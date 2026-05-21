import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'fallback-change-me'
)

// Log failed attempts
async function logAttempt(ip: string, email: string | null, success: boolean) {
  await prisma.loginAttempt.create({
    data: { ip, email, success }
  })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  
  try {
    const { code, email } = await request.json()
    
    if (!code || !email) {
      return NextResponse.json({ error: 'Code and email required' }, { status: 400 })
    }
    
    // Find the parent
    const parent = await prisma.parent.findUnique({ where: { email } })
    if (!parent) {
      await logAttempt(ip, email, false)
      return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
    }
    
    // Find unused, non-expired codes for this parent
    const codes = await prisma.recoveryCode.findMany({
      where: {
        parentId: parent.id,
        usedAt: null,
        expiresAt: { gt: new Date() }
      }
    })
    
    // Try each code
    let matched = false
    for (const savedCode of codes) {
      if (bcrypt.compareSync(code, savedCode.codeHash)) {
        matched = true
        // Mark as used
        await prisma.recoveryCode.update({
          where: { id: savedCode.id },
          data: { usedAt: new Date() }
        })
        break
      }
    }
    
    if (!matched) {
      await logAttempt(ip, email, false)
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 })
    }
    
    await logAttempt(ip, email, true)
    
    // Generate a one-time JWT for password reset
    const resetToken = await new SignJWT({ parentId: parent.id, type: 'recovery' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('15m')
      .sign(JWT_SECRET)
    
    return NextResponse.json({
      message: 'Code accepted. Set your new password below.',
      resetToken,
      parentId: parent.id
    })
    
  } catch (error) {
    console.error('Recovery code use error:', error)
    return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 })
  }
}
