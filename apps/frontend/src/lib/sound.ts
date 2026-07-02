'use client';

import { create } from 'zustand';

/**
 * Original WebAudio sound engine (no audio files). Synthesizes short UI SFX and
 * a soft ambient pad. The AudioContext is created lazily on the first user
 * gesture (browser autoplay policy). All state lives in a zustand store so the
 * controls stay in sync. Muted by default until the user enables sound.
 */

export type Sfx =
  | 'click'
  | 'hover'
  | 'coin'
  | 'win'
  | 'jackpot'
  | 'notify'
  | 'lose'
  | 'rocket'
  | 'explosion'
  | 'countdown'
  | 'cashout'
  | 'wheel'
  | 'ball'
  | 'chips'
  | 'diceRoll'
  | 'diceBounce'
  | 'cardFlip'
  | 'reward'
  | 'achievement';

export type Ambience = 'default' | 'casino' | 'crash' | 'sports' | 'arcade' | 'esports';

/** Per-category ambience presets: filter cutoff (Hz), LFO sweep rate, detune. */
const AMBIENCE: Record<Ambience, { cutoff: number; lfo: number; detune: number }> = {
  default: { cutoff: 620, lfo: 0.06, detune: 0 },
  casino: { cutoff: 720, lfo: 0.05, detune: -4 }, // warm, luxurious
  crash: { cutoff: 1500, lfo: 0.13, detune: 8 }, // bright, tense, electric
  sports: { cutoff: 460, lfo: 0.03, detune: -8 }, // low crowd rumble
  arcade: { cutoff: 1150, lfo: 0.1, detune: 4 }, // bright, playful
  esports: { cutoff: 1250, lfo: 0.09, detune: 6 }, // energetic arena
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let currentAmbience: Ambience = 'default';
let ambient: {
  osc: OscillatorNode[];
  lfo: OscillatorNode;
  gain: GainNode;
  filter: BiquadFilterNode;
} | null = null;

function ensureCtx(): boolean {
  if (typeof window === 'undefined') return false;
  if (ctx) return true;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = useSound.getState().muted ? 0 : useSound.getState().volume;
  master.connect(ctx.destination);
  return true;
}

function blip(freq: number, when: number, dur: number, type: OscillatorType, vol: number) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, when);
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g);
  g.connect(master);
  o.start(when);
  o.stop(when + dur + 0.02);
}

/** Short filtered-noise burst — for explosions, wheel spin, dice, shuffles. */
function noise(when: number, dur: number, vol: number, type: BiquadFilterType, freq: number, q = 1) {
  if (!ctx || !master) return;
  const frames = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(when);
  src.stop(when + dur);
}

/** A pitch sweep — rocket thrust, cash-out zip, ball landing. */
function sweep(from: number, to: number, when: number, dur: number, type: OscillatorType, vol: number) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(from, when);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, to), when + dur);
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g);
  g.connect(master);
  o.start(when);
  o.stop(when + dur + 0.02);
}

function render(name: Sfx) {
  if (!ctx) return;
  const t = ctx.currentTime;
  switch (name) {
    case 'hover':
      blip(1200, t, 0.05, 'sine', 0.05);
      break;
    case 'click':
      blip(660, t, 0.07, 'triangle', 0.12);
      blip(990, t + 0.02, 0.06, 'sine', 0.06);
      break;
    case 'coin':
      blip(880, t, 0.08, 'square', 0.09);
      blip(1320, t + 0.06, 0.1, 'square', 0.08);
      break;
    case 'notify':
      blip(784, t, 0.1, 'sine', 0.1);
      blip(1046, t + 0.09, 0.12, 'sine', 0.09);
      break;
    case 'win':
      [523, 659, 784, 1046].forEach((f, i) => blip(f, t + i * 0.08, 0.16, 'triangle', 0.1));
      break;
    case 'jackpot':
      [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => blip(f, t + i * 0.07, 0.22, 'sawtooth', 0.08));
      [1046, 1568].forEach((f, i) => blip(f, t + 0.5 + i * 0.12, 0.4, 'sine', 0.07));
      break;
    case 'lose':
      blip(220, t, 0.18, 'sawtooth', 0.09);
      blip(165, t + 0.12, 0.22, 'sawtooth', 0.08);
      break;
    case 'rocket':
      sweep(120, 900, t, 0.9, 'sawtooth', 0.06);
      noise(t, 0.9, 0.05, 'lowpass', 700);
      break;
    case 'explosion':
      noise(t, 0.5, 0.22, 'lowpass', 900, 0.7);
      blip(90, t, 0.4, 'sawtooth', 0.12);
      break;
    case 'countdown':
      blip(880, t, 0.09, 'square', 0.08);
      break;
    case 'cashout':
      sweep(600, 1600, t, 0.22, 'triangle', 0.1);
      blip(1319, t + 0.18, 0.16, 'sine', 0.08);
      break;
    case 'wheel':
      noise(t, 1.4, 0.05, 'bandpass', 1200, 3);
      break;
    case 'ball':
      for (let i = 0; i < 6; i++) blip(1400 - i * 60, t + i * 0.08, 0.05, 'square', 0.05);
      break;
    case 'chips':
      for (let i = 0; i < 3; i++) noise(t + i * 0.04, 0.05, 0.08, 'highpass', 3000);
      break;
    case 'diceRoll':
      noise(t, 0.35, 0.12, 'bandpass', 900, 2);
      break;
    case 'diceBounce':
      blip(500, t, 0.06, 'square', 0.08);
      blip(360, t + 0.08, 0.06, 'square', 0.06);
      break;
    case 'cardFlip':
      noise(t, 0.09, 0.1, 'highpass', 2500);
      break;
    case 'reward':
      [659, 880, 1174].forEach((f, i) => blip(f, t + i * 0.06, 0.14, 'sine', 0.09));
      break;
    case 'achievement':
      [784, 988, 1319, 1568].forEach((f, i) => blip(f, t + i * 0.09, 0.2, 'triangle', 0.09));
      break;
  }
}

