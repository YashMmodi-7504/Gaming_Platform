import { Injectable } from '@nestjs/common';
import {
  MarketManager,
  OddsManager,
  SportResolver,
  SportsEngine,
  VariantResolver,
  type BetSelection,
  type BetType,
  type Match,
  type OddsFormat,
} from '@gaming-platform/sports-engine';

/**
 * Stateless sportsbook computation — pricing, odds conversion and settlement with
 * no persistence. Catalog management lives in {@link SportsCatalogService} and
 * user betting in `SportsBettingService`.
 */
@Injectable()
export class SportsEngineService {
  private readonly profiles = new VariantResolver();
  private readonly sports = new SportResolver();

  /** Built-in sport definitions. */
  listSports() {
    return this.sports.all();
  }

  /** Available rule profiles (standard, high-roller, conservative, …). */
  listProfiles() {
    return this.profiles.keys().map((key) => this.profiles.resolve(key));
  }

  /** Market type catalog. */
  marketTemplates() {
    return MarketManager.all();
  }

  /** Price a slip from raw, pre-priced legs (stateless). */
  quote(input: { type: BetType; stake: string; profile?: string; selections: BetSelection[] }) {
    const engine = new SportsEngine(this.resolveProfile(input.profile));
    return engine.quote({ type: input.type, stake: input.stake, selections: input.selections });
  }

  /** Settle a slip against supplied matches (stateless). */
  settle(input: {
    profile?: string;
    slip: Parameters<SportsEngine['settle']>[0];
    matches: Match[];
  }) {
    const engine = new SportsEngine(this.resolveProfile(input.profile));
    return engine.settle(input.slip, new Map(input.matches.map((m) => [m.id, m])));
  }

  /** Convert decimal odds to a display format. */
  formatOdds(decimal: number, format: OddsFormat) {
    return OddsManager.format(decimal, format);
  }

  private resolveProfile(profile?: string) {
    const key = profile && this.profiles.has(profile) ? profile : 'standard';
    return this.profiles.resolve(key);
  }
}
