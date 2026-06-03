import Phaser from 'phaser';
import { VIEW_W } from '../config/gameConfig';
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

  constructor() {
    super({ key: 'UIScene', active: false });
  }

  create(): void {
    const W = this.scale.width;
    const cx = W / 2;

    this.stormTint = this.add.rectangle(0, 0, W, this.scale.height, 0x102040, 0).setOrigin(0, 0).setDepth(0);

    // Split divider.
    this.add.rectangle(VIEW_W, 0, 4, this.scale.height, 0xffffff, 0.5).setOrigin(0.5, 0).setDepth(10);

    // Score panels.
    this.scoreText = {
      1: this.makeScore(20, 0xff7ab6).setOrigin(0, 0),
      2: this.makeScore(W - 20, 0x5ec8ff).setOrigin(1, 0),
    };
    this.addIcon(64, 30, 'hud_icons', 0);
    this.addIcon(W - 64, 30, 'hud_icons', 0);

    // Center clock.
    this.add.rectangle(cx, 36, 200, 60, 0x000000, 0.45).setDepth(10);
    this.timerText = this.add
      .text(cx, 26, '2:00', { fontFamily: 'monospace', fontSize: '34px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(11);
    this.roundText = this.add
      .text(cx, 56, '', { fontFamily: 'monospace', fontSize: '13px', color: '#ffd1e8' })
      .setOrigin(0.5)
      .setDepth(11);
    this.weatherText = this.add
      .text(cx, 78, '', { fontFamily: 'monospace', fontSize: '13px', color: '#cfe8ff' })
      .setOrigin(0.5)
      .setDepth(11);

    // Held-item indicators (top, below the score — keeps the bottom free for
    // on-screen touch controls).
    this.heldIcon = {
      1: this.add.sprite(44, 96, 'clothes_dirty', 0).setDepth(11).setVisible(false),
      2: this.add.sprite(W - 44, 96, 'clothes_dirty', 0).setDepth(11).setVisible(false),
    };
    this.heldLabel = {
      1: this.add.text(74, 84, '', { fontFamily: 'monospace', fontSize: '14px', color: '#fff' }).setDepth(11),
      2: this.add.text(W - 74, 84, '', { fontFamily: 'monospace', fontSize: '14px', color: '#fff' }).setOrigin(1, 0).setDepth(11),
    };

    // Power-up slots (next to the held indicator).
    this.puIcon = {
      1: this.add.sprite(160, 96, 'pu_icons', 0).setScale(0.16).setDepth(11).setVisible(false),
      2: this.add.sprite(W - 160, 96, 'pu_icons', 0).setScale(0.16).setDepth(11).setVisible(false),
    };

    // Countdown.
    this.countdownImg = this.add.image(cx, this.scale.height / 2, 'countdown', 0).setDepth(50).setVisible(false);

    this.bindGameEvents();

    // On-screen controls for touch devices.
    if (isTouchDevice()) new TouchControls(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => resetTouchState());
  }

  private makeScore(x: number, color: number): Phaser.GameObjects.Text {
    return this.add
      .text(x + 36, 18, '0', {
        fontFamily: 'monospace',
        fontSize: '40px',
        color: Phaser.Display.Color.IntegerToColor(color).rgba,
      })
      .setDepth(11);
  }

  private addIcon(x: number, y: number, key: string, frame: number): void {
    const s = this.add.sprite(x, y, key, frame).setDepth(11);
    s.setScale(40 / (s.frame.realHeight || s.height));
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
    this.scoreText[1].setText(`${this.registry.get('score1') ?? 0}`);
    this.scoreText[2].setText(`${this.registry.get('score2') ?? 0}`);

    const ms = this.registry.get('timer') ?? 0;
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    this.timerText.setText(`${m}:${s.toString().padStart(2, '0')}`);
    if (total <= 30) this.timerText.setColor('#ff5a5a');

    const bestOf = this.registry.get('bestOf') ?? 1;
    if (bestOf > 1) this.roundText.setText(`Round ${this.registry.get('round') ?? 1} / ${bestOf}`);

    this.updateHeld(1);
    this.updateHeld(2);
    this.updatePowerUp(1);
    this.updatePowerUp(2);
  }

  private updateHeld(id: PlayerId): void {
    const held = this.registry.get(`held${id}`) as { type: ItemType; state: ClothesState } | null;
    const icon = this.heldIcon[id];
    const label = this.heldLabel[id];
    if (held) {
      const sheet = held.type === ItemType.SOCK ? 'socks' : HELD_SHEET[held.state];
      const frame = held.type === ItemType.SOCK ? 0 : held.type;
      icon.setTexture(sheet, frame);
      icon.setScale(46 / (icon.frame.realHeight || icon.height));
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
      .text(x, 180, d.text, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: Phaser.Display.Color.IntegerToColor(d.color).rgba,
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(40);
    this.tweens.add({
      targets: t,
      y: 130,
      alpha: 0,
      duration: 1100,
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
    this.tweens.add({
      targets: this.countdownImg,
      scale: 1.0,
      duration: 700,
      ease: 'Back.out',
    });
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
    this.weatherText.setText(dark ? '⛈ STORM' : '');
  }
}
