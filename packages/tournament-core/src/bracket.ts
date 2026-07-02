import { assignSeeds, isPowerOfTwo, nextPowerOfTwo, standardSeedOrder } from './seeding';
import type { Bracket, Match, MatchSlot, Participant } from './types';

export class BracketError extends Error {}

function emptySlot(): MatchSlot {
  return { participantId: null };
}

function makeMatch(id: string, round: number, position: number, bracket: Match['bracket']): Match {
  return {
    id,
    round,
    position,
    bracket,
    state: 'pending',
    slots: [emptySlot(), emptySlot()],
    winnerId: null,
    loserId: null,
  };
}

function log2(n: number): number {
  return Math.round(Math.log2(n));
}

/** Mark a match ready/bye once both source slots are determined. */
function refreshState(match: Match): void {
  if (match.state === 'completed') return;
  const [a, b] = match.slots;
  if (a.participantId && b.participantId) match.state = 'ready';
  else if ((a.participantId || b.participantId) && match.round === 1 && match.bracket !== 'losers') {
    match.state = 'bye';
  } else match.state = 'pending';
}

/**
 * Single-elimination (also used for `knockout`). Seeds are placed by the
 * standard bracket order so the strongest meet last; odd fields receive byes.
 */
export function singleElimination(participants: Participant[]): Bracket {
  if (participants.length < 2) throw new BracketError('At least 2 participants required');
  const seeded = participants.every((p) => p.seed) ? participants : assignSeeds(participants, { byRating: true });
  const size = nextPowerOfTwo(seeded.length);
  const rounds = log2(size);
  const order = standardSeedOrder(size);
  const bySeed = new Map(seeded.map((p) => [p.seed!, p.id]));

  const grid: Match[][] = [];
  for (let r = 1; r <= rounds; r += 1) {
    const count = size / 2 ** r;
    const arr: Match[] = [];
    for (let pos = 0; pos < count; pos += 1) arr.push(makeMatch(`m-main-${r}-${pos}`, r, pos, 'main'));
    grid.push(arr);
  }

  for (let pos = 0; pos < size / 2; pos += 1) {
    const match = grid[0]![pos]!;
    match.slots[0].participantId = bySeed.get(order[pos * 2]!) ?? null;
    match.slots[1].participantId = bySeed.get(order[pos * 2 + 1]!) ?? null;
  }

  for (let r = 0; r < rounds - 1; r += 1) {
    grid[r]!.forEach((match, pos) => {
      match.winnerTo = { matchId: grid[r + 1]![Math.floor(pos / 2)]!.id, slot: (pos % 2) as 0 | 1 };
    });
  }

  const matches = grid.flat();
  matches.forEach(refreshState);
  return { format: 'single-elimination', rounds, matches };
}

/**
 * Double-elimination for power-of-two fields (≥ 4). Winners-bracket losers drop
 * into a losers bracket; the LB winner meets the WB winner in the grand final.
 * Total matches = 2n − 2.
 */
export function doubleElimination(participants: Participant[]): Bracket {
  const seeded = participants.every((p) => p.seed) ? participants : assignSeeds(participants, { byRating: true });
  const n = nextPowerOfTwo(seeded.length);
  if (!isPowerOfTwo(n) || n < 4) throw new BracketError('Double elimination requires a field of 4+');
  const wb = singleElimination(seeded);
  const k = wb.rounds;
  const matches: Match[] = wb.matches.map((m) => ({ ...m, bracket: 'winners' as const }));
  const wbByRoundPos = (round: number, pos: number) => matches.find((m) => m.bracket === 'winners' && m.round === round && m.position === pos)!;

  // Build losers bracket: 2(k-1) rounds.
  const lbRounds = 2 * (k - 1);
  const lbGrid: Match[][] = [];
  for (let r = 1; r <= lbRounds; r += 1) {
    const i = Math.ceil(r / 2);
    const count = n / 2 ** (i + 1);
    const arr: Match[] = [];
    for (let pos = 0; pos < count; pos += 1) arr.push(makeMatch(`m-losers-${r}-${pos}`, r, pos, 'losers'));
    lbGrid.push(arr);
    matches.push(...arr);
  }

  const gf = makeMatch('m-final-1-0', k + 1, 0, 'final');
  matches.push(gf);

  // Wire WB winners forward already done by singleElimination except final → GF.
  const wbFinal = wbByRoundPos(k, 0);
  wbFinal.winnerTo = { matchId: gf.id, slot: 0 };

  // Wire WB losers into LB.
  for (let j = 1; j <= k; j += 1) {
    const wbRound = matches.filter((m) => m.bracket === 'winners' && m.round === j);
    wbRound.forEach((m, pos) => {
      if (j === 1) {
        const target = lbGrid[0]![Math.floor(pos / 2)]!;
        m.loserTo = { matchId: target.id, slot: (pos % 2) as 0 | 1 };
      } else {
        const lbRoundIndex = 2 * (j - 1); // 1-based even round
        const target = lbGrid[lbRoundIndex - 1]![pos]!;
        m.loserTo = { matchId: target.id, slot: 1 };
      }
    });
  }

  // Wire LB winners forward.
  for (let r = 1; r <= lbRounds; r += 1) {
    const round = lbGrid[r - 1]!;
    round.forEach((m, pos) => {
      if (r === lbRounds) {
        m.winnerTo = { matchId: gf.id, slot: 1 };
      } else if (r % 2 === 1) {
        // Odd → next even round, same position, slot 0 (survivor side).
        m.winnerTo = { matchId: lbGrid[r]![pos]!.id, slot: 0 };
      } else {
        // Even → next odd round, pair up.
        m.winnerTo = { matchId: lbGrid[r]![Math.floor(pos / 2)]!.id, slot: (pos % 2) as 0 | 1 };
      }
    });
  }

  matches.forEach(refreshState);
  return { format: 'double-elimination', rounds: k + 1, matches };
}

