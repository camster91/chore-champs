import { z } from 'zod'

/** Prisma IDs are cuid(), not UUID */
export const idSchema = z.string().cuid('Invalid id')

export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .refine(val => !val.includes(','), 'Email addresses cannot contain commas'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long')
    .refine((val) => {
      // Verify string is valid UTF-8 (no null bytes, can round-trip)
      try { return Buffer.from(Buffer.from(val).toString()).toString() === val } catch { return false }
    }, { message: 'Name contains invalid characters' }),
})

export const createChoreSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  basePoints: z.number().min(1, 'Points must be at least 1').max(1000, 'Points too high'),
  icon: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  recurring: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  timeOfDay: z.enum(['MORNING', 'AFTERNOON', 'EVENING', 'ANYTIME']).optional(),
  assignToKids: z.array(idSchema).optional(),
})

export const updateChoreSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  basePoints: z.number().int().min(1).max(1000).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  recurring: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY']).nullable().optional(),
  timeOfDay: z.enum(['MORNING', 'AFTERNOON', 'EVENING', 'ANYTIME']).optional(),
  icon: z.string().max(32).optional(),
  isActive: z.boolean().optional(),
}).strict()

export const updateKidSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  age: z.number().int().min(3).max(18).optional(),
  avatarId: z.string().min(1).max(500).optional(),
  themeMode: z.enum(['SOLAR', 'CANDY', 'DEEP_SEA', 'FOREST', 'NEUTRAL']).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
}).strict()

export const createInviteSchema = z.object({
  email: z.string().email('Invalid email address').max(254),
  // Invites may only grant MEMBER — OWNER is reserved for Family.parentId
  role: z.literal('MEMBER').default('MEMBER'),
})

export const updateRewardSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
    cost: z.number().int().min(1).max(100000).optional(),
    category: z.string().min(1).max(100).optional(),
    icon: z.string().max(32).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()

export const assignChoreSchema = z.object({
  choreId: idSchema,
  kidIds: z.array(idSchema).min(1).max(20),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
    .optional(),
})

export const createRewardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  cost: z.number().min(1, 'Cost must be at least 1').max(100000, 'Cost too high'),
  category: z.string().min(1, 'Category is required').max(100, 'Category too long'),
  icon: z.string().optional(),
})

export const redeemRewardSchema = z.object({
  kidId: idSchema,
})

export const createKidSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  age: z.number().min(3, 'Age must be at least 3').max(18, 'Age must be at most 18'),
  avatarId: z.string().min(1, 'Avatar is required'),
  themeMode: z.enum(['SOLAR', 'CANDY', 'DEEP_SEA', 'FOREST', 'NEUTRAL']).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
})

export const createFamilyGoalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  targetPoints: z.number().min(1, 'Target must be at least 1').max(1000000, 'Target too high'),
  reward: z.string().max(500, 'Reward description too long').optional(),
})

export const pushSubscriptionSchema = z.object({
  endpoint: z
    .string()
    .url()
    .refine((url) => url.startsWith('https://'), 'Push endpoint must be HTTPS')
    .refine((url) => {
      try {
        const host = new URL(url).hostname
        // Common Web Push providers + allowlist pattern
        return (
          host.endsWith('.googleapis.com') ||
          host.endsWith('.mozilla.com') ||
          host.endsWith('.mozilla.org') ||
          host.endsWith('.windows.com') ||
          host.endsWith('.apple.com') ||
          host.includes('push') ||
          host.includes('notify')
        )
      } catch {
        return false
      }
    }, 'Unrecognized push service endpoint'),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>
export type CreateChoreInput = z.infer<typeof createChoreSchema>
export type UpdateChoreInput = z.infer<typeof updateChoreSchema>
export type UpdateKidInput = z.infer<typeof updateKidSchema>
export type CreateInviteInput = z.infer<typeof createInviteSchema>
export type UpdateRewardInput = z.infer<typeof updateRewardSchema>
export type AssignChoreInput = z.infer<typeof assignChoreSchema>
export type CreateRewardInput = z.infer<typeof createRewardSchema>
export type RedeemRewardInput = z.infer<typeof redeemRewardSchema>
export type CreateKidInput = z.infer<typeof createKidSchema>
export type CreateFamilyGoalInput = z.infer<typeof createFamilyGoalSchema>
