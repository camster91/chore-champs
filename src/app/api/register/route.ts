import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'
import { registerSchema } from '@/lib/validation/schemas'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'
import { guardMutatingRequest } from '@/lib/security/request-guards'
import { Prisma } from '@prisma/client'

const GENERIC_CREATE_ERROR =
  'Unable to create account. Try signing in, or use a different email.'

export async function POST(request: NextRequest) {
  const blocked = await guardMutatingRequest(request, 'register', {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
  })
  if (blocked) return blocked

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
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    const parsed = registerSchema.safeParse({ name, email, password })
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => e.message).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const existingParent = await prisma.parent.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    })

    // Same message whether the email is taken — no account enumeration.
    if (existingParent) {
      return NextResponse.json({ error: GENERIC_CREATE_ERROR }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 12)
    const parent = await prisma.parent.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: hashedPassword,
      },
    })

    await prisma.family.create({
      data: {
        name: `${parsed.data.name}'s Family`,
        parentId: parent.id,
      },
    })

    return NextResponse.json({
      success: true,
      parentId: parent.id,
      message: 'Account created! Signing you in...',
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json({ error: GENERIC_CREATE_ERROR }, { status: 400 })
    }

    const message = error instanceof Error ? error.message : String(error)
    const isConnectionError =
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ENOTFOUND')

    if (isConnectionError) {
      return NextResponse.json(
        { error: 'Database connection error. Please try again later.' },
        { status: 500 }
      )
    }
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    )
  }
}
