import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, notFound, badRequest } from '@/lib/auth/helpers'
import { calculateLevel, getPointsMultiplier } from '@/lib/utils'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  const { id: assignmentId } = await params

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
  const pointsEarned = assignment.chore.basePoints * getPointsMultiplier(difficulty)

  // Streak logic
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const wasActiveYesterday = assignment.kid.lastActiveAt
    ? new Date(assignment.kid.lastActiveAt) >= yesterday
    : false
  const wasActiveToday = assignment.kid.lastActiveAt
    ? new Date(assignment.kid.lastActiveAt) >= todayStart
    : false

  let newStreakDays = assignment.kid.streakDays
  if (!wasActiveToday) {
    newStreakDays = wasActiveYesterday ? assignment.kid.streakDays + 1 : 1
  }

  const newTotalPoints = assignment.kid.totalPoints + pointsEarned
  const newPoints = assignment.kid.points + pointsEarned
  const newLevel = calculateLevel(newTotalPoints)
  const leveledUp = newLevel > assignment.kid.level

  const [updatedAssignment, updatedKid] = await prisma.$transaction([
    prisma.choreAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        pointsEarned,
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
      },
    }),
  ])

  return NextResponse.json({
    assignment: updatedAssignment,
    kid: updatedKid,
    pointsEarned,
    leveledUp,
    newLevel: leveledUp ? newLevel : null,
    streakDays: newStreakDays,
  })
}
