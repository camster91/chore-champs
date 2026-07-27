import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import crypto from 'crypto'
import { checkRateLimit } from '@/lib/rate-limiter'
import { createInviteSchema } from '@/lib/validation/schemas'
import {
  getAuthenticatedFamily,
  unauthorized,
  forbidden,
} from '@/lib/auth/helpers'

function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

const SAFE_INVITE_SELECT = {
  id: true,
  email: true,
  role: true,
  expiresAt: true,
  createdAt: true,
} as const

export async function GET() {
  try {
    const auth = await getAuthenticatedFamily()
    if (!auth) {
      return NextResponse.json([])
    }

    const invites = await prisma.familyInvite.findMany({
      where: {
        familyId: auth.familyId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: SAFE_INVITE_SELECT,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(invites)
  } catch (error) {
    console.error('List invites error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedFamily()
  if (!auth) {
    return unauthorized()
  }
  if (auth.role !== 'OWNER') {
    return forbidden('Only the family owner can send invitations')
  }

  const { allowed, retryAfter } = await checkRateLimit(
    auth.userId,
    'invite-create',
    10,
    15 * 60 * 1000
  )
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const body = await request.json()
    const parsed = createInviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid invite' },
        { status: 400 }
      )
    }

    const { email, role } = parsed.data

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
        familyId: auth.familyId,
        role,
        token,
        expiresAt,
        createdById: auth.userId,
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
    const auth = await getAuthenticatedFamily()
    if (!auth) {
      return unauthorized()
    }
    if (auth.role !== 'OWNER') {
      return forbidden('Only the family owner can cancel invitations')
    }

    const { searchParams } = new URL(request.url)
    const inviteId = searchParams.get('id')

    if (!inviteId) {
      return NextResponse.json({ error: 'Invite ID required' }, { status: 400 })
    }

    const invite = await prisma.familyInvite.findFirst({
      where: { id: inviteId, familyId: auth.familyId },
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
