import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { allowed, retryAfter } = checkRateLimit(ip, 'check-account', 10, 15 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const { email } = await request.json()
    
    const user = await prisma.parent.findUnique({
      where: { email },
      select: { id: true }
    })

    return NextResponse.json({
      hasAccount: !!user,
    })
  } catch (error) {
    console.error('Check account error:', error)
    return NextResponse.json({ error: 'Failed to check account' }, { status: 500 })
  }
}
