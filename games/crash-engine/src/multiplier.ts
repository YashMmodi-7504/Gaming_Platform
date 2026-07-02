import type { CrashGameRuleSet } from './rules';

/** Round a multiplier down to 2 decimals. */
function floor2(value: number): number {
  return Math.floor(value * 100) / 100;
}

/**
 * Drives the rising multiplier. The curve is continuous exponential growth:
 * `m(t) = e^(growthRate · t_seconds)`, clamped to the configured range. Pure and
 * deterministic — the same elapsed time always yields the same multiplier.
 */
export class MultiplierManager {
  private readonly rate: number;
  private readonly min: number;
  private readonly max: number;

  constructor(ruleset: Pick<CrashGameRuleSet, 'growthRatePerSecond' | 'minMultiplier' | 'maxMultiplier'>) {
    this.rate = ruleset.growthRatePerSecond;
    this.min = ruleset.minMultiplier;
    this.max = ruleset.maxMultiplier;
  }

  /** Multiplier value at an elapsed time (ms since the curve started). */
  valueAt(elapsedMs: number): number {
    const raw = Math.exp(this.rate * (Math.max(0, elapsedMs) / 1000));
    return Math.min(this.max, Math.max(this.min, floor2(raw)));
  }

  /** Time (ms) at which the curve first reaches a target multiplier. */
  timeToReach(multiplier: number): number {
    if (multiplier <= this.min) return 0;
    return (Math.log(multiplier) / this.rate) * 1000;
  }
}

export interface CurvePoint {
  tMs: number;
  multiplier: number;
}

export interface CrashCurve {
  crashPoint: number;
  crashTimeMs: number;
  points: CurvePoint[];
}

/**
 * Generates a sampled multiplier curve up to the crash point, for animation and
 * replay. Sampling honours the ruleset tick but is bounded so very long rounds
 * never produce unbounded point arrays.
 */
export const CrashCurveGenerator = {
  generate(ruleset: CrashGameRuleSet, crashPoint: number, maxPoints = 600): CrashCurve {
    const manager = new MultiplierManager(ruleset);
    const crashTimeMs = Math.min(manager.timeToReach(crashPoint), ruleset.roundDurationCapMs);
    const step = Math.max(ruleset.tickMs, Math.ceil(crashTimeMs / maxPoints) || ruleset.tickMs);
    const points: CurvePoint[] = [];
    for (let t = 0; t < crashTimeMs; t += step) {
      points.push({ tMs: t, multiplier: manager.valueAt(t) });
    }
    points.push({ tMs: crashTimeMs, multiplier: crashPoint });
    return { crashPoint, crashTimeMs, points };
  },
};

export interface SerializedCrashRound {
  crashPoint: number;
  crashTimeMs: number;
  cashedOutAt: number | null;
}

/** Serialises a crash round to a compact, persistable shape. */
export const CrashSerializer = {
  encode(round: { crashPoint: number; crashTimeMs: number; cashedOutAt: number | null }): SerializedCrashRound {
    return {
      crashPoint: round.crashPoint,
      crashTimeMs: round.crashTimeMs,
      cashedOutAt: round.cashedOutAt,
    };
  },

  /** Encode just the curve points for the client renderer. */
  encodeCurve(curve: CrashCurve): number[][] {
    return curve.points.map((p) => [p.tMs, p.multiplier]);
  },
};

/** Reconstructs a crash round / curve from serialized form. */
export const CrashDeserializer = {
  decode(data: SerializedCrashRound): SerializedCrashRound {
    return { crashPoint: data.crashPoint, crashTimeMs: data.crashTimeMs, cashedOutAt: data.cashedOutAt };
  },

  decodeCurve(points: number[][]): CurvePoint[] {
    return points.map(([tMs, multiplier]) => ({ tMs: tMs ?? 0, multiplier: multiplier ?? 1 }));
  },
};
