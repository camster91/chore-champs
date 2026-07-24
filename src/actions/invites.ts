'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'
import { AppError, getUserFriendlyError, logError } from '@/lib/utils/error'

function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function throwSafe(context: string, error: unknown): never {
  logError(context, error)
  if (error instanceof AppError) throw error
  throw new AppError(getUserFriendlyError(error), 500)
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

export async function createFamilyInvite(email: string, _unusedRole?: string) {
  void _unusedRole
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  const normalized = normalizeEmail(email)
  if (!normalized || !normalized.includes('@')) {
    throw new AppError('Valid email is required', 400)
  }

  // Role is never client-controlled — invites are always MEMBER.
  const role = 'MEMBER'

  try {
    const existingUser = await prisma.parent.findUnique({ where: { email: normalized } })
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
        email: normalized,
        familyId: session.user.familyId,
        role,
        token,
        expiresAt,
        createdById: session.user.id,
      },
    })

    if (!process.env.NEXTAUTH_URL) {
      throw new AppError('NEXTAUTH_URL is not configured', 500)
    }
    const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`
    return {
      message: 'Invitation created!',
      inviteUrl,
      direct: false,
    }
  } catch (error) {
    if (error instanceof AppError) throw error
    throwSafe('createFamilyInvite', error)
  }
}

export async function acceptInvite(token: string) {
  try {
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
      include: { _count: { select: { kids: true, chores: true } } },
    })

    const existingMembership = await prisma.familyMember.findFirst({
      where: { parentId: session.user.id },
    })

    if (existingMembership) {
      throw new AppError(
        'You already belong to a family. Leave your current family before accepting a new invitation.',
        400
      )
    }

    if (existingFamily) {
      const isEmpty = existingFamily._count.kids === 0 && existingFamily._count.chores === 0
      if (!isEmpty) {
        throw new AppError(
          'You already belong to a family. Leave your current family before accepting a new invitation.',
          400
        )
      }
      await prisma.family.delete({ where: { id: existingFamily.id } })
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

    return { success: true, message: 'Welcome to the family!', familyId: invite.familyId }
  } catch (error) {
    if (error instanceof AppError) throw error
    throwSafe('acceptInvite', error)
  }
}

export async function getPendingInvites() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return []
  }

  try {
    // Never return raw invite tokens in list responses — they are bearer credentials.
    return await prisma.familyInvite.findMany({
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
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string }
    if (err?.code === 'P2021' || err?.message?.includes('does not exist in the current database')) {
      return []
    }
    throwSafe('getPendingInvites', error)
  }
}

export async function cancelInvite(inviteId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  try {
    const invite = await prisma.familyInvite.findFirst({
      where: { id: inviteId, familyId: session.user.familyId },
    })
    if (!invite) {
      throw new AppError('Invite not found', 404)
    }

    await prisma.familyInvite.delete({ where: { id: inviteId } })
  } catch (error) {
    if (error instanceof AppError) throw error
    throwSafe('cancelInvite', error)
  }
}
