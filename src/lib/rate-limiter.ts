import prisma from '@/lib/db'
import { randomUUID } from 'crypto'

interface RateLimitResult {
  allowed: boolean
  retryAfter: number // seconds until reset
}

/**
 * Atomic durable rate limiter using Postgres INSERT ... ON CONFLICT.
 *
 * The previous read-then-write path allowed concurrent requests in the same
 * window to all observe count < max and all be allowed. This version
 * increments (or resets) in a single statement and decides from RETURNING.
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitResult> {
  const resetAt = new Date(Date.now() + windowMs)
  const id = randomUUID()

  const rows = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    INSERT INTO "RateLimit" (id, identifier, action, count, "resetAt", "createdAt", "updatedAt")
    VALUES (${id}, ${identifier}, ${action}, 1, ${resetAt}, NOW(), NOW())
    ON CONFLICT (identifier, action) DO UPDATE SET
      count = CASE
        WHEN "RateLimit"."resetAt" <= NOW() THEN 1
        ELSE "RateLimit".count + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimit"."resetAt" <= NOW() THEN ${resetAt}
        ELSE "RateLimit"."resetAt"
      END,
      "updatedAt" = NOW()
    RETURNING count, "resetAt"
  `

  const row = rows[0]
  if (!row) {
    // Should not happen; fail closed.
    return { allowed: false, retryAfter: Math.ceil(windowMs / 1000) }
  }

  if (row.count > maxAttempts) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((new Date(row.resetAt).getTime() - Date.now()) / 1000)),
    }
  }

  return { allowed: true, retryAfter: 0 }
}

export async function cleanupRateLimits(): Promise<number> {
  const result = await prisma.rateLimit.deleteMany({
    where: { resetAt: { lte: new Date() } },
  })
  return result.count
}

/**
 * Prefer proxy-controlled identity headers. Do not trust the leftmost
 * X-Forwarded-For value (client-spoofable). Coolify/nginx typically set
 * X-Real-IP to the connecting client.
 */
export function getClientIp(req: Request): string {
  const realIp = req.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded.split(',').map(p => p.trim()).filter(Boolean)
    if (parts.length > 0) {
      return parts[parts.length - 1]
    }
  }

  return 'unknown'
}
