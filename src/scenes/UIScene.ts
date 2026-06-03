import Phaser from 'phaser';
import { VIEW_W, COLORS } from '../config/gameConfig';
import { ClothesState, ItemType, Weather, EV, type PlayerId } from '../types';
import { TouchControls } from '../systems/TouchControls';
import { isTouchDevice, resetTouchState } from '../systems/touchState';

const STATE_LABEL: Record<ClothesState, string> = {
  [ClothesState.DIRTY]: 'DIRTY',
  [ClothesState.WET]: 'WET',
  [ClothesState.DRY]: 'DRY',
  [ClothesState.FOLDED]: 'FOLDED',
};

const HELD_SHEET: Record<ClothesState, string> = {
  [ClothesState.DIRTY]: 'clothes_dirty',
  [ClothesState.WET]: 'clothes_wet',
  [ClothesState.DRY]: 'clothes_wet',
  [ClothesState.FOLDED]: 'clothes_folded',
};

const PANEL_W = 256;
const PANEL_H = 118;

export class UIScene extends Phaser.Scene {
  private scoreText!: Record<PlayerId, Phaser.GameObjects.Text>;
  private heldIcon!: Record<PlayerId, Phaser.GameObjects.Sprite>;
  private heldLabel!: Record<PlayerId, Phaser.GameObjects.Text>;
  private puIcon!: Record<PlayerId, Phaser.GameObjects.Sprite>;
  private timerText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private weatherText!: Phaser.GameObjects.Text;
  private stormTint!: Phaser.GameObjects.Rectangle;
  private countdownImg!: Phaser.GameObjects.Image;
  private lastScore: Record<PlayerId, number> = { 1: 0, 2: 0 };

  constructor() {
    super({ key: 'UIScene', active: false });
  }

