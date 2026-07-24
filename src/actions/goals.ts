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

  const parsed = createFamilyGoalSchema.safeParse(data)
  if (!parsed.success) {
    throw new AppError(parsed.error.issues.map((i) => i.message).join(', '), 400)
  }

  // Explicit allowlist — never spread client data (blocks currentPoints / isActive injection).
  const goal = await prisma.familyGoal.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      targetPoints: parsed.data.targetPoints,
      reward: parsed.data.reward,
      familyId: session.user.familyId,
    },
  })

  revalidatePath('/dashboard')
  return goal
}

/**
 * Increment active family goals for the *authenticated* family only.
 * Client-supplied familyId is ignored — previously this was an unauthenticated
 * cross-tenant write.
 */
export async function updateFamilyGoalPoints(points: number) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  if (!Number.isFinite(points) || points === 0 || Math.abs(points) > 10000) {
    throw new AppError('Invalid points value', 400)
  }

  await prisma.familyGoal.updateMany({
    where: {
      familyId: session.user.familyId,
      isActive: true,
    },
    data: {
      currentPoints: { increment: Math.trunc(points) },
    },
  })
}
