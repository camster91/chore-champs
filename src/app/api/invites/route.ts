import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import crypto from 'crypto'
import { checkRateLimit } from '@/lib/rate-limiter'
import { inviteEmailSchema } from '@/lib/validation/schemas'

function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.familyId) {
      return NextResponse.json([])
    }

    const invites = await prisma.familyInvite.findMany({
      where: {
        familyId: session.user.familyId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(invites)
  } catch (error) {
    console.error('List invites error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { allowed, retryAfter } = await checkRateLimit(userId, 'invite-create', 10, 15 * 60 * 1000)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    const body = await request.json()
    const parsed = inviteEmailSchema.safeParse({ email: body?.email })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }
    const { email } = parsed.data

    const existingUser = await prisma.parent.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({
        message: 'This person already has an account. Send them an invite link!',
        direct: false,
      })
    }

    const token = generateToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Role is always MEMBER — clients cannot escalate to OWNER via invite.
    await prisma.familyInvite.create({
      data: {
        email,
        familyId: session.user.familyId,
        role: 'MEMBER',
        token,
        expiresAt,
        createdById: session.user.id,
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/invite/${token}`

    return NextResponse.json({
      message: 'Invitation created!',
      inviteUrl,
      direct: false,
    })
  } catch (error) {
    console.error('Create invite error:', error)
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const inviteId = searchParams.get('id')

    if (!inviteId) {
      return NextResponse.json({ error: 'Invite ID required' }, { status: 400 })
    }

    const invite = await prisma.familyInvite.findFirst({
      where: { id: inviteId, familyId: session.user.familyId },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    await prisma.familyInvite.delete({ where: { id: inviteId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
