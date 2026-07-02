import type { RouletteColor, WheelLayout } from './rules';

/** Sentinel pocket number for the American double-zero pocket (`00`). */
export const DOUBLE_ZERO = 37;

/** Human-readable label for a pocket number (`37` ⇒ `00`). */
export function pocketLabel(pocket: number): string {
  return pocket === DOUBLE_ZERO ? '00' : String(pocket);
}

/** Resolve a pocket's colour from the wheel layout (data-driven). */
export function pocketColor(layout: WheelLayout, pocket: number): RouletteColor {
  if (layout.greenPockets.includes(pocket)) return 'green';
  return layout.redNumbers.includes(pocket) ? 'red' : 'black';
}

export interface Pocket {
  /** Position on the physical ring (0-based). */
  index: number;
  number: number;
  label: string;
  color: RouletteColor;
  /** Angle (degrees) of this pocket's centre on the wheel. */
  angle: number;
}

/** A fully materialised wheel — the ordered ring of coloured pockets. */
export class Wheel {
  readonly pockets: Pocket[];

  constructor(readonly layout: WheelLayout) {
    const total = layout.sequence.length;
    this.pockets = layout.sequence.map((number, index) => ({
      index,
      number,
      label: pocketLabel(number),
      color: pocketColor(layout, number),
      angle: (index / total) * 360,
    }));
  }

  get size(): number {
    return this.pockets.length;
  }

  /** Pocket at a ring index (the slot the ball settles into). */
  at(index: number): Pocket {
    const pocket = this.pockets[((index % this.size) + this.size) % this.size];
    if (!pocket) throw new Error('Wheel has no pockets');
    return pocket;
  }

  /** Find the pocket for a given face number (`37` ⇒ `00`). */
  forNumber(number: number): Pocket | undefined {
    return this.pockets.find((p) => p.number === number);
  }

  numbers(): number[] {
    return this.pockets.map((p) => p.number);
  }
}

/** Builds wheels from layouts. */
export const WheelManager = {
  build(layout: WheelLayout): Wheel {
    return new Wheel(layout);
  },
};

/**
 * The ball model — given a target ring index it computes a deterministic landing
 * angle plus a number of full turns for animation. Pure data; no timers.
 */
export const Ball = {
  /** Final resting angle (degrees) for a target pocket index. */
  restAngle(wheel: Wheel, index: number): number {
    return wheel.at(index).angle;
  },

  /**
   * Total visual rotation for a spin: `turns` full revolutions plus the angle
   * landing on the target pocket. Deterministic for replay.
   */
  spinRotation(wheel: Wheel, index: number, turns = 5): number {
    return turns * 360 + this.restAngle(wheel, index);
  },
};

export interface SerializedWheel {
  sequence: number[];
  redNumbers: number[];
  greenPockets: number[];
  maxNumber: number;
  dozenSize: number;
  columnStride: number;
  lowRange: [number, number];
  highRange: [number, number];
}

/** Serialises a wheel layout to a transport-safe, persistable shape. */
export const WheelSerializer = {
  encode(layout: WheelLayout): SerializedWheel {
    return {
      sequence: [...layout.sequence],
      redNumbers: [...layout.redNumbers],
      greenPockets: [...layout.greenPockets],
      maxNumber: layout.maxNumber,
      dozenSize: layout.dozenSize,
      columnStride: layout.columnStride,
      lowRange: [...layout.lowRange],
      highRange: [...layout.highRange],
    };
  },

  /** Encode just the visible ring (number + colour) for the client renderer. */
  encodeRing(layout: WheelLayout): Array<{ number: number; label: string; color: RouletteColor }> {
    return new Wheel(layout).pockets.map((p) => ({
      number: p.number,
      label: p.label,
      color: p.color,
    }));
  },
};

/** Reconstructs a wheel layout from its serialized form. */
export const WheelDeserializer = {
  decode(data: SerializedWheel): WheelLayout {
    return {
      sequence: [...data.sequence],
      redNumbers: [...data.redNumbers],
      greenPockets: [...data.greenPockets],
      maxNumber: data.maxNumber,
      dozenSize: data.dozenSize,
      columnStride: data.columnStride,
      lowRange: [data.lowRange[0], data.lowRange[1]],
      highRange: [data.highRange[0], data.highRange[1]],
    };
  },
};
