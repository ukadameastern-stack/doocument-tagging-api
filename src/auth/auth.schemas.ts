import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  role: z.enum(['customer', 'admin']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().uuid(),
});
