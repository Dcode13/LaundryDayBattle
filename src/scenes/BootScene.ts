import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    // Crisp pixel scaling.
    this.cameras.main.setBackgroundColor('#1a1a2e');
    this.scene.start('PreloadScene');
  }
}
