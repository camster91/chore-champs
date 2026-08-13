'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { initI18n, getLocalizedSampleData } from '@/lib/i18n'

export async function addSampleData(locale: string = 'en') {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const familyId = session.user.familyId

  // Initialize i18n and get localized data
  await initI18n(locale)
  const { kids: sampleKids, chores: sampleChores, rewards: sampleRewards, habits: sampleHabits, familyGoal: sampleGoal, messages } = getLocalizedSampleData()

  // Check if family already has data
  const existingKids = await prisma.kid.count({ where: { familyId } })
  if (existingKids > 0) {
    return { message: messages.alreadyHasData, added: false }
  }

  // Add sample kids
  const kids = await Promise.all(
    sampleKids.map(kid =>
      prisma.kid.create({
        data: {
          ...kid,
          familyId,
          themeMode: 'NEUTRAL',
          primaryColor: '#6366f1',
          secondaryColor: '#8b5cf6',
        }
      })
    )
  )

  // Add sample chores with assignments
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const chore of sampleChores) {
    const newChore = await prisma.chore.create({
      data: {
        title: chore.title,
        description: chore.description,
        basePoints: chore.basePoints,
        icon: chore.icon,
        difficulty: chore.difficulty,
        familyId,
        recurring: chore.key === 'brush_teeth' || chore.key === 'read_20_min' ? 'DAILY' : null,
        timeOfDay: 'ANYTIME',
        isActive: true,
      }
    })

    // Create assignments for each kid
    await prisma.choreAssignment.createMany({
      data: kids.map(kid => ({
        choreId: newChore.id,
        kidId: kid.id,
        dueDate: today,
        status: 'PENDING'
      })),
      skipDuplicates: true,
    })
  }

  // Add sample rewards
  await Promise.all(
    sampleRewards.map(reward =>
      prisma.reward.create({
        data: {
          title: reward.title,
          description: reward.description,
          cost: reward.cost,
          icon: reward.icon,
          category: reward.category,
          familyId,
          isActive: true,
        }
      })
    )
  )

  // Add sample habits
  await Promise.all(
    sampleHabits.map(habit =>
      prisma.habit.create({
        data: {
          title: habit.title,
          description: habit.description,
          icon: habit.icon,
          points: habit.points,
          familyId,
          isActive: true,
        }
      })
    )
  )

  // Add a sample family goal
  await prisma.familyGoal.create({
    data: {
      title: sampleGoal.title,
      description: sampleGoal.description,
      targetPoints: 1000,
      currentPoints: 0,
      reward: `${sampleGoal.reward} 🏖️`,
      familyId,
      isActive: true,
    }
  })

  revalidatePath('/dashboard')
  revalidatePath('/chores')
  revalidatePath('/rewards')
  revalidatePath('/habits')
  revalidatePath('/profile')

  return {
    message: messages.sampleAdded,
    added: true,
    kidsCount: kids.length,
    choresCount: sampleChores.length,
    rewardsCount: sampleRewards.length,
    habitsCount: sampleHabits.length,
  }
}

export async function hasExistingData() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    return false
  }

  const kidsCount = await prisma.kid.count({
    where: { familyId: session.user.familyId }
  })

  return kidsCount > 0
}
