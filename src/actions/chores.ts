'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function getChores() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return []
  }

  return await prisma.chore.findMany({
    where: { familyId: session.user.familyId },
    include: {
      assignments: {
        include: { kid: true },
        orderBy: { dueDate: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getChoreById(id: string) {
  return await prisma.chore.findUnique({
    where: { id },
    include: { assignments: { include: { kid: true } } }
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
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    await prisma.choreAssignment.createMany({
      data: data.assignToKids.map(kidId => ({
        choreId: chore.id,
        kidId,
        dueDate: today,
        status: 'PENDING'
      }))
    })
  }

  revalidatePath('/chores')
  return chore
}

export async function completeChore(assignmentId: string, pointsEarned: number, kidId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const assignment = await prisma.choreAssignment.update({
    where: { id: assignmentId },
    data: { 
      status: 'COMPLETED',
      completedAt: new Date()
    },
    include: { chore: true }
  })

  revalidatePath('/chores')
  revalidatePath('/dashboard')
  revalidatePath('/profile')

  return { assignment }
}

export async function assignChore(choreId: string, kidId: string, dueDate: Date) {
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

  const chore = await prisma.chore.update({
    where: { id: choreId },
    data
  })

  revalidatePath('/chores')
  return chore
}
