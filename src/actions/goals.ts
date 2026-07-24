'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { createFamilyGoalSchema } from '@/lib/validation/schemas'
import { AppError } from '@/lib/utils/error'

export async function getFamilyGoals() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  return await prisma.familyGoal.findMany({
    where: {
      familyId: session.user.familyId,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
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
    throw new AppError('Unauthorized', 401)
  }

  const parsed = createFamilyGoalSchema.parse(data)

  const goal = await prisma.familyGoal.create({
    data: {
      title: parsed.title,
      description: parsed.description,
      targetPoints: parsed.targetPoints,
      reward: parsed.reward,
      familyId: session.user.familyId,
    },
  })

  revalidatePath('/dashboard')
  return goal
}
