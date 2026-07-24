import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'
import { logError } from '@/lib/utils/error'

type Props = {
  params: Promise<{ token: string }>
}

export async function POST(request: Request, { params }: Props) {
  const ip = getClientIp(request)
  const { allowed, retryAfter } = await checkRateLimit(ip, 'invite-accept', 10, 15 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const { token } = await params

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ needsLogin: true }, { status: 401 })
    }

    const invite = await prisma.familyInvite.findUnique({
      where: { token },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
    }

    if (invite.acceptedAt) {
      return NextResponse.json({ error: 'This invitation has already been used' }, { status: 400 })
    }

    if (new Date() > invite.expiresAt) {
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 })
    }

    const parent = await prisma.parent.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    })

    if (!parent || parent.email.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address.' },
        { status: 403 }
      )
    }

    // Block multi-family membership (mirrors src/actions/invites.ts)
    const existingFamily = await prisma.family.findUnique({
      where: { parentId: session.user.id },
      include: { _count: { select: { kids: true, chores: true } } },
    })

    const existingMembership = await prisma.familyMember.findFirst({
      where: { parentId: session.user.id },
    })

    if (existingMembership) {
      return NextResponse.json(
        {
          error:
            'You already belong to a family. Leave your current family before accepting a new invitation.',
        },
        { status: 400 }
      )
    }

    // If signup auto-created an empty personal family, remove it so the user
    // can join the invited family (single-family constraint).
    if (existingFamily) {
      const isEmpty = existingFamily._count.kids === 0 && existingFamily._count.chores === 0
      if (!isEmpty) {
        return NextResponse.json(
          {
            error:
              'You already belong to a family. Leave your current family before accepting a new invitation.',
          },
          { status: 400 }
        )
      }
      await prisma.family.delete({ where: { id: existingFamily.id } })
    }

    // Never trust invite.role for OWNER elevation — force MEMBER.
    await prisma.$transaction([
      prisma.familyMember.create({
        data: {
          familyId: invite.familyId,
          parentId: session.user.id,
          role: 'MEMBER',
        },
      }),
      prisma.familyInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ])

    revalidatePath('/settings')
    revalidatePath('/dashboard')

    return NextResponse.json({
      success: true,
      message: 'Welcome to the family!',
      familyId: invite.familyId,
    })
  } catch (error) {
    logError('invite-accept', error)
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
  }
}
