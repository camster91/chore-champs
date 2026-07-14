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

  // ⚡ Bolt: Performance Optimization - Resolve N+1 query loop by bulk-fetching and grouping in-memory
  const weekStartDay = startOfDay(weekStart)
  const weekEndDay = endOfDay(addDays(weekStart, 6))

  const [allChoreAssignments, allHabitLogs] = await Promise.all([
    prisma.choreAssignment.findMany({
      where: {
        kidId,
        dueDate: { gte: weekStartDay, lte: weekEndDay },
      },
      select: { dueDate: true, status: true },
    }),
    prisma.habitLog.findMany({
      where: {
        kidId,
        loggedAt: { gte: weekStartDay, lte: weekEndDay },
      },
      select: { loggedAt: true },
    }),
  ])

  // Build day ranges
  const days: Array<{ label: string; completed: number; total: number; date: string }> = []
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  for (let i = 0; i < 7; i++) {
    const dayDate = addDays(weekStart, i)
    const dayStart = startOfDay(dayDate)
    const dayEnd = endOfDay(dayDate)

    // Aggregate in-memory, preserving timezone boundaries
    const dayAssignments = allChoreAssignments.filter(
      (a) => a.dueDate >= dayStart && a.dueDate <= dayEnd
    )
    const total = dayAssignments.length
    const completed = dayAssignments.filter((a) => a.status === 'COMPLETED').length

    const dayHabitLogsCount = allHabitLogs.filter(
      (h) => h.loggedAt >= dayStart && h.loggedAt <= dayEnd
    ).length

    days.push({
      label: dayLabels[(weekStart.getDay() + i) % 7],
      completed: completed + dayHabitLogsCount,
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
