'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getRewards() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return []
  }

  return await prisma.reward.findMany({
    where: { familyId: session.user.familyId },
    orderBy: { cost: 'asc' }
  })
}

export async function createReward(data: {
  title: string
  description?: string
  cost: number
  icon?: string
  category?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  if (!Number.isInteger(data.cost) || data.cost < 1) {
    throw new Error('Reward cost must be a positive integer (>= 1)')
  }

  const reward = await prisma.reward.create({
    data: {
      title: data.title,
      description: data.description,
      cost: data.cost,
      icon: data.icon || '🎁',
      category: data.category,
      familyId: session.user.familyId,
    }
  })

  revalidatePath('/rewards')
  return reward
}

export async function redeemReward(rewardId: string, kidId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const reward = await prisma.reward.findUnique({
    where: { id: rewardId }
  })

  if (!reward) {
    throw new Error('Reward not found')
  }

  const kid = await prisma.kid.findFirst({
    where: { id: kidId, familyId: session.user.familyId },
    include: { 
      choreAssignments: { 
        where: { status: 'COMPLETED' },
        include: { chore: true }
      } 
    }
  })

  if (!kid) {
    throw new Error('Kid not found')
  }

  const totalPoints = kid.choreAssignments.reduce((sum, a) => sum + (a.chore?.basePoints || 5), 0)

  if (totalPoints < reward.cost) {
    throw new Error('Insufficient points')
  }

  const redemption = await prisma.redemption.create({
    data: {
      rewardId,
      kidId,
      points: reward.cost
    }
  })

  revalidatePath('/rewards')
  revalidatePath('/dashboard')
  return redemption
}

export async function deleteReward(rewardId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  await prisma.reward.delete({ where: { id: rewardId } })
  revalidatePath('/rewards')
}
