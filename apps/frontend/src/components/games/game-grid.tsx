import type { GameSummary } from '@gaming-platform/types';

import { GameCard } from './game-card';

export function GameGrid({ games }: { games: GameSummary[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}
