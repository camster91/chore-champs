'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getFamilyGoals() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  return await prisma.familyGoal.findMany({
    where: {
      familyId: session.user.familyId,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function createFamilyGoal(data: {
  title: string
  description?: string
  targetPoints: number
  reward?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const goal = await prisma.familyGoal.create({
    data: {
      ...data,
      familyId: session.user.familyId,
    },
  })

  revalidatePath('/dashboard')
  return goal
}

export async function updateFamilyGoalPoints(familyId: string, points: number) {
  // This is called internally when points are earned
  await prisma.familyGoal.updateMany({
    where: {
      familyId,
      isActive: true,
    },
    data: {
      currentPoints: { increment: points },
    },
  })
}
