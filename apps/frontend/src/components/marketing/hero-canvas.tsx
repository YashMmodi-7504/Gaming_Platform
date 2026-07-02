'use client';

import { useEffect, useRef } from 'react';

/**
 * Original, dependency-free cinematic hero background. Canvas-2D floating casino
 * objects (chips, coins, dice, cards) + light particles with subtle mouse
 * parallax. GPU-cheap: capped DPR, pauses when offscreen or tab-hidden, and
 * fully disabled under prefers-reduced-motion. No external assets, no video.
 */
type Shape = 'chip' | 'coin' | 'dice' | 'card' | 'spark';

interface Obj {
  x: number;
  y: number;
  z: number; // depth 0.3..1 for parallax + size
  r: number;
  rot: number;
  vrot: number;
  vy: number;
  shape: Shape;
  hue: number;
}

const PALETTE = [263, 268, 190, 326, 38, 210]; // purple, violet, cyan, pink, gold, blue

export function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let objs: Obj[] = [];
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;
    let running = true;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const build = () => {
      const area = w * h;
      const count = Math.max(14, Math.min(46, Math.round(area / 32000)));
      const shapes: Shape[] = ['chip', 'coin', 'dice', 'card', 'spark', 'spark', 'spark'];
      objs = Array.from({ length: count }, () => {
        const z = rand(0.3, 1);
        const shape = shapes[Math.floor(Math.random() * shapes.length)]!;
        return {
          x: rand(0, w),
          y: rand(0, h),
          z,
          r: (shape === 'spark' ? rand(1.2, 3) : rand(14, 34)) * z,
          rot: rand(0, Math.PI * 2),
          vrot: rand(-0.004, 0.004),
          vy: rand(0.08, 0.35) * z,
          shape,
          hue: PALETTE[Math.floor(Math.random() * PALETTE.length)]!,
        };
      });
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    const drawDicePips = (s: number) => {
      ctx.fillStyle = 'rgba(99,102,241,0.55)';
      const o = s * 0.26;
      for (const [px, py] of [
        [-o, -o],
        [o, -o],
        [-o, o],
        [o, o],
        [0, 0],
      ] as const) {
        ctx.beginPath();
        ctx.arc(px, py, s * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      for (const o of objs) {
        o.y -= o.vy;
        o.rot += o.vrot;
        if (o.y < -50) {
          o.y = h + 50;
          o.x = rand(0, w);
        }
        const px = o.x + mouse.x * 26 * o.z;
        const py = o.y + mouse.y * 26 * o.z;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(o.rot);
        const col = (a: number) => `hsla(${o.hue}, 90%, 62%, ${a})`;

        if (o.shape === 'spark') {
          ctx.fillStyle = col(0.5);
          ctx.beginPath();
          ctx.arc(0, 0, o.r, 0, Math.PI * 2);
          ctx.fill();
        } else if (o.shape === 'chip' || o.shape === 'coin') {
          ctx.fillStyle = col(0.16);
          ctx.beginPath();
          ctx.arc(0, 0, o.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = Math.max(1.5, o.r * 0.16);
          ctx.strokeStyle = col(0.5);
          ctx.setLineDash(o.shape === 'chip' ? [o.r * 0.5, o.r * 0.4] : []);
          ctx.beginPath();
          ctx.arc(0, 0, o.r * 0.82, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = col(0.35);
          ctx.beginPath();
          ctx.arc(0, 0, o.r * 0.45, 0, Math.PI * 2);
          ctx.stroke();
        } else if (o.shape === 'dice') {
          const s = o.r * 1.5;
          ctx.fillStyle = col(0.14);
          ctx.strokeStyle = col(0.5);
          ctx.lineWidth = 2;
          roundRect(ctx, -s / 2, -s / 2, s, s, s * 0.22);
          ctx.fill();
          ctx.stroke();
          drawDicePips(s);
        } else {
          // card
          const cw = o.r * 1.2;
          const ch = o.r * 1.7;
          ctx.fillStyle = col(0.14);
          ctx.strokeStyle = col(0.45);
          ctx.lineWidth = 2;
          roundRect(ctx, -cw / 2, -ch / 2, cw, ch, o.r * 0.22);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
      if (running) raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };

    resize();
    window.addEventListener('resize', resize);
    if (!reduce) {
      window.addEventListener('pointermove', onMove);
      const io = new IntersectionObserver(
        ([entry]) => {
          const visible = entry?.isIntersecting ?? true;
          if (visible && !running) {
            running = true;
            raf = requestAnimationFrame(draw);
          } else if (!visible) {
            running = false;
            cancelAnimationFrame(raf);
          }
        },
        { threshold: 0 },
      );
      io.observe(canvas);
      raf = requestAnimationFrame(draw);
      return () => {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        window.removeEventListener('pointermove', onMove);
        io.disconnect();
      };
    }

    // reduced-motion: render one static frame
    draw();
    running = false;
    cancelAnimationFrame(raf);
    return () => {
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full" />;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
