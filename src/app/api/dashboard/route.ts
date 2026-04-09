import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized } from '@/lib/auth/helpers'

export async function GET(request: Request) {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  const { searchParams } = new URL(request.url)
  const kidId = searchParams.get('kidId')

  if (!kidId) {
    return NextResponse.json({ error: 'kidId is required' }, { status: 400 })
  }

  const today = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [
    kid,
    todaysAssignments,
    weeklyCompleted,
    recentBadges,
    totalChoresCompleted,
    leaderboard,
  ] = await Promise.all([
    // Current kid data
    prisma.kid.findFirst({
      where: { id: kidId, familyId: auth.familyId },
    }),

    // Today's chore assignments
    prisma.choreAssignment.findMany({
      where: {
        kidId,
        dueDate: { gte: today, lt: tomorrow },
      },
      include: { chore: true },
      orderBy: [{ status: 'asc' }, { chore: { timeOfDay: 'asc' } }],
    }),

    // Completed this week
    prisma.choreAssignment.count({
      where: {
        kidId,
        status: 'COMPLETED',
        completedAt: { gte: weekAgo },
      },
    }),

    // Recent badges
    prisma.earnedBadge.findMany({
      where: { kidId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
      take: 5,
    }),

    // Total completed
    prisma.choreAssignment.count({
      where: { kidId, status: 'COMPLETED' },
    }),

    // Family leaderboard
    prisma.kid.findMany({
      where: { familyId: auth.familyId },
      select: {
        id: true,
        name: true,
        avatarId: true,
        points: true,
        totalPoints: true,
        level: true,
        streakDays: true,
        primaryColor: true,
        secondaryColor: true,
      },
      orderBy: { totalPoints: 'desc' },
    }),
  ])

  if (!kid) {
    return NextResponse.json({ error: 'Kid not found' }, { status: 404 })
  }

  const todayCompleted = todaysAssignments.filter((a) => a.status === 'COMPLETED').length
  const todayTotal = todaysAssignments.length
  const todayPoints = todaysAssignments
    .filter((a) => a.status === 'COMPLETED')
    .reduce((sum, a) => sum + (a.pointsEarned || 0), 0)
  const todayPossiblePoints = todaysAssignments.reduce(
    (sum, a) => sum + a.chore.basePoints,
    0
  )

  return NextResponse.json({
    kid,
    today: {
      assignments: todaysAssignments,
      completed: todayCompleted,
      total: todayTotal,
      points: todayPoints,
      possiblePoints: todayPossiblePoints,
    },
    weeklyCompleted,
    totalChoresCompleted,
    recentBadges: recentBadges.map((eb) => ({
      id: eb.badge.id,
      name: eb.badge.name,
      icon: eb.badge.icon,
      description: eb.badge.description,
      earnedAt: eb.earnedAt,
    })),
    leaderboard,
  })
}
