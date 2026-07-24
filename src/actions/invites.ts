'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'
import { inviteEmailSchema } from '@/lib/validation/schemas'
import { AppError } from '@/lib/utils/error'
import { claimFamilyInvite } from '@/lib/invites/claim'

function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/** Invites may only grant MEMBER — never OWNER via client input. */
const INVITE_ROLE = 'MEMBER'

export async function createFamilyInvite(email: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  const { email: safeEmail } = inviteEmailSchema.parse({ email })

  const existingUser = await prisma.parent.findUnique({ where: { email: safeEmail } })
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
      email: safeEmail,
      familyId: session.user.familyId,
      role: INVITE_ROLE,
      token,
      expiresAt,
      createdById: session.user.id,
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
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new AppError('Please sign in first to accept the invitation', 401)
  }

  const result = await claimFamilyInvite(token, session.user.id)
  if (!result.ok) {
    throw new AppError(result.error, result.status)
  }

  revalidatePath('/settings')
  revalidatePath('/dashboard')

  return { success: true, message: result.message }
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
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string }
    if (err?.code === 'P2021' || err?.message?.includes('does not exist in the current database')) {
      return []
    }
    throw error
  }
}

export async function cancelInvite(inviteId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  const invite = await prisma.familyInvite.findFirst({
    where: { id: inviteId, familyId: session.user.familyId },
  })
  if (!invite) {
    throw new AppError('Invite not found', 404)
  }

  await prisma.familyInvite.delete({ where: { id: inviteId } })
}
