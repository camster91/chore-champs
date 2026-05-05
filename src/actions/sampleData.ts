'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

const SAMPLE_KIDS = [
  { name: 'Alex', age: 8, avatarId: 'robot' },
  { name: 'Emma', age: 6, avatarId: 'astronaut' },
  { name: 'Sam', age: 10, avatarId: 'ninja' },
]

const SAMPLE_CHORES = [
  { title: 'Make Your Bed', description: 'Straighten sheets and fluff pillows', basePoints: 5, icon: '🛏️', difficulty: 'EASY' as const },
  { title: 'Brush Teeth', description: 'Brush for 2 minutes', basePoints: 5, icon: '🦷', difficulty: 'EASY' as const },
  { title: 'Clean Room', description: 'Tidy toys, make bed, vacuum floor', basePoints: 15, icon: '✨', difficulty: 'MEDIUM' as const },
  { title: 'Feed Pet', description: 'Give food and fresh water to pet', basePoints: 10, icon: '🐕', difficulty: 'EASY' as const },
  { title: 'Do Homework', description: 'Complete all assignments', basePoints: 20, icon: '📚', difficulty: 'MEDIUM' as const },
  { title: 'Set Table', description: 'Put out plates and utensils for dinner', basePoints: 5, icon: '🍽️', difficulty: 'EASY' as const },
  { title: 'Take Out Trash', description: 'Empty all trash cans and take to curb', basePoints: 10, icon: '🗑️', difficulty: 'MEDIUM' as const },
  { title: 'Read for 20 Minutes', description: 'Read quietly in your favorite spot', basePoints: 15, icon: '📖', difficulty: 'EASY' as const },
  { title: 'Help with Dishes', description: 'Load or unload dishwasher', basePoints: 10, icon: '🍳', difficulty: 'EASY' as const },
  { title: 'Practice Instrument', description: 'Practice for at least 15 minutes', basePoints: 15, icon: '🎵', difficulty: 'MEDIUM' as const },
]

const SAMPLE_REWARDS = [
  { title: 'Extra Screen Time', description: '30 minutes of extra tablet or TV time', cost: 25, icon: '📱', category: 'Entertainment' },
  { title: 'Pick a Movie', description: 'Choose the family movie for movie night', cost: 30, icon: '🎬', category: 'Entertainment' },
  { title: 'Stay Up Late', description: '30 minutes past bedtime', cost: 40, icon: '🌙', category: 'Special' },
  { title: 'Ice Cream Trip', description: 'Trip to the ice cream shop', cost: 100, icon: '🍦', category: 'Treats' },
  { title: 'New Book', description: 'Pick out a new book to read', cost: 75, icon: '📚', category: 'Education' },
  { title: 'Friend Sleepover', description: 'Invite a friend for a sleepover', cost: 150, icon: '🎉', category: 'Special' },
  { title: 'Game Night Choice', description: 'You pick the game for family game night', cost: 35, icon: '🎲', category: 'Fun' },
  { title: 'Skip a Chore', description: 'Skip one chore of your choice', cost: 50, icon: '⏭️', category: 'Special' },
]

const SAMPLE_HABITS = [
  { title: 'Drink Water', description: 'Drink 8 glasses of water today', frequency: 'DAILY' as const, icon: '💧' },
  { title: 'Exercise', description: '30 minutes of physical activity', frequency: 'DAILY' as const, icon: '🏃' },
  { title: 'Practice Gratitude', description: 'Write down 3 things you are thankful for', frequency: 'DAILY' as const, icon: '🙏' },
  { title: 'No Complaining', description: 'Go all day without complaining', frequency: 'DAILY' as const, icon: '😊' },
  { title: 'Read Before Bed', description: 'Read for at least 10 minutes', frequency: 'DAILY' as const, icon: '📖' },
]

export async function addSampleData() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized')
  }

  const familyId = session.user.familyId

  // Check if family already has data
  const existingKids = await prisma.kid.count({ where: { familyId } })
  if (existingKids > 0) {
    return { message: 'Family already has kids. Sample data not added.', added: false }
  }

  // Add sample kids
  const kids = await Promise.all(
    SAMPLE_KIDS.map(kid => 
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

  // Add sample chores
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  await Promise.all(
    SAMPLE_CHORES.map(chore =>
      prisma.chore.create({
        data: {
          ...chore,
          familyId,
          recurring: chore.title.includes('Brush') || chore.title.includes('Read') ? 'DAILY' : null,
          timeOfDay: 'ANYTIME',
          isActive: true,
          assignments: {
            create: kids.map(kid => ({
              kidId: kid.id,
              dueDate: today,
              status: 'PENDING'
            }))
          }
        }
      })
    )
  )

  // Add sample rewards
  await Promise.all(
    SAMPLE_REWARDS.map(reward =>
      prisma.reward.create({
        data: {
          ...reward,
          familyId,
          isActive: true,
        }
      })
    )
  )

  // Add sample habits
  await Promise.all(
    SAMPLE_HABITS.map((habit, index) =>
      prisma.habit.create({
        data: {
          ...habit,
          familyId,
          isActive: true,
          streakDays: Math.floor(Math.random() * 5),
          lastLoggedAt: new Date(),
          assignments: {
            create: kids.map(kid => ({
              kidId: kid.id,
              completed: index < 2,
              loggedAt: index < 2 ? new Date() : null,
            }))
          }
        }
      })
    )
  )

  // Add a sample family goal
  await prisma.familyGoal.create({
    data: {
      title: 'Summer Vacation Fund',
      description: 'Work together to earn enough for our family trip!',
      targetPoints: 1000,
      currentPoints: 0,
      reward: 'Beach vacation! 🏖️',
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
    message: 'Sample data added successfully!', 
    added: true,
    kidsCount: kids.length,
    choresCount: SAMPLE_CHORES.length,
    rewardsCount: SAMPLE_REWARDS.length,
    habitsCount: SAMPLE_HABITS.length,
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
