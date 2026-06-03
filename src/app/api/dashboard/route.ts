import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, notFound } from '@/lib/auth/helpers'

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedFamily()
    if (!auth) return unauthorized()

    const { searchParams } = new URL(request.url)
    const kidId = searchParams.get('kidId')

    if (!kidId) {
      return NextResponse.json({ error: 'kidId is required' }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Optimization: Removed include for choreAssignments
    // to prevent unbounded O(N) relational over-fetching,
    // since the API only returns basic kid information.
    const kid = await prisma.kid.findFirst({
      where: { id: kidId, familyId: auth.familyId }
    })

    if (!kid) return notFound('Kid not found')

    const todaysAssignments = await prisma.choreAssignment.findMany({
      where: {
        kidId,
        dueDate: { gte: today, lt: tomorrow },
      },
      include: { chore: true },
    })

    const completedCount = todaysAssignments.filter(a => a.status === 'COMPLETED').length

    return NextResponse.json({
      kid: {
        id: kid.id,
        name: kid.name,
        age: kid.age,
        avatarId: kid.avatarId,
      },
      todaysAssignments: todaysAssignments.map(a => ({
        id: a.id,
        choreId: a.choreId,
        title: a.chore.title,
        description: a.chore.description,
        icon: a.chore.icon,
        points: a.chore.basePoints,
        status: a.status,
        dueDate: a.dueDate,
      })),
      stats: {
        completedToday: completedCount,
        totalToday: todaysAssignments.length,
      }
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
