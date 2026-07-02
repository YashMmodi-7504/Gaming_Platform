import { z } from 'zod';

import { PASSWORD_POLICY, USERNAME_POLICY } from '../constants';

export const emailSchema = z.string().trim().toLowerCase().email('A valid email is required');

export const passwordSchema = z
  .string()
  .min(PASSWORD_POLICY.MIN_LENGTH, `Password must be at least ${PASSWORD_POLICY.MIN_LENGTH} characters`)
  .max(PASSWORD_POLICY.MAX_LENGTH, `Password must be at most ${PASSWORD_POLICY.MAX_LENGTH} characters`)
  .regex(
    PASSWORD_POLICY.PATTERN,
    'Password must contain an uppercase letter, a lowercase letter, and a number',
  );

export const usernameSchema = z
  .string()
  .trim()
  .min(USERNAME_POLICY.MIN_LENGTH, `Username must be at least ${USERNAME_POLICY.MIN_LENGTH} characters`)
  .max(USERNAME_POLICY.MAX_LENGTH, `Username must be at most ${USERNAME_POLICY.MAX_LENGTH} characters`)
  .regex(USERNAME_POLICY.PATTERN, 'Username may only contain letters, numbers, and underscores');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
