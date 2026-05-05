'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { TimeOfDay } from '@prisma/client'
import { processGamification } from '@/lib/gamification'

export async function getHabits() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  // Habits currently don't have familyId in schema, but they should.
  // UPDATE: They do have familyId in schema now.
  return await prisma.habit.findMany({
    where: {
      familyId: session.user.familyId,
      isActive: true,
    },
    include: {
      logs: {
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })
}

export async function createHabit(data: {
  title: string
  description?: string
  icon: string
  timeOfDay: TimeOfDay
  points?: number
  targetCount?: number
  unit?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const habit = await prisma.habit.create({
    data: {
      ...data,
      familyId: session.user.familyId,
      points: data.points || 5,
      targetCount: data.targetCount || 1,
    },
  })

  revalidatePath('/habits')
  return habit
}

export async function logHabit(habitId: string, kidId: string, completed: boolean, increment = 1) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  // Verify ownership to prevent IDOR
  const [isKidOwned, habit] = await Promise.all([
    prisma.kid.findFirst({ where: { id: kidId, familyId: session.user.familyId } }),
    prisma.habit.findFirst({ where: { id: habitId, familyId: session.user.familyId } })
  ])

  if (!isKidOwned || !habit) {
    throw new Error('Kid or Habit not found or unauthorized')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const existingLog = await prisma.habitLog.findUnique({
    where: {
      habitId_kidId_date: {
        habitId,
        kidId,
        date: today,
      },
    },
  })

  const currentCount = existingLog?.count || 0
  const newCount = completed ? habit.targetCount : Math.max(0, currentCount + increment)
  const isNowCompleted = newCount >= habit.targetCount
  const wasAlreadyCompleted = existingLog?.completed || false

  const shouldAwardPoints = isNowCompleted && !wasAlreadyCompleted
  const pointsToAward = habit.points

  const log = await prisma.habitLog.upsert({
    where: {
      habitId_kidId_date: {
        habitId,
        kidId,
        date: today,
      },
    },
    update: {
      completed: isNowCompleted,
      count: newCount,
    },
    create: {
      habitId,
      kidId,
      date: today,
      completed: isNowCompleted,
      count: newCount,
    },
  })

  if (shouldAwardPoints) {
    await prisma.kid.update({
      where: { id: kidId },
      data: {
        points: { increment: pointsToAward },
        totalPoints: { increment: pointsToAward },
        experience: { increment: pointsToAward },
      },
    })

    // Update streaks, gems, and family goals
    await processGamification(kidId, pointsToAward, session.user.familyId)
  }

  revalidatePath('/habits')
  revalidatePath('/dashboard')
  revalidatePath('/profile')
  return log
}
