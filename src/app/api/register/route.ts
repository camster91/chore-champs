import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'
import { registerSchema } from '@/lib/validation/schemas'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const { allowed, retryAfter } = await checkRateLimit(ip, 'register', 5, 15 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const body = await request.json()
    const { name, email, password } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
    }

    // Validate + normalize email (lowercase) via schema transform
    const parsed = registerSchema.safeParse({ name, email, password })
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => e.message).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { name: safeName, email: safeEmail, password: safePassword } = parsed.data

    const existingParent = await prisma.parent.findUnique({
      where: { email: safeEmail },
    })

    if (existingParent) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in.' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(safePassword, 12)
    const parent = await prisma.parent.create({
      data: {
        name: safeName,
        email: safeEmail,
        password: hashedPassword,
      },
    })

    await prisma.family.create({
      data: {
        name: `${safeName}'s Family`,
        parentId: parent.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Account created! Signing you in...',
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    )
  }
}
