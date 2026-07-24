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

  const parsed = createRewardSchema.safeParse({
    ...data,
    category: data.category || 'general',
  })
  if (!parsed.success) {
    throw new AppError(parsed.error.issues.map((i) => i.message).join(', '), 400)
  }

  const reward = await prisma.reward.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      cost: parsed.data.cost,
      icon: parsed.data.icon || '🎁',
      category: parsed.data.category,
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

  // Atomic conditional decrement prevents TOCTOU races that drive points negative.
  const redemption = await prisma.$transaction(async (tx) => {
    const deducted = await tx.kid.updateMany({
      where: { id: kidId, points: { gte: reward.cost } },
      data: { points: { decrement: reward.cost } },
    })

    if (deducted.count === 0) {
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
  const { getAuthenticatedFamily } = await import('@/lib/auth/helpers')
  const auth = await getAuthenticatedFamily()
  if (!auth) {
    throw new AppError('Unauthorized', 401)
  }
  if (!auth.isOwner) {
    throw new AppError('Only the family owner can delete rewards', 403)
  }

  const reward = await prisma.reward.findFirst({
    where: { id: rewardId, familyId: auth.familyId },
  })
  if (!reward) {
    throw new AppError('Reward not found', 404)
  }

  await prisma.reward.delete({ where: { id: rewardId } })
  revalidatePath('/rewards')
}
