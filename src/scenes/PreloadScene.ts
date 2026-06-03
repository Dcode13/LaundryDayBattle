import Phaser from 'phaser';
import { SHEETS, IMAGES, frameSize } from '../config/assetManifest';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.buildLoadingBar();

    for (const [key, def] of Object.entries(SHEETS)) {
      this.load.spritesheet(key, `assets/${def.file}`, frameSize(def));
    }
    for (const [key, file] of Object.entries(IMAGES)) {
      this.load.image(key, `assets/${file}`);
    }
  }

  create(): void {
    this.defineAnimations();
    this.scene.start('MenuScene');
  }

  private defineAnimations(): void {
    const make = (key: string, sheet: string, frames: number[], frameRate: number, repeat = -1) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(sheet, { frames }),
        frameRate,
        repeat,
      });
    };

    for (const p of [1, 2]) {
      make(`walk${p}`, `p${p}_walk`, [0, 1, 2, 3], 9);
      make(`carry${p}`, `p${p}_carry`, [0, 1], 4);
    }
    // Storm cloud loop & washer spin idle.
    make('storm_loop', 'storm', [0, 1], 3);
  }

  private buildLoadingBar(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.add.text(cx, cy - 70, 'LAUNDRY DAY BATTLE', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffd1e8',
    }).setOrigin(0.5);

    const barW = 420;
    const barH = 28;
    const border = this.add.rectangle(cx, cy, barW + 6, barH + 6).setStrokeStyle(2, 0xffffff);
    const bar = this.add.rectangle(cx - barW / 2, cy, 1, barH, 0xff7ab6).setOrigin(0, 0.5);
    const pct = this.add.text(cx, cy + 40, '0%', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.load.on('progress', (p: number) => {
      bar.width = Math.max(1, barW * p);
      pct.setText(`${Math.round(p * 100)}%`);
    });
    this.load.on('complete', () => {
      border.destroy();
      bar.destroy();
      pct.destroy();
    });
  }
}
