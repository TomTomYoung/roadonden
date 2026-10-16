import { requireThat } from './validation.ts';

/** Rendering rate is not simulation time. Visibility/pause changes discard wall-time remainder. */
export class FixedClock {
  private remainderMs = 0;
  private paused = true;
  setPaused(paused: boolean): void { this.paused = paused; this.remainderMs = 0; }
  advance(milliseconds: number, tick: () => void): number {
    requireThat(Number.isFinite(milliseconds) && milliseconds >= 0, '経過時間が不正です');
    if (this.paused) return 0;
    this.remainderMs += milliseconds;
    const steps = Math.floor((this.remainderMs + 1e-8) / 100);
    this.remainderMs = Math.max(0, this.remainderMs - steps * 100);
    for (let i = 0; i < steps; i++) tick();
    return steps;
  }
}
