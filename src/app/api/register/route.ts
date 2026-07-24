import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'
import { registerSchema } from '@/lib/validation/schemas'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'
import { logError } from '@/lib/utils/error'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const { allowed, retryAfter } = await checkRateLimit(ip, 'register', 5, 15 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const body = await request.json()
    const { name, email, password, inviteToken } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
    }

    const parsed = registerSchema.safeParse({ name, email, password })
    if (!parsed.success) {
      const errors = parsed.error.issues.map((e) => e.message).join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const normalizedEmail = parsed.data.email.toLowerCase().trim()

    // If registering via invite, validate the token before creating the account.
    let validInvite: { id: string; familyId: string; email: string } | null = null
    if (typeof inviteToken === 'string' && inviteToken.length > 0) {
      const invite = await prisma.familyInvite.findUnique({ where: { token: inviteToken } })
      if (
        !invite ||
        invite.acceptedAt ||
        new Date() > invite.expiresAt ||
        invite.email.toLowerCase() !== normalizedEmail
      ) {
        return NextResponse.json(
          { error: 'Invalid or expired invitation for this email.' },
          { status: 400 }
        )
      }
      validInvite = { id: invite.id, familyId: invite.familyId, email: invite.email }
    }

    const existingParent = await prisma.parent.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingParent) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in.' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 12)

    const parent = await prisma.$transaction(async (tx) => {
      const created = await tx.parent.create({
        data: {
          name: parsed.data.name,
          email: normalizedEmail,
          password: hashedPassword,
        },
      })

      if (validInvite) {
        // Join invited family — do NOT create a personal empty family.
        await tx.familyMember.create({
          data: {
            familyId: validInvite.familyId,
            parentId: created.id,
            role: 'MEMBER',
          },
        })
        await tx.familyInvite.update({
          where: { id: validInvite.id },
          data: { acceptedAt: new Date() },
        })
      } else {
        await tx.family.create({
          data: {
            name: `${parsed.data.name}'s Family`,
            parentId: created.id,
          },
        })
      }

      return created
    })

    return NextResponse.json({
      success: true,
      parentId: parent.id,
      message: validInvite
        ? 'Account created and invitation accepted! Signing you in...'
        : 'Account created! Signing you in...',
      joinedFamily: !!validInvite,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const isConnectionError =
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('ECONNREFUSED') ||
      message.includes('ENOTFOUND')

    if (isConnectionError) {
      return NextResponse.json(
        { error: 'Database connection error. Please try again later.' },
        { status: 500 }
      )
    }
    logError('register', error)
    return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 })
  }
}
