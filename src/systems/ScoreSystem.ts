import Phaser from 'phaser';
import { CFG } from '../config/gameConfig';
import { EV, type PlayerId } from '../types';
import type { Player } from '../entities/Player';

/** Tracks points and decides round / match winners. */
export class ScoreSystem {
  private scene: Phaser.Scene;
  readonly players: Record<PlayerId, Player>;
  roundWins: Record<PlayerId, number> = { 1: 0, 2: 0 };
  round = 1;

  constructor(scene: Phaser.Scene, p1: Player, p2: Player) {
    this.scene = scene;
    this.players = { 1: p1, 2: p2 };
    // Restore match progress across round restarts (best-of-N).
    this.round = scene.registry.get('matchRound') ?? 1;
    const wins = scene.registry.get('matchWins') as Record<PlayerId, number> | undefined;
    if (wins) this.roundWins = { 1: wins[1], 2: wins[2] };
  }

  persist(): void {
    this.scene.registry.set('matchRound', this.round);
    this.scene.registry.set('matchWins', { 1: this.roundWins[1], 2: this.roundWins[2] });
  }

  award(id: PlayerId, points: number, reason?: string): void {
    const p = this.players[id];
    p.score += points;
    this.scene.registry.set(`score${id}`, p.score);
    if (reason) {
      this.scene.events.emit(EV.TOAST, { id, text: reason, color: points >= 0 ? 0x8be34a : 0xff5a5a });
    }
  }

  recordLost(id: PlayerId): void {
    const p = this.players[id];
    p.lostItems++;
    if (CFG.POINTS_LOST_PENALTY !== 0) this.award(id, CFG.POINTS_LOST_PENALTY);
  }

  /** Winner of the current round: by score, tie-broken by fewer lost items. 0 = tie. */
  roundWinner(): 0 | PlayerId {
    const a = this.players[1];
    const b = this.players[2];
    if (a.score !== b.score) return a.score > b.score ? 1 : 2;
    if (a.lostItems !== b.lostItems) return a.lostItems < b.lostItems ? 1 : 2;
    return 0;
  }

  /** id of the match winner once someone has clinched best-of-N, else null. */
  matchWinner(): PlayerId | null {
    const needed = Math.floor(CFG.BEST_OF / 2) + 1;
    if (this.roundWins[1] >= needed) return 1;
    if (this.roundWins[2] >= needed) return 2;
    return null;
  }
}
