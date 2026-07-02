type TimeoutHandle = ReturnType<typeof setTimeout>;
type IntervalHandle = ReturnType<typeof setInterval>;

/**
 * Tracks every timer the game schedules so they can be cleared deterministically
 * on pause / stop / destroy — preventing leaks and orphaned callbacks.
 */
export class GameTimerManager {
  private readonly timeouts = new Set<TimeoutHandle>();
  private readonly intervals = new Set<IntervalHandle>();

  setTimeout(callback: () => void, ms: number): TimeoutHandle {
    const handle = setTimeout(() => {
      this.timeouts.delete(handle);
      callback();
    }, ms);
    this.timeouts.add(handle);
    return handle;
  }

  setInterval(callback: () => void, ms: number): IntervalHandle {
    const handle = setInterval(callback, ms);
    this.intervals.add(handle);
    return handle;
  }

  clearTimeout(handle: TimeoutHandle): void {
    clearTimeout(handle);
    this.timeouts.delete(handle);
  }

  clearInterval(handle: IntervalHandle): void {
    clearInterval(handle);
    this.intervals.delete(handle);
  }

  /** Promise that resolves after `ms`, cancellable via the manager. */
  delay(ms: number): Promise<void> {
    return new Promise((resolve) => this.setTimeout(resolve, ms));
  }

  clearAll(): void {
    for (const handle of this.timeouts) clearTimeout(handle);
    for (const handle of this.intervals) clearInterval(handle);
    this.timeouts.clear();
    this.intervals.clear();
  }

  get activeCount(): number {
    return this.timeouts.size + this.intervals.size;
  }
}
