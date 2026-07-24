import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'
import { guardMutatingRequest } from '@/lib/security/request-guards'
import { z } from 'zod'

const emailSchema = z.object({
  email: z.string().email().max(254),
})

/**
 * Intentionally does NOT reveal whether an email is registered.
 * Always returns a generic success payload after a small fixed delay
 * to reduce timing/oracle attacks.
 */
export async function POST(request: Request) {
  const blocked = await guardMutatingRequest(request, 'check-account', {
    maxAttempts: 10,
    windowMs: 15 * 60 * 1000,
  })
  if (blocked) return blocked

  const ip = getClientIp(request)
  const { allowed, retryAfter } = await checkRateLimit(ip, 'check-account', 10, 15 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  const started = Date.now()
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = emailSchema.safeParse(body)
    if (parsed.success) {
      // Touch the DB so timing is similar whether or not the row exists,
      // but never return hasAccount to the client.
      await prisma.parent.findUnique({
        where: { email: parsed.data.email.toLowerCase().trim() },
        select: { id: true },
      })
    }
  } catch (error) {
    console.error('Check account error:', error)
  }

  const elapsed = Date.now() - started
  if (elapsed < 200) {
    await new Promise((r) => setTimeout(r, 200 - elapsed))
  }

  return NextResponse.json({ ok: true })
}
