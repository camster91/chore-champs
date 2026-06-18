'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { getWeekStart, addDays, startOfDay, endOfDay } from '@/lib/utils'

export interface WeeklySummary {
  startDate: string
  days: Array<{
    label: string
    completed: number
    total: number
    date: string
  }>
  weeklyTotal: number
  weeklyGoal: number
  bestDay: string
  consistencyPercent: number
}

export async function getWeeklySummary(
  kidId: string,
  weekOffset: number = 0
): Promise<WeeklySummary> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  // Verify kid belongs to this family
  const kid = await prisma.kid.findFirst({
    where: { id: kidId, familyId: session.user.familyId }
  })
  if (!kid) {
    throw new Error('Kid not found')
  }

  const now = new Date()
  const weekStart = getWeekStart(addDays(now, weekOffset * 7))

  // Build day ranges
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const weekEnd = endOfDay(addDays(weekStart, 6))

  // Optimization: Fetch all data for the week in 3 queries, then group in memory
  const [allAssignments, completedAssignments, allHabitLogs] = await Promise.all([
    prisma.choreAssignment.groupBy({
      by: ['dueDate'],
      where: {
        kidId,
        dueDate: { gte: startOfDay(weekStart), lte: weekEnd }
      },
      _count: { _all: true }
    }),
    prisma.choreAssignment.groupBy({
      by: ['dueDate'],
      where: {
        kidId,
        dueDate: { gte: startOfDay(weekStart), lte: weekEnd },
        status: 'COMPLETED'
      },
      _count: { _all: true }
    }),
    prisma.habitLog.groupBy({
      by: ['loggedAt'],
      where: {
        kidId,
        loggedAt: { gte: startOfDay(weekStart), lte: weekEnd }
      },
      _count: { _all: true }
    })
  ])

  // Process data in memory
  const days = Array.from({ length: 7 }).map((_, i) => {
    const dayDate = addDays(weekStart, i)
    const dayStart = startOfDay(dayDate)
    const dayEnd = endOfDay(dayDate)

    // Filter matching records for this day
    const matchDay = (dateStr: Date | string) => {
      const d = new Date(dateStr)
      return d >= dayStart && d <= dayEnd
    }

    const total = allAssignments
      .filter(a => matchDay(a.dueDate))
      .reduce((sum, a) => sum + a._count._all, 0)

    const completed = completedAssignments
      .filter(a => matchDay(a.dueDate))
      .reduce((sum, a) => sum + a._count._all, 0)

    const habitLogsCount = allHabitLogs
      .filter(l => matchDay(l.loggedAt))
      .reduce((sum, l) => sum + l._count._all, 0)

    return {
      label: dayLabels[(weekStart.getDay() + i) % 7],
      completed: completed + habitLogsCount,
      total,
      date: dayDate.toISOString().split('T')[0],
    }
  })

  const weeklyTotal = days.reduce((sum, d) => sum + d.completed, 0)
  const weeklyGoal = days.reduce((sum, d) => sum + d.total, 0)
  const bestDay = dayNames[days.reduce((bestIdx, day, idx) =>
    day.completed > days[bestIdx].completed ? idx : bestIdx, 0
  ) + weekStart.getDay() % 7]
  const consistencyPercent = weeklyGoal > 0
    ? Math.round((weeklyTotal / weeklyGoal) * 100)
    : 0

  return {
    startDate: weekStart.toISOString().split('T')[0],
    days,
    weeklyTotal,
    weeklyGoal,
    bestDay,
    consistencyPercent,
  }
}
