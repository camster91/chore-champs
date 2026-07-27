import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'

const bodySchema = z.object({
  email: z.string().email().max(254),
})

/**
 * Intentionally does not reveal whether an email is registered
 * (account enumeration). Always returns the same shape after rate limiting.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { allowed, retryAfter } = await checkRateLimit(ip, 'check-account', 10, 15 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    bodySchema.safeParse(body)
    // Constant response — never return hasAccount / existence hints
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Check account error:', error)
    return NextResponse.json({ ok: true })
  }
}
