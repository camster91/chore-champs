import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, badRequest } from '@/lib/auth/helpers'
import { z } from 'zod'

const choreSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  icon: z.string().optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  basePoints: z.number().min(1).optional(),
  recurring: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'WEEKDAYS', 'WEEKENDS']).nullable().optional(),
  timeOfDay: z.enum(['MORNING', 'AFTERNOON', 'EVENING', 'ANYTIME']).optional(),
  assignToKids: z.array(z.string()).optional(),
})

export async function GET(request: Request) {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  const { searchParams } = new URL(request.url)
  const kidId = searchParams.get('kidId')
  const date = searchParams.get('date') // YYYY-MM-DD
  const status = searchParams.get('status')

  // Get chores with assignments if kidId is provided
  if (kidId) {
    // Verify kid ownership
    const kid = await prisma.kid.findFirst({
      where: { id: kidId, familyId: auth.familyId }
    })
    if (!kid) return unauthorized()

    const startOfDay = date
      ? new Date(`${date}T00:00:00.000Z`)
      : new Date(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

    const assignments = await prisma.choreAssignment.findMany({
      where: {
        kidId,
        kid: { familyId: auth.familyId },
        dueDate: { gte: startOfDay, lt: endOfDay },
        ...(status ? { status: status as 'PENDING' | 'COMPLETED' | 'SKIPPED' } : {}),
      },
      include: {
        chore: true,
      },
      orderBy: [
        { status: 'asc' },
        { chore: { timeOfDay: 'asc' } },
        { createdAt: 'asc' },
      ],
    })

    return NextResponse.json(assignments)
  }

  // Get all family chores
  const chores = await prisma.chore.findMany({
    where: {
      familyId: auth.familyId,
      isActive: true,
    },
    include: {
      _count: {
        select: { assignments: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(chores)
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  try {
    const json = await request.json()
    const body = choreSchema.parse(json)
    const { title, description, icon, difficulty, basePoints, recurring, timeOfDay, assignToKids } = body

    // Verify all kids belong to this family
    if (assignToKids && assignToKids.length > 0) {
      const kidsInFamily = await prisma.kid.findMany({
        where: {
          id: { in: assignToKids },
          familyId: auth.familyId,
        },
        select: { id: true },
      })

      if (kidsInFamily.length !== assignToKids.length) {
        return badRequest('One or more invalid kid IDs')
      }
    }

    const chore = await prisma.chore.create({
      data: {
        title,
        description,
        icon: icon || 'star',
        difficulty: difficulty || 'EASY',
        basePoints: basePoints || 10,
        recurring: recurring || null,
        timeOfDay: timeOfDay || 'ANYTIME',
        familyId: auth.familyId,
      },
    })

    // Auto-assign to kids if requested
    if (assignToKids && assignToKids.length > 0) {
      const today = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')

      await prisma.choreAssignment.createMany({
        data: assignToKids.map((kidId: string) => ({
          choreId: chore.id,
          kidId,
          dueDate: today,
        })),
      })
    }

    return NextResponse.json(chore, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest(error.issues[0].message)
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
