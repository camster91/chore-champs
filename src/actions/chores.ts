'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { processGamification } from '@/lib/gamification'
import { createChoreSchema, updateChoreSchema } from '@/lib/validation/schemas'
import { AppError } from '@/lib/utils/error'

/** Assignments older than this are not returned to the UI (keeps payloads bounded). */
const ASSIGNMENT_WINDOW_DAYS = 14

function assignmentWindowStart(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ASSIGNMENT_WINDOW_DAYS)
  return d
}

export async function getChores() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return []
  }

  const since = assignmentWindowStart()

  return await prisma.chore.findMany({
    where: { familyId: session.user.familyId },
    include: {
      assignments: {
        where: {
          OR: [
            { status: 'PENDING' },
            { dueDate: { gte: since } },
            { completedAt: { gte: since } },
          ],
        },
        orderBy: { dueDate: 'asc' },
        take: 100,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
}

export async function getChoreById(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return null
  }

  const since = assignmentWindowStart()

  return await prisma.chore.findFirst({
    where: { id, familyId: session.user.familyId },
    include: {
      assignments: {
        where: {
          OR: [{ status: 'PENDING' }, { dueDate: { gte: since } }],
        },
        take: 50,
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

  const parsed = createChoreSchema.safeParse(data)
  if (!parsed.success) {
    throw new AppError(parsed.error.issues.map((i) => i.message).join(', '), 400)
  }

  const input = parsed.data

  const chore = await prisma.chore.create({
    data: {
      title: input.title,
      description: input.description,
      basePoints: input.basePoints ?? 5,
      difficulty: input.difficulty ?? 'EASY',
      recurring: input.recurring,
      timeOfDay: input.timeOfDay ?? 'ANYTIME',
      icon: input.icon || '📋',
      familyId: session.user.familyId,
    },
  })

  if (input.assignToKids && input.assignToKids.length > 0) {
    const familyKids = await prisma.kid.findMany({
      where: { familyId: session.user.familyId },
      select: { id: true },
    })
    const familyKidIds = new Set(familyKids.map((k) => k.id))
    const validKidIds = input.assignToKids.filter((kidId) => familyKidIds.has(kidId))

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
}

/**
 * Complete a chore assignment.
 *
 * Security: points and kid are taken from the assignment + chore rows —
 * never from the client. Only PENDING assignments can be completed (once).
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
    include: { chore: true },
  })

  if (!existing) {
    throw new AppError('Assignment not found or already completed', 404)
  }

  const kidId = existing.kidId
  const basePoints = existing.chore.basePoints

  const kidBefore = await prisma.kid.findFirst({
    where: { id: kidId, familyId: session.user.familyId },
    select: {
      totalPoints: true,
      currentStreak: true,
      longestStreak: true,
      lastCompletedAt: true,
    },
  })
  if (!kidBefore) {
    throw new AppError('Kid not found', 404)
  }

  const gamification = processGamification(
    basePoints,
    kidBefore.totalPoints,
    kidBefore.currentStreak,
    kidBefore.longestStreak,
    kidBefore.lastCompletedAt
  )

  // Conditional update prevents replay races: only one concurrent completer wins.
  const completed = await prisma.$transaction(async (tx) => {
    const updated = await tx.choreAssignment.updateMany({
      where: { id: assignmentId, status: 'PENDING' },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    if (updated.count === 0) {
      throw new AppError('Assignment already completed', 409)
    }

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

    return tx.choreAssignment.findUniqueOrThrow({ where: { id: assignmentId } })
  })

  const updatedKid = await prisma.kid.findUnique({
    where: { id: kidId },
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

  // Cap farming: reuse an existing PENDING assignment for the same day.
  const dayStart = new Date(dueDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const existingPending = await prisma.choreAssignment.findFirst({
    where: {
      choreId,
      kidId,
      status: 'PENDING',
      dueDate: { gte: dayStart, lt: dayEnd },
    },
  })
  if (existingPending) {
    return existingPending
  }

  return await prisma.choreAssignment.create({
    data: {
      choreId,
      kidId,
      dueDate: dayStart,
      status: 'PENDING',
    },
  })
}

export async function deleteChore(choreId: string) {
  const { getAuthenticatedFamily } = await import('@/lib/auth/helpers')
  const auth = await getAuthenticatedFamily()
  if (!auth) {
    throw new AppError('Unauthorized', 401)
  }
  if (!auth.isOwner) {
    throw new AppError('Only the family owner can delete chores', 403)
  }

  const chore = await prisma.chore.findFirst({
    where: { id: choreId, familyId: auth.familyId },
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

  const parsed = updateChoreSchema.safeParse(data)
  if (!parsed.success) {
    throw new AppError(parsed.error.issues.map((i) => i.message).join(', '), 400)
  }

  const allowed = parsed.data
  const chore = await prisma.chore.update({
    where: { id: choreId },
    data: {
      ...(allowed.title !== undefined ? { title: allowed.title } : {}),
      ...(allowed.description !== undefined ? { description: allowed.description } : {}),
      ...(allowed.basePoints !== undefined ? { basePoints: allowed.basePoints } : {}),
      ...(allowed.difficulty !== undefined ? { difficulty: allowed.difficulty } : {}),
      ...(allowed.recurring !== undefined ? { recurring: allowed.recurring } : {}),
      ...(allowed.timeOfDay !== undefined ? { timeOfDay: allowed.timeOfDay } : {}),
      ...(allowed.icon !== undefined ? { icon: allowed.icon } : {}),
      ...(allowed.isActive !== undefined ? { isActive: allowed.isActive } : {}),
    },
  })

  revalidatePath('/chores')
  return chore
}
