'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { createHabitSchema } from '@/lib/validation/schemas'
import { AppError, getUserFriendlyError, logError } from '@/lib/utils/error'

function throwSafe(context: string, error: unknown): never {
  logError(context, error)
  if (error instanceof AppError) throw error
  throw new AppError(getUserFriendlyError(error), 500)
}

export async function getHabits() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return []
  }

  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

  return await prisma.habit.findMany({
    where: { familyId: session.user.familyId },
    take: 200,
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

  const parsed = createHabitSchema.safeParse({
    title: data.title,
    description: data.description,
    icon: data.icon,
    points: data.points ?? 5,
  })
  if (!parsed.success) {
    throw new AppError(parsed.error.issues.map((e) => e.message).join(', '), 400)
  }

  try {
    const habit = await prisma.habit.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        icon: parsed.data.icon || '✨',
        points: parsed.data.points,
        familyId: session.user.familyId,
      },
    })

    revalidatePath('/habits')
    return habit
  } catch (error) {
    throwSafe('createHabit', error)
  }
}

export async function logHabit(habitId: string, kidId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  try {
    // Ownership checks — prevent logging against another family's habit/kid.
    const [habit, kid] = await Promise.all([
      prisma.habit.findFirst({
        where: { id: habitId, familyId: session.user.familyId },
      }),
      prisma.kid.findFirst({
        where: { id: kidId, familyId: session.user.familyId },
      }),
    ])

    if (!habit || !kid) {
      throw new AppError('Not found', 404)
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
  } catch (error) {
    if (error instanceof AppError) throw error
    throwSafe('logHabit', error)
  }
}

export async function deleteHabit(habitId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new AppError('Unauthorized', 401)
  }

  try {
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, familyId: session.user.familyId },
    })
    if (!habit) {
      throw new AppError('Habit not found', 404)
    }

    await prisma.habit.delete({ where: { id: habitId } })
    revalidatePath('/habits')
  } catch (error) {
    if (error instanceof AppError) throw error
    throwSafe('deleteHabit', error)
  }
}
