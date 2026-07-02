/**
 * Runtime type guards and small predicate helpers.
 */

export const isDefined = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

export const isString = (value: unknown): value is string => typeof value === 'string';

export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && !Number.isNaN(value);

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isNonEmptyArray = <T>(value: T[] | null | undefined): value is [T, ...T[]] =>
  Array.isArray(value) && value.length > 0;

export const assertNever = (value: never, message = 'Unexpected value'): never => {
  throw new Error(`${message}: ${String(value)}`);
};
