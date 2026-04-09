import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, notFound, badRequest } from '@/lib/auth/helpers'
import { calculateLevel, getPointsMultiplier } from '@/lib/utils'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  const { id: assignmentId } = await params
  const body = await request.json().catch(() => ({}))
  const { kidId, bonusPoints = 0 } = body

  // Find the assignment
  const assignment = await prisma.choreAssignment.findFirst({
    where: {
      id: assignmentId,
      kid: { familyId: auth.familyId },
    },
    include: { chore: true, kid: true },
  })

  if (!assignment) return notFound('Assignment not found')
  if (assignment.status === 'COMPLETED') return badRequest('Already completed')

  const difficulty = assignment.chore.difficulty as 'EASY' | 'MEDIUM' | 'HARD'
  const pointsEarned = assignment.chore.basePoints * getPointsMultiplier(difficulty) + bonusPoints

  // Check streak: was the kid active yesterday?
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const wasActiveYesterday = assignment.kid.lastActiveAt
    ? new Date(assignment.kid.lastActiveAt) >= yesterday
    : false

  const wasActiveToday = assignment.kid.lastActiveAt
    ? new Date(assignment.kid.lastActiveAt) >= today
    : false

  let newStreakDays = assignment.kid.streakDays
  if (!wasActiveToday) {
    newStreakDays = wasActiveYesterday ? assignment.kid.streakDays + 1 : 1
  }

  const newTotalPoints = assignment.kid.totalPoints + pointsEarned
  const newPoints = assignment.kid.points + pointsEarned
  const newLevel = calculateLevel(newTotalPoints)
  const leveledUp = newLevel > assignment.kid.level

  // Update assignment and kid in a transaction
  const [updatedAssignment, updatedKid] = await prisma.$transaction([
    prisma.choreAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        pointsEarned,
        bonusPoints,
      },
      include: { chore: true },
    }),
    prisma.kid.update({
      where: { id: assignment.kidId },
      data: {
        points: newPoints,
        totalPoints: newTotalPoints,
        streakDays: newStreakDays,
        lastActiveAt: new Date(),
        level: newLevel,
        experience: newTotalPoints - (newLevel > 1 ? (newLevel * (newLevel - 1)) / 2 * 100 : 0),
      },
    }),
  ])

  // Check for new badge unlocks
  const newBadges = await checkAndAwardBadges(updatedKid.id, {
    totalCompleted: updatedKid.totalPoints,
    streakDays: newStreakDays,
    level: newLevel,
  })

  return NextResponse.json({
    assignment: updatedAssignment,
    kid: updatedKid,
    pointsEarned,
    leveledUp,
    newLevel: leveledUp ? newLevel : null,
    streakDays: newStreakDays,
    newBadges,
  })
}

async function checkAndAwardBadges(
  kidId: string,
  stats: { totalCompleted: number; streakDays: number; level: number }
) {
  const badges = await prisma.badgeDefinition.findMany()
  const earnedBadges = await prisma.earnedBadge.findMany({
    where: { kidId },
    select: { badgeId: true },
  })
  const earnedIds = new Set(earnedBadges.map((b) => b.badgeId))

  const newBadges: { name: string; icon: string; description: string }[] = []

  for (const badge of badges) {
    if (earnedIds.has(badge.id)) continue

    let criteria: { type: string; value: number }
    try {
      criteria = JSON.parse(badge.requirement)
    } catch {
      continue
    }

    let earned = false
    if (criteria.type === 'streak' && stats.streakDays >= criteria.value) earned = true
    if (criteria.type === 'level' && stats.level >= criteria.value) earned = true
    if (criteria.type === 'points' && stats.totalCompleted >= criteria.value) earned = true

    if (earned) {
      await prisma.earnedBadge.create({
        data: { badgeId: badge.id, kidId },
      })
      newBadges.push({ name: badge.name, icon: badge.icon, description: badge.description })
    }
  }

  return newBadges
}
