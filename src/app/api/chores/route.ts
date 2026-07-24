import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized } from '@/lib/auth/helpers'

const ASSIGNMENT_LOOKBACK_DAYS = 14

export async function GET() {
  try {
    const auth = await getAuthenticatedFamily()
    if (!auth) return unauthorized()

    const since = new Date()
    since.setDate(since.getDate() - ASSIGNMENT_LOOKBACK_DAYS)
    since.setHours(0, 0, 0, 0)

    const chores = await prisma.chore.findMany({
      where: { familyId: auth.familyId },
      include: {
        assignments: {
          where: {
            OR: [
              { status: 'PENDING' },
              { dueDate: { gte: since } },
              { completedAt: { gte: since } },
            ],
          },
          include: { kid: { select: { id: true, name: true, avatarId: true } } },
          orderBy: { dueDate: 'asc' },
          take: 100,
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
