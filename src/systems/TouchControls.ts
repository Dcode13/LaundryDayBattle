import Phaser from 'phaser';
import { touchState } from './touchState';
import type { PlayerId } from '../types';

// On-screen touch controls for both split-screen players: a floating virtual
// joystick on each outer edge (movement) and GRAB / ACT buttons toward the
// centre. Multitouch-aware: each control claims a pointer id until release.
//
// Coordinates are in the fixed 1280x720 design space; Phaser's Scale Manager
// maps real screen touches into this space, so positions are resolution-agnostic.

interface Stick {
  pid: PlayerId;
  zoneX1: number;
  zoneX2: number;
  radius: number;
  base: Phaser.GameObjects.Arc;
  thumb: Phaser.GameObjects.Arc;
  ptr: number | null;
  ox: number;
  oy: number;
}

interface Button {
  pid: PlayerId;
  kind: 'interact' | 'action';
  x: number;
  y: number;
  r: number;
  color: number;
  g: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  ptr: number | null;
}

const DEPTH = 60;

export class TouchControls {
  private scene: Phaser.Scene;
  private sticks: Stick[] = [];
  private buttons: Button[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const W = scene.scale.width;
    const H = scene.scale.height;

    this.sticks.push(this.makeStick(1, 0, 330, 120, H - 130));
    this.sticks.push(this.makeStick(2, W - 330, W, W - 120, H - 130));

    this.buttons.push(this.makeButton(1, 'action', 545, H - 140, 52, 'ACT', 0xffa53c));
    this.buttons.push(this.makeButton(1, 'interact', 430, H - 92, 44, 'GRAB', 0x4fd1ff));
    this.buttons.push(this.makeButton(2, 'action', W - 545, H - 140, 52, 'ACT', 0xffa53c));
    this.buttons.push(this.makeButton(2, 'interact', W - 430, H - 92, 44, 'GRAB', 0x4fd1ff));

    scene.input.addPointer(4); // enough simultaneous touches for 2 sticks + 2 buttons
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  private makeStick(pid: PlayerId, zx1: number, zx2: number, bx: number, by: number): Stick {
    const radius = 66;
    const base = this.scene.add
      .circle(bx, by, radius, 0xffffff, 0.1)
      .setStrokeStyle(3, 0xffffff, 0.3)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(false);
    const thumb = this.scene.add
      .circle(bx, by, 30, 0xffffff, 0.3)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1)
      .setVisible(false);
    return { pid, zoneX1: zx1, zoneX2: zx2, radius, base, thumb, ptr: null, ox: bx, oy: by };
  }

  private makeButton(
    pid: PlayerId,
    kind: 'interact' | 'action',
    x: number,
    y: number,
    r: number,
    text: string,
    color: number,
  ): Button {
    const g = this.scene.add
      .circle(x, y, r, color, 0.25)
      .setStrokeStyle(3, color, 0.8)
      .setScrollFactor(0)
      .setDepth(DEPTH);
    const label = this.scene.add
      .text(x, y, text, { fontFamily: 'monospace', fontSize: '15px', color: '#ffffff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);
    return { pid, kind, x, y, r, color, g, label, ptr: null };
  }

  private onDown(p: Phaser.Input.Pointer): void {
    // Buttons take priority over the joystick zone.
    for (const b of this.buttons) {
      if (b.ptr === null && Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) <= b.r + 10) {
        b.ptr = p.id;
        const t = touchState[b.pid];
        if (b.kind === 'interact') t.interactQueued = true;
        else {
          t.actionQueued = true;
          t.actionHeld = true;
        }
        b.g.setFillStyle(b.color, 0.55);
        return;
      }
    }
    for (const s of this.sticks) {
      if (s.ptr === null && p.x >= s.zoneX1 && p.x < s.zoneX2) {
        s.ptr = p.id;
        s.ox = p.x;
        s.oy = p.y;
        s.base.setPosition(p.x, p.y).setVisible(true);
        s.thumb.setPosition(p.x, p.y).setVisible(true);
        return;
      }
    }
  }

  private onMove(p: Phaser.Input.Pointer): void {
    for (const s of this.sticks) {
      if (s.ptr !== p.id) continue;
      let dx = p.x - s.ox;
      let dy = p.y - s.oy;
      const len = Math.hypot(dx, dy);
      if (len > s.radius) {
        dx = (dx / len) * s.radius;
        dy = (dy / len) * s.radius;
      }
      s.thumb.setPosition(s.ox + dx, s.oy + dy);
      const t = touchState[s.pid];
      const dead = 8;
      t.moveX = Math.abs(dx) < dead ? 0 : dx / s.radius;
      t.moveY = Math.abs(dy) < dead ? 0 : dy / s.radius;
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    for (const s of this.sticks) {
      if (s.ptr === p.id) {
        s.ptr = null;
        s.base.setVisible(false);
        s.thumb.setVisible(false);
        touchState[s.pid].moveX = 0;
        touchState[s.pid].moveY = 0;
      }
    }
    for (const b of this.buttons) {
      if (b.ptr === p.id) {
        b.ptr = null;
        if (b.kind === 'action') touchState[b.pid].actionHeld = false;
        b.g.setFillStyle(b.color, 0.25);
      }
    }
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
  }
}
