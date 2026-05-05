import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function POST(request: Request) {
  console.log('[DEBUG-LOGIN] Starting...')
  
  try {
    const body = await request.json()
    const { email, password } = body
    
    console.log('[DEBUG-LOGIN] Received email:', email)
    
    if (!email || !password) {
      console.log('[DEBUG-LOGIN] Missing credentials')
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }
    
    console.log('[DEBUG-LOGIN] Looking up user...')
    const parent = await prisma.parent.findUnique({
      where: { email },
      include: { family: true },
    })
    
    console.log('[DEBUG-LOGIN] User found:', !!parent, parent?.email)
    
    if (!parent) {
      console.log('[DEBUG-LOGIN] User not found')
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }
    
    console.log('[DEBUG-LOGIN] Comparing password...')
    console.log('[DEBUG-LOGIN] Input password:', password)
    console.log('[DEBUG-LOGIN] Stored hash:', parent.password.substring(0, 30) + '...')
    
    const isValid = await bcrypt.compare(password, parent.password)
    console.log('[DEBUG-LOGIN] Password valid:', isValid)
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }
    
    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      user: { id: parent.id, email: parent.email, name: parent.name }
    })
    
    // Set session cookie
    const sessionData = JSON.stringify({
      id: parent.id,
      email: parent.email,
      name: parent.name,
      familyId: parent.family?.id,
    })
    
    const sessionToken = Buffer.from(sessionData).toString('base64url')
    
    response.cookies.set('next-auth.session-token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })
    
    response.cookies.set('session-test', 'hello', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })
    
    console.log('[DEBUG-LOGIN] Set cookies, sending response')
    return response
  } catch (error) {
    console.error('[DEBUG-LOGIN] Error:', error)
    return NextResponse.json({ error: 'Server error', details: String(error) }, { status: 500 })
  }
}
