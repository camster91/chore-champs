import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import crypto from 'crypto'
import { checkRateLimit } from '@/lib/rate-limiter'
import { getAuthenticatedFamily, unauthorized, forbidden, notFound, badRequest } from '@/lib/auth/helpers'
import { inviteEmailSchema } from '@/lib/validation/schemas'

function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export async function GET() {
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
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(invites)
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  if (!auth.isOwner) {
    return forbidden('Only the family owner can send invites')
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
    const parsed = inviteEmailSchema.safeParse(body?.email)
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message || 'Email is required')
    }
    const email = parsed.data

    // Role is never accepted from the client — invites are always MEMBER.
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
        role: 'MEMBER',
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
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  if (!auth.isOwner) {
    return forbidden('Only the family owner can cancel invites')
  }

  const { searchParams } = new URL(request.url)
  const inviteId = searchParams.get('id')

  if (!inviteId) {
    return badRequest('Invite ID required')
  }

  const invite = await prisma.familyInvite.findFirst({
    where: { id: inviteId, familyId: auth.familyId },
  })

  if (!invite) return notFound('Invite not found')

  await prisma.familyInvite.delete({ where: { id: inviteId } })

  return NextResponse.json({ success: true })
}
