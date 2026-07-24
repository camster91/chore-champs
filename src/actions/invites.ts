'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'
import { createInviteSchema } from '@/lib/validation/schemas'
import { getAuthenticatedFamily } from '@/lib/auth/helpers'

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

export async function createFamilyInvite(email: string, role: string = 'MEMBER') {
  const auth = await getAuthenticatedFamily()
  if (!auth) {
    throw new Error('Unauthorized')
  }
  if (auth.role !== 'OWNER') {
    throw new Error('Only the family owner can send invitations')
  }

  const parsed = createInviteSchema.safeParse({ email, role })
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid invite')
  }

  const existingUser = await prisma.parent.findUnique({
    where: { email: parsed.data.email },
  })
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
      email: parsed.data.email,
      familyId: auth.familyId,
      role: parsed.data.role,
      token,
      expiresAt,
      createdById: auth.userId,
    },
  })

  if (!process.env.NEXTAUTH_URL) {
    throw new Error('NEXTAUTH_URL is not configured')
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
    throw new Error('Invalid invitation')
  }

  if (invite.acceptedAt) {
    throw new Error('This invitation has already been used')
  }

  if (new Date() > invite.expiresAt) {
    throw new Error('This invitation has expired')
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error('Please sign in first to accept the invitation')
  }

  const parent = await prisma.parent.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  })

  if (!parent || parent.email.toLowerCase() !== invite.email.toLowerCase()) {
    throw new Error('This invitation was sent to a different email address')
  }

  const existingFamily = await prisma.family.findUnique({
    where: { parentId: session.user.id },
  })

  const existingMembership = await prisma.familyMember.findFirst({
    where: { parentId: session.user.id },
  })

  if (existingFamily || existingMembership) {
    throw new Error(
      'You already belong to a family. Leave your current family before accepting a new invitation.'
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
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return []
  }

  try {
    return await prisma.familyInvite.findMany({
      where: {
        familyId: session.user.familyId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: SAFE_INVITE_SELECT,
      orderBy: { createdAt: 'desc' },
    })
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string }
    if (
      err?.code === 'P2021' ||
      err?.message?.includes('does not exist in the current database')
    ) {
      return []
    }
    throw error
  }
}

export async function cancelInvite(inviteId: string) {
  const auth = await getAuthenticatedFamily()
  if (!auth) {
    throw new Error('Unauthorized')
  }
  if (auth.role !== 'OWNER') {
    throw new Error('Only the family owner can cancel invitations')
  }

  const invite = await prisma.familyInvite.findFirst({
    where: { id: inviteId, familyId: auth.familyId },
  })
  if (!invite) {
    throw new Error('Invite not found')
  }

  await prisma.familyInvite.delete({ where: { id: inviteId } })
}
