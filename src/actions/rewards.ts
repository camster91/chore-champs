'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedFamily } from '@/lib/auth/helpers'

export async function getRewards() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return []
  }

  return await prisma.reward.findMany({
    where: { familyId: session.user.familyId },
    orderBy: { cost: 'asc' },
    take: 100,
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

  const redemption = await prisma.$transaction(async (tx) => {
    const reward = await tx.reward.findFirst({
      where: { id: rewardId, familyId: session.user.familyId },
    })

    if (!reward) {
      throw new Error('Reward not found')
    }

    const kid = await tx.kid.findFirst({
      where: { id: kidId, familyId: session.user.familyId },
      select: { id: true },
    })

    if (!kid) {
      throw new Error('Kid not found')
    }

    // The conditional update makes concurrent redemption retries atomic: only
    // one transaction can decrement a balance that still covers the cost.
    const charged = await tx.kid.updateMany({
      where: {
        id: kid.id,
        familyId: session.user.familyId,
        points: { gte: reward.cost },
      },
      data: { points: { decrement: reward.cost } },
    })

    if (charged.count !== 1) {
      throw new Error('Insufficient points')
    }

    return tx.redemption.create({
      data: { rewardId, kidId, points: reward.cost },
    })
  })

  revalidatePath('/rewards')
  revalidatePath('/dashboard')
  return redemption
}

export async function deleteReward(rewardId: string) {
  const auth = await getAuthenticatedFamily()
  if (!auth) {
    throw new Error('Unauthorized')
  }
  if (auth.role !== 'OWNER') {
    throw new Error('Only the family owner can delete rewards')
  }

  const reward = await prisma.reward.findFirst({
    where: { id: rewardId, familyId: auth.familyId }
  })
  if (!reward) {
    throw new Error('Reward not found')
  }

  await prisma.reward.delete({ where: { id: rewardId } })
  revalidatePath('/rewards')
}
