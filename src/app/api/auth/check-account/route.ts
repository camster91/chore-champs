import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'

/**
 * Account-existence oracle neutralized.
 *
 * Previously returned `{ hasAccount: boolean }`, enabling email enumeration
 * for credential stuffing. Always returns a generic response; login/signup
 * UX should rely on those flows' own error messages.
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
    // Consume body so clients behave the same, but never reveal existence.
    await request.json().catch(() => null)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Check account error:', error)
    return NextResponse.json({ error: 'Failed to check account' }, { status: 500 })
  }
}
