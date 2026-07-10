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

// Format local date component as YYYY-MM-DD to avoid timezone bugs
function toLocalDateString(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
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
  const days: Array<{ label: string; completed: number; total: number; date: string }> = []
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const weekEnd = endOfDay(addDays(weekStart, 6))

  // Optimization: reduced 21 sequential queries inside the loop to 2 concurrent queries for the entire week
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

    const dayAssignments = weeklyAssignments.filter(a =>
      a.dueDate >= dayStart && a.dueDate <= dayEnd
    )
    const dayHabits = weeklyHabitLogs.filter(h =>
      h.loggedAt >= dayStart && h.loggedAt <= dayEnd
    )

    const total = dayAssignments.length
    const completedAssignments = dayAssignments.filter(a => a.status === 'COMPLETED').length
    const habitLogsCount = dayHabits.length

    days.push({
      label: dayLabels[(weekStart.getDay() + i) % 7],
      completed: completedAssignments + habitLogsCount,
      total,
      date: toLocalDateString(dayDate),
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
    startDate: toLocalDateString(weekStart),
    days,
    weeklyTotal,
    weeklyGoal,
    bestDay,
    consistencyPercent,
  }
}
