import prisma from '@/lib/db'

interface RateLimitResult {
  allowed: boolean
  retryAfter: number // seconds until reset
}

/**
 * Durable rate limiter using the RateLimit Prisma table.
 *
 * Replaces the previous in-memory Map (which reset on every container
 * restart — letting attackers bypass limits by waiting for deploys).
 * Each (identifier, action) pair gets a single row whose `count` is
 * incremented until `resetAt` expires, then the row is deleted lazily.
 *
 * Backwards-compatible signature with the old in-memory version.
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = new Date()

  // Find or create the row (race-tolerant: if 2 requests hit at once,
  // we just over-count by 1; that's fine for rate limiting)
  const existing = await prisma.rateLimit.findUnique({
    where: { identifier_action: { identifier, action } },
  })

  if (!existing || existing.resetAt <= now) {
    const resetAt = new Date(now.getTime() + windowMs)
    if (existing) {
      await prisma.rateLimit.update({
        where: { id: existing.id },
        data: { count: 1, resetAt },
      })
    } else {
      // createMany with skipDuplicates handles concurrent inserts
      await prisma.rateLimit
        .create({ data: { identifier, action, count: 1, resetAt } })
        .catch(() => {/* unique violation = another request won the race; safe to ignore */})
    }
    return { allowed: true, retryAfter: 0 }
  }

  if (existing.count >= maxAttempts) {
    return {
      allowed: false,
      retryAfter: Math.ceil((existing.resetAt.getTime() - now.getTime()) / 1000),
    }
  }

  await prisma.rateLimit.update({
    where: { id: existing.id },
    data: { count: { increment: 1 } },
  })
  return { allowed: true, retryAfter: 0 }
}

/**
 * Lazy cleanup of expired rate-limit rows. Call from a cron or on each
 * check (it's cheap — the WHERE filter does the work). Keeping the
 * table small keeps query plans fast.
 */
export async function cleanupRateLimits(): Promise<number> {
  const result = await prisma.rateLimit.deleteMany({
    where: { resetAt: { lte: new Date() } },
  })
  return result.count
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return 'unknown'
}
