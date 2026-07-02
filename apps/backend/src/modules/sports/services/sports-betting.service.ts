import { BadRequestException, Injectable } from '@nestjs/common';
import {
  SportsEngine,
  VariantResolver,
  type BetSelection,
  type BetSlip,
  type BetType,
} from '@gaming-platform/sports-engine';

import { RedisService } from '../../redis/redis.service';
import { WalletBridgeService } from '../../wallet-engine/services/wallet-bridge.service';
import { SportsCatalogService } from './sports-catalog.service';

export interface PlaceBetInput {
  type: BetType;
  stake: string;
  profile?: string;
  selections: Array<{ matchId: string; marketId: string; selectionId: string }>;
}

const KEY = (userId: string): string => `sports:bets:${userId}`;
const TTL = 7 * 24 * 60 * 60; // 7 days
const MAX_BETS = 200;

/**
 * Sportsbook betting: prices and validates bet slips against the data-driven
 * catalog, persists them per-user in Redis, and settles them lazily as their
 * matches are resolved. Odds and labels are always taken from the authoritative
 * catalog — never trusted from the client.
 */
@Injectable()
export class SportsBettingService {
  private readonly profiles = new VariantResolver();

  constructor(
    private readonly redis: RedisService,
    private readonly catalog: SportsCatalogService,
    private readonly wallet: WalletBridgeService,
  ) {}

  /** Resolve client selection references into authoritative, priced legs. */
  private async resolveSelections(
    refs: PlaceBetInput['selections'],
    type: BetType,
  ): Promise<BetSelection[]> {
    if (refs.length === 0) throw new BadRequestException('At least one selection is required');
    const legs: BetSelection[] = [];
    for (const ref of refs) {
      const match = await this.catalog.getMatch(ref.matchId);
      if (match.status === 'settled' || match.status === 'cancelled' || match.status === 'finished') {
        throw new BadRequestException(`Match "${match.name}" is not open for betting`);
      }
      const market = match.markets.find((m) => m.id === ref.marketId);
      if (!market) throw new BadRequestException(`Market "${ref.marketId}" not found`);
      if (market.status !== 'open') throw new BadRequestException(`Market "${market.name}" is suspended`);
      const selection = market.selections.find((s) => s.id === ref.selectionId);
      if (!selection) throw new BadRequestException(`Selection "${ref.selectionId}" not found`);

      legs.push({
        matchId: match.id,
        marketId: market.id,
        selectionId: selection.id,
        odds: selection.odds,
        line: selection.line,
        side: selection.side,
        status: 'pending',
        matchName: match.name,
        marketName: market.name,
        selectionName: selection.name,
      });
    }
    if (type === 'single' && legs.length !== 1) {
      throw new BadRequestException('A single bet must have exactly one selection');
    }
    return legs;
  }

  /** Price a slip without placing it. */
  async quote(input: PlaceBetInput) {
    const engine = new SportsEngine(this.resolveProfile(input.profile));
    const selections = await this.resolveSelections(input.selections, input.type);
    return engine.quote({ type: input.type, stake: input.stake, selections });
  }

  /** Validate, build and persist a bet slip for a user. */
  async place(userId: string, input: PlaceBetInput): Promise<BetSlip> {
    const engine = new SportsEngine(this.resolveProfile(input.profile));
    const selections = await this.resolveSelections(input.selections, input.type);
    const slip = engine.place({ type: input.type, stake: input.stake, selections, userId, at: Date.now() });

    const bets = await this.load(userId);
    bets.unshift(slip);
    await this.save(userId, bets.slice(0, MAX_BETS));
    return slip;
  }

  /** List a user's bets, settling any whose matches have resolved. */
  async listBets(userId: string, status?: string): Promise<BetSlip[]> {
    const bets = await this.settlePending(userId);
    return status ? bets.filter((b) => b.status === status) : bets;
  }

  /** Force a settlement pass over the user's pending bets. */
  async settlePending(userId: string): Promise<BetSlip[]> {
    const bets = await this.load(userId);
    let changed = false;
    const engine = new SportsEngine(this.resolveProfile());

    for (const slip of bets) {
      if (slip.status !== 'pending') continue;
      const matchIds = [...new Set(slip.selections.map((s) => s.matchId))];
      const matches = await this.catalog.getMatches(matchIds);
      const allSettled = matchIds.every((id) => matches.get(id)?.result);
      if (!allSettled) continue;

      const settlement = engine.settle(slip, matches);
      if (settlement.status === 'pending') continue;
      slip.status = settlement.status;
      slip.settledAt = Date.now();
      const statusById = new Map(settlement.selections.map((s) => [s.selectionId, s.status]));
      for (const leg of slip.selections) leg.status = statusById.get(leg.selectionId) ?? leg.status;
      slip.potentialReturn = settlement.returned;
      changed = true;

      // Real-money settlement flows through the Wallet Engine. Demo slips carry
      // no currency, so the bridge is a safe no-op; real-money slips are ledgered.
      await this.wallet.settleImmediate({
        userId,
        currencyId: slip.currencyId ?? null,
        betAmount: slip.stake,
        winAmount: settlement.status === 'won' ? settlement.returned : '0',
        reference: `sports:${slip.betId}`,
        idempotencyKey: `sports:${slip.betId}`,
      });
    }

    if (changed) await this.save(userId, bets);
    return bets;
  }

  async statistics(userId: string) {
    const bets = await this.settlePending(userId);
    const settled = bets.filter((b) => b.status !== 'pending');
    const won = settled.filter((b) => b.status === 'won');
    const staked = bets.reduce((sum, b) => sum + Number(b.stake), 0);
    const returned = won.reduce((sum, b) => sum + Number(b.potentialReturn), 0);
    return {
      total: bets.length,
      pending: bets.filter((b) => b.status === 'pending').length,
      won: won.length,
      lost: settled.filter((b) => b.status === 'lost').length,
      void: settled.filter((b) => b.status === 'void').length,
      totalStaked: staked,
      totalReturned: returned,
      net: returned - staked,
    };
  }

  private resolveProfile(profile?: string) {
    const key = profile && this.profiles.has(profile) ? profile : 'standard';
    return this.profiles.resolve(key);
  }

  private async load(userId: string): Promise<BetSlip[]> {
    return (await this.redis.get<BetSlip[]>(KEY(userId))) ?? [];
  }

  private async save(userId: string, bets: BetSlip[]): Promise<void> {
    await this.redis.set(KEY(userId), bets, TTL);
  }
}
