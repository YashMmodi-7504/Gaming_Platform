import bcrypt from 'bcryptjs';

import { PASSWORD_DEFAULTS } from './constants';

/**
 * Hash a plaintext password using bcrypt.
 */
export const hashPassword = async (
  plain: string,
  saltRounds: number = PASSWORD_DEFAULTS.SALT_ROUNDS,
): Promise<string> => {
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(plain, salt);
};

/**
 * Constant-time comparison of a plaintext password against a stored hash.
 */
export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);
