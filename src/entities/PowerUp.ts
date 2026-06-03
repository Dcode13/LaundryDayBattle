import Phaser from 'phaser';
import { PowerUpType } from '../types';

const FRAME: Record<PowerUpType, number> = {
  [PowerUpType.SOAP_BOMB]: 0,
  [PowerUpType.MISCHIEF_WIND]: 1,
  [PowerUpType.SOCK_SNATCH]: 2,
  [PowerUpType.SPEEDY_SPIN]: 3,
};

/** A pickup floating in the world (M5). */
export class PowerUp {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly type: PowerUpType;

  constructor(scene: Phaser.Scene, type: PowerUpType, x: number, y: number) {
    this.type = type;
    this.sprite = scene.add.sprite(x, y, 'pu_icons', FRAME[type]);
    this.sprite.setScale(54 / (this.sprite.frame.realHeight || this.sprite.height));
    this.sprite.setDepth(y);
    scene.tweens.add({
      targets: this.sprite,
      y: y - 8,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
