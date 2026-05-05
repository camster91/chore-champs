'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function checkAndAwardBadges(kidId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) return

  const kid = await prisma.kid.findFirst({
    where: { 
      id: kidId,
      familyId: session.user.familyId 
    },
    include: {
      earnedBadges: true,
      choreAssignments: {
        where: { status: 'COMPLETED' },
      },
    },
  })

  if (!kid) return

  const completedCount = kid.choreAssignments.length
  const badgesToAward = []

  // Achievement logic
  const achievements = [
    { id: 'first-chore', name: 'First Chore', requirement: 1, icon: '🌟' },
    { id: 'chore-pro', name: 'Chore Pro', requirement: 10, icon: '🏆' },
    { id: 'chore-master', name: 'Chore Master', requirement: 50, icon: '👑' },
  ]

  for (const achievement of achievements) {
    const alreadyEarned = kid.earnedBadges.some(b => b.badgeId === achievement.id)
    if (!alreadyEarned && completedCount >= achievement.requirement) {
      // Award badge
      // First ensure the definition exists
      await prisma.badgeDefinition.upsert({
        where: { id: achievement.id },
        update: {},
        create: {
          id: achievement.id,
          name: achievement.name,
          description: `Completed ${achievement.requirement} chores`,
          icon: achievement.icon,
          requirement: JSON.stringify({ chores: achievement.requirement }),
        },
      })

      badgesToAward.push(
        prisma.earnedBadge.create({
          data: {
            kidId,
            badgeId: achievement.id,
          },
        })
      )
    }
  }

  if (badgesToAward.length > 0) {
    await Promise.all(badgesToAward)
    revalidatePath('/profile')
    revalidatePath('/dashboard')
  }
}

export async function getEarnedBadges(kidId: string) {
  return await prisma.earnedBadge.findMany({
    where: { kidId },
    include: {
      badge: true,
    },
  })
}
