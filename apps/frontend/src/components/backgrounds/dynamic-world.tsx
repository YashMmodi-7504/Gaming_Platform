'use client';

import { useEffect, useState } from 'react';

/**
 * Dynamic World — a living-atmosphere layer over the themed route background.
 * Applies a time-of-day tint (from the real clock) and cycles ambient weather
 * (clear → rain → snow → fog → festival) every ~45s so the world never feels
 * static. Light-first: even "night" stays soft, never dark. Pure CSS transforms,
 * reduced-motion aware, mounted-gated to avoid hydration mismatch.
 */
type Phase = 'morning' | 'afternoon' | 'evening' | 'night';
type Weather = 'clear' | 'rain' | 'snow' | 'fog' | 'festival' | 'fireworks';

const PHASE_TINT: Record<Phase, string> = {
  morning: 'radial-gradient(120% 80% at 50% 0%, hsl(38 95% 80% / 0.20), transparent 60%)',
  afternoon: 'radial-gradient(120% 80% at 50% 0%, hsl(200 95% 82% / 0.16), transparent 60%)',
  evening: 'radial-gradient(120% 80% at 50% 0%, hsl(326 90% 82% / 0.20), transparent 60%)',
  night: 'radial-gradient(120% 80% at 50% 0%, hsl(258 80% 78% / 0.22), transparent 62%)',
};
const WEATHER_CYCLE: Weather[] = ['clear', 'rain', 'festival', 'fog', 'fireworks', 'snow'];

function phaseFor(h: number): Phase {
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

export function DynamicWorld() {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>('afternoon');
  const [weather, setWeather] = useState<Weather>('clear');
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setMounted(true);
    const r = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    setReduce(r);
    const h = new Date().getHours();
    setPhase(phaseFor(h));
    let i = h % WEATHER_CYCLE.length;
    setWeather(WEATHER_CYCLE[i]!);
    if (r) return;
    const wid = window.setInterval(() => {
      i = (i + 1) % WEATHER_CYCLE.length;
      setWeather(WEATHER_CYCLE[i]!);
    }, 45000);
    const pid = window.setInterval(() => setPhase(phaseFor(new Date().getHours())), 300000);
    return () => {
      window.clearInterval(wid);
      window.clearInterval(pid);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-[9] overflow-hidden">
      {/* time-of-day tint */}
      <div className="absolute inset-0 transition-[background] duration-[3000ms]" style={{ backgroundImage: PHASE_TINT[phase] }} />

      {!reduce && weather === 'rain'
        ? Array.from({ length: 34 }).map((_, i) => (
            <span
              key={i}
              className="absolute top-[-12vh] h-16 w-px bg-gradient-to-b from-transparent via-primary/25 to-transparent"
              style={{
                left: `${(i * 97) % 100}%`,
                animation: `rain-fall ${0.7 + (i % 5) * 0.12}s linear infinite`,
                animationDelay: `${(i % 11) * 0.13}s`,
              }}
            />
          ))
        : null}

      {!reduce && weather === 'snow'
        ? Array.from({ length: 30 }).map((_, i) => (
            <span
              key={i}
              className="absolute top-[-6vh] rounded-full bg-white/80 shadow-[0_0_4px_rgba(255,255,255,0.9)]"
              style={{
                left: `${(i * 89) % 100}%`,
                height: `${4 + (i % 3) * 2}px`,
                width: `${4 + (i % 3) * 2}px`,
                animation: `snow-fall ${5 + (i % 6)}s linear infinite`,
                animationDelay: `${(i % 9) * 0.5}s`,
              }}
            />
          ))
        : null}

      {!reduce && weather === 'fireworks'
        ? [
            { pos: 'left-[20%] top-[22%]', c: 'bg-pink/60', d: '0s' },
            { pos: 'left-[62%] top-[16%]', c: 'bg-gold/60', d: '0.7s' },
            { pos: 'left-[40%] top-[30%]', c: 'bg-accent/60', d: '1.3s' },
            { pos: 'left-[78%] top-[26%]', c: 'bg-violet/60', d: '1.9s' },
          ].map((f, i) => (
            <span key={i} className={`absolute h-3 w-3 ${f.pos}`}>
              <span
                className={`absolute inset-0 animate-ping rounded-full ${f.c}`}
                style={{ animationDuration: '1.8s', animationDelay: f.d }}
              />
              <span className={`absolute inset-0 rounded-full ${f.c} blur-sm`} />
            </span>
          ))
        : null}

      {weather === 'fog' ? (
        <>
          <div className="absolute inset-x-0 top-1/4 h-40 animate-float bg-gradient-to-b from-white/50 to-transparent blur-2xl" />
          <div className="absolute inset-x-0 bottom-1/4 h-40 animate-float-slow bg-gradient-to-t from-white/45 to-transparent blur-2xl" />
        </>
      ) : null}

      {!reduce && weather === 'festival'
        ? Array.from({ length: 22 }).map((_, i) => {
            const cols = ['bg-gold/70', 'bg-pink/70', 'bg-accent/70', 'bg-primary/70', 'bg-emerald/70'];
            return (
              <span
                key={i}
                className={`absolute h-2.5 w-1.5 rounded-sm ${cols[i % cols.length]}`}
                style={{
                  left: `${(i * 53) % 100}%`,
                  top: '-4vh',
                  animation: `rain-fall ${2.4 + (i % 5) * 0.3}s linear infinite`,
                  animationDelay: `${(i % 7) * 0.35}s`,
                  transform: `rotate(${i * 40}deg)`,
                }}
              />
            );
          })
        : null}
    </div>
  );
}
