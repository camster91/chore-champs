'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getRewards() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  return await prisma.reward.findMany({
    where: {
      familyId: session.user.familyId,
      isActive: true,
    },
    orderBy: {
      cost: 'asc',
    },
  })
}

export async function createReward(data: {
  title: string
  description?: string
  cost: number
  icon: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const reward = await prisma.reward.create({
    data: {
      ...data,
      familyId: session.user.familyId,
    },
  })

  revalidatePath('/rewards')
  revalidatePath('/dashboard')
  return reward
}

export async function redeemReward(rewardId: string, kidId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const reward = await prisma.reward.findUnique({
    where: { id: rewardId },
  })

  const kid = await prisma.kid.findUnique({
    where: { id: kidId },
  })

  if (!reward || reward.familyId !== session.user.familyId) {
    throw new Error('Reward not found or unauthorized')
  }

  if (!kid || kid.familyId !== session.user.familyId) {
    throw new Error('Kid not found or unauthorized')
  }

  if (kid.points < reward.cost) {
    throw new Error('Insufficient points')
  }

  // Update points and create redemption record in a transaction
  const [redemption] = await prisma.$transaction([
    prisma.redeemedReward.create({
      data: {
        rewardId,
        kidId,
        pointsSpent: reward.cost,
        fulfilled: false,
      },
    }),
    prisma.kid.update({
      where: { id: kidId },
      data: {
        points: { decrement: reward.cost },
      },
    }),
  ])

  revalidatePath('/rewards')
  revalidatePath('/dashboard')
  revalidatePath('/profile')
  
  return redemption
}

export async function getRedemptions() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  return await prisma.redeemedReward.findMany({
    where: {
      reward: {
        familyId: session.user.familyId,
      },
    },
    include: {
      reward: true,
      kid: true,
    },
    orderBy: {
      redeemedAt: 'desc',
    },
  })
}

export async function fulfillReward(redemptionId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const redemption = await prisma.redeemedReward.findUnique({
    where: { id: redemptionId },
    include: { reward: true },
  })

  if (!redemption || redemption.reward.familyId !== session.user.familyId) {
    throw new Error('Redemption not found or unauthorized')
  }

  const updated = await prisma.redeemedReward.update({
    where: { id: redemptionId },
    data: {
      fulfilled: true,
      fulfilledAt: new Date(),
    },
  })

  revalidatePath('/rewards')
  revalidatePath('/dashboard')
  return updated
}
