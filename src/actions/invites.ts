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
    // If they already have an account, directly add them to the family
    if (existingUser.familyId === session.user.familyId) {
      return { message: 'This person is already part of your family!', direct: true }
    }
    // Add them to the family directly
    await prisma.parent.update({
      where: { id: existingUser.id },
      data: { familyId: session.user.familyId }
    })
    revalidatePath('/settings')
    return { message: 'Added to your family! They can now log in.', direct: true }
  }

  // Generate magic link token (valid for 7 days)
  const token = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const invite = await prisma.familyInvite.create({
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
    message: 'Invitation sent!', 
    inviteUrl,
    direct: false 
  }
}

export async function acceptInvite(token: string) {
  // Find the invite
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

  // Get current session
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error('Please sign in first to accept the invitation')
  }

  const user = await prisma.parent.findUnique({ where: { id: session.user.id } })
  if (!user) {
    throw new Error('User not found')
  }

  // If user already has a family, they need to leave it first
  if (user.familyId && user.familyId !== invite.familyId) {
    return { 
      requiresLeave: true, 
      message: 'You need to leave your current family first to join a new one.',
      inviteFamilyId: invite.familyId 
    }
  }

  // Add user to the family
  await prisma.parent.update({
    where: { id: session.user.id },
    data: { familyId: invite.familyId }
  })

  // Mark invite as accepted
  await prisma.familyInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() }
  })

  // Update invite token so it can't be reused
  await prisma.familyInvite.update({
    where: { id: invite.id },
    data: { token: 'USED-' + token }
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
      familyId: session.user.familyId // Ensure it belongs to their family
    }
  })
}

export async function resendInvite(inviteId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const invite = await prisma.familyInvite.findUnique({
    where: { id: inviteId }
  })

  if (!invite || invite.familyId !== session.user.familyId) {
    throw new Error('Invite not found')
  }

  // Generate new token
  const newToken = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.familyInvite.update({
    where: { id: inviteId },
    data: { token: newToken, expiresAt }
  })

  const inviteUrl = `https://kidschore.ashbi.ca/invite/${newToken}`
  return { inviteUrl }
}
