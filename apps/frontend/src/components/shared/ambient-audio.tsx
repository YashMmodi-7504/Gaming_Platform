'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * Optional ambient sound — a soft, original synthesized pad (WebAudio, no audio
 * files shipped). Muted by default; created lazily on first enable (a user
 * gesture, as browsers require). A gentle LFO sweeps a low-pass filter so the
 * drone breathes like distant casino/city ambience.
 */
export function AmbientAudio() {
  const [on, setOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const nodesRef = useRef<{ osc: OscillatorNode[]; lfo: OscillatorNode } | null>(null);

  const start = () => {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    filter.Q.value = 6;
    filter.connect(master);
    master.connect(ctx.destination);

    // soft detuned chord
    const freqs = [110, 164.81, 220, 277.18];
    const osc = freqs.map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 === 0 ? 'sine' : 'triangle';
      o.frequency.value = f;
      o.detune.value = (i - 1.5) * 6;
      const g = ctx.createGain();
      g.gain.value = 0.18 / freqs.length;
      o.connect(g);
      g.connect(filter);
      o.start();
      return o;
    });

    // LFO sweeping the filter for movement
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 320;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    master.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 2);

    ctxRef.current = ctx;
    masterRef.current = master;
    nodesRef.current = { osc, lfo };
  };

  const stop = () => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
    window.setTimeout(() => {
      nodesRef.current?.osc.forEach((o) => o.stop());
      nodesRef.current?.lfo.stop();
      void ctx.close();
      ctxRef.current = null;
      masterRef.current = null;
      nodesRef.current = null;
    }, 700);
  };

  const toggle = () => {
    if (on) stop();
    else start();
    setOn((v) => !v);
  };

  useEffect(() => () => stop(), []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={on ? 'Mute ambient sound' : 'Play ambient sound'}
      title={on ? 'Mute ambient' : 'Ambient sound'}
      className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/80 text-foreground shadow-soft backdrop-blur transition-all hover:-translate-y-0.5 hover:text-primary hover:shadow-glow-sm"
    >
      {on ? <Volume2 className="h-5 w-5 text-primary" /> : <VolumeX className="h-5 w-5" />}
      {on ? (
        <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/20" />
      ) : null}
    </button>
  );
}
