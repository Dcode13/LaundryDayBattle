import Phaser from 'phaser';

export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelectScene');
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.add.tileSprite(0, 0, W, H, 'ground').setOrigin(0, 0);
    this.add.rectangle(0, 0, W, H, 0x1a1a2e, 0.45).setOrigin(0, 0);

    this.makeFighter(W * 0.27, H * 0.5, 1, 'Partner Pink', 0xff7ab6);
    this.makeFighter(W * 0.73, H * 0.5, 2, 'Partner Blue', 0x5ec8ff);

    const vs = this.add.image(W / 2, H * 0.45, 'vs_badge').setOrigin(0.5);
    vs.setScale(200 / vs.height);
    this.tweens.add({ targets: vs, scale: vs.scale * 1.1, duration: 600, yoyo: true, repeat: -1 });

    const ready = this.add
      .text(W / 2, H * 0.82, 'READY?  Press ENTER / SPACE to start', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: ready, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });

    const go = () => {
      this.registry.set('matchRound', 1);
      this.registry.set('matchWins', { 1: 0, 2: 0 });
      this.scene.start('GameScene');
    };
    this.input.keyboard!.once('keydown-ENTER', go);
    this.input.keyboard!.once('keydown-SPACE', go);
    this.input.once('pointerdown', go);
    // Auto-start fallback so the demo always proceeds.
    this.time.delayedCall(6000, go);
  }

  private makeFighter(x: number, y: number, id: 1 | 2, name: string, color: number): void {
    const s = this.add.sprite(x, y, `p${id}_idle`, 0).setOrigin(0.5);
    s.setScale(260 / s.frame.realHeight);
    if (id === 2) s.setFlipX(true);
    this.tweens.add({ targets: s, y: y - 12, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add
      .text(x, y + 150, name, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: Phaser.Display.Color.IntegerToColor(color).rgba,
        stroke: '#000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.add
      .text(x, y + 182, id === 1 ? 'Player 1' : 'Player 2', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
  }
}
