'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { AppError } from '@/lib/utils/error'

export async function getHabits() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return []
  }

  // Replaced unconstrained `logs: true` fetch with a 48-hour rolling window.
  // The UI only needs to know if a habit was completed today.
  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

  return await prisma.habit.findMany({
    where: { familyId: session.user.familyId },
    include: {
      logs: {
        where: { loggedAt: { gte: twoDaysAgo } },
      },
    },
  })
}

export async function createHabit(data: {
  title: string
  description?: string
  icon?: string
  points?: number
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  const habit = await prisma.habit.create({
    data: {
      title: data.title,
      description: data.description,
      icon: data.icon || '✨',
      points: data.points || 5,
      familyId: session.user.familyId,
    },
  })

  revalidatePath('/habits')
  return habit
}

export async function logHabit(habitId: string, kidId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  const [habit, kid] = await Promise.all([
    prisma.habit.findFirst({
      where: { id: habitId, familyId: session.user.familyId },
      select: { id: true },
    }),
    prisma.kid.findFirst({
      where: { id: kidId, familyId: session.user.familyId },
      select: { id: true },
    }),
  ])

  if (!habit) {
    throw new AppError('Habit not found', 404)
  }
  if (!kid) {
    throw new AppError('Kid not found', 404)
  }

  // Prevent duplicate logs for the same kid/habit on the same UTC day.
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const endOfDay = new Date(startOfDay)
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1)

  const existingLog = await prisma.habitLog.findFirst({
    where: {
      habitId,
      kidId,
      loggedAt: { gte: startOfDay, lt: endOfDay },
    },
  })
  if (existingLog) {
    throw new AppError('Habit already logged today', 409)
  }

  const log = await prisma.habitLog.create({
    data: {
      habitId,
      kidId,
    },
  })

  revalidatePath('/habits')
  revalidatePath('/dashboard')
  return log
}

export async function deleteHabit(habitId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  const habit = await prisma.habit.findFirst({
    where: { id: habitId, familyId: session.user.familyId },
  })
  if (!habit) {
    throw new AppError('Habit not found', 404)
  }

  await prisma.habit.delete({ where: { id: habitId } })
  revalidatePath('/habits')
}
