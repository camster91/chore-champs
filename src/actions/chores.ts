'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { processGamification } from '@/lib/gamification'
import { updateChoreSchema } from '@/lib/validation/schemas'
import { getAuthenticatedFamily } from '@/lib/auth/helpers'

/** Assignments older than this are not loaded into list views. */
const ASSIGNMENT_LOOKBACK_DAYS = 14

function assignmentWindowWhere() {
  const since = new Date()
  since.setDate(since.getDate() - ASSIGNMENT_LOOKBACK_DAYS)
  since.setHours(0, 0, 0, 0)
  return {
    OR: [
      { status: 'PENDING' },
      { dueDate: { gte: since } },
      { completedAt: { gte: since } },
    ],
  }
}

export async function getChores() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return []
  }

  return await prisma.chore.findMany({
    where: { familyId: session.user.familyId },
    include: {
      assignments: {
        where: assignmentWindowWhere(),
        orderBy: { dueDate: 'asc' },
        take: 100,
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

  return await prisma.chore.findFirst({
    where: { id, familyId: session.user.familyId },
    include: {
      assignments: {
        where: assignmentWindowWhere(),
        orderBy: { dueDate: 'asc' },
        take: 100,
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
    throw new Error('Unauthorized')
  }

  const chore = await prisma.chore.create({
    data: {
      title: data.title,
      description: data.description,
      basePoints: data.basePoints || 5,
      difficulty: data.difficulty || 'EASY',
      recurring: data.recurring,
      timeOfDay: data.timeOfDay || 'ANYTIME',
      icon: data.icon || '📋',
      familyId: session.user.familyId,
    },
  })

  if (data.assignToKids && data.assignToKids.length > 0) {
    // Validate all kid IDs belong to this family
    const familyKids = await prisma.kid.findMany({
      where: { familyId: session.user.familyId },
      select: { id: true },
    })
    const familyKidIds = new Set(familyKids.map((k) => k.id))
    const validKidIds = data.assignToKids.filter((kidId) => familyKidIds.has(kidId))

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
        skipDuplicates: true,
      })
    }
  }

  revalidatePath('/chores')
  return chore
}

/**
 * Complete a chore assignment.
 *
 * Security: kidId and points are derived from the assignment + chore on the
 * server. Client-supplied values are ignored to prevent IDOR / point fraud.
 * Already-completed assignments cannot be replayed.
 */
export async function completeChore(assignmentId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.choreAssignment.findFirst({
      where: {
        id: assignmentId,
        kid: { familyId: session.user.familyId },
      },
      include: { chore: true },
    })

    if (!existing) {
      throw new Error('Assignment not found')
    }

    if (existing.status === 'COMPLETED') {
      throw new Error('Assignment already completed')
    }

    const kidBefore = await tx.kid.findFirst({
      where: { id: existing.kidId, familyId: session.user.familyId },
      select: {
        totalPoints: true,
        currentStreak: true,
        longestStreak: true,
        lastCompletedAt: true,
      },
    })
    if (!kidBefore) {
      throw new Error('Kid not found')
    }

    const gamification = processGamification(
      existing.chore.basePoints,
      kidBefore.totalPoints,
      kidBefore.currentStreak,
      kidBefore.longestStreak,
      kidBefore.lastCompletedAt,
    )
    const completedAt = new Date()

    // Keep the status transition and point award in one transaction so a
    // failed award cannot leave the assignment permanently completed.
    const updated = await tx.choreAssignment.updateMany({
      where: { id: assignmentId, status: 'PENDING' },
      data: { status: 'COMPLETED', completedAt },
    })

    if (updated.count === 0) {
      throw new Error('Assignment already completed')
    }

    const [assignment, updatedKid] = await Promise.all([
      tx.choreAssignment.findUniqueOrThrow({ where: { id: assignmentId } }),
      tx.kid.update({
        where: { id: existing.kidId },
        data: {
          points: { increment: gamification.pointsEarned },
          totalPoints: { increment: gamification.pointsEarned },
          currentStreak: gamification.currentStreak,
          longestStreak: Math.max(kidBefore.longestStreak, gamification.currentStreak),
          lastCompletedAt: completedAt,
        },
        select: { points: true, totalPoints: true },
      }),
    ])

    return { assignment, updatedKid, gamification }
  })

  revalidatePath('/chores')
  revalidatePath('/dashboard')
  revalidatePath('/profile')

  return {
    assignment: result.assignment,
    kidPoints: result.updatedKid.points,
    kidTotalPoints: result.updatedKid.totalPoints,
    gamification: result.gamification,
  }
}

export async function assignChore(choreId: string, kidId: string, dueDate: Date) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const [chore, kid] = await Promise.all([
    prisma.chore.findFirst({ where: { id: choreId, familyId: session.user.familyId } }),
    prisma.kid.findFirst({ where: { id: kidId, familyId: session.user.familyId } }),
  ])

  if (!chore) {
    throw new Error('Chore not found')
  }
  if (!kid) {
    throw new Error('Kid not found')
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
  const auth = await getAuthenticatedFamily()
  if (!auth) {
    throw new Error('Unauthorized')
  }
  if (auth.role !== 'OWNER') {
    throw new Error('Only the family owner can delete chores')
  }

  const chore = await prisma.chore.findFirst({
    where: { id: choreId, familyId: auth.familyId },
  })
  if (!chore) {
    throw new Error('Chore not found')
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
    throw new Error('Unauthorized')
  }

  const parsed = updateChoreSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid chore data')
  }

  const existing = await prisma.chore.findFirst({
    where: { id: choreId, familyId: session.user.familyId },
  })
  if (!existing) {
    throw new Error('Chore not found')
  }

  const chore = await prisma.chore.update({
    where: { id: choreId },
    data: parsed.data,
  })

  revalidatePath('/chores')
  return chore
}
