import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, badRequest, notFound } from '@/lib/auth/helpers'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_KIDS_PER_ASSIGN = 20

/**
 * POST /api/chores/assign
 * Assign an existing chore to one or more kids for a specific date.
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedFamily()
    if (!auth) return unauthorized()

    const body = await request.json()
    const { choreId, kidIds, date } = body

    if (!choreId || typeof choreId !== 'string') {
      return badRequest('choreId is required')
    }
    if (!kidIds || !Array.isArray(kidIds) || kidIds.length === 0) {
      return badRequest('kidIds must be a non-empty array')
    }
    if (kidIds.length > MAX_KIDS_PER_ASSIGN) {
      return badRequest(`kidIds cannot exceed ${MAX_KIDS_PER_ASSIGN}`)
    }
    if (!kidIds.every((id: unknown) => typeof id === 'string' && id.length > 0 && id.length <= 64)) {
      return badRequest('Invalid kidIds')
    }

    // Verify chore belongs to family
    const chore = await prisma.chore.findFirst({
      where: { id: choreId, familyId: auth.familyId },
    })
    if (!chore) return notFound('Chore not found')

    // Verify all kids belong to family
    const kids = await prisma.kid.findMany({
      where: { id: { in: kidIds }, familyId: auth.familyId },
      take: MAX_KIDS_PER_ASSIGN,
    })
    if (kids.length !== kidIds.length) {
      return badRequest('One or more kids not found in family')
    }

    // Default to today; only allow ISO dates within ±7 days of today.
    let dueDate: Date
    if (date != null) {
      if (typeof date !== 'string' || !DATE_RE.test(date)) {
        return badRequest('date must be YYYY-MM-DD')
      }
      dueDate = new Date(`${date}T00:00:00.000Z`)
      if (Number.isNaN(dueDate.getTime())) {
        return badRequest('Invalid date')
      }
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)
      const diffDays = Math.abs((dueDate.getTime() - today.getTime()) / 86_400_000)
      if (diffDays > 7) {
        return badRequest('date must be within 7 days of today')
      }
    } else {
      dueDate = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')
    }

    // Avoid duplicates: any assignment (PENDING or COMPLETED) for that day blocks re-assign.
    const tomorrow = new Date(dueDate)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const existing = await prisma.choreAssignment.findMany({
      where: {
        choreId,
        kidId: { in: kidIds },
        dueDate: { gte: dueDate, lt: tomorrow },
      },
      select: { kidId: true },
    })
    const existingKidIds = new Set(existing.map((a) => a.kidId))

    const newAssignments = kidIds
      .filter((kidId: string) => !existingKidIds.has(kidId))
      .map((kidId: string) => ({
        choreId,
        kidId,
        dueDate,
        status: 'PENDING' as const,
      }))

    if (newAssignments.length > 0) {
      await prisma.choreAssignment.createMany({ data: newAssignments })
    }

    return NextResponse.json({
      assigned: newAssignments.length,
      skippedDuplicates: kidIds.length - newAssignments.length,
    })
  } catch (error) {
    console.error('Assign chore API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
