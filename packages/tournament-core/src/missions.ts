/**
 * Missions, achievements, streaks and XP/levels — the progression layer. All
 * pure and data-driven: a mission declares a metric + target; progress events
 * advance it; completion yields rewards. The same model powers daily / weekly /
 * season missions and milestone achievements.
 */

export type MissionWindow = 'daily' | 'weekly' | 'monthly' | 'season' | 'permanent';

export interface MissionDefinition {
  id: string;
  name: string;
  window: MissionWindow;
  /** Metric this mission tracks (e.g. `bets_placed`, `games_won`, `wagered`). */
  metric: string;
  /** Target value to complete. */
  target: number;
  /** XP awarded on completion. */
  xp: number;
  rewardSlugs?: string[];
}

export interface ProgressEvent {
  metric: string;
  /** Increment (default 1). */
  amount?: number;
}

export interface MissionProgress {
  missionId: string;
  value: number;
  completed: boolean;
}

export const Missions = {
  /** Apply an event to a mission's progress, returning the new progress. */
  apply(definition: MissionDefinition, progress: MissionProgress, event: ProgressEvent): MissionProgress {
    if (progress.completed || definition.metric !== event.metric) return progress;
    const value = progress.value + (event.amount ?? 1);
    return { missionId: definition.id, value, completed: value >= definition.target };
  },

  /** Apply an event across many missions at once. */
  applyAll(
    definitions: MissionDefinition[],
    progressById: Map<string, MissionProgress>,
    event: ProgressEvent,
  ): Map<string, MissionProgress> {
    const next = new Map(progressById);
    for (const def of definitions) {
      const current = next.get(def.id) ?? { missionId: def.id, value: 0, completed: false };
      next.set(def.id, Missions.apply(def, current, event));
    }
    return next;
  },

  percent(definition: MissionDefinition, progress: MissionProgress): number {
    if (definition.target <= 0) return 100;
    return Math.min(100, Math.round((progress.value / definition.target) * 100));
  },
};

// ---- Streaks ---------------------------------------------------------------

export interface StreakState {
  current: number;
  longest: number;
  /** Day index (epoch days) of the last increment. */
  lastDay: number | null;
}

export const Streaks = {
  /** Record activity on `day` (epoch days). Consecutive days extend the streak. */
  record(state: StreakState, day: number): StreakState {
    if (state.lastDay === day) return state; // already counted today
    const current = state.lastDay !== null && day === state.lastDay + 1 ? state.current + 1 : 1;
    return { current, longest: Math.max(state.longest, current), lastDay: day };
  },
};

// ---- XP & levels -----------------------------------------------------------

export interface LevelCurve {
  /** XP required for level 2; subsequent levels scale quadratically. */
  base: number;
  exponent: number;
}

export const DEFAULT_LEVEL_CURVE: LevelCurve = { base: 100, exponent: 1.5 };

export const Levels = {
  /** Cumulative XP required to *reach* a level (level 1 = 0 XP). */
  xpForLevel(level: number, curve: LevelCurve = DEFAULT_LEVEL_CURVE): number {
    if (level <= 1) return 0;
    let total = 0;
    for (let l = 2; l <= level; l += 1) {
      total += Math.floor(curve.base * Math.pow(l - 1, curve.exponent));
    }
    return total;
  },

  /** The level for a given cumulative XP. */
  levelForXp(xp: number, curve: LevelCurve = DEFAULT_LEVEL_CURVE): number {
    let level = 1;
    while (Levels.xpForLevel(level + 1, curve) <= xp) level += 1;
    return level;
  },

  /** Progress (0..1) toward the next level. */
  progress(xp: number, curve: LevelCurve = DEFAULT_LEVEL_CURVE): { level: number; into: number; needed: number } {
    const level = Levels.levelForXp(xp, curve);
    const floor = Levels.xpForLevel(level, curve);
    const ceil = Levels.xpForLevel(level + 1, curve);
    return { level, into: xp - floor, needed: ceil - floor };
  },
};
