'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { createFamilyGoalSchema } from '@/lib/validation/schemas'

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

  const parsed = createFamilyGoalSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid goal data')
  }

  const goal = await prisma.familyGoal.create({
    data: {
      ...parsed.data,
      familyId: session.user.familyId,
    },
  })

  revalidatePath('/dashboard')
  return goal
}

/**
 * Increment active family goals. Caller must pass their own familyId —
 * it is verified against the session (ignores cross-family IDs).
 */
export async function updateFamilyGoalPoints(familyId: string, points: number) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }
  if (familyId !== session.user.familyId) {
    throw new Error('Forbidden')
  }
  if (!Number.isFinite(points) || points <= 0 || points > 10000) {
    throw new Error('Invalid points')
  }

  await prisma.familyGoal.updateMany({
    where: {
      familyId: session.user.familyId,
      isActive: true,
    },
    data: {
      currentPoints: { increment: Math.floor(points) },
    },
  })
}
