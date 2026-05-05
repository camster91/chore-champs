'use server'

import prisma from '@/lib/db'

// Magic number constants for clarity
const MS_PER_DAY = 1000 * 60 * 60 * 24
const FIRST_DAY_STREAK = 1
const MISSED_DAY_STREAK = 1

export async function processGamification(kidId: string, points: number, familyId: string) {
  const kid = await prisma.kid.findUnique({
    where: { id: kidId },
  })

  if (!kid) return { gemsEarned: 0, newStreak: 0 }

  const now = new Date()
  const lastActive = kid.lastActiveAt ? new Date(kid.lastActiveAt) : null
  
  let newStreak = kid.streakDays
  let gemsEarned = 0

  if (!lastActive) {
    // First activity ever
    newStreak = FIRST_DAY_STREAK
  } else {
    const diffTime = Math.abs(now.getTime() - lastActive.getTime())
    const diffDays = Math.floor(diffTime / MS_PER_DAY)

    if (diffDays === 0) {
      // Same day, keep streak
      newStreak = kid.streakDays
    } else if (diffDays === 1) {
      // Consecutive day, increment streak
      newStreak += 1
    } else {
      // Missed days, reset streak
      newStreak = MISSED_DAY_STREAK
    }
  }

  // Update Kid stats
  await prisma.kid.update({
    where: { id: kidId },
    data: {
      streakDays: newStreak,
      lastActiveAt: now,
      gems: { increment: gemsEarned },
      totalGems: { increment: gemsEarned },
    },
  })

  // Update Family Goals
  await updateFamilyGoalPoints(familyId, points)

  return { gemsEarned, newStreak }
}

async function updateFamilyGoalPoints(familyId: string, points: number) {
  const goals = await prisma.familyGoal.findMany({
    where: {
      familyId,
      status: 'ACTIVE',
    },
  })

  for (const goal of goals) {
    const newCurrent = goal.currentPoints + points
    
    await prisma.familyGoal.update({
      where: { id: goal.id },
      data: {
        currentPoints: newCurrent,
        status: newCurrent >= goal.targetPoints ? 'COMPLETED' : 'ACTIVE',
      },
    })
  }
}
