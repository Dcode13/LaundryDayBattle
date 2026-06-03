import Phaser from 'phaser';
import { PlayerState, type PlayerId } from '../types';
import { CFG, PLAYER_DISPLAY_H } from '../config/gameConfig';
import type { PlayerIntent } from '../systems/InputManager';
import type { ClothesItem } from './ClothesItem';

const BODY_W = 78;
const BODY_H = 60;
const FOOT_MARGIN = 18;

/** Transient mini-game state while WASHING or FOLDING. */
export interface MiniGame {
  item: ClothesItem;
  taps: number;
  holdMs: number;
  cursor: number; // 0..1 (fold)
  dir: number; // +1 / -1 (fold)
}

export class Player {
  readonly id: PlayerId;
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  state: PlayerState = PlayerState.FREE;
  held: ClothesItem | null = null;
  mini: MiniGame | null = null;

  // Stats.
  score = 0;
  lostItems = 0;
  foldedCount = 0;
  pendingSock: ClothesItem | null = null; // a folded single sock waiting for a pair

  // Power-up modifiers.
  speedMult = 1;
  private baseScale: number;
  private facing = -1; // art faces left by default

  constructor(scene: Phaser.Scene, id: PlayerId, x: number, y: number) {
    this.id = id;
    this.sprite = scene.physics.add.sprite(x, y, `p${id}_idle`, 0);
    const fh = this.sprite.frame.realHeight || this.sprite.height;
    this.baseScale = PLAYER_DISPLAY_H / fh;
    this.sprite.setScale(this.baseScale);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(y);
    this.refreshBody();
    this.sprite.setData('player', this);
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }

  get locked(): boolean {
    return this.state === PlayerState.WASHING || this.state === PlayerState.FOLDING;
  }

  setHeld(item: ClothesItem | null): void {
    this.held = item;
    if (item) {
      item.owner = this.id;
      item.onLine = false;
      item.fallen = false;
      item.sprite.setDepth(this.sprite.depth + 1);
      this.state = PlayerState.CARRYING;
    } else if (this.state === PlayerState.CARRYING) {
      this.state = PlayerState.FREE;
    }
  }

  update(_dt: number, intent: PlayerIntent): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;

    if (this.locked) {
      body.setVelocity(0, 0);
      this.playIdle();
    } else {
      let { moveX, moveY } = intent;
      const len = Math.hypot(moveX, moveY);
      if (len > 0) {
        moveX /= len;
        moveY /= len;
      }
      const speed = CFG.PLAYER_SPEED * this.speedMult;
      body.setVelocity(moveX * speed, moveY * speed);

      if (len > 0) {
        if (moveX < -0.1) this.facing = -1;
        else if (moveX > 0.1) this.facing = 1;
        this.playWalk();
      } else {
        this.playIdle();
      }
    }

    this.sprite.setFlipX(this.facing === 1); // art faces left, flip to face right
    this.sprite.setDepth(this.sprite.y);
    this.refreshBody();
    this.positionHeld();
  }

  private playWalk(): void {
    const key = this.held ? `carry${this.id}` : `walk${this.id}`;
    if (this.sprite.anims.currentAnim?.key !== key || !this.sprite.anims.isPlaying) {
      this.sprite.play(key, true);
    }
  }

  private playIdle(): void {
    this.sprite.anims.stop();
    if (this.held) {
      this.sprite.setTexture(`p${this.id}_carry`, 0);
    } else {
      this.sprite.setTexture(`p${this.id}_idle`, 0);
    }
  }

  private positionHeld(): void {
    if (!this.held) return;
    const dir = this.facing;
    this.held.sprite.setPosition(this.x + dir * 12, this.y - PLAYER_DISPLAY_H * 0.12);
    this.held.sprite.setDepth(this.sprite.depth + 1);
  }

  /** Keep the physics body centred at the feet as the frame size changes. */
  private refreshBody(): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    const fw = this.sprite.frame.realWidth;
    const fh = this.sprite.frame.realHeight;
    body.setSize(BODY_W, BODY_H);
    body.setOffset((fw - BODY_W) / 2, fh - BODY_H - FOOT_MARGIN);
  }
}
