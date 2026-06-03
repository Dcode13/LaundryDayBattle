import Phaser from 'phaser';
import { Station } from './Station';
import { CFG } from '../../config/gameConfig';
import { ItemType } from '../../types';

/** Shared basket of dirty laundry in the middle that both players fight over. */
export class DirtyPile extends Station {
  count: number;
  private decor: Phaser.GameObjects.Sprite[] = [];
  private respawnTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'dirty_pile', { displayH: 150, radius: 96 });
    this.count = CFG.DIRTY_MAX;

    // Decorative dirty clothes peeking out of the basket.
    for (let i = 0; i < CFG.DIRTY_MAX; i++) {
      const angle = (i / CFG.DIRTY_MAX) * Math.PI - Math.PI / 2;
      const sx = x + Math.cos(angle) * 34;
      const sy = y - 34 + Math.sin(angle) * 10;
      const type = i % 6;
      const s = scene.add.sprite(sx, sy, 'clothes_dirty', type).setDepth(y + 4);
      s.setScale(34 / (s.frame.realHeight || s.height));
      this.decor.push(s);
    }
    this.refreshDecor();
  }

  hasItem(): boolean {
    return this.count > 0;
  }

  /** Take one dirty item, returning a random type, or null if empty. */
  take(): ItemType | null {
    if (this.count <= 0) return null;
    this.count--;
    this.refreshDecor();
    return Phaser.Math.Between(0, 5) as ItemType;
  }

  update(dtMs: number, rush: boolean): void {
    if (this.count >= CFG.DIRTY_MAX) return;
    this.respawnTimer += dtMs;
    const period = CFG.DIRTY_RESPAWN_MS * (rush ? CFG.RUSH_SPEEDUP : 1);
    if (this.respawnTimer >= period) {
      this.respawnTimer = 0;
      this.count = Math.min(CFG.DIRTY_MAX, this.count + 1);
      this.refreshDecor();
    }
  }

  private refreshDecor(): void {
    this.decor.forEach((s, i) => s.setVisible(i < this.count));
  }
}
