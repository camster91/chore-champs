import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'
import { logError } from '@/lib/utils/error'

/**
 * Intentionally does not reveal whether an email is registered
 * (account enumeration hardening). Always returns the same shape.
 * Callers that need existence checks should use authenticated flows.
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
    const email =
      typeof body?.email === 'string' ? body.email.toLowerCase().trim() : ''

    // Perform the lookup (and normalize timing) but never disclose the result.
    if (email) {
      await prisma.parent.findUnique({
        where: { email },
        select: { id: true },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    logError('check-account', error)
    return NextResponse.json({ ok: true })
  }
}
