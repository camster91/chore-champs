import { PrismaClient } from '@prisma/client'

// Prisma 7: PrismaClient requires a driver adapter (e.g., @prisma/adapter-pg).
// To avoid the adapter requirement at module load (e.g., when Next.js page-data
// collection or build steps import this module), we defer PrismaClient
// construction until the first method call.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const buildPrisma = () => {
  if (!process.env.DATABASE_URL) {
    console.error('WARNING: DATABASE_URL environment variable is not set')
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = (globalForPrisma.prisma ??= buildPrisma())
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value
  },
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma ??= buildPrisma()
}

export default prisma
