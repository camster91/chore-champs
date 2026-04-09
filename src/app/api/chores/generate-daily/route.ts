import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized } from '@/lib/auth/helpers'

/**
 * POST /api/chores/generate-daily
 * Generates today's chore assignments from recurring chores for all kids in the family.
 * Called when the dashboard loads or can be triggered by a cron job.
 * Idempotent — won't create duplicate assignments for today.
 */
export async function POST() {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const dayOfWeek = today.getDay() // 0=Sun, 6=Sat
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  // Get all active recurring chores for this family
  const recurringChores = await prisma.chore.findMany({
    where: {
      familyId: auth.familyId,
      isActive: true,
      recurring: { not: null },
    },
  })

  // Get all kids in the family
  const kids = await prisma.kid.findMany({
    where: { familyId: auth.familyId },
  })

  if (kids.length === 0 || recurringChores.length === 0) {
    return NextResponse.json({ created: 0, message: 'No kids or recurring chores' })
  }

  // Filter chores that should run today
  const todaysChores = recurringChores.filter((chore) => {
    switch (chore.recurring) {
      case 'DAILY':
        return true
      case 'WEEKDAYS':
        return isWeekday
      case 'WEEKENDS':
        return isWeekend
      case 'WEEKLY':
        // Run on Monday
        return dayOfWeek === 1
      case 'MONTHLY':
        // Run on 1st of month
        return today.getDate() === 1
      default:
        return false
    }
  })

  // Check which assignments already exist for today
  const existingAssignments = await prisma.choreAssignment.findMany({
    where: {
      dueDate: { gte: today, lt: tomorrow },
      chore: { familyId: auth.familyId },
    },
    select: { choreId: true, kidId: true },
  })

  const existingKeys = new Set(
    existingAssignments.map((a) => `${a.choreId}:${a.kidId}`)
  )

  // Create missing assignments
  const newAssignments = todaysChores.flatMap((chore) =>
    kids
      .filter((kid) => !existingKeys.has(`${chore.id}:${kid.id}`))
      .map((kid) => ({
        choreId: chore.id,
        kidId: kid.id,
        dueDate: today,
        status: 'PENDING' as const,
      }))
  )

  if (newAssignments.length > 0) {
    await prisma.choreAssignment.createMany({ data: newAssignments })
  }

  return NextResponse.json({
    created: newAssignments.length,
    todaysChores: todaysChores.length,
    kids: kids.length,
  })
}
