'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { createFamilyGoalSchema } from '@/lib/validation/schemas'
import { AppError, getUserFriendlyError, logError } from '@/lib/utils/error'

function throwSafe(context: string, error: unknown): never {
  logError(context, error)
  if (error instanceof AppError) throw error
  throw new AppError(getUserFriendlyError(error), 500)
}

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
    take: 50,
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
    throw new AppError('Unauthorized', 401)
  }

  const parsed = createFamilyGoalSchema.safeParse(data)
  if (!parsed.success) {
    throw new AppError(parsed.error.issues.map((e) => e.message).join(', '), 400)
  }

  try {
    const goal = await prisma.familyGoal.create({
      data: {
        ...parsed.data,
        familyId: session.user.familyId,
      },
    })

    revalidatePath('/dashboard')
    return goal
  } catch (error) {
    throwSafe('createFamilyGoal', error)
  }
}

// NOTE: Previously exported `updateFamilyGoalPoints(familyId, points)` with no
// auth — that was a Critical IDOR. Goal progress must be incremented from
// authenticated server code using session.user.familyId only.
