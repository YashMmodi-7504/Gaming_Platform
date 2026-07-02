/**
 * Deterministic text embeddings and similarity. A hashed bag-of-words projects
 * any text into a fixed-dimensional unit vector with no external model or
 * network — so semantic similarity, "similar games" and vector search are exact
 * and fully testable. The same approach is used to embed catalog items and
 * search queries into one space.
 */

export const EMBED_DIM = 64;

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'on', 'with', 'is', 'are', 'me', 'show',
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Stable 32-bit hash (FNV-1a) of a token. */
function hashToken(token: string): number {
  let h = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Embed text (or a list of tokens) into a unit-length vector of `dim`. */
export function embed(input: string | string[], dim = EMBED_DIM): number[] {
  const tokens = Array.isArray(input) ? input : tokenize(input);
  const vec = new Array<number>(dim).fill(0);
  for (const token of tokens) {
    const h = hashToken(token);
    const idx = h % dim;
    const sign = (h >>> 31) & 1 ? -1 : 1;
    vec[idx] = (vec[idx] ?? 0) + sign;
  }
  return normalize(vec);
}

export function normalize(vec: number[]): number[] {
  const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (mag === 0) return vec;
  return vec.map((v) => v / mag);
}

export function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length && i < b.length; i += 1) sum += a[i]! * b[i]!;
  return sum;
}

/** Cosine similarity of two (assumed unit) vectors, clamped to [-1, 1]. */
export function cosine(a: number[], b: number[]): number {
  return Math.max(-1, Math.min(1, dot(a, b)));
}

export interface ScoredId {
  id: string;
  score: number;
}

/** Top-K nearest items to a query vector (cosine), excluding given ids. */
export function nearest(
  query: number[],
  items: Array<{ id: string; vector: number[] }>,
  k: number,
  exclude: Set<string> = new Set(),
): ScoredId[] {
  return items
    .filter((it) => !exclude.has(it.id))
    .map((it) => ({ id: it.id, score: cosine(query, it.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
