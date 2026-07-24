import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import crypto from 'crypto'
import { checkRateLimit } from '@/lib/rate-limiter'
import { inviteEmailSchema } from '@/lib/validation/schemas'
import { requireFamilyOwner } from '@/lib/auth/helpers'
import { guardMutatingRequest } from '@/lib/security/request-guards'

function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export async function GET() {
  try {
    const { auth, error } = await requireFamilyOwner()
    if (error) {
      // Members may view empty list rather than 403 for GET UX
      if (error.status === 401) return NextResponse.json([])
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
  } catch (error) {
    console.error('List invites error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { auth, error } = await requireFamilyOwner()
    if (error) return error

    const blocked = await guardMutatingRequest(request, 'invite-create', {
      userId: auth.userId,
      maxAttempts: 10,
      windowMs: 15 * 60 * 1000,
    })
    if (blocked) return blocked

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
  try {
    const { auth, error } = await requireFamilyOwner()
    if (error) return error

    const blocked = await guardMutatingRequest(request, 'invite-delete', {
      userId: auth.userId,
    })
    if (blocked) return blocked

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
