'use server'

import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getHabits() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return []
  }

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
    throw new Error('Unauthorized')
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
    throw new Error('Unauthorized')
  }

  const [habit, kid] = await Promise.all([
    prisma.habit.findFirst({
      where: { id: habitId, familyId: session.user.familyId, isActive: true },
    }),
    prisma.kid.findFirst({
      where: { id: kidId, familyId: session.user.familyId },
    }),
  ])

  if (!habit) {
    throw new Error('Habit not found')
  }
  if (!kid) {
    throw new Error('Kid not found')
  }

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const alreadyLogged = await prisma.habitLog.findFirst({
    where: {
      habitId,
      kidId,
      loggedAt: { gte: startOfDay },
    },
  })
  if (alreadyLogged) {
    throw new Error('Habit already logged today')
  }

  let log
  try {
    log = await prisma.habitLog.create({
      data: {
        habitId,
        kidId,
        loggedDate: startOfDay,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error('Habit already logged today')
    }
    throw error
  }

  revalidatePath('/habits')
  revalidatePath('/dashboard')
  return log
}

export async function deleteHabit(habitId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const habit = await prisma.habit.findFirst({
    where: { id: habitId, familyId: session.user.familyId },
  })
  if (!habit) {
    throw new Error('Habit not found')
  }

  await prisma.habit.delete({ where: { id: habitId } })
  revalidatePath('/habits')
}