/**
 * Round-robin (circle method): every participant plays every other once. A bye
 * is added for odd fields. Matches are independent; standings come from scores.
 */
export function roundRobin(participants: Participant[]): Bracket {
  if (participants.length < 2) throw new BracketError('At least 2 participants required');
  const players: Array<string | null> = participants.map((p) => p.id);
  if (players.length % 2 === 1) players.push(null); // bye marker
  const m = players.length;
  const rounds = m - 1;
  const half = m / 2;
  const matches: Match[] = [];
  const arr = [...players];

  for (let r = 0; r < rounds; r += 1) {
    for (let i = 0; i < half; i += 1) {
      const a = arr[i]!;
      const b = arr[m - 1 - i]!;
      if (a === null || b === null) continue; // bye
      const match = makeMatch(`m-main-${r + 1}-${i}`, r + 1, i, 'main');
      match.slots[0].participantId = a;
      match.slots[1].participantId = b;
      match.state = 'ready';
      matches.push(match);
    }
    // Rotate (keep first fixed).
    arr.splice(1, 0, arr.pop()!);
  }
  return { format: 'round-robin', rounds, matches };
}

/**
 * One Swiss round: participants are paired by descending score (tie-broken by
 * seed), skipping pairings already played. Swiss is iterative — the engine calls
 * this once per round and records results into participant scores.
 */
export function swissPairing(
  participants: Participant[],
  round: number,
  playedPairs: Set<string>,
): Bracket {
  const active = [...participants]
    .filter((p) => p.status !== 'withdrawn')
    .sort((a, b) => b.score - a.score || (a.seed ?? 0) - (b.seed ?? 0));
  const used = new Set<string>();
  const matches: Match[] = [];
  let pos = 0;

  for (let i = 0; i < active.length; i += 1) {
    const a = active[i]!;
    if (used.has(a.id)) continue;
    let partner: Participant | undefined;
    for (let j = i + 1; j < active.length; j += 1) {
      const b = active[j]!;
      if (used.has(b.id)) continue;
      if (playedPairs.has(pairKey(a.id, b.id))) continue;
      partner = b;
      break;
    }
    // Fall back to the next available player if every candidate is a rematch.
    if (!partner) partner = active.find((b) => b.id !== a.id && !used.has(b.id));
    if (!partner) {
      // Odd one out gets a bye.
      const bye = makeMatch(`m-main-${round}-${pos}`, round, pos, 'main');
      bye.slots[0].participantId = a.id;
      bye.state = 'bye';
      bye.winnerId = a.id;
      matches.push(bye);
      used.add(a.id);
      pos += 1;
      continue;
    }
    used.add(a.id);
    used.add(partner.id);
    const match = makeMatch(`m-main-${round}-${pos}`, round, pos, 'main');
    match.slots[0].participantId = a.id;
    match.slots[1].participantId = partner.id;
    match.state = 'ready';
    matches.push(match);
    pos += 1;
  }
  return { format: 'swiss', rounds: round, matches };
}

export function pairKey(a: string, b: string): string {
  return [a, b].sort().join('|');
}

/** Dispatch to the generator for a format (knockout aliases single-elimination). */
export function generateBracket(format: Bracket['format'], participants: Participant[]): Bracket {
  switch (format) {
    case 'single-elimination':
    case 'knockout':
      return singleElimination(participants);
    case 'double-elimination':
      return doubleElimination(participants);
    case 'round-robin':
      return roundRobin(participants);
    case 'swiss':
      return swissPairing(participants, 1, new Set());
    default:
      throw new BracketError(`Format "${format}" has no bracket (use leaderboard standings)`);
  }
}
