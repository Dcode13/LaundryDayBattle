import Phaser from 'phaser';
import { CFG } from '../config/gameConfig';

export interface DisruptionHooks {
  onWind: () => void;
  onRain: () => void;
  onSock: () => void;
}

/** Owns the timing of wind / rain / runaway-sock events; the scene does the visuals. */
export class DisruptionSystem {
  private hooks: DisruptionHooks;
  private windT = 0;
  private rainT = 0;
  private sockT = 0;
  private enabled = false;

  constructor(_scene: Phaser.Scene, hooks: DisruptionHooks) {
    this.hooks = hooks;
  }

  start(): void {
    this.enabled = true;
    this.windT = Phaser.Math.Between(CFG.WIND_MIN_MS, CFG.WIND_MAX_MS);
    this.rainT = Phaser.Math.Between(CFG.RAIN_MIN_MS, CFG.RAIN_MAX_MS);
    this.sockT = Phaser.Math.Between(CFG.SOCK_MIN_MS, CFG.SOCK_MAX_MS);
  }

  stop(): void {
    this.enabled = false;
  }

  update(dtMs: number, rush: boolean): void {
    if (!this.enabled) return;
    const mult = rush ? CFG.RUSH_SPEEDUP : 1;

    this.windT -= dtMs;
    if (this.windT <= 0) {
      this.hooks.onWind();
      this.windT = Phaser.Math.Between(CFG.WIND_MIN_MS, CFG.WIND_MAX_MS) * mult;
    }

    this.rainT -= dtMs;
    if (this.rainT <= 0) {
      this.hooks.onRain();
      this.rainT = Phaser.Math.Between(CFG.RAIN_MIN_MS, CFG.RAIN_MAX_MS) * mult;
    }

    this.sockT -= dtMs;
    if (this.sockT <= 0) {
      this.hooks.onSock();
      this.sockT = Phaser.Math.Between(CFG.SOCK_MIN_MS, CFG.SOCK_MAX_MS) * mult;
    }
  }

  /** Force the next wind gust very soon (used by the Mischief Wind power-up). */
  triggerWindSoon(): void {
    this.windT = 200;
  }
}
