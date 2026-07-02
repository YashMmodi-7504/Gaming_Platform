import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@gaming-platform/database';
import {
  CARD_VARIANT_PRESETS,
  RuleResolver,
  VariantResolver,
  type CardGameRuleSet,
} from '@gaming-platform/card-engine';

import { PrismaService } from '../../database/prisma.service';

const SCOPE = 'card-variant';
const ENV = 'production';

interface StoredVariant {
  name: string;
  enabled: boolean;
  rules: Partial<CardGameRuleSet>;
}

export interface VariantSummary {
  key: string;
  name: string;
  evaluationMode: string;
  builtIn: boolean;
  enabled: boolean;
  sides: string[];
  betCount: number;
}

/**
 * Card variant registry. Built-in presets ship with the engine; admin-defined
 * variants are stored as configuration (`ApplicationSetting`, scope
 * `card-variant`) so new card games are added by data, never code.
 */
@Injectable()
export class CardVariantService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadCustom(): Promise<Map<string, StoredVariant>> {
    const rows = await this.prisma.applicationSetting.findMany({
      where: { scope: SCOPE, environment: ENV },
    });
    const map = new Map<string, StoredVariant>();
    for (const row of rows) {
      map.set(row.key, row.value as unknown as StoredVariant);
    }
    return map;
  }

  /** A resolver combining enabled custom variants over built-in presets. */
  async resolver(includeDisabled = false): Promise<VariantResolver> {
    const custom = await this.loadCustom();
    const overrides: Record<string, Partial<CardGameRuleSet>> = {};
    for (const [key, variant] of custom) {
      if (variant.enabled || includeDisabled) {
        overrides[key] = { ...variant.rules, key, name: variant.name };
      }
    }
    return new VariantResolver(overrides);
  }

  async resolve(key: string, overrides?: Partial<CardGameRuleSet>): Promise<CardGameRuleSet> {
    const resolver = await this.resolver(true);
    if (!resolver.has(key)) throw new NotFoundException(`Unknown card variant "${key}"`);
    return resolver.resolve(key, overrides);
  }

  async list(includeDisabled = false): Promise<VariantSummary[]> {
    const custom = await this.loadCustom();
    const summaries: VariantSummary[] = [];

    for (const key of Object.keys(CARD_VARIANT_PRESETS)) {
      if (custom.has(key)) continue; // overridden by custom
      const ruleset = RuleResolver.resolve(CARD_VARIANT_PRESETS[key]!);
      summaries.push(this.toSummary(ruleset, true, true));
    }
    for (const [key, variant] of custom) {
      if (!variant.enabled && !includeDisabled) continue;
      const base = CARD_VARIANT_PRESETS[key];
      const ruleset = RuleResolver.resolve(base ?? {}, { ...variant.rules, key, name: variant.name });
      summaries.push(this.toSummary(ruleset, !!base, variant.enabled));
    }
    return summaries.sort((a, b) => a.name.localeCompare(b.name));
  }

  // ---- Admin management ----------------------------------------------------

  async create(input: { key: string; name: string; rules: Partial<CardGameRuleSet> }) {
    const existing = await this.prisma.applicationSetting.findUnique({
      where: { scope_key_environment: { scope: SCOPE, key: input.key, environment: ENV } },
    });
    if (existing) throw new ConflictException(`Variant "${input.key}" already exists`);
    // Validate the resolved ruleset before persisting.
    RuleResolver.resolve(CARD_VARIANT_PRESETS[input.key] ?? {}, {
      ...input.rules,
      key: input.key,
      name: input.name,
    });

    const value: StoredVariant = { name: input.name, enabled: true, rules: input.rules };
    return this.prisma.applicationSetting.create({
      data: {
        scope: SCOPE,
        key: input.key,
        environment: ENV,
        valueType: 'JSON',
        value: value as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async update(key: string, patch: { name?: string; rules?: Partial<CardGameRuleSet> }) {
    const current = await this.requireCustom(key);
    const next: StoredVariant = {
      name: patch.name ?? current.name,
      enabled: current.enabled,
      rules: { ...current.rules, ...patch.rules },
    };
    RuleResolver.resolve(CARD_VARIANT_PRESETS[key] ?? {}, { ...next.rules, key, name: next.name });
    return this.save(key, next);
  }

  async setEnabled(key: string, enabled: boolean) {
    const current = await this.requireCustom(key);
    return this.save(key, { ...current, enabled });
  }

  async remove(key: string) {
    await this.requireCustom(key);
    await this.prisma.applicationSetting.delete({
      where: { scope_key_environment: { scope: SCOPE, key, environment: ENV } },
    });
    return { success: true as const };
  }

  // ---- internals -----------------------------------------------------------

  private async requireCustom(key: string): Promise<StoredVariant> {
    const row = await this.prisma.applicationSetting.findUnique({
      where: { scope_key_environment: { scope: SCOPE, key, environment: ENV } },
    });
    if (!row) throw new NotFoundException(`Custom variant "${key}" not found`);
    return row.value as unknown as StoredVariant;
  }

  private save(key: string, value: StoredVariant) {
    return this.prisma.applicationSetting.update({
      where: { scope_key_environment: { scope: SCOPE, key, environment: ENV } },
      data: { value: value as unknown as Prisma.InputJsonValue },
    });
  }

  private toSummary(ruleset: CardGameRuleSet, builtIn: boolean, enabled: boolean): VariantSummary {
    return {
      key: ruleset.key,
      name: ruleset.name,
      evaluationMode: ruleset.evaluationMode,
      builtIn,
      enabled,
      sides: ruleset.sides,
      betCount: ruleset.bets.length + ruleset.sideBets.length,
    };
  }
}