  create(): void {
    const W = this.scale.width;
    const cx = W / 2;

    this.lastScore = { 1: 0, 2: 0 };
    this.stormTint = this.add.rectangle(0, 0, W, this.scale.height, 0x102040, 0).setOrigin(0, 0).setDepth(0);

    // Split divider + player-coloured edge accents (label each half).
    this.add.rectangle(VIEW_W, 0, 4, this.scale.height, 0xffffff, 0.4).setOrigin(0.5, 0).setDepth(10);
    this.add.rectangle(0, 0, 6, this.scale.height, COLORS.p1, 0.7).setOrigin(0, 0).setDepth(9);
    this.add.rectangle(W, 0, 6, this.scale.height, COLORS.p2, 0.7).setOrigin(1, 0).setDepth(9);

    this.scoreText = {} as Record<PlayerId, Phaser.GameObjects.Text>;
    this.heldIcon = {} as Record<PlayerId, Phaser.GameObjects.Sprite>;
    this.heldLabel = {} as Record<PlayerId, Phaser.GameObjects.Text>;
    this.puIcon = {} as Record<PlayerId, Phaser.GameObjects.Sprite>;
    this.buildPanel(1, 'left', COLORS.p1, '#ff7ab6');
    this.buildPanel(2, 'right', COLORS.p2, '#5ec8ff');

    // Center clock.
    const clock = this.add.graphics().setDepth(10);
    clock.fillStyle(0x000000, 0.5).fillRoundedRect(cx - 100, 10, 200, 66, 14);
    clock.lineStyle(3, 0xffffff, 0.6).strokeRoundedRect(cx - 100, 10, 200, 66, 14);
    this.timerText = this.add
      .text(cx, 30, '2:00', {
        fontFamily: 'monospace',
        fontSize: '38px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(11);
    this.roundText = this.add
      .text(cx, 60, '', { fontFamily: 'monospace', fontSize: '13px', color: '#ffd1e8' })
      .setOrigin(0.5)
      .setDepth(11);
    this.weatherText = this.add
      .text(cx, 88, '', { fontFamily: 'monospace', fontSize: '15px', color: '#cfe8ff', stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(11);

    // Countdown.
    this.countdownImg = this.add.image(cx, this.scale.height / 2, 'countdown', 0).setDepth(50).setVisible(false);

    this.bindGameEvents();

    if (isTouchDevice()) new TouchControls(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => resetTouchState());
  }

  /** Builds one player's score/status card pinned to a top corner. */
  private buildPanel(id: PlayerId, side: 'left' | 'right', color: number, css: string): void {
    const W = this.scale.width;
    const left = side === 'left';
    const px = left ? 14 : W - 14 - PANEL_W;
    const py = 12;

    const g = this.add.graphics().setDepth(10);
    g.fillStyle(0x000000, 0.5).fillRoundedRect(px, py, PANEL_W, PANEL_H, 14);
    g.lineStyle(3, color, 0.95).strokeRoundedRect(px, py, PANEL_W, PANEL_H, 14);

    // Player tag.
    this.add
      .text(left ? px + 14 : px + PANEL_W - 14, py + 12, `PLAYER ${id}`, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: css,
        fontStyle: 'bold',
      })
      .setOrigin(left ? 0 : 1, 0)
      .setDepth(11);

    // Score icon + number.
    const iconX = left ? px + 34 : px + PANEL_W - 34;
    const icon = this.add.sprite(iconX, py + 58, 'hud_icons', 0).setDepth(11);
    icon.setScale(40 / (icon.frame.realHeight || icon.height));
    const numX = left ? px + 62 : px + PANEL_W - 62;
    this.scoreText[id] = this.add
      .text(numX, py + 58, '0', {
        fontFamily: 'monospace',
        fontSize: '46px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(left ? 0 : 1, 0.5)
      .setDepth(11);

    // Held item + power-up sub-row.
    const hx = left ? px + 30 : px + PANEL_W - 30;
    this.heldIcon[id] = this.add.sprite(hx, py + 96, 'clothes_dirty', 0).setDepth(11).setVisible(false);
    this.heldLabel[id] = this.add
      .text(left ? px + 52 : px + PANEL_W - 52, py + 90, '', { fontFamily: 'monospace', fontSize: '13px', color: '#fff' })
      .setOrigin(left ? 0 : 1, 0)
      .setDepth(11);
    const puX = left ? px + PANEL_W - 28 : px + 28;
    this.puIcon[id] = this.add.sprite(puX, py + 96, 'pu_icons', 0).setScale(0.15).setDepth(11).setVisible(false);
  }

  private bindGameEvents(): void {
    const game = this.scene.get('GameScene');
    game.events.on(EV.TOAST, this.onToast, this);
    game.events.on(EV.COUNTDOWN, this.onCountdown, this);
    game.events.on(EV.RUSH, this.onRush, this);
    game.events.on(EV.WEATHER, this.onWeather, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      game.events.off(EV.TOAST, this.onToast, this);
      game.events.off(EV.COUNTDOWN, this.onCountdown, this);
      game.events.off(EV.RUSH, this.onRush, this);
      game.events.off(EV.WEATHER, this.onWeather, this);
    });
  }

  update(): void {
    this.refreshScore(1);
    this.refreshScore(2);

    const ms = this.registry.get('timer') ?? 0;
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    this.timerText.setText(`${m}:${s.toString().padStart(2, '0')}`);
    this.timerText.setColor(total <= 30 ? '#ff5a5a' : '#ffffff');

    const bestOf = this.registry.get('bestOf') ?? 1;
    if (bestOf > 1) this.roundText.setText(`Round ${this.registry.get('round') ?? 1} / ${bestOf}`);

    this.updateHeld(1);
    this.updateHeld(2);
    this.updatePowerUp(1);
    this.updatePowerUp(2);
  }

  private refreshScore(id: PlayerId): void {
    const score = (this.registry.get(`score${id}`) as number) ?? 0;
    if (score === this.lastScore[id]) return;
    const gain = score > this.lastScore[id];
    this.lastScore[id] = score;
    const t = this.scoreText[id];
    t.setText(`${score}`);
    // Pop (anchored to its panel side so it never spills out).
    this.tweens.killTweensOf(t);
    t.setScale(1);
    t.setColor(gain ? '#ffe24a' : '#ff9a9a');
    this.tweens.add({
      targets: t,
      scaleX: 1.32,
      scaleY: 1.32,
      duration: 120,
      yoyo: true,
      ease: 'Quad.out',
      onComplete: () => t.setColor('#ffffff'),
    });
  }

  private updateHeld(id: PlayerId): void {
    const held = this.registry.get(`held${id}`) as { type: ItemType; state: ClothesState } | null;
    const icon = this.heldIcon[id];
    const label = this.heldLabel[id];
    if (held) {
      const sheet = held.type === ItemType.SOCK ? 'socks' : HELD_SHEET[held.state];
      const frame = held.type === ItemType.SOCK ? 0 : held.type;
      icon.setTexture(sheet, frame);
      icon.setScale(34 / (icon.frame.realHeight || icon.height));
      icon.setVisible(true);
      label.setText(STATE_LABEL[held.state]).setVisible(true);
    } else {
      icon.setVisible(false);
      label.setVisible(false);
    }
  }

  private updatePowerUp(id: PlayerId): void {
    const pu = this.registry.get(`powerup${id}`);
    const icon = this.puIcon[id];
    if (pu !== null && pu !== undefined) {
      icon.setFrame(pu as number).setVisible(true);
    } else {
      icon.setVisible(false);
    }
  }

  private onToast(d: { id: PlayerId | 0; text: string; color: number }): void {
    const x = d.id === 1 ? VIEW_W / 2 : d.id === 2 ? VIEW_W + VIEW_W / 2 : this.scale.width / 2;
    const t = this.add
      .text(x, 190, d.text, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: Phaser.Display.Color.IntegerToColor(d.color).rgba,
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setScale(0.6);
    this.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.out' });
    this.tweens.add({
      targets: t,
      y: 140,
      alpha: 0,
      delay: 250,
      duration: 1000,
      ease: 'Cubic.out',
      onComplete: () => t.destroy(),
    });
  }

  private onCountdown(d: { index?: number; done?: boolean }): void {
    if (d.done) {
      this.countdownImg.setVisible(false);
      return;
    }
    this.countdownImg.setFrame(d.index ?? 0).setVisible(true).setScale(0.4).setAlpha(1);
    this.tweens.add({ targets: this.countdownImg, scale: 1.0, duration: 700, ease: 'Back.out' });
  }

  private onRush(): void {
    const t = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 40, 'RUSH HOUR!', {
        fontFamily: 'monospace',
        fontSize: '52px',
        color: '#ffe24a',
        stroke: '#a00',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(45)
      .setScale(0.5);
    this.tweens.add({ targets: t, scale: 1.2, alpha: 0, duration: 1600, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }

  private onWeather(d: { weather: Weather }): void {
    const dark = d.weather === Weather.STORM;
    this.tweens.add({ targets: this.stormTint, fillAlpha: dark ? 0.28 : 0, duration: 700 });
    this.weatherText.setText(dark ? 'STORM' : '');
  }
}
