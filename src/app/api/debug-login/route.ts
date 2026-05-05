import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body
    
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
    
    // Create response with session cookie using __Host prefix
    const response = NextResponse.json({
      success: true,
      user: { id: parent.id, email: parent.email, name: parent.name }
    })
    
    // Set session cookie using NextAuth's expected cookie name
    const sessionData = JSON.stringify({
      id: parent.id,
      email: parent.email,
      name: parent.name,
      familyId: parent.family?.id,
    })
    
    const sessionToken = Buffer.from(sessionData).toString('base64url')
    
    // Use the secure __Host prefix
    response.cookies.set('__Host-next-auth.session-token', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })
    
    return response
  } catch (error) {
    console.error('[DEBUG-LOGIN] Error:', error)
    return NextResponse.json({ error: 'Server error', details: String(error) }, { status: 500 })
  }
}
