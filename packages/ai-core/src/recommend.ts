import { cosine, embed, EMBED_DIM, nearest, type ScoredId } from './embeddings';

/**
 * Recommendation engine combining content-based similarity (item feature
 * embeddings) with collaborative signals (what the player and similar players
 * engage with) and popularity/recency. Pure and deterministic.
 */

export interface RecItem {
  id: string;
  /** Free-text features (name, category, tags, volatility…) for embedding. */
  text: string;
  popularity: number;
  /** Recency 0..1 (1 = newest). */
  recency: number;
  rtp?: number;
  vector?: number[];
}

export interface RecProfile {
  /** Item ids the player has interacted with (most-recent first). */
  history: string[];
  /** Weight of items by id (e.g. play counts). */
  weights?: Record<string, number>;
}

export interface RecWeights {
  content: number;
  popularity: number;
  recency: number;
}

export const DEFAULT_WEIGHTS: RecWeights = { content: 0.6, popularity: 0.25, recency: 0.15 };

function ensureVector(item: RecItem): number[] {
  return item.vector ?? (item.vector = embed(item.text));
}

/** Build a taste vector from the player's interaction history. */
export function profileVector(profile: RecProfile, items: Map<string, RecItem>): number[] {
  // Use the fixed embedding dimension instead of building a throwaway empty
  // embedding on every call (hot path for recommendations).
  const dim = EMBED_DIM;
  const acc = new Array<number>(dim).fill(0);
  let total = 0;
  profile.history.forEach((id, index) => {
    const item = items.get(id);
    if (!item) return;
    // More-recent history weighs more (decay), times explicit weight.
    const decay = 1 / (1 + index);
    const weight = (profile.weights?.[id] ?? 1) * decay;
    const vec = ensureVector(item);
    for (let i = 0; i < dim; i += 1) acc[i]! += vec[i]! * weight;
    total += weight;
  });
  if (total === 0) return acc;
  const mag = Math.sqrt(acc.reduce((s, v) => s + v * v, 0)) || 1;
  return acc.map((v) => v / mag);
}

/** Maximum popularity used to normalise the popularity term. */
function maxPopularity(items: RecItem[]): number {
  return Math.max(1, ...items.map((i) => i.popularity));
}

/** Rank items as personalized recommendations for a profile. */
export function recommend(
  items: RecItem[],
  profile: RecProfile,
  options: { limit?: number; weights?: RecWeights } = {},
): ScoredId[] {
  const weights = options.weights ?? DEFAULT_WEIGHTS;
  const limit = options.limit ?? 12;
  const byId = new Map(items.map((i) => [i.id, i]));
  const taste = profileVector(profile, byId);
  const hasTaste = taste.some((v) => v !== 0);
  const maxPop = maxPopularity(items);
  const seen = new Set(profile.history);

  return items
    .filter((i) => !seen.has(i.id))
    .map((item) => {
      const content = hasTaste ? (cosine(taste, ensureVector(item)) + 1) / 2 : 0;
      const popularity = item.popularity / maxPop;
      const score = content * weights.content + popularity * weights.popularity + item.recency * weights.recency;
      return { id: item.id, score: Number(score.toFixed(6)) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Items most similar to a target item (content-based). */
export function similar(targetId: string, items: RecItem[], k = 8): ScoredId[] {
  const target = items.find((i) => i.id === targetId);
  if (!target) return [];
  const vectors = items.map((i) => ({ id: i.id, vector: ensureVector(i) }));
  return nearest(ensureVector(target), vectors, k, new Set([targetId]));
}

/** Trending ranking: popularity blended with recency. */
export function trending(items: RecItem[], k = 12): ScoredId[] {
  const maxPop = maxPopularity(items);
  return items
    .map((i) => ({ id: i.id, score: Number(((i.popularity / maxPop) * 0.7 + i.recency * 0.3).toFixed(6)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
