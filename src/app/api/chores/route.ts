import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized } from '@/lib/auth/helpers'

export async function GET() {
  try {
    const auth = await getAuthenticatedFamily()
    if (!auth) return unauthorized()

    const since = new Date()
    since.setHours(0, 0, 0, 0)
    since.setDate(since.getDate() - 14)

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
          take: 100,
          // Only return kidId — avoid nesting full kid rows per assignment.
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
      take: 200,
    })

    return NextResponse.json(chores)
  } catch (error) {
    console.error('Chores API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
