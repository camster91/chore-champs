'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { processGamification } from '@/lib/gamification'

export async function getChores() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return []
  }

  // ⚡ Bolt: Performance Optimization
  // Removed `include: { kid: true }` from assignments as the client only maps the `kidId` to match the current kid
  // and discards the nested kid relation, avoiding O(N) relational over-fetching on large lists.
  return await prisma.chore.findMany({
    where: { familyId: session.user.familyId },
    include: {
      assignments: {
        orderBy: { dueDate: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getChoreById(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return null
  }

  // ⚡ Bolt: Performance Optimization
  // Removed `include: { kid: true }` as the full kid object is silently discarded.
  return await prisma.chore.findFirst({
    where: { id, familyId: session.user.familyId },
    include: { assignments: true }
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
    }
  })

  if (data.assignToKids && data.assignToKids.length > 0) {
    // Validate all kid IDs belong to this family
    const familyKids = await prisma.kid.findMany({
      where: { familyId: session.user.familyId },
      select: { id: true }
    })
    const familyKidIds = new Set(familyKids.map(k => k.id))
    const validKidIds = data.assignToKids.filter(kidId => familyKidIds.has(kidId))

    if (validKidIds.length > 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      await prisma.choreAssignment.createMany({
        data: validKidIds.map(kidId => ({
          choreId: chore.id,
          kidId,
          dueDate: today,
          status: 'PENDING'
        }))
      })
    }
  }

  revalidatePath('/chores')
  return chore
}

export async function completeChore(assignmentId: string, pointsEarned: number, kidId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  // Verify the assignment belongs to a kid in this family
  const existing = await prisma.choreAssignment.findFirst({
    where: {
      id: assignmentId,
      kid: { familyId: session.user.familyId }
    },
    include: { chore: true },
  })

  if (!existing) {
    throw new Error('Assignment not found')
  }

  // Fetch the kid before the update so we can compute the streak bonus
  // (needs the previous totalPoints, currentStreak, longestStreak, lastCompletedAt).
  const kidBefore = await prisma.kid.findUnique({
    where: { id: kidId },
    select: { totalPoints: true, currentStreak: true, longestStreak: true, lastCompletedAt: true },
  })
  if (!kidBefore) {
    throw new Error('Kid not found')
  }

  // Compute gamification server-side so the client can't game streaks/points.
  const gamification = processGamification(
    pointsEarned,
    kidBefore.totalPoints,
    kidBefore.currentStreak,
    kidBefore.longestStreak,
    kidBefore.lastCompletedAt,
  )

  // ⚡ Bolt: Performance Optimization
  // Removed `include: { chore: true }` from update as the full chore object is not utilized downstream.
  const [assignment] = await prisma.$transaction([
    prisma.choreAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    }),
    prisma.kid.update({
      where: { id: kidId },
      data: {
        points: { increment: gamification.pointsEarned },
        totalPoints: { increment: gamification.pointsEarned },
        currentStreak: gamification.currentStreak,
        longestStreak: Math.max(kidBefore.longestStreak, gamification.currentStreak),
        lastCompletedAt: new Date(),
      }
    })
  ])

  // Fetch updated kid to get new totalPoints for level calculation
  const updatedKid = await prisma.kid.findUnique({
    where: { id: kidId },
    select: { points: true, totalPoints: true }
  })

  revalidatePath('/chores')
  revalidatePath('/dashboard')
  revalidatePath('/profile')

  return {
    assignment,
    kidPoints: updatedKid?.points || 0,
    kidTotalPoints: updatedKid?.totalPoints || 0,
    gamification,
  }
}

export async function assignChore(choreId: string, kidId: string, dueDate: Date) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  // Verify both chore and kid belong to this family
  const [chore, kid] = await Promise.all([
    prisma.chore.findFirst({ where: { id: choreId, familyId: session.user.familyId } }),
    prisma.kid.findFirst({ where: { id: kidId, familyId: session.user.familyId } })
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
      status: 'PENDING'
    }
  })
}

export async function deleteChore(choreId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const chore = await prisma.chore.findFirst({
    where: { id: choreId, familyId: session.user.familyId }
  })
  if (!chore) {
    throw new Error('Chore not found')
  }

  await prisma.chore.delete({ where: { id: choreId } })
  revalidatePath('/chores')
}

export async function updateChore(choreId: string, data: Partial<{
  title: string
  description: string
  basePoints: number
  difficulty: string
  recurring: string
  timeOfDay: string
  icon: string
  isActive: boolean
}>) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const existing = await prisma.chore.findFirst({
    where: { id: choreId, familyId: session.user.familyId }
  })
  if (!existing) {
    throw new Error('Chore not found')
  }

  const chore = await prisma.chore.update({
    where: { id: choreId },
    data
  })

  revalidatePath('/chores')
  return chore
}
