import { z } from 'zod';

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,24}$/);
export const accountStateSchema = z.enum(['active', 'suspended', 'deletion_pending', 'deleted']);
export const onboardingStepSchema = z.enum(['region', 'providers', 'taste', 'compare', 'complete']);
export const profileSchema = z.object({
  user_id: z.string().uuid(),
  username: usernameSchema,
  display_name: z.string().trim().min(1).max(50),
  bio: z.string().max(160),
  visibility: z.enum(['private', 'public']),
  account_state: accountStateSchema,
  version: z.number().int().positive(),
  created_at: z.string(),
  updated_at: z.string(),
});
export const userSettingsSchema = z.object({
  user_id: z.string().uuid(),
  region: z.literal('US'),
  locale: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
  history_visibility: z.enum(['private', 'friends', 'public']),
  watchlist_visibility: z.enum(['private', 'friends', 'public']),
  analytics_opt_in: z.boolean(),
  collaborative_opt_in: z.boolean(),
  ai_opt_in: z.boolean(),
  onboarding_step: onboardingStepSchema,
  onboarding_completed_at: z.string().nullable(),
  version: z.number().int().positive(),
  created_at: z.string(),
  updated_at: z.string(),
});
export const bootstrapProfileSchema = z
  .object({
    username: usernameSchema,
    display_name: z.string().trim().min(1).max(50),
  })
  .strict();
export type Profile = z.infer<typeof profileSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;
