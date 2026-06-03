import Phaser from 'phaser';
import { Station } from './Station';
import { ClothesState } from '../../types';
import { CFG, LINE_SLOTS } from '../../config/gameConfig';
import type { ClothesItem } from '../ClothesItem';

interface Slot {
  x: number;
  y: number;
  item: ClothesItem | null;
}

export class Clothesline extends Station {
  private slots: Slot[] = [];
  private pegs: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'line_empty', { displayH: 96, radius: 104, depthBias: -200 });

    const span = this.sprite.displayWidth * 0.8;
    const top = y - this.sprite.displayHeight * 0.18;
    for (let i = 0; i < LINE_SLOTS; i++) {
      const sx = x - span / 2 + (span / (LINE_SLOTS - 1)) * i;
      this.slots.push({ x: sx, y: top, item: null });
      const peg = scene.add.image(sx, top - 12, 'peg').setDepth(y + 5);
      peg.setScale(22 / (peg.frame.realHeight || peg.height));
      this.pegs.push(peg);
    }
  }

  emptySlotIndex(): number {
    return this.slots.findIndex((s) => s.item === null);
  }

  hang(item: ClothesItem, slotIndex: number): void {
    const slot = this.slots[slotIndex];
    slot.item = item;
    item.onLine = true;
    item.fallen = false;
    item.slotIndex = slotIndex;
    item.dryProgress = 0;
    item.setState(ClothesState.WET);
    item.setPosition(slot.x, slot.y);
    item.sprite.setDepth(this.sprite.depth + 50);
  }

  /** The first fully-dried item ready to be collected, if any. */
  readyItem(): ClothesItem | null {
    const slot = this.slots.find((s) => s.item && s.item.state === ClothesState.DRY);
    return slot ? slot.item : null;
  }

  remove(item: ClothesItem): void {
    const slot = this.slots.find((s) => s.item === item);
    if (slot) slot.item = null;
    item.onLine = false;
    item.slotIndex = -1;
  }

  /** Advance drying. Calls onDried(item) when an item finishes. */
  update(dtMs: number, onDried: (item: ClothesItem) => void): void {
    for (const slot of this.slots) {
      const it = slot.item;
      if (!it || it.state !== ClothesState.WET) continue;
      it.dryProgress = Math.min(1, it.dryProgress + dtMs / CFG.DRY_TIME_MS);
      if (it.dryProgress >= 1) {
        it.setState(ClothesState.DRY);
        onDried(it);
      }
    }
  }

  /** Rain re-wets everything currently hung. */
  rainWet(): ClothesItem[] {
    const affected: ClothesItem[] = [];
    for (const slot of this.slots) {
      const it = slot.item;
      if (it && (it.state === ClothesState.DRY || it.state === ClothesState.WET)) {
        const wasDry = it.state === ClothesState.DRY;
        it.setState(ClothesState.WET);
        it.dryProgress = 0;
        if (wasDry) affected.push(it);
      }
    }
    return affected;
  }

  /** Wind: each hung item has `chance` to fall off. Returns the fallen items. */
  windKnockoff(chance: number): ClothesItem[] {
    const fallen: ClothesItem[] = [];
    for (const slot of this.slots) {
      const it = slot.item;
      if (it && Math.random() < chance) {
        slot.item = null;
        it.onLine = false;
        it.slotIndex = -1;
        fallen.push(it);
      }
    }
    return fallen;
  }

  hungItems(): ClothesItem[] {
    return this.slots.filter((s) => s.item).map((s) => s.item!) as ClothesItem[];
  }
}
