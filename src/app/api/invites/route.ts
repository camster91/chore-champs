import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import crypto from 'crypto'
import { checkRateLimit } from '@/lib/rate-limiter'
import { logError } from '@/lib/utils/error'

function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.familyId) {
      return NextResponse.json([])
    }

    // Omit token — invite tokens are bearer credentials for joining a family.
    const invites = await prisma.familyInvite.findMany({
      where: {
        familyId: session.user.familyId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(invites)
  } catch (error) {
    logError('invites-GET', error)
    return NextResponse.json({ error: 'Failed to load invitations' }, { status: 500 })
  }
}

export async function POST(request: Request) {
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

  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? normalizeEmail(body.email) : ''

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Never trust client-supplied role — invites are always MEMBER.
    const role = 'MEMBER'

    const existingUser = await prisma.parent.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({
        message: 'This person already has an account. Send them an invite link!',
        direct: false,
      })
    }

    const token = generateToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await prisma.familyInvite.create({
      data: {
        email,
        familyId: session.user.familyId,
        role,
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
    logError('invites-POST', error)
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
    logError('invites-DELETE', error)
    return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 })
  }
}
