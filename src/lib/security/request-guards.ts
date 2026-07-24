import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'

/**
 * Same-origin guard for custom mutating API routes.
 * Cookie auth (SameSite=Lax) mitigates classic CSRF; this rejects
 * cross-site POSTs that still carry cookies in some browsers/apps.
 */
export function assertSameOrigin(request: Request): NextResponse | null {
  const allowedHosts = getAllowedHosts()
  if (allowedHosts.length === 0) {
    // Misconfigured deploy — fail closed in production.
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return null
  }

  const origin = request.headers.get('origin')
  if (origin) {
    try {
      const host = new URL(origin).host
      if (allowedHosts.includes(host)) return null
    } catch {
      /* invalid origin */
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const referer = request.headers.get('referer')
  if (referer) {
    try {
      const host = new URL(referer).host
      if (allowedHosts.includes(host)) return null
    } catch {
      /* invalid referer */
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Non-browser clients (health checks, curl) often omit both. Allow only
  // outside production so real browsers are still Origin-checked in prod.
  if (process.env.NODE_ENV !== 'production') {
    return null
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

function getAllowedHosts(): string[] {
  const hosts = new Set<string>()
  const candidates = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ]
  for (const raw of candidates) {
    if (!raw) continue
    try {
      hosts.add(new URL(raw).host)
    } catch {
      /* ignore */
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    hosts.add('localhost:3000')
    hosts.add('127.0.0.1:3000')
  }
  return [...hosts]
}

/**
 * CSRF + per-identity rate limit for mutating API handlers.
 */
export async function guardMutatingRequest(
  request: Request,
  action: string,
  opts?: { userId?: string; maxAttempts?: number; windowMs?: number }
): Promise<NextResponse | null> {
  const csrf = assertSameOrigin(request)
  if (csrf) return csrf

  const identity = opts?.userId || getClientIp(request)
  const maxAttempts = opts?.maxAttempts ?? 60
  const windowMs = opts?.windowMs ?? 60_000
  const { allowed, retryAfter } = await checkRateLimit(
    identity,
    `mutate:${action}`,
    maxAttempts,
    windowMs
  )
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }
  return null
}
