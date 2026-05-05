import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { name, email } = await request.json()

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    // Check if email already exists
    const existingParent = await prisma.parent.findUnique({
      where: { email }
    })

    if (existingParent) {
      return NextResponse.json({ error: 'An account with this email already exists. Please sign in.' }, { status: 400 })
    }

    // Create parent with placeholder password
    const parent = await prisma.parent.create({
      data: {
        name,
        email,
        password: crypto.randomBytes(32).toString('hex'),
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Account created! You can now sign in.'
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 })
  }
}
