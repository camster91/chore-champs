// Environment variable validation
// This file validates required environment variables at runtime

export function validateEnv() {
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
  ]

  const missingVars: string[] = []

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar)
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}. ` +
      `Please check your .env file or environment settings.`
    )
  }
}

// Check if we're in a server context and validate
export function getEnvVar(name: string, required = true): string {
  const value = process.env[name]
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value || ''
}

// Database URL getter with validation
export function getDatabaseUrl(): string {
  return getEnvVar('DATABASE_URL')
}

// NextAuth secret getter with validation
export function getNextAuthSecret(): string {
  return getEnvVar('NEXTAUTH_SECRET')
}

// NextAuth URL - optional in production (Vercel auto-detects)
export function getNextAuthUrl(): string | undefined {
  return process.env.NEXTAUTH_URL
}
