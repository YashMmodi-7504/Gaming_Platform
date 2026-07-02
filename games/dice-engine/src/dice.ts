/** A single die — a face value with the size of the die it came from. */
export interface Die {
  /** Face value, 1..faces. */
  value: number;
  /** Number of faces on the die. */
  faces: number;
}

export function makeDie(value: number, faces = 6): Die {
  return { value, faces };
}

/**
 * An immutable set of rolled dice with derived aggregates. Pure data — the
 * engine builds it from the provably-fair roller.
 */
export class DiceSet {
  readonly dice: readonly Die[];

  constructor(dice: readonly Die[]) {
    this.dice = [...dice];
  }

  get count(): number {
    return this.dice.length;
  }

  /** Face values in roll order. */
  values(): number[] {
    return this.dice.map((d) => d.value);
  }

  /** Sum of all dice. */
  total(): number {
    return this.dice.reduce((sum, d) => sum + d.value, 0);
  }

  /** Count of each face value present (face → occurrences). */
  counts(): Map<number, number> {
    const map = new Map<number, number>();
    for (const d of this.dice) map.set(d.value, (map.get(d.value) ?? 0) + 1);
    return map;
  }

  /** Occurrences of a specific face value. */
  occurrences(face: number): number {
    return this.dice.reduce((n, d) => (d.value === face ? n + 1 : n), 0);
  }

  /** True when every die shows the same value (and there is at least one). */
  isTriple(): boolean {
    return this.count > 0 && this.dice.every((d) => d.value === this.dice[0]!.value);
  }

  /** True when at least `n` dice share a value (default 2 ⇒ a double). */
  hasOfAKind(n = 2): boolean {
    for (const c of this.counts().values()) if (c >= n) return true;
    return false;
  }

  /** Sorted face values (ascending) — useful for canonical comparison. */
  sorted(): number[] {
    return this.values().sort((a, b) => a - b);
  }
}

/** Builds dice sets from raw values. */
export const DiceManager = {
  fromValues(values: number[], faces: number): DiceSet {
    return new DiceSet(values.map((v) => makeDie(v, faces)));
  },
};

/** Serialises dice to a compact transport/persistence shape (the face values). */
export const DiceSerializer = {
  encode(set: DiceSet): number[] {
    return set.values();
  },

  /** Encode with face metadata, for renderers that need die sizes. */
  encodeDetailed(set: DiceSet): Array<{ value: number; faces: number }> {
    return set.dice.map((d) => ({ value: d.value, faces: d.faces }));
  },
};

/** Reconstructs a dice set from serialized face values. */
export const DiceDeserializer = {
  decode(values: number[], faces: number): DiceSet {
    return DiceManager.fromValues(values, faces);
  },
};
