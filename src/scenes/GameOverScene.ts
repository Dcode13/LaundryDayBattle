import Phaser from 'phaser';
import type { PlayerId } from '../types';

interface GameOverData {
  winner: 0 | PlayerId;
  s1: number;
  s2: number;
  lost1: number;
  lost2: number;
}

const HISCORE_KEY = 'ldb-hiscore';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data: GameOverData): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.add.tileSprite(0, 0, W, H, 'ground').setOrigin(0, 0);
    this.add.rectangle(0, 0, W, H, 0x1a1a2e, 0.6).setOrigin(0, 0);

    const banner = this.add.image(W / 2, H * 0.26, 'banner_win').setOrigin(0.5);
    banner.setScale(Math.min(520 / banner.width, 1));

    const winnerName =
      data.winner === 0 ? "IT'S A TIE!" : data.winner === 1 ? 'PLAYER 1 WINS!' : 'PLAYER 2 WINS!';
    const color = data.winner === 2 ? '#5ec8ff' : data.winner === 1 ? '#ff7ab6' : '#ffffff';
    this.add
      .text(W / 2, H * 0.46, winnerName, {
        fontFamily: 'monospace',
        fontSize: '46px',
        color,
        stroke: '#000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(
        W / 2,
        H * 0.58,
        `Player 1:  ${data.s1} pts  (lost ${data.lost1})\nPlayer 2:  ${data.s2} pts  (lost ${data.lost2})`,
        { fontFamily: 'monospace', fontSize: '22px', color: '#ffffff', align: 'center' },
      )
      .setOrigin(0.5);

    // Persist a best score locally.
    const best = Math.max(data.s1, data.s2);
    const prev = Number(localStorage.getItem(HISCORE_KEY) ?? 0);
    if (best > prev) localStorage.setItem(HISCORE_KEY, String(best));
    this.add
      .text(W / 2, H * 0.68, `Best score: ${Math.max(best, prev)}`, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffd1e8',
      })
      .setOrigin(0.5);

    const retry = this.add.image(W / 2 - 90, H * 0.82, 'buttons', 2).setOrigin(0.5).setInteractive({ useHandCursor: true });
    retry.setScale(96 / retry.frame.realHeight);
    this.add.text(W / 2 - 90, H * 0.82 + 60, 'REMATCH', { fontFamily: 'monospace', fontSize: '16px', color: '#fff' }).setOrigin(0.5);

    const menu = this.add.image(W / 2 + 90, H * 0.82, 'buttons', 0).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menu.setScale(96 / menu.frame.realHeight);
    this.add.text(W / 2 + 90, H * 0.82 + 60, 'MENU', { fontFamily: 'monospace', fontSize: '16px', color: '#fff' }).setOrigin(0.5);

    const rematch = () => {
      this.registry.set('matchRound', 1);
      this.registry.set('matchWins', { 1: 0, 2: 0 });
      this.scene.start('GameScene');
    };
    retry.on('pointerdown', rematch);
    menu.on('pointerdown', () => this.scene.start('MenuScene'));
    this.input.keyboard!.once('keydown-ENTER', rematch);
    this.input.keyboard!.once('keydown-ESC', () => this.scene.start('MenuScene'));
  }
}
