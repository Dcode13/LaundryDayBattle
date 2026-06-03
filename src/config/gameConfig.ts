import type { ControlMap } from '../types';

// ---- Gameplay tuning (all magic numbers live here) ----
export const CFG = {
  PLAYER_SPEED: 210, // px/s
  WASH_TAPS: 6, // action presses to finish washing
  WASH_HOLD_MS: 1500, // ...or hold the action key this long
  DRY_TIME_MS: 8000, // time to dry on the line
  FOLD_WINDOW: 0.28, // width (0..1) of the fold timing zone
  FOLD_PERFECT: 0.06, // half-width of the "perfect" center zone
  FOLD_CURSOR_SPEED: 1.35, // ping-pong cycles per second
  ROUND_MS: 120000, // one round length
  BEST_OF: 1, // 1 for quick tests; 3 for a full match
  POINTS_FOLD: 10,
  POINTS_PERFECT_BONUS: 5,
  POINTS_SOCK_PAIR_BONUS: 25,
  POINTS_LOST_PENALTY: 0, // set negative to penalise lost items
  DIRTY_MAX: 6, // max dirty items in the shared basket
  DIRTY_RESPAWN_MS: 3000,
  WIND_MIN_MS: 15000,
  WIND_MAX_MS: 25000,
  WIND_FALL_CHANCE: 0.5,
  RAIN_MIN_MS: 30000,
  RAIN_MAX_MS: 45000,
  RAIN_DURATION_MS: 6000,
  SOCK_MIN_MS: 20000,
  SOCK_MAX_MS: 30000,
  RUSH_HOUR_AT_MS: 90000, // when Rush Hour kicks in
  RUSH_SPEEDUP: 0.55, // event-timer multiplier during Rush Hour
  POWERUP_SPAWN_MS: 12000,
  POWERUP_SLOW_MS: 4000,
  POWERUP_SPEED_MS: 5000,
  POWERUP_SPEED_MULT: 1.6,
  POWERUP_SLOW_MULT: 0.45,
} as const;

// ---- World / layout ----
export const WORLD_W = 1600;
export const WORLD_H = 720;
export const VIEW_W = 640;
export const VIEW_H = 720;

export const PLAYER_DISPLAY_H = 112; // on-screen sprite height
export const CLOTHES_DISPLAY = 46; // carried/hung clothes size
export const LINE_SLOTS = 3; // peg slots per clothesline

// Station / spawn positions in world space. P2 side mirrors P1.
export const LAYOUT = {
  p1Spawn: { x: 340, y: 380 },
  p2Spawn: { x: 1260, y: 380 },
  p1: {
    washer: { x: 230, y: 250 },
    line: { x: 235, y: 520 },
    fold: { x: 470, y: 360 },
    score: { x: 110, y: 600 },
  },
  p2: {
    washer: { x: 1370, y: 250 },
    line: { x: 1365, y: 520 },
    fold: { x: 1130, y: 360 },
    score: { x: 1490, y: 600 },
  },
  dirty: { x: 800, y: 360 }, // shared dirty basket in the middle
} as const;

export const CONTROLS: Record<1 | 2, ControlMap> = {
  1: { up: 'W', down: 'S', left: 'A', right: 'D', interact: 'SPACE', action: 'F' },
  2: {
    up: 'UP',
    down: 'DOWN',
    left: 'LEFT',
    right: 'RIGHT',
    interact: 'ENTER',
    action: 'PERIOD',
    actionAlt: 'SHIFT', // Right Shift
  },
};

export const COLORS = {
  p1: 0xff7ab6,
  p2: 0x5ec8ff,
  perfect: 0xffe24a,
  warn: 0xff5a5a,
  good: 0x8be34a,
} as const;
