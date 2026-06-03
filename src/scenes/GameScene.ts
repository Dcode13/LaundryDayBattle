import Phaser from 'phaser';
import {
  CFG,
  WORLD_W,
  WORLD_H,
  VIEW_W,
  VIEW_H,
  LAYOUT,
  COLORS,
} from '../config/gameConfig';
import { ClothesState, ItemType, PlayerState, Weather, EV, PowerUpType, type PlayerId } from '../types';
import { InputManager } from '../systems/InputManager';
import { ScoreSystem } from '../systems/ScoreSystem';
import { DisruptionSystem } from '../systems/DisruptionSystem';
import { Sfx } from '../systems/Sfx';
import { Player } from '../entities/Player';
import { ClothesItem } from '../entities/ClothesItem';
import { PowerUp } from '../entities/PowerUp';
import { WashingMachine } from '../entities/stations/WashingMachine';
import { Clothesline } from '../entities/stations/Clothesline';
import { FoldingTable } from '../entities/stations/FoldingTable';
import { DirtyPile } from '../entities/stations/DirtyPile';
import { ScorePile } from '../entities/stations/ScorePile';

interface PlayerStations {
  washer: WashingMachine;
  line: Clothesline;
  fold: FoldingTable;
  score: ScorePile;
  sockHome: { x: number; y: number };
}

export class GameScene extends Phaser.Scene {
  private input2!: InputManager;
  private players!: Record<PlayerId, Player>;
  private stations!: Record<PlayerId, PlayerStations>;
  private dirtyPile!: DirtyPile;
  private scoreSys!: ScoreSystem;
  private disruption!: DisruptionSystem;
  private sfx = new Sfx();

  private groundItems: ClothesItem[] = [];
  private sockMarkers = new Map<ClothesItem, Phaser.GameObjects.Image>();
  private powerups: PowerUp[] = [];
  private heldPowerup: Record<PlayerId, PowerUpType | null> = { 1: null, 2: null };
  private powerupTimer = 0;

  private dryGfx!: Phaser.GameObjects.Graphics;
  private miniGfx!: Phaser.GameObjects.Graphics;
  private skyImg!: Phaser.GameObjects.Image;
  private rainEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private stormClouds: Phaser.GameObjects.Sprite[] = [];

  private weather: Weather = Weather.SUNNY;
  private running = false;
  private rush = false;
  private roundMsLeft: number = CFG.ROUND_MS;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.resetState();
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    this.buildBackground();
    this.buildStations();
    this.buildPlayers();
    this.setupCameras();

    this.input2 = new InputManager(this);
    this.scoreSys = new ScoreSystem(this, this.players[1], this.players[2]);
    this.disruption = new DisruptionSystem(this, {
      onWind: () => this.triggerWind(),
      onRain: () => this.triggerRain(),
      onSock: () => this.triggerSockEvent(),
    });

    this.dryGfx = this.add.graphics().setDepth(90000);
    this.miniGfx = this.add.graphics().setDepth(90001);

    // Player-vs-player collision -> bonk.
    this.physics.add.collider(this.players[1].sprite, this.players[2].sprite, () => {
      const mx = (this.players[1].x + this.players[2].x) / 2;
      const my = (this.players[1].y + this.players[2].y) / 2;
      this.burst('p_bonk', mx, my, 6, 0.16);
    });

    // Seed HUD registry values.
    this.registry.set('score1', 0);
    this.registry.set('score2', 0);
    this.registry.set('round', this.scoreSys.round);
    this.registry.set('bestOf', CFG.BEST_OF);
    this.registry.set('timer', this.roundMsLeft);
    this.registry.set('weather', this.weather);
    this.emitHeld(1);
    this.emitHeld(2);

