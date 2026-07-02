import type { AudioDriver } from '../types';

/** No-op audio driver — the default on the server and in tests. */
export class NoopAudioDriver implements AudioDriver {
  load(): Promise<void> {
    return Promise.resolve();
  }
  play(): void {}
  stop(): void {}
  stopAll(): void {}
  setMasterVolume(): void {}
  setMuted(): void {}
  dispose(): void {}
}

/**
 * Game audio facade. Delegates to an injectable driver (the browser harness
 * provides a Web Audio / HTMLAudio driver) and tracks master volume / mute
 * state so the UI controls stay in sync.
 */
export class GameAudioManager {
  private masterVolume = 1;
  private muted = false;

  constructor(private readonly driver: AudioDriver = new NoopAudioDriver()) {}

  load(id: string, url: string): Promise<void> {
    return this.driver.load(id, url);
  }

  play(id: string, options?: { loop?: boolean; volume?: number }): void {
    if (this.muted) return;
    this.driver.play(id, options);
  }

  stop(id: string): void {
    this.driver.stop(id);
  }

  stopAll(): void {
    this.driver.stopAll();
  }

  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.driver.setMasterVolume(this.masterVolume);
  }

  getVolume(): number {
    return this.masterVolume;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.driver.setMuted(muted);
    if (muted) this.driver.stopAll();
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  dispose(): void {
    this.driver.dispose();
  }
}
