'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export async function createFamilyInvite(email: string, role: string = 'MEMBER') {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  // Check if email already has an account
  const existingUser = await prisma.parent.findUnique({ where: { email } })
  if (existingUser) {
    // Users can only be in one family at a time
    // If they're already in a family, they need to use invites
    return { message: 'This person already has an account. Send them an invite link!', direct: false }
  }

  // Generate magic link token (valid for 7 days)
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
    }
  })

  if (!process.env.NEXTAUTH_URL) {
    throw new Error('NEXTAUTH_URL is not configured')
  }
  const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`
  return { 
    message: 'Invitation created!', 
    inviteUrl,
    direct: false 
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

  // Verify the invitee email matches the session user
  const parent = await prisma.parent.findUnique({
    where: { id: session.user.id },
    select: { email: true }
  })

  if (!parent || parent.email.toLowerCase() !== invite.email.toLowerCase()) {
    throw new Error('This invitation was sent to a different email address')
  }

  // Check if user already belongs to a family (owner or member)
  const existingFamily = await prisma.family.findUnique({
    where: { parentId: session.user.id }
  })

  const existingMembership = await prisma.familyMember.findFirst({
    where: { parentId: session.user.id }
  })

  if (existingFamily || existingMembership) {
    throw new Error('You already belong to a family. Leave your current family before accepting a new invitation.')
  }

  // Add user as a family member (do NOT replace the owner)
  await prisma.familyMember.create({
    data: {
      familyId: invite.familyId,
      parentId: session.user.id,
      role: invite.role || 'MEMBER'
    }
  })

  // Mark invite as accepted
  await prisma.familyInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() }
  })

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
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    })
  } catch (error: unknown) {
    // If FamilyInvite table doesn't exist (P2021), return empty array
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
    throw new Error('Unauthorized')
  }

  const invite = await prisma.familyInvite.findFirst({
    where: { id: inviteId, familyId: session.user.familyId }
  })
  if (!invite) {
    throw new Error('Invite not found')
  }

  await prisma.familyInvite.delete({ where: { id: inviteId } })
}
