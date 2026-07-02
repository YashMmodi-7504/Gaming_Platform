import type { AnimationScheduler } from '../types';

/** Default scheduler — a ~60fps timer loop usable on the server and in tests. */
export class TimerAnimationScheduler implements AnimationScheduler {
  request(callback: (time: number) => void): number {
    return setTimeout(() => callback(Date.now()), 16) as unknown as number;
  }
  cancel(handle: number): void {
    clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
  }
  now(): number {
    return Date.now();
  }
}

export type Easing = (t: number) => number;

export const easings = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
} satisfies Record<string, Easing>;

/**
 * Drives the per-frame update loop and provides tween helpers. The browser
 * harness injects a requestAnimationFrame-based scheduler; the default uses a
 * timer so the engine logic is testable headlessly.
 */
export class GameAnimationManager {
  private handle: number | null = null;
  private lastTime = 0;
  private running = false;
  private loopCallback: ((deltaMs: number) => void) | null = null;

  constructor(private readonly scheduler: AnimationScheduler = new TimerAnimationScheduler()) {}

  start(onFrame: (deltaMs: number) => void): void {
    if (this.running) return;
    this.running = true;
    this.loopCallback = onFrame;
    this.lastTime = this.scheduler.now();
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.handle !== null) {
      this.scheduler.cancel(this.handle);
      this.handle = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  /** Animate a numeric value over `durationMs`, resolving when complete. */
  tween(options: {
    from: number;
    to: number;
    durationMs: number;
    onUpdate: (value: number) => void;
    easing?: Easing;
  }): Promise<void> {
    const { from, to, durationMs, onUpdate, easing = easings.linear } = options;
    const start = this.scheduler.now();
    return new Promise((resolve) => {
      const step = () => {
        const elapsed = this.scheduler.now() - start;
        const t = durationMs <= 0 ? 1 : Math.min(1, elapsed / durationMs);
        onUpdate(from + (to - from) * easing(t));
        if (t >= 1) {
          resolve();
          return;
        }
        this.scheduler.request(step);
      };
      step();
    });
  }

  private tick(): void {
    if (!this.running) return;
    this.handle = this.scheduler.request((time) => {
      const delta = time - this.lastTime;
      this.lastTime = time;
      this.loopCallback?.(delta);
      this.tick();
    });
  }
}
