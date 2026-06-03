// Shared touch-input intent, written by TouchControls (in the UIScene) and read
// by InputManager (in the GameScene). Edge flags (interact/action "queued") are
// consumed once by getIntent each frame, giving just-pressed semantics.
import type { PlayerId } from '../types';

export interface TouchPlayerState {
  moveX: number;
  moveY: number;
  interactQueued: boolean;
  actionQueued: boolean;
  actionHeld: boolean;
}

function blank(): TouchPlayerState {
  return { moveX: 0, moveY: 0, interactQueued: false, actionQueued: false, actionHeld: false };
}

export const touchState: Record<PlayerId, TouchPlayerState> = { 1: blank(), 2: blank() };

export function resetTouchState(): void {
  Object.assign(touchState[1], blank());
  Object.assign(touchState[2], blank());
}

/** True if the current device exposes touch input (or ?touch=1 forces it on). */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).has('touch')) return true;
  return (
    'ontouchstart' in window ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
  );
}
