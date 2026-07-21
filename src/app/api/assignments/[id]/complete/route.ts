import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import prisma from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { processGamification } from '@/lib/gamification'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const assignment = await prisma.choreAssignment.findFirst({
      where: { id, kid: { familyId: session.user.familyId } },
      include: { kid: true, chore: true },
    })

    if (!assignment) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { kid, chore } = assignment
    const newCompleted = !assignment.completed

    let gamificationResult = null

    if (newCompleted) {
      // Calculate gamification
      gamificationResult = processGamification(
        chore.points,
        kid.totalPoints,
        kid.currentStreak,
        kid.longestStreak,
        kid.lastCompletedAt
      )

      // Update kid with new stats
      await prisma.kid.update({
        where: { id: kid.id },
        data: {
          points: { increment: gamificationResult.pointsEarned },
          totalPoints: { increment: gamificationResult.pointsEarned },
          currentStreak: gamificationResult.currentStreak,
          longestStreak: Math.max(kid.longestStreak, gamificationResult.currentStreak),
          lastCompletedAt: new Date(),
        },
      })

      // Award badge if level up
      if (gamificationResult.leveledUp && gamificationResult.newLevel) {
        await prisma.earnedBadge.upsert({
          where: {
            kidId_badgeId: {
              kidId: kid.id,
              badgeId: `level-${gamificationResult.newLevel.level}`,
            },
          },
          update: {},
          create: {
            kidId: kid.id,
            badgeId: `level-${gamificationResult.newLevel.level}`,
            name: gamificationResult.newLevel.title,
            description: `Reached ${gamificationResult.newLevel.title} level!`,
            icon: gamificationResult.newLevel.icon,
          },
        })
      }
    } else {
      // Marking as incomplete — revert points but keep streak
      await prisma.kid.update({
        where: { id: kid.id },
        data: {
          points: { decrement: chore.points },
          totalPoints: { decrement: chore.points },
        },
      })
    }

    const updated = await prisma.choreAssignment.update({
      where: { id },
      data: { completed: newCompleted, completedAt: newCompleted ? new Date() : null },
      include: { chore: true },
    })

    return NextResponse.json({
      success: true,
      assignment: updated,
      gamification: gamificationResult,
    })
  } catch (error) {
    console.error('Complete assignment error:', error)
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 })
  }
}
