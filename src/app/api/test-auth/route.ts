import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    
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
    
    const sessionToken = Buffer.from(JSON.stringify({
      id: parent.id,
      email: parent.email,
      name: parent.name,
      familyId: parent.family?.id,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000
    })).toString('base64')
    
    const cookieStore = await cookies()
    cookieStore.set('test-session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })
    
    return NextResponse.json({
      success: true,
      user: { id: parent.id, email: parent.email, name: parent.name }
    })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
