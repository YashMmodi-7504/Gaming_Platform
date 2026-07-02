import { NotFoundException } from '@nestjs/common';

import { RuntimePluginRegistryService } from './runtime-plugin-registry.service';

describe('RuntimePluginRegistryService', () => {
  const service = new RuntimePluginRegistryService();

  it('registers all six engine plugins', () => {
    const keys = service.list().map((p) => p.key).sort();
    expect(keys).toEqual(
      [
        'card-engine',
        'crash-engine',
        'dice-engine',
        'lottery-engine',
        'roulette-engine',
        'sports-engine',
      ].sort(),
    );
  });

  it('returns metadata for a known plugin', () => {
    const meta = service.get('dice-engine');
    expect(meta.genre).toBe('DICE');
    // The data-driven engine is configured by variant, not hardcoded dice shape.
    expect(meta.defaultConfig).toHaveProperty('variant');
  });

  it('throws for an unknown plugin', () => {
    expect(() => service.get('does-not-exist')).toThrow(NotFoundException);
  });

  it('resolves a config from defaults', () => {
    const config = service.resolveConfig('dice-engine', { variant: 'lucky-dice' });
    expect((config as { variant: string }).variant).toBe('lucky-dice');
  });
});
