export interface RuntimeActionPreset {
  label: string;
  type: string;
  payload?: Record<string, unknown>;
  variant?: 'default' | 'gradient' | 'destructive' | 'outline';
  primary?: boolean;
}

/**
 * Per-engine action buttons for the runtime harness. New engines register their
 * presets here; the platform code never special-cases a game.
 */
export const ACTION_PRESETS: Record<string, RuntimeActionPreset[]> = {
  'dice-engine': [
    { label: 'Roll', type: 'dice:roll', payload: { amount: '1' }, variant: 'gradient', primary: true },
  ],
  'crash-engine': [
    { label: 'Start round', type: 'crash:start', payload: { amount: '1' }, variant: 'gradient', primary: true },
    { label: 'Cash out', type: 'crash:cashout', variant: 'destructive' },
  ],
  'roulette-engine': [
    {
      label: 'Spin (Red + №7)',
      type: 'roulette:spin',
      payload: { bets: [{ type: 'red', amount: '1' }, { type: 'straight', value: 7, amount: '1' }] },
      variant: 'gradient',
      primary: true,
    },
  ],
  'card-engine': [
    { label: 'Deal 2', type: 'card:deal', payload: { count: 2 }, variant: 'gradient', primary: true },
    { label: 'Shuffle', type: 'card:shuffle', variant: 'outline' },
  ],
  'lottery-engine': [
    {
      label: 'Draw',
      type: 'lottery:draw',
      payload: { ticket: [1, 2, 3, 4, 5, 6], amount: '1' },
      variant: 'gradient',
      primary: true,
    },
  ],
  'sports-engine': [
    {
      label: 'Place bet',
      type: 'sports:place',
      payload: {
        betId: 'b1',
        amount: '1',
        type: 'single',
        selections: [{ marketId: 'm1', selectionId: 's1', odds: 2.5 }],
      },
      variant: 'gradient',
      primary: true,
    },
    { label: 'Settle (win)', type: 'sports:settle', payload: { results: { s1: 'won' } }, variant: 'outline' },
  ],
};

export function presetsFor(pluginKey: string): RuntimeActionPreset[] {
  return ACTION_PRESETS[pluginKey] ?? [];
}
