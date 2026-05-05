import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'
import { Prisma } from '@prisma/client'
import { checkRateLimit } from '@/lib/auth/helpers'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  familyName: z.string().min(1, 'Family name is required'),
})

export async function POST(request: Request) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
  if (!checkRateLimit(ip, 3, 3600000)) { // 3 attempts per hour for registration
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      { status: 429 }
    )
  }

  // Check for required environment variables
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not configured')
    return NextResponse.json(
      { error: 'Server configuration error. Please contact support.' },
      { status: 500 }
    )
  }

  try {
    const json = await request.json()
    const body = registerSchema.parse(json)
    const { email, password, name, familyName } = body

    // Check if user already exists
    const existingUser = await prisma.parent.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create parent and family in a transaction
    const parent = await prisma.parent.create({
      data: {
        email,
        password: hashedPassword,
        name,
        family: {
          create: {
            name: familyName,
          },
        },
      },
      include: {
        family: true,
      },
    })

    return NextResponse.json({
      id: parent.id,
      email: parent.email,
      name: parent.name,
      familyId: parent.family?.id,
    })
  } catch (error) {
    console.error('Registration error:', error)

    // Handle specific Prisma errors
    if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error('Database connection failed. Check DATABASE_URL.')
      return NextResponse.json(
        { error: 'Database connection error. Please try again later.' },
        { status: 503 }
      )
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique constraint violation
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}
