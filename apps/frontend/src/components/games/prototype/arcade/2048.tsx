'use client';

import { Badge, Button, cn } from '@gaming-platform/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Sparkles, Trophy, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { GameFx, type FxSignal } from '@/components/games/prototype/game-fx';
import { AnimatedNumber } from '@/components/marketing/animated-number';
import { settleRound } from '@/lib/game-result';
import { sound } from '@/lib/sound';
import { useGameStat } from '@/stores/game-stats';

const SIZE = 4;
type Dir = 'up' | 'down' | 'left' | 'right';

interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  merged?: boolean;
  spawned?: boolean;
}

/** Per-value light-theme gradient. Falls back to the top tier for 4096+. */
const TILE_STYLE: Record<number, string> = {
  2: 'from-slate-100 to-slate-200 text-slate-600',
  4: 'from-amber-100 to-amber-200 text-amber-700',
  8: 'from-orange-200 to-orange-300 text-orange-800',
  16: 'from-orange-300 to-pink-300 text-white',
  32: 'from-pink-300 to-pink-400 text-white',
  64: 'from-pink-400 to-rose-500 text-white',
  128: 'from-violet-300 to-violet-400 text-white',
  256: 'from-violet-400 to-indigo-500 text-white',
  512: 'from-indigo-400 to-blue-500 text-white',
  1024: 'from-cyan-400 to-emerald-500 text-white',
  2048: 'from-amber-400 to-yellow-500 text-white',
};

function styleFor(v: number): string {
  return TILE_STYLE[v] ?? 'from-emerald-400 to-teal-500 text-white';
}

function fontFor(v: number): string {
  if (v >= 1024) return 'text-[1.35rem] sm:text-3xl';
  if (v >= 128) return 'text-2xl sm:text-4xl';
  return 'text-3xl sm:text-5xl';
}

let idSeq = 0;
function nextId(): number {
  idSeq += 1;
  return idSeq;
}

function emptyCells(tiles: Tile[]): Array<{ row: number; col: number }> {
  const occupied = new Set(tiles.map((t) => t.row * SIZE + t.col));
  const cells: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!occupied.has(r * SIZE + c)) cells.push({ row: r, col: c });
    }
  }
  return cells;
}

function spawn(tiles: Tile[]): Tile[] {
  const cells = emptyCells(tiles);
  if (cells.length === 0) return tiles;
  const pick = cells[Math.floor(Math.random() * cells.length)];
  if (!pick) return tiles;
  const value = Math.random() < 0.9 ? 2 : 4;
  return [...tiles, { id: nextId(), value, row: pick.row, col: pick.col, spawned: true }];
}

function initBoard(): Tile[] {
  return spawn(spawn([]));
}

/** Slide + merge one line (array of values, index 0 = front toward move direction). */
function collapse(line: Array<Tile | null>): { line: Array<Tile | null>; gained: number; moved: boolean } {
  const present = line.filter((t): t is Tile => t !== null);
  const out: Tile[] = [];
  let gained = 0;
  for (let i = 0; i < present.length; i++) {
    const cur = present[i];
    if (!cur) continue;
    const nxt = present[i + 1];
    if (nxt && nxt.value === cur.value) {
      const mergedValue = cur.value * 2;
      out.push({ ...cur, value: mergedValue, merged: true });
      gained += mergedValue;
      i += 1; // consume next
    } else {
      out.push({ ...cur, merged: false });
    }
  }
  const result: Array<Tile | null> = Array.from({ length: SIZE }, (_, i) => out[i] ?? null);
  const moved = out.length !== present.length || present.some((t, i) => {
    const o = out[i];
    return !o || o.id !== t.id;
  });
  return { line: result, gained, moved };
}

function move(tiles: Tile[], dir: Dir): { tiles: Tile[]; gained: number; moved: boolean } {
  const grid: Array<Array<Tile | null>> = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => null as Tile | null),
  );
  for (const t of tiles) {
    const row = grid[t.row];
    if (row) row[t.col] = { ...t, merged: false, spawned: false };
  }

  let gained = 0;
  let moved = false;
  const next: Tile[] = [];

  const readLine = (i: number): Array<Tile | null> => {
    const line: Array<Tile | null> = [];
    for (let j = 0; j < SIZE; j++) {
      let cell: Tile | null = null;
      if (dir === 'left') cell = grid[i]?.[j] ?? null;
      else if (dir === 'right') cell = grid[i]?.[SIZE - 1 - j] ?? null;
      else if (dir === 'up') cell = grid[j]?.[i] ?? null;
      else cell = grid[SIZE - 1 - j]?.[i] ?? null;
      line.push(cell);
    }
    return line;
  };

  const writeLine = (i: number, line: Array<Tile | null>) => {
    for (let j = 0; j < SIZE; j++) {
      const cell = line[j];
      if (!cell) continue;
      let row = i;
      let col = j;
      if (dir === 'left') { row = i; col = j; }
      else if (dir === 'right') { row = i; col = SIZE - 1 - j; }
      else if (dir === 'up') { row = j; col = i; }
      else { row = SIZE - 1 - j; col = i; }
      next.push({ ...cell, row, col });
    }
  };

  for (let i = 0; i < SIZE; i++) {
    const line = readLine(i);
    const res = collapse(line);
    if (res.moved) moved = true;
    gained += res.gained;
    writeLine(i, res.line);
  }

  return { tiles: next, gained, moved };
}

