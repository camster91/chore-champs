import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, badRequest, notFound } from '@/lib/auth/helpers'
import { guardMutatingRequest } from '@/lib/security/request-guards'

/**
 * POST /api/chores/assign
 * Assign an existing chore to one or more kids for a specific date.
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedFamily()
    if (!auth) return unauthorized()

    const blocked = await guardMutatingRequest(request, 'chore-assign', { userId: auth.userId })
    if (blocked) return blocked

    const body = await request.json()
    const { choreId, kidIds, date } = body

    if (!choreId) return badRequest('choreId is required')
    if (!kidIds || !Array.isArray(kidIds) || kidIds.length === 0) {
      return badRequest('kidIds must be a non-empty array')
    }

    const chore = await prisma.chore.findFirst({
      where: { id: choreId, familyId: auth.familyId },
    })
    if (!chore) return notFound('Chore not found')

    const kids = await prisma.kid.findMany({
      where: { id: { in: kidIds }, familyId: auth.familyId },
    })
    if (kids.length !== kidIds.length) {
      return badRequest('One or more kids not found in family')
    }

    const dueDate = date
      ? new Date(`${date}T00:00:00.000Z`)
      : new Date(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')

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
