import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthenticatedFamily, unauthorized, notFound, badRequest } from '@/lib/auth/helpers'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedFamily()
    if (!auth) return unauthorized()

    const { id: assignmentId } = await params

    const assignment = await prisma.choreAssignment.findFirst({
      where: {
        id: assignmentId,
        kid: { familyId: auth.familyId },
      },
      include: { chore: true, kid: true },
    })

    if (!assignment) return notFound('Assignment not found')
    if (assignment.status === 'COMPLETED') return badRequest('Already completed')

    const pointsEarned = assignment.chore.basePoints

    const [updatedAssignment] = await prisma.$transaction([
      prisma.choreAssignment.update({
        where: { id: assignmentId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
        include: { chore: true },
      }),
      prisma.kid.update({
        where: { id: assignment.kid.id },
        data: {
          points: { increment: pointsEarned },
          totalPoints: { increment: pointsEarned }
        }
      })
    ])

    return NextResponse.json({
      assignment: updatedAssignment,
      pointsEarned,
    })
  } catch (error) {
    console.error('Complete assignment API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
