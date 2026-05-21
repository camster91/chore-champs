import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'fallback-change-me'
)

export async function POST(request: NextRequest) {
  try {
    const { resetToken, newPassword } = await request.json()
    
    if (!resetToken || !newPassword) {
      return NextResponse.json({ error: 'Missing token or password' }, { status: 400 })
    }
    
    // Verify token
    let decoded: { parentId: string; type: string }
    try {
      const { payload } = await jwtVerify(resetToken, JWT_SECRET)
      decoded = payload as { parentId: string; type: string }
    } catch {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 401 })
    }

    if (decoded.type !== 'recovery') {
      return NextResponse.json({ error: 'Invalid token type' }, { status: 401 })
    }
    
    // Validate password length
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    
    // Find and update parent
    const parent = await prisma.parent.findUnique({
      where: { id: decoded.parentId }
    })
    
    if (!parent) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    
    await prisma.parent.update({
      where: { id: parent.id },
      data: { password: hashedPassword }
    })
    
    return NextResponse.json({ message: 'Password updated successfully' })
    
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
