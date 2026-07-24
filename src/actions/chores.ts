'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { processGamification } from '@/lib/gamification'
import { createChoreSchema } from '@/lib/validation/schemas'
import { AppError, getUserFriendlyError, logError } from '@/lib/utils/error'

const ASSIGNMENT_LOOKBACK_DAYS = 14
const MAX_CHORES = 500

function throwSafe(context: string, error: unknown): never {
  logError(context, error)
  if (error instanceof AppError) throw error
  throw new AppError(getUserFriendlyError(error), 500)
}

export async function getChores() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return []
  }

  const since = new Date()
  since.setDate(since.getDate() - ASSIGNMENT_LOOKBACK_DAYS)
  since.setHours(0, 0, 0, 0)

  // Limit assignment history — unbounded include: { assignments: true }
  // grows without bound and can OOM / slow the dashboard.
  return await prisma.chore.findMany({
    where: { familyId: session.user.familyId },
    take: MAX_CHORES,
    include: {
      assignments: {
        where: { dueDate: { gte: since } },
        orderBy: { dueDate: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getChoreById(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return null
  }

  const since = new Date()
  since.setDate(since.getDate() - ASSIGNMENT_LOOKBACK_DAYS)
  since.setHours(0, 0, 0, 0)

  return await prisma.chore.findFirst({
    where: { id, familyId: session.user.familyId },
    include: {
      assignments: {
        where: { dueDate: { gte: since } },
      },
    },
  })
}

export async function createChore(data: {
  title: string
  description?: string
  basePoints?: number
  difficulty?: string
  recurring?: string
  timeOfDay?: string
  icon?: string
  assignToKids?: string[]
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  const parsed = createChoreSchema.safeParse({
    title: data.title,
    description: data.description,
    basePoints: data.basePoints ?? 5,
    difficulty: data.difficulty,
    recurring:
      data.recurring === undefined || data.recurring === null || data.recurring === ''
        ? undefined
        : data.recurring,
    timeOfDay: data.timeOfDay,
    icon: data.icon,
    assignToKids: data.assignToKids,
  })
  if (!parsed.success) {
    throw new AppError(parsed.error.issues.map((e) => e.message).join(', '), 400)
  }

  try {
    const chore = await prisma.chore.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        basePoints: parsed.data.basePoints,
        difficulty: parsed.data.difficulty || 'EASY',
        recurring: parsed.data.recurring,
        timeOfDay: parsed.data.timeOfDay || 'ANYTIME',
        icon: parsed.data.icon || '📋',
        familyId: session.user.familyId,
      },
    })

    if (parsed.data.assignToKids && parsed.data.assignToKids.length > 0) {
      const familyKids = await prisma.kid.findMany({
        where: { familyId: session.user.familyId },
        select: { id: true },
      })
      const familyKidIds = new Set(familyKids.map((k) => k.id))
      const validKidIds = parsed.data.assignToKids.filter((kidId) => familyKidIds.has(kidId))

      if (validKidIds.length > 0) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        await prisma.choreAssignment.createMany({
          data: validKidIds.map((kidId) => ({
            choreId: chore.id,
            kidId,
            dueDate: today,
            status: 'PENDING',
          })),
        })
      }
    }

    revalidatePath('/chores')
    return chore
  } catch (error) {
    throwSafe('createChore', error)
  }
}

/**
 * Complete a chore assignment.
 * Points are ALWAYS taken from the chore record — never from the client —
 * to prevent points farming / IDOR credit to another kid.
 */
export async function completeChore(assignmentId: string, kidId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  try {
    // Only PENDING assignments in this family can be completed (blocks replay).
    const existing = await prisma.choreAssignment.findFirst({
      where: {
        id: assignmentId,
        status: 'PENDING',
        kid: { familyId: session.user.familyId },
      },
      include: { chore: true, kid: true },
    })

    if (!existing) {
      throw new AppError('Assignment not found or already completed', 404)
    }

    // Bind completion to the assignment's kid — ignore mismatched client kidId.
    if (existing.kidId !== kidId) {
      throw new AppError('Assignment does not belong to this kid', 403)
    }

    if (existing.kid.familyId !== session.user.familyId) {
      throw new AppError('Assignment not found', 404)
    }

    const basePoints = existing.chore.basePoints

    const kidBefore = {
      totalPoints: existing.kid.totalPoints,
      currentStreak: existing.kid.currentStreak,
      longestStreak: existing.kid.longestStreak,
      lastCompletedAt: existing.kid.lastCompletedAt,
    }

    const gamification = processGamification(
      basePoints,
      kidBefore.totalPoints,
      kidBefore.currentStreak,
      kidBefore.longestStreak,
      kidBefore.lastCompletedAt,
    )

    // Conditional update prevents double-complete races under concurrency.
    const [assignmentResult] = await prisma.$transaction([
      prisma.choreAssignment.updateMany({
        where: { id: assignmentId, status: 'PENDING' },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      }),
      prisma.kid.update({
        where: { id: existing.kidId },
        data: {
          points: { increment: gamification.pointsEarned },
          totalPoints: { increment: gamification.pointsEarned },
          currentStreak: gamification.currentStreak,
          longestStreak: Math.max(kidBefore.longestStreak, gamification.currentStreak),
          lastCompletedAt: new Date(),
        },
      }),
    ])

    if (assignmentResult.count === 0) {
      throw new AppError('Assignment already completed', 409)
    }

    const updatedKid = await prisma.kid.findUnique({
      where: { id: existing.kidId },
      select: { points: true, totalPoints: true },
    })

    revalidatePath('/chores')
    revalidatePath('/dashboard')
    revalidatePath('/profile')

    return {
      assignment: { id: assignmentId, status: 'COMPLETED' as const },
      kidPoints: updatedKid?.points || 0,
      kidTotalPoints: updatedKid?.totalPoints || 0,
      gamification,
    }
  } catch (error) {
    if (error instanceof AppError) throw error
    throwSafe('completeChore', error)
  }
}

export async function assignChore(choreId: string, kidId: string, dueDate: Date) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  try {
    const [chore, kid] = await Promise.all([
      prisma.chore.findFirst({ where: { id: choreId, familyId: session.user.familyId } }),
      prisma.kid.findFirst({ where: { id: kidId, familyId: session.user.familyId } }),
    ])

    if (!chore) {
      throw new AppError('Chore not found', 404)
    }
    if (!kid) {
      throw new AppError('Kid not found', 404)
    }

    return await prisma.choreAssignment.create({
      data: {
        choreId,
        kidId,
        dueDate,
        status: 'PENDING',
      },
    })
  } catch (error) {
    if (error instanceof AppError) throw error
    throwSafe('assignChore', error)
  }
}

