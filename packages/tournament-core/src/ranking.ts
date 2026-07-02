import type { Participant } from './types';

export interface Standing {
  participantId: string;
  userId: string;
  displayName: string;
  rank: number;
  score: number;
}

/**
 * Rank participants by descending score with standard competition ranking
 * ("1224" — ties share a rank and the next rank skips accordingly). Ties break
 * deterministically by seed then id so rankings are stable.
 */
export function rankParticipants(participants: Participant[]): Standing[] {
  const sorted = [...participants].sort(
    (a, b) => b.score - a.score || (a.seed ?? 1e9) - (b.seed ?? 1e9) || a.id.localeCompare(b.id),
  );
  const standings: Standing[] = [];
  let lastScore: number | null = null;
  let lastRank = 0;
  sorted.forEach((p, index) => {
    const rank = lastScore !== null && p.score === lastScore ? lastRank : index + 1;
    standings.push({
      participantId: p.id,
      userId: p.userId,
      displayName: p.displayName,
      rank,
      score: p.score,
    });
    lastScore = p.score;
    lastRank = rank;
  });
  return standings;
}

/** Points awarded for a finishing rank, from a configurable table (default 0). */
export function pointsForRank(rank: number, table: Record<number, number>): number {
  return table[rank] ?? 0;
}

/** Merge incremental score deltas into a leaderboard snapshot, then re-rank. */
export function applyScores(
  participants: Participant[],
  deltas: Record<string, number>,
): Participant[] {
  return participants.map((p) =>
    deltas[p.id] !== undefined ? { ...p, score: p.score + (deltas[p.id] ?? 0) } : p,
  );
}
