/**
 * Framework-agnostic primitive and utility types shared across the platform.
 */

export type UUID = string;
export type ISODateString = string;
export type Nullable<T> = T | null;
export type Maybe<T> = T | null | undefined;
export type Dictionary<T = unknown> = Record<string, T>;

/** Make selected keys of T optional. */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Make selected keys of T required. */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/** A value that may be wrapped in a Promise. */
export type Awaitable<T> = T | Promise<T>;

export interface Timestamped {
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface SoftDeletable {
  deletedAt: Nullable<ISODateString>;
}

export interface Identifiable {
  id: UUID;
}

export type Environment = 'development' | 'staging' | 'production' | 'test';