export async function deleteChore(choreId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  try {
    const chore = await prisma.chore.findFirst({
      where: { id: choreId, familyId: session.user.familyId },
    })
    if (!chore) {
      throw new AppError('Chore not found', 404)
    }

    await prisma.chore.delete({ where: { id: choreId } })
    revalidatePath('/chores')
  } catch (error) {
    if (error instanceof AppError) throw error
    throwSafe('deleteChore', error)
  }
}

export async function updateChore(
  choreId: string,
  data: Partial<{
    title: string
    description: string
    basePoints: number
    difficulty: string
    recurring: string
    timeOfDay: string
    icon: string
    isActive: boolean
  }>
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  if (data.basePoints !== undefined) {
    if (!Number.isInteger(data.basePoints) || data.basePoints < 1 || data.basePoints > 1000) {
      throw new AppError('Points must be an integer between 1 and 1000', 400)
    }
  }

  try {
    const existing = await prisma.chore.findFirst({
      where: { id: choreId, familyId: session.user.familyId },
    })
    if (!existing) {
      throw new AppError('Chore not found', 404)
    }

    const chore = await prisma.chore.update({
      where: { id: choreId },
      data,
    })

    revalidatePath('/chores')
    return chore
  } catch (error) {
    if (error instanceof AppError) throw error
    throwSafe('updateChore', error)
  }
}
