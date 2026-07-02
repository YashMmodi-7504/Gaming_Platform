import { Injectable, NotFoundException } from '@nestjs/common';
import {
  GameConfigResolver,
  GamePluginRegistry,
  GameRegistryResolver,
  type GameConfig,
  type GamePluginMetadata,
  type PluginRegistration,
} from '@gaming-platform/game-sdk';
import { cardRegistration } from '@gaming-platform/card-engine';
import { crashRegistration } from '@gaming-platform/crash-engine';
import { diceRegistration } from '@gaming-platform/dice-engine';
import { lotteryRegistration } from '@gaming-platform/lottery-engine';
import { rouletteRegistration } from '@gaming-platform/roulette-engine';
import { sportsRegistration } from '@gaming-platform/sports-engine';

const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Server-side plugin registry. Every engine is validated and registered at
 * boot. The resolver also supports lazy/code-split loading for future engines
 * without changing platform code.
 */
@Injectable()
export class RuntimePluginRegistryService {
  private readonly registry = new GamePluginRegistry();
  readonly resolver: GameRegistryResolver;

  constructor() {
    const registrations: PluginRegistration[] = [
      diceRegistration,
      crashRegistration,
      rouletteRegistration,
      cardRegistration,
      lotteryRegistration,
      sportsRegistration,
    ];
    for (const registration of registrations) {
      this.validate(registration);
      this.registry.register(registration);
    }
    this.resolver = new GameRegistryResolver(this.registry);
  }

  list(): GamePluginMetadata[] {
    return this.registry.list();
  }

  get(key: string): GamePluginMetadata {
    const registration = this.registry.get(key);
    if (!registration) throw new NotFoundException(`Unknown plugin "${key}"`);
    return registration.metadata;
  }

  has(key: string): boolean {
    return this.registry.has(key);
  }

  resolveConfig(key: string, override?: Partial<GameConfig>): GameConfig {
    const metadata = this.get(key);
    return new GameConfigResolver(metadata.defaultConfig).resolve(override);
  }

  /** Plugin integrity validation — rejects malformed registrations at boot. */
  private validate(registration: PluginRegistration): void {
    const { metadata, factory } = registration;
    if (!metadata.key || !KEY_PATTERN.test(metadata.key)) {
      throw new Error(`Invalid plugin key: "${metadata.key}"`);
    }
    if (typeof factory !== 'function') {
      throw new Error(`Plugin "${metadata.key}" has no factory`);
    }
    if (metadata.minPlayers < 1 || metadata.maxPlayers < metadata.minPlayers) {
      throw new Error(`Plugin "${metadata.key}" has an invalid player range`);
    }
  }
}
