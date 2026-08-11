import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  deviceFingerprint: z.string().optional(),
  deviceName: z.string().optional(),
});

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  consentGiven: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the privacy policy',
  }),
});

export const memoryEditSchema = z.object({
  statement: z.string().min(1, 'Memory content is required').max(2000),
});

export const goalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  category: z.string(),
  targetDate: z.string().datetime().optional(),
});

export const privacySettingsSchema = z.object({
  memoryPaused: z.boolean(),
  dataRetentionDays: z.number().min(1).max(3650),
  disabledCategories: z.array(z.string()).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type MemoryEditInput = z.infer<typeof memoryEditSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type PrivacySettingsInput = z.infer<typeof privacySettingsSchema>;
