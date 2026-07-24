import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized } from '@/lib/auth/helpers'
import { logError } from '@/lib/utils/error'

export async function GET() {
  try {
    const auth = await getAuthenticatedFamily()
    if (!auth) return unauthorized()

    const since = new Date()
    since.setDate(since.getDate() - 14)
    since.setHours(0, 0, 0, 0)

    const chores = await prisma.chore.findMany({
      where: { familyId: auth.familyId },
      take: 500,
      include: {
        assignments: {
          where: { dueDate: { gte: since } },
          include: { kid: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(chores)
  } catch (error) {
    logError('chores-GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
