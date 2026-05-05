import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { signToken } from '@/lib/auth/helpers'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }
    
    const parent = await prisma.parent.findUnique({
      where: { email },
      include: { family: true },
    })
    
    if (!parent) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }
    
    const isValid = await bcrypt.compare(password, parent.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }
    
    // Create JWT token directly
    const token = await signToken({
      id: parent.id,
      email: parent.email,
      name: parent.name,
      familyId: parent.family?.id,
    })
    
    // Set the session cookie manually
    const response = NextResponse.json({
      success: true,
      user: { id: parent.id, email: parent.email, name: parent.name }
    })
    
    response.cookies.set('next-auth.session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })
    
    return response
  } catch (error) {
    console.error('Debug login error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
