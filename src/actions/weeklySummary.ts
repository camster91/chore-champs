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
  const weekEnd = endOfDay(addDays(weekStart, 6))

  // Build day ranges
  const days: Array<{ label: string; completed: number; total: number; date: string }> = []
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // ⚡ Optimization: Fetch all chores and habit logs for the week in two concurrent queries
  // instead of executing 3 sequential count queries per day (21 queries total) inside a loop.
  // This prevents connection pool exhaustion and significantly reduces database roundtrips.
  const [weeklyAssignments, weeklyHabitLogs] = await Promise.all([
    prisma.choreAssignment.findMany({
      where: {
        kidId,
        dueDate: { gte: startOfDay(weekStart), lte: weekEnd },
      },
      select: {
        dueDate: true,
        status: true,
      }
    }),
    prisma.habitLog.findMany({
      where: {
        kidId,
        loggedAt: { gte: startOfDay(weekStart), lte: weekEnd },
      },
      select: {
        loggedAt: true,
      }
    })
  ])

  for (let i = 0; i < 7; i++) {
    const dayDate = addDays(weekStart, i)
    const dayStart = startOfDay(dayDate)
    const dayEnd = endOfDay(dayDate)

    // Aggregate in-memory
    const total = weeklyAssignments.filter(a => a.dueDate >= dayStart && a.dueDate <= dayEnd).length
    const completedAssignments = weeklyAssignments.filter(a => a.dueDate >= dayStart && a.dueDate <= dayEnd && a.status === 'COMPLETED').length
    const habitLogCount = weeklyHabitLogs.filter(h => h.loggedAt >= dayStart && h.loggedAt <= dayEnd).length
    const completed = completedAssignments + habitLogCount

    days.push({
      label: dayLabels[(weekStart.getDay() + i) % 7],
      completed,
      total,
      date: dayDate.toISOString().split('T')[0],
    })
  }

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
