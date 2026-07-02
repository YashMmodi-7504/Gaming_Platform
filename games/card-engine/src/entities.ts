import { CardSerializer, type Card } from './card';

export type SeatStatus = 'empty' | 'seated' | 'betting' | 'in-play' | 'stood' | 'folded' | 'busted';

/** An ordered set of cards held by a player or dealer. */
export class Hand {
  private cards: Card[] = [];

  constructor(initial: Card[] = []) {
    this.cards = [...initial];
  }

  add(...cards: Card[]): void {
    this.cards.push(...cards);
  }

  get size(): number {
    return this.cards.length;
  }

  toArray(): readonly Card[] {
    return this.cards;
  }

  clear(): void {
    this.cards = [];
  }

  encode(): string[] {
    return CardSerializer.encodeMany(this.cards);
  }
}

export interface PlayerOptions {
  id: string;
  seat: number;
  name?: string;
  isDealer?: boolean;
}

/** A participant at the table (human seat or bot). */
export class Player {
  readonly id: string;
  readonly seat: number;
  readonly name: string;
  readonly isDealer: boolean;
  hand = new Hand();
  status: SeatStatus = 'seated';

  constructor(options: PlayerOptions) {
    this.id = options.id;
    this.seat = options.seat;
    this.name = options.name ?? `Seat ${options.seat}`;
    this.isDealer = options.isDealer ?? false;
  }

  reset(): void {
    this.hand.clear();
    this.status = 'seated';
  }

  snapshot(): { id: string; seat: number; status: SeatStatus; cards: string[] } {
    return { id: this.id, seat: this.seat, status: this.status, cards: this.hand.encode() };
  }
}

/** The dealer/banker — a Player flagged as the house. */
export class Dealer extends Player {
  constructor(seat = 0) {
    super({ id: 'dealer', seat, name: 'Dealer', isDealer: true });
  }
}
