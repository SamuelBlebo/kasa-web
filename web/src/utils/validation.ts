import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Enter your email').email('That email does not look right'),
  password: z.string().min(8, 'Use at least 8 characters'),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Accepts "024 123 4567", "+233 24 123 4567", "233241234567". */
export const phoneSchema = z
  .string()
  .min(1, 'Enter your phone number')
  .regex(/^\+?[0-9\s-]{9,17}$/, 'Enter a valid phone number, e.g. 024 123 4567');

export const phoneLoginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(8, 'Use at least 8 characters'),
});
export type PhoneLoginInput = z.infer<typeof phoneLoginSchema>;

/** Signup asks for a phone, not an email (see utils/phone.ts). The business comes next, in onboarding. */
export const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your name'),
  phone: phoneSchema,
  password: z.string().min(8, 'Use at least 8 characters'),
});
export type SignupInput = z.infer<typeof signupSchema>;
