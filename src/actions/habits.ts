'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getHabits() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  // Habits currently don't have familyId in schema, but they should.
  // For now, let's just get all habits and filter by kid's logs in the UI
  // OR we can fetch them and assume they are global for now (needs schema fix later)
  return await prisma.habit.findMany({
    where: {
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
  timeOfDay: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const habit = await prisma.habit.create({
    data,
  })

  revalidatePath('/habits')
  return habit
}

export async function logHabit(habitId: string, kidId: string, completed: boolean) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Check if already completed today to avoid double points
  const existingLog = await prisma.habitLog.findUnique({
    where: {
      habitId_kidId_date: {
        habitId,
        kidId,
        date: today,
      },
    },
  })

  const shouldAwardPoints = completed && (!existingLog || !existingLog.completed)
  const pointsToAward = 5

  const log = await prisma.habitLog.upsert({
    where: {
      habitId_kidId_date: {
        habitId,
        kidId,
        date: today,
      },
    },
    update: {
      completed,
    },
    create: {
      habitId,
      kidId,
      date: today,
      completed,
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
  }

  revalidatePath('/habits')
  revalidatePath('/dashboard')
  revalidatePath('/profile')
  return log
}
