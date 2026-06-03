import Phaser from 'phaser';

/** Base for a fixed interaction point in the world. */
export class Station {
  readonly scene: Phaser.Scene;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly x: number;
  readonly y: number;
  radius: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    opts: { frame?: number; displayH?: number; radius?: number; depthBias?: number } = {},
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.radius = opts.radius ?? 80;
    this.sprite = scene.add.sprite(x, y, texture, opts.frame ?? 0);
    if (opts.displayH) {
      const fh = this.sprite.frame.realHeight || this.sprite.height;
      this.sprite.setScale(opts.displayH / fh);
    }
    this.sprite.setDepth(y + (opts.depthBias ?? 0));
  }

  isNear(px: number, py: number): boolean {
    return Phaser.Math.Distance.Between(px, py, this.x, this.y) <= this.radius;
  }
}
