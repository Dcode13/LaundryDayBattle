// Shared enums & interfaces for Laundry Day Battle.

export enum ClothesState {
  DIRTY,
  WET,
  DRY,
  FOLDED,
}

// Frame order matches the B1/B2/B3 sheets (row-major 3x2):
// 0 shirt, 1 jeans, 2 towel, 3 sock, 4 hoodie, 5 dress.
export enum ItemType {
  SHIRT,
  JEANS,
  TOWEL,
  SOCK,
  HOODIE,
  DRESS,
}

export enum PlayerState {
  FREE,
  CARRYING,
  WASHING,
  FOLDING,
}

export enum Weather {
  SUNNY,
  OVERCAST,
  STORM,
}

export type PlayerId = 1 | 2;

export enum PowerUpType {
  SOAP_BOMB, // slow the opponent
  MISCHIEF_WIND, // trigger a gust on the opponent's clothesline
  SOCK_SNATCH, // steal one folded item from the opponent
  SPEEDY_SPIN, // temporary self speed boost
}

export interface ControlMap {
  up: string;
  down: string;
  left: string;
  right: string;
  interact: string;
  action: string;
  actionAlt?: string;
}

// Registry / event keys used to talk between GameScene and UIScene.
export const EV = {
  SCORE: 'score-changed', // { id, score }
  HELD: 'held-changed', // { id, type | null, state | null }
  TIMER: 'timer-changed', // { msLeft }
  ROUND: 'round-changed', // { round, bestOf }
  WEATHER: 'weather-changed', // { weather }
  COUNTDOWN: 'countdown', // { text } | { done: true }
  RUSH: 'rush-hour', // {}
  POWERUP: 'powerup-changed', // { id, type | null }
  GAME_OVER: 'game-over', // { winner, s1, s2, lost1, lost2 }
  TOAST: 'toast', // { id, text, color }
} as const;
