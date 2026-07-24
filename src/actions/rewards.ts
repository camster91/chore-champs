'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { createRewardSchema } from '@/lib/validation/schemas'
import { AppError } from '@/lib/utils/error'

export async function getRewards() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return []
  }

  return await prisma.reward.findMany({
    where: { familyId: session.user.familyId },
    orderBy: { cost: 'asc' },
    take: 200,
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
    throw new AppError('Unauthorized', 401)
  }

  const parsed = createRewardSchema.parse({
    title: data.title,
    description: data.description,
    cost: data.cost,
    icon: data.icon,
    category: data.category || 'GENERAL',
  })

  const reward = await prisma.reward.create({
    data: {
      title: parsed.title,
      description: parsed.description,
      cost: parsed.cost,
      icon: parsed.icon || '🎁',
      category: parsed.category,
      familyId: session.user.familyId,
    },
  })

  revalidatePath('/rewards')
  return reward
}

export async function redeemReward(rewardId: string, kidId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  const reward = await prisma.reward.findFirst({
    where: { id: rewardId, familyId: session.user.familyId },
  })

  if (!reward) {
    throw new AppError('Reward not found', 404)
  }

  const kid = await prisma.kid.findFirst({
    where: { id: kidId, familyId: session.user.familyId },
  })

  if (!kid) {
    throw new AppError('Kid not found', 404)
  }

  // Atomic conditional debit — prevents race overdrafts.
  const redemption = await prisma.$transaction(async (tx) => {
    const debit = await tx.kid.updateMany({
      where: {
        id: kidId,
        familyId: session.user.familyId,
        points: { gte: reward.cost },
      },
      data: {
        points: { decrement: reward.cost },
      },
    })

    if (debit.count !== 1) {
      throw new AppError('Insufficient points', 400)
    }

    return tx.redemption.create({
      data: {
        rewardId,
        kidId,
        points: reward.cost,
      },
    })
  })

  revalidatePath('/rewards')
  revalidatePath('/dashboard')
  return redemption
}

export async function deleteReward(rewardId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  const reward = await prisma.reward.findFirst({
    where: { id: rewardId, familyId: session.user.familyId },
  })
  if (!reward) {
    throw new AppError('Reward not found', 404)
  }

  await prisma.reward.delete({ where: { id: rewardId } })
  revalidatePath('/rewards')
}
