import Phaser from 'phaser';
import { WORLD_H } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { GameOverScene } from './scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 1280,
  height: WORLD_H,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#87CEEB',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    expandParent: true,
  },
  input: {
    activePointers: 5, // 2 joysticks + 2 buttons (+ spare) for two-player touch
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false, gravity: { x: 0, y: 0 } },
  },
  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    CharacterSelectScene,
    GameScene,
    UIScene,
    GameOverScene,
  ],
};

const game = new Phaser.Game(config);

// Dev-only hook so automated smoke tests can inspect game state.
if (import.meta.env.DEV) {
  (window as unknown as { LDB: Phaser.Game }).LDB = game;
}
