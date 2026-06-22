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

// ⚡ Bolt Performance Optimization:
// What: Replaced unbounded relational data fetching (getting all chores and assignments) with a direct database-level `.count()` aggregation.
// Why: Prevent O(N) memory scaling issues on the Node.js side as user assignment histories grow. The client only needed a count, not the full payload.
// Impact: Drastically reduces database query latency, cuts network payload size, and eliminates Node.js heap memory spikes.
// Measurement: Load time and memory usage for `ProfilePage` will remain flat regardless of historical data volume.
export async function getCompletedChoresCount(kidId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return 0
  }

  // Verify the kid belongs to this family
  const kid = await prisma.kid.findFirst({
    where: { id: kidId, familyId: session.user.familyId },
    select: { id: true }
  })
  if (!kid) {
    return 0
  }

  return await prisma.choreAssignment.count({
    where: {
      kidId,
      status: 'COMPLETED'
    }
  })
}

export async function getChoreById(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return null
  }

  return await prisma.chore.findFirst({
    where: { id, familyId: session.user.familyId },
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
    include: { kid: true }
  })

  if (!existing) {
    throw new Error('Assignment not found')
  }

  const [assignment] = await prisma.$transaction([
    prisma.choreAssignment.update({
      where: { id: assignmentId },
      data: { 
        status: 'COMPLETED',
        completedAt: new Date()
      },
      include: { chore: true }
    }),
    prisma.kid.update({
      where: { id: kidId },
      data: {
        points: { increment: pointsEarned },
        totalPoints: { increment: pointsEarned }
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

  return { assignment, kidPoints: updatedKid?.points || 0, kidTotalPoints: updatedKid?.totalPoints || 0 }
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
