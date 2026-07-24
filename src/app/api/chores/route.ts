import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized } from '@/lib/auth/helpers'

const ASSIGNMENT_HISTORY_DAYS = 90
const MAX_ASSIGNMENTS_PER_CHORE = 200

export async function GET() {
  try {
    const auth = await getAuthenticatedFamily()
    if (!auth) return unauthorized()

    const since = new Date()
    since.setDate(since.getDate() - ASSIGNMENT_HISTORY_DAYS)
    since.setHours(0, 0, 0, 0)

    const chores = await prisma.chore.findMany({
      where: { familyId: auth.familyId },
      select: {
        id: true,
        title: true,
        description: true,
        basePoints: true,
        icon: true,
        difficulty: true,
        recurring: true,
        timeOfDay: true,
        isActive: true,
        createdAt: true,
        assignments: {
          where: {
            OR: [
              { status: 'PENDING' },
              { dueDate: { gte: since } },
              { completedAt: { gte: since } },
            ],
          },
          orderBy: { dueDate: 'asc' },
          take: MAX_ASSIGNMENTS_PER_CHORE,
          select: {
            id: true,
            choreId: true,
            kidId: true,
            dueDate: true,
            status: true,
            completedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(chores)
  } catch (error) {
    console.error('Chores API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
