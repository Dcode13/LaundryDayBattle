import Phaser from 'phaser';
import { ClothesState, ItemType, type PlayerId } from '../types';
import { CLOTHES_DISPLAY } from '../config/gameConfig';

const STATE_SHEET: Record<ClothesState, string> = {
  [ClothesState.DIRTY]: 'clothes_dirty',
  [ClothesState.WET]: 'clothes_wet',
  [ClothesState.DRY]: 'clothes_wet', // DRY reuses the WET art (distinguished by sparkle + meter)
  [ClothesState.FOLDED]: 'clothes_folded',
};

/** A single piece of laundry moving through DIRTY -> WET -> DRY -> FOLDED. */
export class ClothesItem {
  readonly sprite: Phaser.GameObjects.Sprite;
  type: ItemType;
  state: ClothesState;
  owner: PlayerId | null = null;

  // Clothesline bookkeeping.
  onLine = false;
  dryProgress = 0; // 0..1
  slotIndex = -1;

  // Ground / weather bookkeeping.
  fallen = false;

  // Sock pairing.
  isPair = false;

  constructor(scene: Phaser.Scene, type: ItemType, state: ClothesState, x: number, y: number) {
    this.type = type;
    this.state = state;
    this.sprite = scene.add.sprite(x, y, STATE_SHEET[state], type);
    this.applyTexture();
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }

  setPosition(x: number, y: number): this {
    this.sprite.setPosition(x, y);
    return this;
  }

  setState(state: ClothesState): void {
    this.state = state;
    if (state !== ClothesState.DRY) this.dryProgress = 0;
    this.applyTexture();
  }

  /** Mark a folded sock as a completed pair (uses the pair sprite). */
  markPair(): void {
    this.isPair = true;
    this.applyTexture();
  }

  private applyTexture(): void {
    if (this.isPair && this.type === ItemType.SOCK) {
      this.sprite.setTexture('socks', 1);
    } else {
      this.sprite.setTexture(STATE_SHEET[this.state], this.type);
    }
    const fh = this.sprite.frame.realHeight || this.sprite.height;
    this.sprite.setScale(CLOTHES_DISPLAY / fh);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
