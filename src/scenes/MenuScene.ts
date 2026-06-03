import Phaser from 'phaser';
import { isTouchDevice } from '../systems/touchState';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.add.tileSprite(0, 0, W, H, 'ground').setOrigin(0, 0);
    for (let x = 0; x < W; x += 360) {
      this.add.image(x, 40, 'bg_house').setOrigin(0, 0).setScale(360 / this.textures.get('bg_house').getSourceImage().width).setAlpha(0.9);
    }
    this.add.rectangle(0, 0, W, H, 0x1a1a2e, 0.35).setOrigin(0, 0);

    const logo = this.add.image(W / 2, H * 0.34, 'logo').setOrigin(0.5);
    logo.setScale(Math.min(560 / logo.width, 1));
    this.tweens.add({ targets: logo, y: H * 0.34 - 10, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.add
      .text(W / 2, H * 0.55, 'Local 2-Player  •  Wash → Dry → Fold', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const play = this.add.image(W / 2, H * 0.7, 'buttons', 0).setOrigin(0.5).setInteractive({ useHandCursor: true });
    play.setScale(120 / play.frame.realHeight);
    this.tweens.add({ targets: play, scale: play.scale * 1.08, duration: 700, yoyo: true, repeat: -1 });

    const help = isTouchDevice()
      ? 'Touch: each side has a joystick + GRAB / ACT buttons\nHold landscape — one player per half of the screen\n\nTap PLAY to start'
      : 'P1: WASD move · SPACE grab · F action\nP2: Arrows move · ENTER grab · . action\n\nClick PLAY or press ENTER';
    this.add
      .text(W / 2, H * 0.85, help, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#ffd1e8',
        align: 'center',
      })
      .setOrigin(0.5);

    const go = () => {
      // On touch devices, go fullscreen + try to lock landscape (needs a gesture).
      if (isTouchDevice()) {
        try {
          if (!this.scale.isFullscreen) this.scale.startFullscreen();
        } catch {
          /* ignore */
        }
        const orientation = (screen as unknown as { orientation?: { lock?: (o: string) => Promise<void> } }).orientation;
        orientation?.lock?.('landscape').catch(() => {
          /* orientation lock not permitted; harmless */
        });
      }
      this.scene.start('CharacterSelectScene');
    };
    play.on('pointerdown', go);
    this.input.keyboard!.once('keydown-ENTER', go);
    this.input.keyboard!.once('keydown-SPACE', go);
  }
}
