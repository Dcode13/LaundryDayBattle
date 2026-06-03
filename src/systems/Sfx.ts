// Tiny asset-free sound system using the WebAudio API (short synthesised blips).
// Kept defensive so it silently no-ops if audio is unavailable.
export class Sfx {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private ensure(): void {
    if (!this.enabled) return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        this.enabled = false;
        return;
      }
      try {
        this.ctx = new Ctor();
      } catch {
        this.enabled = false;
      }
    }
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  private tone(freq: number, dur = 0.08, type: OscillatorType = 'square', gain = 0.07, when = 0): void {
    this.ensure();
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g).connect(this.ctx.destination);
    const t = this.ctx.currentTime + when;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur);
  }

  pickup(): void {
    this.tone(440, 0.06, 'sine');
  }
  washTap(): void {
    this.tone(280, 0.04, 'sine', 0.05);
  }
  done(): void {
    this.tone(620, 0.1, 'square');
  }
  hang(): void {
    this.tone(360, 0.06, 'triangle');
  }
  score(): void {
    this.tone(740, 0.1, 'triangle');
    this.tone(990, 0.12, 'triangle', 0.06, 0.08);
  }
  perfect(): void {
    this.tone(880, 0.1, 'triangle');
    this.tone(1320, 0.14, 'triangle', 0.06, 0.09);
  }
  pair(): void {
    this.tone(660, 0.09, 'square');
    this.tone(880, 0.12, 'square', 0.06, 0.09);
  }
  miss(): void {
    this.tone(170, 0.12, 'sawtooth', 0.06);
  }
  powerup(): void {
    this.tone(520, 0.07, 'square');
    this.tone(780, 0.09, 'square', 0.06, 0.07);
  }
  wind(): void {
    this.tone(220, 0.3, 'sawtooth', 0.04);
  }
  thunder(): void {
    this.tone(70, 0.45, 'sawtooth', 0.12);
  }
}
