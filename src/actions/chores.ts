'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { checkAndAwardBadges } from './gamification'
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
  icon: string
  difficulty: Difficulty
  basePoints: number
  recurring?: RecurringType
  timeOfDay?: TimeOfDay
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const chore = await prisma.chore.create({
    data: {
      ...data,
      familyId: session.user.familyId,
    },
  })

  revalidatePath('/chores')
  revalidatePath('/dashboard')
  return chore
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

  if (!assignment || assignment.chore.familyId !== session.user.familyId) {
    throw new Error('Assignment not found or unauthorized')
  }

  if (assignment.status === 'COMPLETED') {
    return assignment
  }

  const pointsEarned = assignment.chore.basePoints

  // Update assignment and kid points in a transaction
  const [updatedAssignment] = await prisma.$transaction([
    prisma.choreAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        pointsEarned,
      },
    }),
    prisma.kid.update({
      where: { id: assignment.kidId },
      data: {
        points: { increment: pointsEarned },
        totalPoints: { increment: pointsEarned },
        experience: { increment: pointsEarned * 2 }, // Simple XP logic
      },
    }),
  ])

  revalidatePath('/chores')
  revalidatePath('/dashboard')
  revalidatePath('/profile')
  
  // Check for new badges
  await checkAndAwardBadges(assignment.kidId)

  // Update streaks, gems, and family goals
  await processGamification(assignment.kidId, pointsEarned, session.user.familyId)
  
  return updatedAssignment
}

export async function assignChore(choreId: string, kidId: string, dueDate: Date) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const chore = await prisma.chore.findUnique({
    where: { id: choreId },
  })

  if (!chore || chore.familyId !== session.user.familyId) {
    throw new Error('Chore not found or unauthorized')
  }

  // Verify kid ownership
  const kid = await prisma.kid.findFirst({
    where: { id: kidId, familyId: session.user.familyId }
  })
  if (!kid) {
    throw new Error('Kid not found or unauthorized')
  }

  const assignment = await prisma.choreAssignment.create({
    data: {
      choreId,
      kidId,
      dueDate,
      status: 'PENDING',
    },
  })

  revalidatePath('/chores')
  revalidatePath('/dashboard')
  return assignment
}
