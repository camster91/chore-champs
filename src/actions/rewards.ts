'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { createRewardSchema } from '@/lib/validation/schemas'
import { AppError, getUserFriendlyError, logError } from '@/lib/utils/error'

function throwSafe(context: string, error: unknown): never {
  logError(context, error)
  if (error instanceof AppError) throw error
  throw new AppError(getUserFriendlyError(error), 500)
}

export async function getRewards() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return []
  }

  return await prisma.reward.findMany({
    where: { familyId: session.user.familyId },
    take: 200,
    orderBy: { cost: 'asc' },
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
    title: data.title,
    description: data.description,
    cost: data.cost,
    icon: data.icon,
    category: data.category || 'General',
  })
  if (!parsed.success) {
    throw new AppError(parsed.error.issues.map((e) => e.message).join(', '), 400)
  }

  try {
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
  } catch (error) {
    throwSafe('createReward', error)
  }
}

export async function redeemReward(rewardId: string, kidId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  try {
    const reward = await prisma.reward.findFirst({
      where: { id: rewardId, familyId: session.user.familyId },
    })

    if (!reward) {
      throw new AppError('Reward not found', 404)
    }

    // Atomic check-and-decrement to prevent TOCTOU negative balances.
    const redemption = await prisma.$transaction(async (tx) => {
      const kid = await tx.kid.findFirst({
        where: { id: kidId, familyId: session.user.familyId },
      })

      if (!kid) {
        throw new AppError('Kid not found', 404)
      }

      if (kid.points < reward.cost) {
        throw new AppError('Insufficient points', 400)
      }

      const updated = await tx.kid.updateMany({
        where: {
          id: kidId,
          familyId: session.user.familyId,
          points: { gte: reward.cost },
        },
        data: {
          points: { decrement: reward.cost },
        },
      })

      if (updated.count === 0) {
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
  } catch (error) {
    if (error instanceof AppError) throw error
    throwSafe('redeemReward', error)
  }
}

export async function deleteReward(rewardId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  try {
    const reward = await prisma.reward.findFirst({
      where: { id: rewardId, familyId: session.user.familyId },
    })
    if (!reward) {
      throw new AppError('Reward not found', 404)
    }

    await prisma.reward.delete({ where: { id: rewardId } })
    revalidatePath('/rewards')
  } catch (error) {
    if (error instanceof AppError) throw error
    throwSafe('deleteReward', error)
  }
}
