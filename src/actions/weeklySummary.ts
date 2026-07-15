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

  // ⚡ Bolt: Performance Optimization - Resolved N+1 queries by fetching all assignments and habit logs for the week in 2 concurrent queries, replacing 21 sequential queries.
  const [allAssignments, allHabitLogs] = await Promise.all([
    prisma.choreAssignment.findMany({
      where: {
        kidId,
        dueDate: { gte: startOfDay(weekStart), lte: weekEnd },
      },
      select: { dueDate: true, status: true },
    }),
    prisma.habitLog.findMany({
      where: {
        kidId,
        loggedAt: { gte: startOfDay(weekStart), lte: weekEnd },
      },
      select: { loggedAt: true },
    })
  ])

  // Build day ranges
  const days: Array<{ label: string; completed: number; total: number; date: string }> = []
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  for (let i = 0; i < 7; i++) {
    const dayDate = addDays(weekStart, i)
    const dayStartMs = startOfDay(dayDate).getTime()
    const dayEndMs = endOfDay(dayDate).getTime()

    const dayAssignments = allAssignments.filter(a => {
      const time = a.dueDate.getTime()
      return time >= dayStartMs && time <= dayEndMs
    })

    const total = dayAssignments.length
    const completed = dayAssignments.filter(a => a.status === 'COMPLETED').length

    // Also count habit logs for this date
    const habitLogs = allHabitLogs.filter(h => {
      const time = h.loggedAt.getTime()
      return time >= dayStartMs && time <= dayEndMs
    }).length

    days.push({
      label: dayLabels[(weekStart.getDay() + i) % 7],
      completed: completed + habitLogs,
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
