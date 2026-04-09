import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, badRequest } from '@/lib/auth/helpers'

export async function GET(request: Request) {
  const auth = await getAuthenticatedFamily()
  if (!auth) return unauthorized()

  const { searchParams } = new URL(request.url)
  const kidId = searchParams.get('kidId')
  const date = searchParams.get('date') // YYYY-MM-DD
  const status = searchParams.get('status')

  // Get chores with assignments if kidId is provided
  if (kidId) {
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

  const body = await request.json()
  const { title, description, icon, difficulty, basePoints, recurring, timeOfDay, assignToKids } = body

  if (!title) return badRequest('Title is required')

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
  if (assignToKids && Array.isArray(assignToKids) && assignToKids.length > 0) {
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
}
