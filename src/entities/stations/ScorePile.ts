import Phaser from 'phaser';
import { Station } from './Station';

/** A pile of folded laundry that visibly grows as a player scores. */
export class ScorePile extends Station {
  private folded = 0;
  private baseH = 70;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'score_pile', { displayH: 70, radius: 60 });
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setPosition(x, y + this.sprite.displayHeight / 2);
  }

  addFolded(n = 1): void {
    this.folded += n;
    const targetH = Math.min(this.baseH + this.folded * 6, 150);
    const scale = targetH / (this.sprite.frame.realHeight || this.sprite.height);
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: scale,
      scaleY: scale,
      duration: 200,
      ease: 'Back.out',
    });
  }
}
