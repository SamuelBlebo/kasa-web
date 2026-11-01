import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Enter your email').email('That email does not look right'),
  password: z.string().min(8, 'Use at least 8 characters'),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Accepts "+233 24 123 4567", "233241234567", etc. — normalizePhone() strips the rest. */
export const phoneSchema = z
  .string()
  .min(1, 'Enter your phone number')
  .regex(/^\+?[0-9\s-]{8,17}$/, 'Enter a valid phone number, e.g. +233 24 123 4567');

export const phoneLoginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(8, 'Use at least 8 characters'),
});
export type PhoneLoginInput = z.infer<typeof phoneLoginSchema>;

/** Signup only ever asks for a phone, not email — see phoneToAuthEmail. */
export const registerSchema = z.object({
  fullName: z.string().min(2, 'Enter your name'),
  businessName: z.string().min(2, 'Enter your business name'),
  phone: phoneSchema,
  password: z.string().min(8, 'Use at least 8 characters'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const onboardingSchema = z.object({
  businessName: z.string().min(2, 'Enter your business name'),
  phone: z.string().min(7, 'Enter a valid phone number').optional().or(z.literal('')),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const productSchema = z.object({
  name: z.string().min(2, 'Enter a product name'),
  description: z.string().max(600, 'Keep it under 600 characters').default(''),
  price: z.coerce.number().positive('Price must be more than 0'),
  stock: z.coerce.number().int('Whole numbers only').min(0, 'Stock cannot be negative'),
  category: z.string().min(1, 'Enter a category'),
  active: z.boolean().default(true),
});
export type ProductInput = z.infer<typeof productSchema>;
