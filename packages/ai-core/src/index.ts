/**
 * @gaming-platform/ai-core
 *
 * The pure, deterministic core of the Enterprise AI platform: text embeddings &
 * vector similarity, recommendation/personalization scoring, rule-based fraud
 * detection, risk & responsible-gaming scoring, player segmentation & churn, and
 * a natural-language search parser.
 *
 * The backend `ai` module wires these to the catalog, sessions, wallet, devices
 * and an optional LLM provider (Claude) for narrative insights.
 */

export * from './embeddings';
export * from './recommend';
export * from './fraud';
export * from './risk';
export * from './segment';
export * from './search';
