import prisma from '@/lib/db'
import { updateFamilyGoalPoints } from '@/actions/goals'

export async function processGamification(kidId: string, points: number, familyId: string) {
  const kid = await prisma.kid.findUnique({
    where: { id: kidId },
  })

  if (!kid) return

  const now = new Date()
  const lastActive = kid.lastActiveAt ? new Date(kid.lastActiveAt) : null
  
  let newStreak = kid.streakDays
  let gemsEarned = 0

  if (!lastActive) {
    newStreak = 1
  } else {
    const diffTime = Math.abs(now.getTime() - lastActive.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      newStreak += 1
      // Award Gems for milestones
      if (newStreak % 30 === 0) gemsEarned = 50
      else if (newStreak % 10 === 0) gemsEarned = 15
      else if (newStreak % 5 === 0) gemsEarned = 5
    } else if (diffDays > 1) {
      newStreak = 1
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
