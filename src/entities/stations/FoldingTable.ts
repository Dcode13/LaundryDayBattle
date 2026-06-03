import Phaser from 'phaser';
import { Station } from './Station';

export class FoldingTable extends Station {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'fold_table', { displayH: 96, radius: 92 });
  }
}
