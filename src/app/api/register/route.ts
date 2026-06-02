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

    // Validate with schema
    const parsed = registerSchema.safeParse({ name, email, password })
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => e.message).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    // Check if email already exists
    const existingParent = await prisma.parent.findUnique({
      where: { email }
    })

    if (existingParent) {
      return NextResponse.json({ error: 'An account with this email already exists. Please sign in.' }, { status: 400 })
    }

    // Create parent with hashed password
    const hashedPassword = await bcrypt.hash(password, 12)
    const parent = await prisma.parent.create({
      data: {
        name,
        email,
        password: hashedPassword,
      }
    })

    // Auto-create a family for the new parent
    await prisma.family.create({
      data: {
        name: `${name}'s Family`,
        parentId: parent.id,
      }
    })

    return NextResponse.json({
      success: true,
      parentId: parent.id,
      message: 'Account created! Signing you in...'
    })
  } catch (error) {
    // Distinguish between connection errors (user-facing) vs internal errors (logged)
    const message = error instanceof Error ? error.message : String(error)
    const isConnectionError = message.includes('connection') || message.includes('timeout') || message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')

    if (isConnectionError) {
      return NextResponse.json({ error: 'Database connection error. Please try again later.' }, { status: 500 })
    }
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 })
  }
}
