import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'
import { registerSchema } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
    }

    // Validate with schema
    const parsed = registerSchema.safeParse({ name, email, password })
    if (!parsed.success) {
      const errors = parsed.error.errors.map(e => e.message).join(', ')
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

    return NextResponse.json({
      success: true,
      parentId: parent.id,
      message: 'Account created! Signing you in...'
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 })
  }
}
