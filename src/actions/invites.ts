'use server'

import { getAuthenticatedFamily } from '@/lib/auth/helpers'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'
import { inviteEmailSchema } from '@/lib/validation/schemas'
import { AppError, logError } from '@/lib/utils/error'

function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export async function createFamilyInvite(email: string) {
  const auth = await getAuthenticatedFamily()
  if (!auth) {
    throw new AppError('Unauthorized', 401)
  }

  // Only owners may invite; role is never client-controlled.
  if (!auth.isOwner) {
    throw new AppError('Only the family owner can send invites', 403)
  }

  const parsed = inviteEmailSchema.safeParse(email)
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message || 'Invalid email', 400)
  }
  const normalizedEmail = parsed.data

  const existingUser = await prisma.parent.findUnique({ where: { email: normalizedEmail } })
  if (existingUser) {
    return {
      message: 'This person already has an account. Send them an invite link!',
      direct: false,
    }
  }

  const token = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.familyInvite.create({
    data: {
      email: normalizedEmail,
      familyId: auth.familyId,
      role: 'MEMBER',
      token,
      expiresAt,
      createdById: auth.userId,
    },
  })

  if (!process.env.NEXTAUTH_URL) {
    throw new AppError('Invite service is not configured', 500)
  }
  const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`
  return {
    message: 'Invitation created!',
    inviteUrl,
    direct: false,
  }
}

export async function acceptInvite(token: string) {
  const invite = await prisma.familyInvite.findUnique({ where: { token } })

  if (!invite) {
    throw new AppError('Invalid invitation', 404)
  }

  if (invite.acceptedAt) {
    throw new AppError('This invitation has already been used', 400)
  }

  if (new Date() > invite.expiresAt) {
    throw new AppError('This invitation has expired', 400)
  }

  const { getServerSession } = await import('next-auth')
  const { authOptions } = await import('@/lib/auth/auth')
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new AppError('Please sign in first to accept the invitation', 401)
  }

  const parent = await prisma.parent.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  })

  if (!parent || parent.email.toLowerCase() !== invite.email.toLowerCase()) {
    throw new AppError('This invitation was sent to a different email address', 403)
  }

  const existingFamily = await prisma.family.findUnique({
    where: { parentId: session.user.id },
  })

  const existingMembership = await prisma.familyMember.findFirst({
    where: { parentId: session.user.id },
  })

  if (existingFamily || existingMembership) {
    throw new AppError(
      'You already belong to a family. Leave your current family before accepting a new invitation.',
      400
    )
  }

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

  return { success: true, message: 'Welcome to the family!' }
}

export async function getPendingInvites() {
  const auth = await getAuthenticatedFamily()
  if (!auth) {
    return []
  }

  try {
    return await prisma.familyInvite.findMany({
      where: {
        familyId: auth.familyId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string }
    if (err?.code === 'P2021' || err?.message?.includes('does not exist in the current database')) {
      return []
    }
    logError('getPendingInvites', error)
    throw new AppError('Failed to load invites', 500)
  }
}

export async function cancelInvite(inviteId: string) {
  const auth = await getAuthenticatedFamily()
  if (!auth) {
    throw new AppError('Unauthorized', 401)
  }

  if (!auth.isOwner) {
    throw new AppError('Only the family owner can cancel invites', 403)
  }

  const invite = await prisma.familyInvite.findFirst({
    where: { id: inviteId, familyId: auth.familyId },
  })
  if (!invite) {
    throw new AppError('Invite not found', 404)
  }

  await prisma.familyInvite.delete({ where: { id: inviteId } })
}
