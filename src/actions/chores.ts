'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { processGamification } from '@/lib/gamification'
import { createChoreSchema, updateChoreSchema } from '@/lib/validation/schemas'
import { AppError } from '@/lib/utils/error'

/** Assignments older than this are omitted from list queries to bound payload size. */
const ASSIGNMENT_HISTORY_DAYS = 90
const MAX_ASSIGNMENTS_PER_CHORE = 200

function assignmentHistorySince(): Date {
  const since = new Date()
  since.setDate(since.getDate() - ASSIGNMENT_HISTORY_DAYS)
  since.setHours(0, 0, 0, 0)
  return since
}

export async function getChores() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return []
  }

  const since = assignmentHistorySince()

  return await prisma.chore.findMany({
    where: { familyId: session.user.familyId },
    select: {
      id: true,
      title: true,
      description: true,
      basePoints: true,
      icon: true,
      difficulty: true,
      recurring: true,
      timeOfDay: true,
      isActive: true,
      familyId: true,
      createdAt: true,
      updatedAt: true,
      assignments: {
        where: {
          OR: [
            { status: 'PENDING' },
            { dueDate: { gte: since } },
            { completedAt: { gte: since } },
          ],
        },
        orderBy: { dueDate: 'asc' },
        take: MAX_ASSIGNMENTS_PER_CHORE,
        select: {
          id: true,
          choreId: true,
          kidId: true,
          dueDate: true,
          status: true,
          completedAt: true,
        },
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

  const since = assignmentHistorySince()

  return await prisma.chore.findFirst({
    where: { id, familyId: session.user.familyId },
    include: {
      assignments: {
        where: {
          OR: [
            { status: 'PENDING' },
            { dueDate: { gte: since } },
            { completedAt: { gte: since } },
          ],
        },
        take: MAX_ASSIGNMENTS_PER_CHORE,
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

  const parsed = createChoreSchema.parse({
    title: data.title,
    description: data.description,
    basePoints: data.basePoints ?? 5,
    difficulty: data.difficulty,
    recurring: data.recurring,
    timeOfDay: data.timeOfDay,
    icon: data.icon,
    assignToKids: data.assignToKids,
  })

  const chore = await prisma.chore.create({
    data: {
      title: parsed.title,
      description: parsed.description,
      basePoints: parsed.basePoints,
      difficulty: parsed.difficulty || 'EASY',
      recurring: parsed.recurring,
      timeOfDay: parsed.timeOfDay || 'ANYTIME',
      icon: parsed.icon || '📋',
      familyId: session.user.familyId,
    },
  })

  if (parsed.assignToKids && parsed.assignToKids.length > 0) {
    const familyKids = await prisma.kid.findMany({
      where: { familyId: session.user.familyId },
      select: { id: true },
    })
    const familyKidIds = new Set(familyKids.map(k => k.id))
    const validKidIds = parsed.assignToKids.filter(kidId => familyKidIds.has(kidId))

    if (validKidIds.length > 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      await prisma.choreAssignment.createMany({
        data: validKidIds.map(kidId => ({
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
}

/**
 * Complete a chore assignment. Points and kid are derived server-side from
 * the assignment — clients cannot forge points, credit another kid, or
 * replay a completed assignment.
 */
export async function completeChore(assignmentId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  const existing = await prisma.choreAssignment.findFirst({
    where: {
      id: assignmentId,
      status: 'PENDING',
      kid: { familyId: session.user.familyId },
    },
    include: {
      chore: { select: { basePoints: true, familyId: true } },
      kid: {
        select: {
          id: true,
          familyId: true,
          totalPoints: true,
          currentStreak: true,
          longestStreak: true,
          lastCompletedAt: true,
        },
      },
    },
  })

  if (!existing) {
    throw new AppError('Assignment not found or already completed', 404)
  }

  if (existing.chore.familyId !== session.user.familyId) {
    throw new AppError('Assignment not found', 404)
  }

  const pointsEarned = existing.chore.basePoints
  const kidId = existing.kidId
  const kidBefore = existing.kid

  const gamification = processGamification(
    pointsEarned,
    kidBefore.totalPoints,
    kidBefore.currentStreak,
    kidBefore.longestStreak,
    kidBefore.lastCompletedAt,
  )

  // Atomic: only complete if still PENDING (blocks replay races).
  const completed = await prisma.$transaction(async (tx) => {
    const updated = await tx.choreAssignment.updateMany({
      where: { id: assignmentId, status: 'PENDING' },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    if (updated.count !== 1) {
      throw new AppError('Assignment already completed', 409)
    }

    const assignment = await tx.choreAssignment.findUniqueOrThrow({
      where: { id: assignmentId },
    })

    await tx.kid.update({
      where: { id: kidId },
      data: {
        points: { increment: gamification.pointsEarned },
        totalPoints: { increment: gamification.pointsEarned },
        currentStreak: gamification.currentStreak,
        longestStreak: Math.max(kidBefore.longestStreak, gamification.currentStreak),
        lastCompletedAt: new Date(),
      },
    })

    return assignment
  })

  const updatedKid = await prisma.kid.findFirst({
    where: { id: kidId, familyId: session.user.familyId },
    select: { points: true, totalPoints: true },
  })

  revalidatePath('/chores')
  revalidatePath('/dashboard')
  revalidatePath('/profile')

  return {
    assignment: completed,
    kidPoints: updatedKid?.points || 0,
    kidTotalPoints: updatedKid?.totalPoints || 0,
    gamification,
  }
}

export async function assignChore(choreId: string, kidId: string, dueDate: Date) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

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
}

export async function deleteChore(choreId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  const chore = await prisma.chore.findFirst({
    where: { id: choreId, familyId: session.user.familyId },
  })
  if (!chore) {
    throw new AppError('Chore not found', 404)
  }

  await prisma.chore.delete({ where: { id: choreId } })
  revalidatePath('/chores')
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

  const existing = await prisma.chore.findFirst({
    where: { id: choreId, familyId: session.user.familyId },
  })
  if (!existing) {
    throw new AppError('Chore not found', 404)
  }

  const parsed = updateChoreSchema.parse(data)

  const chore = await prisma.chore.update({
    where: { id: choreId },
    data: {
      ...(parsed.title !== undefined && { title: parsed.title }),
      ...(parsed.description !== undefined && { description: parsed.description }),
      ...(parsed.basePoints !== undefined && { basePoints: parsed.basePoints }),
      ...(parsed.difficulty !== undefined && { difficulty: parsed.difficulty }),
      ...(parsed.recurring !== undefined && { recurring: parsed.recurring }),
      ...(parsed.timeOfDay !== undefined && { timeOfDay: parsed.timeOfDay }),
      ...(parsed.icon !== undefined && { icon: parsed.icon }),
      ...(parsed.isActive !== undefined && { isActive: parsed.isActive }),
    },
  })

  revalidatePath('/chores')
  return chore
}