export const sound = {
  /** Call from a user gesture to unlock audio, then play an SFX. */
  play(name: Sfx) {
    const st = useSound.getState();
    if (st.muted) return;
    if (!ensureCtx()) return;
    if (ctx && ctx.state === 'suspended') void ctx.resume();
    render(name);
  },
  startAmbient() {
    if (!ensureCtx() || !ctx || !master || ambient) return;
    const preset = AMBIENCE[currentAmbience];
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = preset.cutoff;
    filter.Q.value = 5;
    const aGain = ctx.createGain();
    aGain.gain.value = 0.5;
    filter.connect(aGain);
    aGain.connect(master);
    const osc = [110, 164.81, 220, 277.18].map((f, i) => {
      const o = ctx!.createOscillator();
      o.type = i % 2 === 0 ? 'sine' : 'triangle';
      o.frequency.value = f;
      o.detune.value = (i - 1.5) * 6 + preset.detune;
      const g = ctx!.createGain();
      g.gain.value = 0.05;
      o.connect(g);
      g.connect(filter);
      o.start();
      return o;
    });
    const lfo = ctx.createOscillator();
    lfo.frequency.value = preset.lfo;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    ambient = { osc, lfo, gain: aGain, filter };
  },
  /** Smoothly morph the running pad to a category ambience (no restart click). */
  setAmbience(a: Ambience) {
    currentAmbience = a;
    if (!ambient || !ctx) return;
    const preset = AMBIENCE[a];
    ambient.filter.frequency.setTargetAtTime(preset.cutoff, ctx.currentTime, 0.6);
    ambient.lfo.frequency.setTargetAtTime(preset.lfo, ctx.currentTime, 0.6);
    ambient.osc.forEach((o, i) => o.detune.setTargetAtTime((i - 1.5) * 6 + preset.detune, ctx!.currentTime, 0.6));
  },
  stopAmbient() {
    if (!ambient) return;
    ambient.osc.forEach((o) => o.stop());
    ambient.lfo.stop();
    ambient = null;
  },
  applyVolume() {
    if (!master || !ctx) return;
    const st = useSound.getState();
    master.gain.setTargetAtTime(st.muted ? 0 : st.volume, ctx.currentTime, 0.05);
  },
};

interface SoundState {
  muted: boolean;
  volume: number;
  ambientOn: boolean;
  toggleMute: () => void;
  setVolume: (v: number) => void;
  toggleAmbient: () => void;
}

export const useSound = create<SoundState>((set, get) => ({
  muted: true,
  volume: 0.6,
  ambientOn: false,
  toggleMute: () => {
    const muted = !get().muted;
    set({ muted });
    if (muted) sound.stopAmbient();
    else if (get().ambientOn) sound.startAmbient();
    sound.applyVolume();
  },
  setVolume: (v) => {
    set({ volume: v });
    sound.applyVolume();
  },
  toggleAmbient: () => {
    const ambientOn = !get().ambientOn;
    set({ ambientOn, muted: ambientOn ? false : get().muted });
    if (ambientOn) sound.startAmbient();
    else sound.stopAmbient();
    sound.applyVolume();
  },
}));