    if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');
    this.startCountdown();
  }

  private resetState(): void {
    this.groundItems = [];
    this.sockMarkers.clear();
    this.powerups = [];
    this.heldPowerup = { 1: null, 2: null };
    this.powerupTimer = 0;
    this.stormClouds = [];
    this.weather = Weather.SUNNY;
    this.running = false;
    this.rush = false;
    this.roundMsLeft = CFG.ROUND_MS;
  }

  // ---------------------------------------------------------------- world ----
  private buildBackground(): void {
    this.add.tileSprite(0, 0, WORLD_W, WORLD_H, 'ground').setOrigin(0, 0).setDepth(-1000);

    this.skyImg = this.add
      .image(0, 0, 'sky', 0)
      .setOrigin(0, 0)
      .setDisplaySize(WORLD_W, 150)
      .setDepth(-950);

    // House facades along the back wall.
    const houseTex = this.textures.get('bg_house').getSourceImage();
    const houseW = 360;
    const houseScale = houseW / houseTex.width;
    const houseH = houseTex.height * houseScale;
    for (let x = 0; x < WORLD_W; x += houseW) {
      this.add.image(x, 60, 'bg_house').setOrigin(0, 0).setScale(houseScale).setDepth(-900);
    }
    void houseH;

    // Fence strip as the horizon line.
    const fence = this.textures.get('fence').getSourceImage();
    const fScale = 90 / fence.height;
    this.add.tileSprite(0, 150, WORLD_W / fScale, fence.height, 'fence')
      .setOrigin(0, 0)
      .setScale(fScale)
      .setDepth(-880);
  }

  private buildStations(): void {
    this.dirtyPile = new DirtyPile(this, LAYOUT.dirty.x, LAYOUT.dirty.y);
    this.add
      .text(LAYOUT.dirty.x, LAYOUT.dirty.y - 96, 'SHARED LAUNDRY', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#00000066',
      })
      .setOrigin(0.5)
      .setDepth(99999);

    type StationCfg = {
      washer: { x: number; y: number };
      line: { x: number; y: number };
      fold: { x: number; y: number };
      score: { x: number; y: number };
    };
    const mk = (id: PlayerId, cfg: StationCfg): PlayerStations => ({
      washer: new WashingMachine(this, cfg.washer.x, cfg.washer.y),
      line: new Clothesline(this, cfg.line.x, cfg.line.y),
      fold: new FoldingTable(this, cfg.fold.x, cfg.fold.y),
      score: new ScorePile(this, cfg.score.x, cfg.score.y),
      sockHome: { x: cfg.score.x + (id === 1 ? 64 : -64), y: cfg.score.y - 6 },
    });
    this.stations = { 1: mk(1, LAYOUT.p1), 2: mk(2, LAYOUT.p2) };
  }

  private buildPlayers(): void {
    this.players = {
      1: new Player(this, 1, LAYOUT.p1Spawn.x, LAYOUT.p1Spawn.y),
      2: new Player(this, 2, LAYOUT.p2Spawn.x, LAYOUT.p2Spawn.y),
    };
  }

  private setupCameras(): void {
    const cam1 = this.cameras.main;
    cam1.setViewport(0, 0, VIEW_W, VIEW_H);
    cam1.setBounds(0, 0, WORLD_W, WORLD_H);
    cam1.setZoom(1.1);
    cam1.startFollow(this.players[1].sprite, true, 0.12, 0.12);

    const cam2 = this.cameras.add(VIEW_W, 0, VIEW_W, VIEW_H);
    cam2.setBounds(0, 0, WORLD_W, WORLD_H);
    cam2.setZoom(1.1);
    cam2.startFollow(this.players[2].sprite, true, 0.12, 0.12);
  }

  // -------------------------------------------------------------- countdown --
  private startCountdown(): void {
    const seq = ['3', '2', '1', 'GO!'];
    let i = 0;
    this.events.emit(EV.COUNTDOWN, { index: i });
    this.time.addEvent({
      delay: 800,
      repeat: seq.length - 1,
      callback: () => {
        i++;
        if (i < seq.length) {
          this.events.emit(EV.COUNTDOWN, { index: i });
        } else {
          this.events.emit(EV.COUNTDOWN, { done: true });
          this.running = true;
          this.disruption.start();
        }
      },
    });
  }

  // ----------------------------------------------------------------- update --
  update(_time: number, delta: number): void {
    for (const id of [1, 2] as PlayerId[]) {
      const intent = this.running ? this.input2.getIntent(id) : {
        moveX: 0, moveY: 0, interactPressed: false, actionPressed: false, actionHeld: false,
      };
      const p = this.players[id];
      p.update(delta, intent);

      if (this.running) {
        if (intent.interactPressed) this.handleInteract(id);
        if (p.state === PlayerState.WASHING) this.tickWashing(id, intent);
        if (p.state === PlayerState.FOLDING) this.tickFolding(id, intent, delta);
        if (intent.actionPressed && p.state !== PlayerState.WASHING && p.state !== PlayerState.FOLDING) {
          this.usePowerUp(id);
        }
      }
    }

    if (this.running) {
      this.stations[1].line.update(delta, (it) => this.onDried(it, 1));
      this.stations[2].line.update(delta, (it) => this.onDried(it, 2));
      this.dirtyPile.update(delta, this.rush);
      this.disruption.update(delta, this.rush);
      this.updatePowerUps(delta);
      this.tickClock(delta);
    }

    this.drawDryingBars();
    this.drawMiniGames();
  }

  private tickClock(delta: number): void {
    this.roundMsLeft = Math.max(0, this.roundMsLeft - delta);
    this.registry.set('timer', this.roundMsLeft);

    if (!this.rush && CFG.ROUND_MS - this.roundMsLeft >= CFG.RUSH_HOUR_AT_MS) {
      this.rush = true;
      this.events.emit(EV.RUSH, {});
    }
    if (this.roundMsLeft <= 0) this.endRound();
  }

  // ------------------------------------------------------------- interaction -
  private handleInteract(id: PlayerId): void {
    const p = this.players[id];
    const st = this.stations[id];

    if (p.state === PlayerState.FREE) {
      // 1) collect a dried item from own line
      const ready = st.line.readyItem();
      if (ready && st.line.isNear(p.x, p.y)) {
        st.line.remove(ready);
        this.pickUp(id, ready);
        return;
      }
      // 2) pick up a ground item (fallen clothes or a runaway sock) near you
      const ground = this.nearestGroundItem(p.x, p.y, 70);
      if (ground) {
        this.pickUpGround(id, ground);
        return;
      }
      // 3) take a dirty item from the shared basket
      if (this.dirtyPile.isNear(p.x, p.y) && this.dirtyPile.hasItem()) {
        const type = this.dirtyPile.take();
        if (type !== null) {
          const item = new ClothesItem(this, type, ClothesState.DIRTY, p.x, p.y);
          this.pickUp(id, item);
        }
        return;
      }
    } else if (p.state === PlayerState.CARRYING && p.held) {
      const item = p.held;
      // DIRTY -> washer
      if (item.state === ClothesState.DIRTY && st.washer.isNear(p.x, p.y)) {
        this.startWashing(id, item);
        return;
      }
      // WET -> clothesline
      if (item.state === ClothesState.WET && st.line.isNear(p.x, p.y)) {
        const slot = st.line.emptySlotIndex();
        if (slot >= 0) {
          p.setHeld(null);
          st.line.hang(item, slot);
          this.emitHeld(id);
          this.sfx.hang();
          return;
        }
      }
      // DRY -> folding table
      if (item.state === ClothesState.DRY && st.fold.isNear(p.x, p.y)) {
        this.startFolding(id, item);
        return;
      }
    }
  }

  private pickUp(id: PlayerId, item: ClothesItem): void {
    this.players[id].setHeld(item);
    this.emitHeld(id);
    this.sfx.pickup();
  }

  private pickUpGround(id: PlayerId, item: ClothesItem): void {
    const idx = this.groundItems.indexOf(item);
    if (idx >= 0) this.groundItems.splice(idx, 1);
    const marker = this.sockMarkers.get(item);
    if (marker) {
      marker.destroy();
      this.sockMarkers.delete(item);
    }
    // A runaway pending sock just returns home rather than being carried.
    if (item === this.players[id].pendingSock) {
      const home = this.stations[id].sockHome;
      item.setPosition(home.x, home.y);
      item.fallen = false;
      item.sprite.setDepth(home.y);
      return;
    }
    this.pickUp(id, item);
  }

  private nearestGroundItem(x: number, y: number, maxDist: number): ClothesItem | null {
    let best: ClothesItem | null = null;
    let bestD = maxDist;
    for (const it of this.groundItems) {
      const d = Phaser.Math.Distance.Between(x, y, it.x, it.y);
      if (d < bestD) {
        bestD = d;
        best = it;
      }
    }
    return best;
  }

  // ------------------------------------------------------------- mini-games --
  private startWashing(id: PlayerId, item: ClothesItem): void {
    const p = this.players[id];
    const st = this.stations[id];
    p.setHeld(null);
    p.state = PlayerState.WASHING;
    p.mini = { item, taps: 0, holdMs: 0, cursor: 0, dir: 1 };
    st.washer.setSpinning(true);
    item.setPosition(st.washer.x, st.washer.y + 8);
    item.sprite.setVisible(false);
    this.emitHeld(id);
  }

  private tickWashing(id: PlayerId, intent: { actionPressed: boolean; actionHeld: boolean }): void {
    const p = this.players[id];
    const m = p.mini;
    if (!m) return;
    const st = this.stations[id];
    p.sprite.setPosition(st.washer.x + (id === 1 ? 36 : -36), st.washer.y + 30);

    if (intent.actionPressed) {
      m.taps++;
      this.burst('p_bubbles', st.washer.x, st.washer.y, 4, 0.12);
      this.sfx.washTap();
    }
    if (intent.actionHeld) m.holdMs += this.game.loop.delta;

    if (m.taps >= CFG.WASH_TAPS || m.holdMs >= CFG.WASH_HOLD_MS) {
      st.washer.setSpinning(false);
      m.item.setState(ClothesState.WET);
      m.item.sprite.setVisible(true);
      this.burst('p_bubbles', st.washer.x, st.washer.y - 10, 12, 0.18);
      this.sfx.done();
      p.state = PlayerState.FREE;
      p.mini = null;
      this.pickUp(id, m.item);
    }
  }

  private startFolding(id: PlayerId, item: ClothesItem): void {
    const p = this.players[id];
    const st = this.stations[id];
    p.setHeld(null);
    p.state = PlayerState.FOLDING;
    p.mini = { item, taps: 0, holdMs: 0, cursor: 0, dir: 1 };
    item.setPosition(st.fold.x, st.fold.y - 10);
    item.sprite.setDepth(st.fold.sprite.depth + 1);
    this.emitHeld(id);
  }

  private tickFolding(
    id: PlayerId,
    intent: { actionPressed: boolean },
    delta: number,
  ): void {
    const p = this.players[id];
    const m = p.mini;
    if (!m) return;
    const st = this.stations[id];
    p.sprite.setPosition(st.fold.x + (id === 1 ? -40 : 40), st.fold.y + 24);

    // Ping-pong cursor 0..1.
    m.cursor += m.dir * CFG.FOLD_CURSOR_SPEED * (delta / 1000);
    if (m.cursor >= 1) {
      m.cursor = 1;
      m.dir = -1;
    } else if (m.cursor <= 0) {
      m.cursor = 0;
      m.dir = 1;
    }

    if (intent.actionPressed) {
      const off = Math.abs(m.cursor - 0.5);
      if (off <= CFG.FOLD_WINDOW / 2) {
        const perfect = off <= CFG.FOLD_PERFECT;
        this.finishFold(id, m.item, perfect);
      } else {
        this.events.emit(EV.TOAST, { id, text: 'Miss!', color: COLORS.warn });
        this.sfx.miss();
      }
    }
  }

  private finishFold(id: PlayerId, item: ClothesItem, perfect: boolean): void {
    const p = this.players[id];
    const st = this.stations[id];
    p.state = PlayerState.FREE;
    p.mini = null;
    item.setState(ClothesState.FOLDED);
    this.burst('p_sparkle', item.x, item.y, 8, 0.16);

    if (item.type === ItemType.SOCK) {
      this.handleSockFold(id, item, perfect);
      return;
    }

    let pts = CFG.POINTS_FOLD + (perfect ? CFG.POINTS_PERFECT_BONUS : 0);
    this.scoreSys.award(id, pts, perfect ? `PERFECT +${pts}` : `+${pts}`);
    if (perfect) this.sfx.perfect();
    else this.sfx.score();
    p.foldedCount++;
    st.score.addFolded();
    this.flyToPile(item, st.score);
  }

  private handleSockFold(id: PlayerId, item: ClothesItem, perfect: boolean): void {
    const p = this.players[id];
    const st = this.stations[id];

    if (p.pendingSock) {
      // Complete a pair!
      const partner = p.pendingSock;
      p.pendingSock = null;
      const pts = CFG.POINTS_FOLD + CFG.POINTS_SOCK_PAIR_BONUS + (perfect ? CFG.POINTS_PERFECT_BONUS : 0);
      this.scoreSys.award(id, pts, `SOCK PAIR +${pts}`);
      p.foldedCount += 2;
      st.score.addFolded(2);
      item.markPair();
      this.burst('p_sparkle', item.x, item.y, 12, 0.2);
      this.sfx.pair();
      this.flyToPile(item, st.score);
      partner.destroy();
    } else {
      // First sock waits for a partner near the score pile.
      p.pendingSock = item;
      item.setState(ClothesState.FOLDED);
      item.sprite.setTexture('socks', 0);
      item.sprite.setScale(40 / (item.sprite.frame.realHeight || item.sprite.height));
      item.setPosition(st.sockHome.x, st.sockHome.y);
      item.sprite.setDepth(st.sockHome.y);
      this.events.emit(EV.TOAST, { id, text: 'Sock needs a pair!', color: COLORS.perfect });
    }
  }

  private flyToPile(item: ClothesItem, pile: ScorePile): void {
    this.tweens.add({
      targets: item.sprite,
      x: pile.x,
      y: pile.y - 20,
      scale: 0.05,
      duration: 280,
      ease: 'Cubic.in',
      onComplete: () => item.destroy(),
    });
  }

  private onDried(item: ClothesItem, _id: PlayerId): void {
    this.burst('p_sparkle', item.x, item.y, 6, 0.14);
  }

  // ------------------------------------------------------------- disruptions -
  private triggerWind(): void {
    const wind = this.add
      .image(-200, WORLD_H * 0.5, 'fx_wind')
      .setDepth(80000)
      .setAlpha(0.85);
    wind.setScale(360 / (wind.frame.realHeight || wind.height));
    this.tweens.add({
      targets: wind,
      x: WORLD_W + 200,
      duration: 1600,
      ease: 'Sine.inOut',
      onComplete: () => wind.destroy(),
    });

    for (const id of [1, 2] as PlayerId[]) {
      const fallen = this.stations[id].line.windKnockoff(CFG.WIND_FALL_CHANCE);
      for (const it of fallen) this.dropToGround(it, id);
    }
    this.sfx.wind();
    this.events.emit(EV.TOAST, { id: 0, text: 'WIND!', color: COLORS.warn });
  }

  private dropToGround(item: ClothesItem, owner: PlayerId): void {
    const gx = Phaser.Math.Clamp(item.x + Phaser.Math.Between(-50, 50), 60, WORLD_W - 60);
    const gy = Phaser.Math.Clamp(item.y + Phaser.Math.Between(70, 130), 220, WORLD_H - 40);
    item.fallen = true;
    item.owner = owner;
    item.sprite.setDepth(gy);
    this.tweens.add({ targets: item.sprite, x: gx, y: gy, duration: 500, ease: 'Bounce.out' });
    item.setPosition(item.x, item.y);
    this.groundItems.push(item);
  }

  private triggerRain(): void {
    if (this.weather === Weather.STORM) return;
    this.setWeather(Weather.STORM);

    for (const id of [1, 2] as PlayerId[]) this.stations[id].line.rainWet();

    this.rainEmitter = this.add.particles(0, 0, 'rain', {
      x: { min: 0, max: WORLD_W },
      y: -20,
      frame: 0,
      lifespan: 900,
      speedY: { min: 500, max: 700 },
      speedX: { min: -60, max: -20 },
      scale: { start: 0.12, end: 0.12 },
      quantity: 6,
      frequency: 30,
    });
    this.rainEmitter.setDepth(80050);

    for (let i = 0; i < 4; i++) {
      const c = this.add
        .sprite(Phaser.Math.Between(100, WORLD_W - 100), Phaser.Math.Between(40, 140), 'storm')
        .play('storm_loop')
        .setDepth(80040);
      c.setScale(180 / (c.frame.realHeight || c.height));
      this.stormClouds.push(c);
    }
    this.sfx.thunder();
    this.events.emit(EV.TOAST, { id: 0, text: 'RAIN!', color: COLORS.p2 });

    this.time.delayedCall(CFG.RAIN_DURATION_MS, () => this.stopRain());
  }

  private stopRain(): void {
    this.setWeather(Weather.SUNNY);
    this.rainEmitter?.stop();
    this.time.delayedCall(1000, () => this.rainEmitter?.destroy());
    for (const c of this.stormClouds) {
      this.tweens.add({ targets: c, alpha: 0, duration: 800, onComplete: () => c.destroy() });
    }
    this.stormClouds = [];
  }

  private setWeather(w: Weather): void {
    this.weather = w;
    this.skyImg.setFrame(w === Weather.STORM ? 2 : w === Weather.OVERCAST ? 1 : 0);
    this.registry.set('weather', w);
    this.events.emit(EV.WEATHER, { weather: w });
  }

  private triggerSockEvent(): void {
    const candidates = ([1, 2] as PlayerId[]).filter(
      (id) => this.players[id].pendingSock && !this.players[id].pendingSock!.fallen,
    );
    if (candidates.length === 0) return;
    const id = Phaser.Utils.Array.GetRandom(candidates);
    const sock = this.players[id].pendingSock!;

    const tx = Phaser.Math.Between(250, WORLD_W - 250);
    const ty = Phaser.Math.Between(240, WORLD_H - 60);
    sock.fallen = true;
    sock.owner = id;
    this.tweens.add({ targets: sock.sprite, x: tx, y: ty, duration: 600, ease: 'Sine.inOut' });
    sock.sprite.setDepth(ty);

    const marker = this.add.image(tx, ty - 40, 'marker_sock').setDepth(95000);
    marker.setScale(46 / (marker.frame.realHeight || marker.height));
    this.tweens.add({ targets: marker, y: ty - 52, duration: 500, yoyo: true, repeat: -1 });
    this.sockMarkers.set(sock, marker);
    this.groundItems.push(sock);

    this.events.emit(EV.TOAST, { id, text: 'Sock ran away!', color: COLORS.warn });
  }

  // ---------------------------------------------------------------- powerups -
  private updatePowerUps(delta: number): void {
    this.powerupTimer += delta;
    const period = CFG.POWERUP_SPAWN_MS * (this.rush ? CFG.RUSH_SPEEDUP : 1);
    if (this.powerupTimer >= period && this.powerups.length < 3) {
      this.powerupTimer = 0;
      this.spawnPowerUp();
    }

    for (const id of [1, 2] as PlayerId[]) {
      if (this.heldPowerup[id] !== null) continue;
      const p = this.players[id];
      for (const pu of [...this.powerups]) {
        if (Phaser.Math.Distance.Between(p.x, p.y, pu.x, pu.y) < 48) {
          this.heldPowerup[id] = pu.type;
          this.registry.set(`powerup${id}`, pu.type);
          pu.destroy();
          this.powerups.splice(this.powerups.indexOf(pu), 1);
          this.sfx.powerup();
          this.events.emit(EV.TOAST, { id, text: 'Power-up!', color: COLORS.good });
          break;
        }
      }
    }
  }

  private spawnPowerUp(): void {
    const type = Phaser.Math.Between(0, 3) as PowerUpType;
    const x = Phaser.Math.Between(WORLD_W * 0.35, WORLD_W * 0.65);
    const y = Phaser.Math.Between(260, WORLD_H - 80);
    this.powerups.push(new PowerUp(this, type, x, y));
  }

  private usePowerUp(id: PlayerId): void {
    const type = this.heldPowerup[id];
    if (type === null) return;
    this.heldPowerup[id] = null;
    this.registry.set(`powerup${id}`, null);
    const other: PlayerId = id === 1 ? 2 : 1;

    switch (type) {
      case PowerUpType.SPEEDY_SPIN:
        this.players[id].speedMult = CFG.POWERUP_SPEED_MULT;
        this.time.delayedCall(CFG.POWERUP_SPEED_MS, () => (this.players[id].speedMult = 1));
        this.events.emit(EV.TOAST, { id, text: 'Speedy Spin!', color: COLORS.good });
        break;
      case PowerUpType.SOAP_BOMB:
        this.players[other].speedMult = CFG.POWERUP_SLOW_MULT;
        this.time.delayedCall(CFG.POWERUP_SLOW_MS, () => (this.players[other].speedMult = 1));
        this.events.emit(EV.TOAST, { id: other, text: 'Slowed!', color: COLORS.warn });
        break;
      case PowerUpType.MISCHIEF_WIND: {
        const fallen = this.stations[other].line.windKnockoff(1);
        for (const it of fallen) this.dropToGround(it, other);
        this.events.emit(EV.TOAST, { id: other, text: 'Mischief Wind!', color: COLORS.warn });
        break;
      }
      case PowerUpType.SOCK_SNATCH:
        if (this.players[other].foldedCount > 0) {
          this.players[other].foldedCount--;
          this.scoreSys.award(other, -CFG.POINTS_FOLD, `-${CFG.POINTS_FOLD}`);
          this.scoreSys.award(id, CFG.POINTS_FOLD, `Snatch +${CFG.POINTS_FOLD}`);
        }
        break;
    }
  }

  // ------------------------------------------------------------------- HUD ---
  private emitHeld(id: PlayerId): void {
    const item = this.players[id].held;
    this.registry.set(`held${id}`, item ? { type: item.type, state: item.state } : null);
  }

  private drawDryingBars(): void {
    const g = this.dryGfx;
    g.clear();
    for (const id of [1, 2] as PlayerId[]) {
      for (const it of this.stations[id].line.hungItems()) {
        if (it.state !== ClothesState.WET) continue;
        const w = 34;
        const x = it.x - w / 2;
        const y = it.y - 30;
        g.fillStyle(0x000000, 0.5).fillRect(x - 1, y - 1, w + 2, 6);
        g.fillStyle(0x4fd1ff, 1).fillRect(x, y, w * it.dryProgress, 4);
      }
    }
  }

  private drawMiniGames(): void {
    const g = this.miniGfx;
    g.clear();
    for (const id of [1, 2] as PlayerId[]) {
      const p = this.players[id];
      const st = this.stations[id];
      if (p.state === PlayerState.WASHING && p.mini) {
        const prog = Math.max(p.mini.taps / CFG.WASH_TAPS, p.mini.holdMs / CFG.WASH_HOLD_MS);
        this.drawBar(st.washer.x, st.washer.y - 110, prog, 0x8be34a);
      } else if (p.state === PlayerState.FOLDING && p.mini) {
        this.drawFoldBar(st.fold.x, st.fold.y - 80, p.mini.cursor);
      }
    }
  }

  private drawBar(cx: number, cy: number, prog: number, color: number): void {
    const w = 70;
    const x = cx - w / 2;
    this.miniGfx.fillStyle(0x000000, 0.6).fillRect(x - 2, cy - 2, w + 4, 14);
    this.miniGfx.fillStyle(color, 1).fillRect(x, cy, w * Phaser.Math.Clamp(prog, 0, 1), 10);
  }

  private drawFoldBar(cx: number, cy: number, cursor: number): void {
    const w = 90;
    const x = cx - w / 2;
    const g = this.miniGfx;
    g.fillStyle(0x000000, 0.6).fillRect(x - 2, cy - 2, w + 4, 16);
    g.fillStyle(0x444444, 1).fillRect(x, cy, w, 12);
    // target zone
    const zoneW = w * CFG.FOLD_WINDOW;
    g.fillStyle(COLORS.good, 1).fillRect(cx - zoneW / 2, cy, zoneW, 12);
    const perfW = w * CFG.FOLD_PERFECT * 2;
    g.fillStyle(COLORS.perfect, 1).fillRect(cx - perfW / 2, cy, perfW, 12);
    // cursor
    g.fillStyle(0xffffff, 1).fillRect(x + w * cursor - 2, cy - 3, 4, 18);
  }

  // ----------------------------------------------------------------- effects -
  private burst(key: string, x: number, y: number, count: number, scaleStart = 0.18): void {
    const e = this.add.particles(x, y, key, {
      lifespan: { min: 350, max: 750 },
      speed: { min: 30, max: 130 },
      angle: { min: 0, max: 360 },
      scale: { start: scaleStart, end: 0 },
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      emitting: false,
    });
    e.setDepth(99000);
    e.explode(count);
    this.time.delayedCall(900, () => e.destroy());
  }

  // -------------------------------------------------------------- round end --
  private endRound(): void {
    if (!this.running) return;
    this.running = false;
    this.disruption.stop();

    const winner = this.scoreSys.roundWinner();
    if (winner !== 0) this.scoreSys.roundWins[winner]++;
    this.scoreSys.persist();

    const match = this.scoreSys.matchWinner();
    const done = match !== null || this.scoreSys.round >= CFG.BEST_OF;

    if (done) {
      const finalWinner =
        match ?? (this.scoreSys.roundWins[1] === this.scoreSys.roundWins[2] ? winner : this.scoreSys.roundWins[1] > this.scoreSys.roundWins[2] ? 1 : 2);
      const payload = {
        winner: finalWinner,
        s1: this.players[1].score,
        s2: this.players[2].score,
        lost1: this.players[1].lostItems,
        lost2: this.players[2].lostItems,
      };
      this.events.emit(EV.GAME_OVER, payload);
      this.time.delayedCall(400, () => {
        this.scene.stop('UIScene');
        this.scene.start('GameOverScene', payload);
      });
    } else {
      // Next round of a best-of series.
      this.scoreSys.round++;
      this.scoreSys.persist();
      this.events.emit(EV.TOAST, { id: 0, text: `Round ${this.scoreSys.round}`, color: COLORS.perfect });
      this.time.delayedCall(400, () => this.scene.restart());
    }
  }
}
