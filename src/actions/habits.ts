'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { createHabitSchema } from '@/lib/validation/schemas'
import { AppError } from '@/lib/utils/error'

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
        take: 100,
      },
    },
    take: 200,
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

  const parsed = createHabitSchema.safeParse(data)
  if (!parsed.success) {
    throw new AppError(parsed.error.issues.map((i) => i.message).join(', '), 400)
  }

  const habit = await prisma.habit.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      icon: parsed.data.icon || '✨',
      points: parsed.data.points || 5,
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

  // Both habit and kid must belong to the caller's family (prevents cross-family IDOR).
  const [habit, kid] = await Promise.all([
    prisma.habit.findFirst({
      where: { id: habitId, familyId: session.user.familyId },
    }),
    prisma.kid.findFirst({
      where: { id: kidId, familyId: session.user.familyId },
    }),
  ])

  if (!habit) {
    throw new AppError('Habit not found', 404)
  }
  if (!kid) {
    throw new AppError('Kid not found', 404)
  }

  // One log per habit/kid/calendar day (prevents unbounded spam writes).
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const existingLog = await prisma.habitLog.findFirst({
    where: {
      habitId,
      kidId,
      loggedAt: { gte: dayStart, lt: dayEnd },
    },
  })
  if (existingLog) {
    return existingLog
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
  const { getAuthenticatedFamily } = await import('@/lib/auth/helpers')
  const auth = await getAuthenticatedFamily()
  if (!auth) {
    throw new AppError('Unauthorized', 401)
  }
  if (!auth.isOwner) {
    throw new AppError('Only the family owner can delete habits', 403)
  }

  const habit = await prisma.habit.findFirst({
    where: { id: habitId, familyId: auth.familyId },
  })
  if (!habit) {
    throw new AppError('Habit not found', 404)
  }

  await prisma.habit.delete({ where: { id: habitId } })
  revalidatePath('/habits')
}
