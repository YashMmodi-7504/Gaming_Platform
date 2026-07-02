/**
 * Shared card engine for the prototype card games. Card codes are 2–3 chars:
 * rank (A,2-9,T,J,Q,K) + suit (H,D,C,S) — e.g. "AS", "TH", "KD". Matches the
 * PlayingCard component. Deterministic seeded shuffle for replayable rounds.
 */
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'] as const;
export const SUITS = ['H', 'D', 'C', 'S'] as const;

export type Card = string;

export function createDeck(decks = 1): Card[] {
  const out: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const s of SUITS) for (const r of RANKS) out.push(`${r}${s}`);
  }
  return out;
}

/** mulberry32 seeded RNG. */
export function seededRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(deck: Card[], seed: number): Card[] {
  const rng = seededRng(seed);
  const a = [...deck];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

export function rankOf(card: Card): string {
  return card.slice(0, card.length - 1);
}
export function suitOf(card: Card): string {
  return card.slice(-1);
}
export function isRed(card: Card): boolean {
  const s = suitOf(card);
  return s === 'H' || s === 'D';
}

/** 2..14 (A high) for high-card games (war, dragon-tiger, andar-bahar match). */
export function rankValue(card: Card): number {
  const r = rankOf(card);
  if (r === 'A') return 14;
  if (r === 'K') return 13;
  if (r === 'Q') return 12;
  if (r === 'J') return 11;
  if (r === 'T') return 10;
  return Number(r);
}

/** Blackjack pip value (A counted as 11 here; soft-adjust in handValue). */
export function blackjackValue(card: Card): number {
  const r = rankOf(card);
  if (r === 'A') return 11;
  if (r === 'K' || r === 'Q' || r === 'J' || r === 'T') return 10;
  return Number(r);
}

export function blackjackHand(cards: Card[]): { total: number; soft: boolean; blackjack: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += blackjackValue(c);
    if (rankOf(c) === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  const soft = aces > 0 && total <= 21;
  return { total, soft, blackjack: cards.length === 2 && total === 21 };
}

/** Baccarat value: face/ten = 0, ace = 1, sum mod 10. */
export function baccaratValue(cards: Card[]): number {
  let total = 0;
  for (const c of cards) {
    const r = rankOf(c);
    total += r === 'A' ? 1 : r === 'T' || r === 'J' || r === 'Q' || r === 'K' ? 0 : Number(r);
  }
  return total % 10;
}
