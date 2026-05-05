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

  const inviteUrl = `https://kidschore.ashbi.ca/invite/${token}`
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

  // Update user's familyId (this field doesn't exist in DB but we need it for auth)
  // For now, we'll update the Family table to include this parent
  await prisma.family.update({
    where: { id: invite.familyId },
    data: { parentId: session.user.id }
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

  return await prisma.familyInvite.findMany({
    where: {
      familyId: session.user.familyId,
      acceptedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function cancelInvite(inviteId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  await prisma.familyInvite.delete({
    where: { 
      id: inviteId,
      familyId: session.user.familyId
    }
  })
}
