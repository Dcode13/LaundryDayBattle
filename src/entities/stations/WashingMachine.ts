import Phaser from 'phaser';
import { Station } from './Station';

export class WashingMachine extends Station {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'washer', { frame: 0, displayH: 170, radius: 92 });
  }

  setSpinning(on: boolean): void {
    this.sprite.setFrame(on ? 1 : 0);
  }
}
