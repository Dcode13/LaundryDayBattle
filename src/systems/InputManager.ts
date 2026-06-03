import Phaser from 'phaser';
import { CONTROLS } from '../config/gameConfig';
import type { ControlMap, PlayerId } from '../types';
import { touchState } from './touchState';

export interface PlayerIntent {
  moveX: number; // -1..1
  moveY: number; // -1..1
  interactPressed: boolean; // just-down this frame
  actionPressed: boolean; // just-down this frame
  actionHeld: boolean; // currently down
}

interface KeySet {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  interact: Phaser.Input.Keyboard.Key;
  action: Phaser.Input.Keyboard.Key;
  actionAlt?: Phaser.Input.Keyboard.Key;
}

/** Maps the keyboard to per-player movement & button intents. */
export class InputManager {
  private keys: Record<PlayerId, KeySet>;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    // Stop the page from scrolling on arrows / space.
    kb.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);

    this.keys = {
      1: this.build(kb, CONTROLS[1]),
      2: this.build(kb, CONTROLS[2]),
    };
  }

  private build(kb: Phaser.Input.Keyboard.KeyboardPlugin, map: ControlMap): KeySet {
    const k = (name: string) => kb.addKey(name, true, true);
    return {
      up: k(map.up),
      down: k(map.down),
      left: k(map.left),
      right: k(map.right),
      interact: k(map.interact),
      action: k(map.action),
      actionAlt: map.actionAlt ? k(map.actionAlt) : undefined,
    };
  }

  getIntent(id: PlayerId): PlayerIntent {
    const ks = this.keys[id];
    let moveX = 0;
    let moveY = 0;
    if (ks.left.isDown) moveX -= 1;
    if (ks.right.isDown) moveX += 1;
    if (ks.up.isDown) moveY -= 1;
    if (ks.down.isDown) moveY += 1;

    let actionPressed =
      Phaser.Input.Keyboard.JustDown(ks.action) ||
      (ks.actionAlt ? Phaser.Input.Keyboard.JustDown(ks.actionAlt) : false);
    let actionHeld = ks.action.isDown || (ks.actionAlt?.isDown ?? false);
    let interactPressed = Phaser.Input.Keyboard.JustDown(ks.interact);

    // Merge on-screen touch controls; edge flags are consumed here.
    const t = touchState[id];
    if (moveX === 0 && moveY === 0) {
      moveX = t.moveX;
      moveY = t.moveY;
    }
    if (t.interactQueued) {
      interactPressed = true;
      t.interactQueued = false;
    }
    if (t.actionQueued) {
      actionPressed = true;
      t.actionQueued = false;
    }
    if (t.actionHeld) actionHeld = true;

    return { moveX, moveY, interactPressed, actionPressed, actionHeld };
  }
}
