import { z } from 'zod'

export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .refine(val => !val.includes(','), 'Email addresses cannot contain commas'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
})

export const createChoreSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  basePoints: z.number().min(1, 'Points must be at least 1').max(1000, 'Points too high'),
  icon: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  recurring: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  timeOfDay: z.enum(['MORNING', 'AFTERNOON', 'EVENING', 'ANYTIME']).optional(),
  assignToKids: z.array(z.string().uuid()).optional(),
})

export const createRewardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  cost: z.number().min(1, 'Cost must be at least 1').max(100000, 'Cost too high'),
  category: z.string().min(1, 'Category is required').max(100, 'Category too long'),
  icon: z.string().optional(),
})

export const redeemRewardSchema = z.object({
  kidId: z.string().uuid('Invalid kid ID'),
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

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>
export type CreateChoreInput = z.infer<typeof createChoreSchema>
export type CreateRewardInput = z.infer<typeof createRewardSchema>
export type RedeemRewardInput = z.infer<typeof redeemRewardSchema>
export type CreateKidInput = z.infer<typeof createKidSchema>
export type CreateFamilyGoalInput = z.infer<typeof createFamilyGoalSchema>
