'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { Difficulty, RecurringType, TimeOfDay } from '@prisma/client'
import { processGamification } from '@/lib/gamification'

export async function getChores() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  return await prisma.chore.findMany({
    where: {
      familyId: session.user.familyId,
      isActive: true,
    },
    include: {
      assignments: {
        where: {
          dueDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function createChore(data: {
  title: string
  description?: string
  icon?: string
  difficulty?: Difficulty
  basePoints: number
  recurring?: RecurringType | null
  timeOfDay?: TimeOfDay
  assignToKids?: string[]
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const { assignToKids, ...choreData } = data

  const chore = await prisma.chore.create({
    data: {
      title: choreData.title,
      description: choreData.description,
      icon: choreData.icon || 'star',
      difficulty: choreData.difficulty || 'EASY',
      basePoints: choreData.basePoints,
      recurring: choreData.recurring,
      timeOfDay: choreData.timeOfDay || 'ANYTIME',
      familyId: session.user.familyId,
    },
  })

  if (assignToKids && assignToKids.length > 0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    await prisma.choreAssignment.createMany({
      data: assignToKids.map(kidId => ({
        choreId: chore.id,
        kidId,
        dueDate: today,
      }))
    })
  }

  revalidatePath('/chores')
  revalidatePath('/dashboard')
  return chore
}

export async function assignChore(choreId: string, kidId: string, dueDate: Date) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const date = new Date(dueDate)
  date.setHours(0, 0, 0, 0)

  return await prisma.choreAssignment.create({
    data: {
      choreId,
      kidId,
      dueDate: date,
    },
  })
}

export async function completeChore(assignmentId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const assignment = await prisma.choreAssignment.findUnique({
    where: { id: assignmentId },
    include: { chore: true, kid: true },
  })

  if (!assignment || assignment.kid.familyId !== session.user.familyId) {
    throw new Error('Assignment not found')
  }

  if (assignment.status === 'COMPLETED') {
    return { leveledUp: false, newLevel: null }
  }

  const pointsToAward = assignment.chore.basePoints + assignment.bonusPoints

  const [updatedAssignment, updatedKid] = await prisma.$transaction([
    prisma.choreAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        pointsEarned: pointsToAward,
      },
    }),
    prisma.kid.update({
      where: { id: assignment.kidId },
      data: {
        points: { increment: pointsToAward },
        totalPoints: { increment: pointsToAward },
        experience: { increment: pointsToAward },
        lastActiveAt: new Date(),
      },
    }),
  ])

  // Update streaks, gems, and check for badges
  const result = await processGamification(assignment.kidId, pointsToAward, session.user.familyId)

  revalidatePath('/chores')
  revalidatePath('/dashboard')
  revalidatePath('/profile')

  return {
    leveledUp: result?.leveledUp || false,
    newLevel: result?.level || null,
    pointsEarned: pointsToAward,
  }
}
