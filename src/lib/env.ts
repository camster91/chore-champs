import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(): Env {
  const isBuildPhase = process.env.npm_lifecycle_event === 'build' || process.env.CI === 'true' || process.env.NEXT_PHASE === 'phase-production-build'

  try {
    const env = envSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NODE_ENV: process.env.NODE_ENV,
    })

    // In runtime, enforce required variables
    if (!isBuildPhase) {
      if (!env.DATABASE_URL) throw new Error("DATABASE_URL is required at runtime")
      if (!env.NEXTAUTH_SECRET) throw new Error("NEXTAUTH_SECRET is required at runtime")
    }

    return env
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(e => e.path.join('.')).join(', ')
      // Only throw if not in build phase
      if (!isBuildPhase) {
        throw new Error(
          `Invalid or missing environment variables: ${missingVars}. ` +
          `Please check your .env file or environment settings.`
        )
      }
      console.warn(`[Build Warning] Missing env vars: ${missingVars}`)
      return {} as Env
    }
    throw error
  }
}

// Store the validated env
let env: Env | null = null

export function getEnv(): Env {
  if (!env) {
    env = validateEnv()
  }
  return env
}

// Database URL getter with validation
export function getDatabaseUrl(): string {
  return getEnv().DATABASE_URL || process.env.DATABASE_URL || ''
}

// NextAuth secret getter with validation
export function getNextAuthSecret(): string {
  return getEnv().NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET || ''
}