function hasMoves(tiles: Tile[]): boolean {
  if (emptyCells(tiles).length > 0) return true;
  const grid: Array<Array<Tile | null>> = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => null as Tile | null),
  );
  for (const t of tiles) {
    const row = grid[t.row];
    if (row) row[t.col] = t;
  }
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cur = grid[r]?.[c];
      if (!cur) continue;
      const right = grid[r]?.[c + 1];
      const down = grid[r + 1]?.[c];
      if (right && right.value === cur.value) return true;
      if (down && down.value === cur.value) return true;
    }
  }
  return false;
}

const CELL = 100 / SIZE;

export function Game2048() {
  const stat = useGameStat('2048');
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keepGoing, setKeepGoing] = useState(false);
  const [fx, setFx] = useState<FxSignal>({ key: 0, type: null });

  const fxKey = useRef(0);
  const settledRef = useRef(false);
  const bestRef = useRef(0);

  const reset = useCallback(() => {
    idSeq = 0;
    setTiles(initBoard());
    setScore(0);
    setOver(false);
    setWon(false);
    setKeepGoing(false);
    settledRef.current = false;
    bestRef.current = 0;
  }, []);

  useEffect(() => {
    reset();
  }, [reset]);

  const finish = useCallback(
    (finalScore: number, reachedWin: boolean) => {
      if (settledRef.current) return;
      settledRef.current = true;
      const coins = Math.round(finalScore * 1.5) + (reachedWin ? 2000 : 0);
      const xp = Math.max(10, Math.round(finalScore / 40)) + (reachedWin ? 60 : 0);
      const win = finalScore >= 500 || reachedWin;
      settleRound({
        game: '2048',
        stake: 0,
        win,
        winnings: win ? coins : 0,
        label: `2048 · ${finalScore.toLocaleString()} pts`,
        value: finalScore,
        xp,
      });
      if (win) {
        fxKey.current += 1;
        setFx({ key: fxKey.current, type: 'win', amount: coins });
        toast.success(`Game over — +${coins.toLocaleString()} coins · +${xp} XP`, {
          description: reachedWin ? 'You reached 2048!' : `Final score ${finalScore.toLocaleString()}`,
        });
      } else {
        toast(`Game over — score ${finalScore.toLocaleString()}`);
      }
    },
    [],
  );

  const doMove = useCallback(
    (dir: Dir) => {
      if (over && !keepGoing) return;
      setTiles((cur) => {
        const res = move(cur, dir);
        if (!res.moved) return cur;
        sound.play('diceBounce');
        const withSpawn = spawn(res.tiles);
        if (res.gained > 0) {
          sound.play('coin');
          setScore((s) => {
            const ns = s + res.gained;
            bestRef.current = ns;
            return ns;
          });
        }
        // win check
        if (!won && withSpawn.some((t) => t.value >= 2048)) {
          setWon(true);
          sound.play('reward');
          toast.success('2048! You hit the tile — keep going for a higher score.');
        }
        if (!hasMoves(withSpawn)) {
          setOver(true);
        }
        return withSpawn;
      });
    },
    [over, keepGoing, won],
  );

  // settle when the board locks up
  useEffect(() => {
    if (over) finish(bestRef.current, won);
  }, [over, won, finish]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
      };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      doMove(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doMove]);

  // swipe
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current;
    const t = e.changedTouches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    touchRef.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 'right' : 'left');
    else doMove(dy > 0 ? 'down' : 'up');
  };

  const showOverlay = over || (won && !keepGoing);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      {/* Stage */}
      <div className="card-premium relative overflow-hidden p-4 sm:p-6">
        <GameFx trigger={fx} />
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-bold text-gradient">2048</p>
            <p className="text-xs text-muted-foreground">Merge tiles · reach 2048</p>
          </div>
          <div className="flex gap-2">
            <div className="rounded-xl bg-black/[0.04] px-3 py-1.5 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Score</p>
              <p className="font-display text-xl font-bold tabular-nums text-primary">
                <AnimatedNumber value={score} duration={400} />
              </p>
            </div>
            <div className="rounded-xl bg-gold/10 px-3 py-1.5 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Best</p>
              <p className="font-display text-xl font-bold tabular-nums text-gold">
                {Math.max(stat.highest, score).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div
          className="relative mx-auto aspect-square w-full max-w-md touch-none select-none rounded-2xl bg-gradient-to-br from-slate-200/80 to-slate-300/60 p-2 shadow-inner"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* grid cells */}
          <div className="absolute inset-2 grid grid-cols-4 grid-rows-4 gap-2">
            {Array.from({ length: SIZE * SIZE }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white/50" />
            ))}
          </div>
          {/* tiles */}
          <div className="absolute inset-2">
            <AnimatePresence>
              {tiles.map((t) => (
                <motion.div
                  key={t.id}
                  initial={t.spawned ? { scale: 0 } : false}
                  animate={{
                    scale: t.merged ? [1, 1.16, 1] : 1,
                    top: `${t.row * CELL}%`,
                    left: `${t.col * CELL}%`,
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{
                    top: { type: 'spring', stiffness: 520, damping: 38 },
                    left: { type: 'spring', stiffness: 520, damping: 38 },
                    scale: { duration: 0.18 },
                  }}
                  className="absolute p-1"
                  style={{ width: `${CELL}%`, height: `${CELL}%` }}
                >
                  <div
                    className={cn(
                      'flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br font-display font-bold tabular-nums shadow-md',
                      styleFor(t.value),
                      fontFor(t.value),
                      t.value >= 2048 && 'shadow-glow-gold',
                    )}
                  >
                    {t.value}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* game over / win overlay */}
          <AnimatePresence>
            {showOverlay ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/70 backdrop-blur-sm"
              >
                {over ? (
                  <>
                    <Sparkles className="h-10 w-10 text-primary" />
                    <p className="font-display text-2xl font-bold text-gradient">Game Over</p>
                    <p className="font-mono text-sm text-muted-foreground">Score {score.toLocaleString()}</p>
                    <Button variant="gradient" size="lg" className="sheen" onClick={reset}>
                      <RotateCcw className="h-5 w-5" /> New Game
                    </Button>
                  </>
                ) : (
                  <>
                    <Trophy className="h-10 w-10 text-gold" />
                    <p className="font-display text-2xl font-bold text-gradient-gold">You reached 2048!</p>
                    <div className="flex gap-2">
                      <Button variant="gold" size="lg" className="sheen" onClick={() => setKeepGoing(true)}>
                        Keep Going
                      </Button>
                      <Button variant="glass" size="lg" onClick={reset}>
                        <RotateCcw className="h-5 w-5" /> New Game
                      </Button>
                    </div>
                  </>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* on-screen dpad */}
        <div className="mx-auto mt-4 grid w-40 grid-cols-3 gap-2">
          <span />
          <ArrowBtn icon={<ArrowUp />} onClick={() => doMove('up')} />
          <span />
          <ArrowBtn icon={<ArrowLeft />} onClick={() => doMove('left')} />
          <ArrowBtn icon={<ArrowDown />} onClick={() => doMove('down')} />
          <ArrowBtn icon={<ArrowRight />} onClick={() => doMove('right')} />
        </div>
      </div>

      {/* Side panel */}
      <div className="space-y-4">
        <div className="card-premium space-y-3 p-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-sm font-bold">How to play</p>
            <Badge variant="secondary">Arrows / WASD</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Swipe or use arrow keys to slide tiles. When two tiles with the same number touch, they merge.
            Reach the 2048 tile to win — then keep going for a bigger score and more coins.
          </p>
          <Button variant="glass" size="lg" className="w-full" onClick={reset}>
            <RotateCcw className="h-5 w-5" /> Restart
          </Button>
        </div>

        <div className="card-premium grid grid-cols-2 gap-3 p-4 text-center">
          <StatCell icon={<Trophy className="h-4 w-4 text-gold" />} label="Best score" value={Math.max(stat.highest, score).toLocaleString()} />
          <StatCell icon={<Zap className="h-4 w-4 text-emerald" />} label="Rounds" value={String(stat.rounds)} />
          <StatCell label="Biggest win" value={`+${stat.biggestWin.toLocaleString()}`} />
          <StatCell label="Best streak" value={String(stat.bestStreak)} />
        </div>

        <div className="card-premium p-4">
          <p className="mb-2 font-display text-sm font-bold">Recent games</p>
          <div className="flex flex-wrap gap-1.5">
            {stat.history.slice(0, 14).map((r) => (
              <span
                key={r.id}
                className={cn(
                  'rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold',
                  r.win ? 'bg-emerald/15 text-emerald' : 'bg-destructive/15 text-destructive',
                )}
              >
                {r.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ArrowBtn({ icon, onClick }: { icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/70 text-primary shadow-sm ring-1 ring-black/5 transition-transform active:scale-90 hover:bg-primary/10 [&_svg]:h-5 [&_svg]:w-5"
    >
      {icon}
    </button>
  );
}

function StatCell({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/[0.03] p-2">
      <div className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 font-display text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
