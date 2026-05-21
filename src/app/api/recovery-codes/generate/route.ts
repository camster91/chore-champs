import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// Generate 8 readable single-use codes
function generateRecoveryCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < 8; i++) {
    // 16-char alphanumeric, chunked for readability: XXXX-XXXX-XXXX-XXXX
    const raw = crypto.randomBytes(10).toString('base64url').slice(0, 16).toUpperCase()
    const formatted = raw.match(/.{1,4}/g)!.join('-')
    codes.push(formatted)
  }
  return codes
}

// Check IP rate limit using Prisma LoginAttempt logs
async function isRateLimited(ip: string, email?: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - 15 * 60 * 1000) // 15 min
  
  const ipAttempts = await prisma.loginAttempt.count({
    where: {
      ip,
      createdAt: { gte: windowStart },
      success: false,
    }
  })
  
  if (ipAttempts >= 10) return true // 10 failed per 15 min
  
  if (email) {
    const emailAttempts = await prisma.loginAttempt.count({
      where: {
        email,
        createdAt: { gte: windowStart },
        success: false,
      }
    })
    if (emailAttempts >= 5) return true // 5 failed per 15 min per email
  }
  
  return false
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  // Require auth to generate codes
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    // Rate limit: max 1 generation per hour per user
    const recentGen = await prisma.recoveryCode.count({
      where: {
        parentId: session.user.id,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
      }
    })
    if (recentGen > 0) {
      return NextResponse.json(
        { error: 'Recovery codes can only be generated once per hour.' },
        { status: 429 }
      )
    }
    
    // Remove any existing unused codes
    await prisma.recoveryCode.deleteMany({
      where: { parentId: session.user.id, usedAt: null }
    })
    
    const plaintextCodes = generateRecoveryCodes()
    const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 180 days
    
    // Hash each code with bcrypt
    await Promise.all(
      plaintextCodes.map(code =>
        prisma.recoveryCode.create({
          data: {
            parentId: session.user.id,
            codeHash: bcrypt.hashSync(code, 12),
            expiresAt,
          }
        })
      )
    )
    
    return NextResponse.json({
      codes: plaintextCodes,
      expireAt: expiresAt.toISOString(),
      message: 'Save these codes somewhere secure. They will never be shown again.'
    })
    
  } catch (error) {
    console.error('Generate recovery codes error:', error)
    return NextResponse.json({ error: 'Failed to generate codes' }, { status: 500 })
  }
}
