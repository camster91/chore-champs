const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding ChoreChamps database...\n')

  // Clean up existing data (order matters for foreign keys)
  console.log('Cleaning up existing data...')
  await prisma.earnedBadge.deleteMany()
  await prisma.badgeDefinition.deleteMany()
  await prisma.redeemedReward.deleteMany()
  await prisma.reward.deleteMany()
  await prisma.habitLog.deleteMany()
  await prisma.habit.deleteMany()
  await prisma.choreAssignment.deleteMany()
  await prisma.chore.deleteMany()
  await prisma.plannerItem.deleteMany()
  await prisma.avatarItem.deleteMany()
  await prisma.kid.deleteMany()
  await prisma.family.deleteMany()
  await prisma.parent.deleteMany()

  // Create parent user
  console.log('Creating parent and family...')
  const hashedPassword = await bcrypt.hash('Ashbi2026!', 12)
  const parent = await prisma.parent.create({
    data: {
      email: 'cameron@ashbi.ca',
      password: hashedPassword,
      name: 'Cameron',
      family: {
        create: {
          name: 'The Ashbi Family',
        },
      },
    },
    include: {
      family: true,
    },
  })

  const familyId = parent.family.id

  // Create 2 child accounts
  console.log('Creating kids...')
  const kid1 = await prisma.kid.create({
    data: {
      name: 'Emma',
      age: 8,
      avatarId: 'unicorn',
      themeMode: 'GIRL',
      primaryColor: '#ec4899',
      secondaryColor: '#a855f7',
      points: 45,
      totalPoints: 145,
      streakDays: 3,
      level: 2,
      experience: 45,
      familyId,
    },
  })

  const kid2 = await prisma.kid.create({
    data: {
      name: 'Noah',
      age: 6,
      avatarId: 'dragon',
      themeMode: 'BOY',
      primaryColor: '#3b82f6',
      secondaryColor: '#22c55e',
      points: 30,
      totalPoints: 80,
      streakDays: 1,
      level: 1,
      experience: 80,
      familyId,
    },
  })

  // Create chores with proper enum values
  console.log('Creating chores...')
  const chores = await Promise.all([
    prisma.chore.create({
      data: {
        title: 'Make my bed',
        description: 'Tidy up your bed every morning',
        icon: '🛏️',
        difficulty: 'EASY',
        basePoints: 10,
        recurring: 'DAILY',
        timeOfDay: 'MORNING',
        familyId,
      },
    }),
    prisma.chore.create({
      data: {
        title: 'Brush teeth',
        description: 'Brush morning and night',
        icon: '🪥',
        difficulty: 'EASY',
        basePoints: 5,
        recurring: 'DAILY',
        timeOfDay: 'MORNING',
        familyId,
      },
    }),
    prisma.chore.create({
      data: {
        title: 'Feed the dog',
        description: 'Give food and fresh water',
        icon: '🐕',
        difficulty: 'MEDIUM',
        basePoints: 15,
        recurring: 'DAILY',
        timeOfDay: 'MORNING',
        familyId,
      },
    }),
    prisma.chore.create({
      data: {
        title: 'Clean my room',
        description: 'Pick up toys and organize your space',
        icon: '🧹',
        difficulty: 'HARD',
        basePoints: 30,
        recurring: 'WEEKLY',
        timeOfDay: 'AFTERNOON',
        familyId,
      },
    }),
    prisma.chore.create({
      data: {
        title: 'Set the table',
        description: 'Help prepare for dinner time',
        icon: '🍽️',
        difficulty: 'MEDIUM',
        basePoints: 20,
        recurring: 'WEEKDAYS',
        timeOfDay: 'EVENING',
        familyId,
      },
    }),
    prisma.chore.create({
      data: {
        title: 'Do homework',
        description: 'Finish your school assignments',
        icon: '📚',
        difficulty: 'MEDIUM',
        basePoints: 20,
        recurring: 'WEEKDAYS',
        timeOfDay: 'AFTERNOON',
        familyId,
      },
    }),
    prisma.chore.create({
      data: {
        title: 'Take out trash',
        description: 'Empty trash cans to the bin outside',
        icon: '🗑️',
        difficulty: 'EASY',
        basePoints: 10,
        recurring: 'WEEKLY',
        timeOfDay: 'EVENING',
        familyId,
      },
    }),
  ])

  // Assign chores to both kids for today
  console.log('Assigning chores for today...')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  await prisma.choreAssignment.createMany({
    data: chores.flatMap((chore) => [
      {
        choreId: chore.id,
        kidId: kid1.id,
        dueDate: today,
        status: 'PENDING',
      },
      {
        choreId: chore.id,
        kidId: kid2.id,
        dueDate: today,
        status: 'PENDING',
      },
    ]),
  })

  // Create rewards
  console.log('Creating rewards...')
  await prisma.reward.createMany({
    data: [
      {
        title: '30 min Screen Time',
        description: 'Extra screen time for games or videos',
        cost: 50,
        icon: '🎮',
        category: 'Screen Time',
        familyId,
      },
      {
        title: 'Ice Cream Trip',
        description: 'Visit to the ice cream shop',
        cost: 100,
        icon: '🍦',
        category: 'Treats',
        familyId,
      },
      {
        title: 'Movie Night Pick',
        description: 'Choose the family movie',
        cost: 75,
        icon: '🎬',
        category: 'Activities',
        familyId,
      },
      {
        title: 'Stay Up Late (30 min)',
        description: 'Extra 30 minutes before bedtime',
        cost: 60,
        icon: '🌙',
        category: 'Privileges',
        familyId,
      },
      {
        title: 'Skip One Chore',
        description: 'Get a free pass on one chore',
        cost: 80,
        icon: '🎫',
        category: 'Privileges',
        familyId,
      },
      {
        title: 'Small Toy or Book',
        description: 'Pick a small toy or book (up to $10)',
        cost: 200,
        icon: '🎁',
        category: 'Prizes',
        familyId,
      },
    ],
  })

  // Create badge definitions (global badges)
  console.log('Creating badges...')
  await prisma.badgeDefinition.createMany({
    data: [
      {
        name: 'First Step',
        description: 'Complete your first chore',
        icon: '⭐',
        requirement: JSON.stringify({ type: 'points', value: 1 }),
        category: 'milestones',
      },
      {
        name: 'Getting Started',
        description: 'Earn 50 total points',
        icon: '🌟',
        requirement: JSON.stringify({ type: 'points', value: 50 }),
        category: 'milestones',
      },
      {
        name: 'Point Collector',
        description: 'Earn 200 total points',
        icon: '💫',
        requirement: JSON.stringify({ type: 'points', value: 200 }),
        category: 'milestones',
      },
      {
        name: 'Superstar',
        description: 'Earn 500 total points',
        icon: '🌠',
        requirement: JSON.stringify({ type: 'points', value: 500 }),
        category: 'milestones',
      },
      {
        name: 'Legend',
        description: 'Earn 1000 total points',
        icon: '👑',
        requirement: JSON.stringify({ type: 'points', value: 1000 }),
        category: 'milestones',
      },
      {
        name: 'On Fire',
        description: '3-day streak',
        icon: '🔥',
        requirement: JSON.stringify({ type: 'streak', value: 3 }),
        category: 'streaks',
      },
      {
        name: 'Week Warrior',
        description: '7-day streak',
        icon: '⚡',
        requirement: JSON.stringify({ type: 'streak', value: 7 }),
        category: 'streaks',
      },
      {
        name: 'Unstoppable',
        description: '14-day streak',
        icon: '🚀',
        requirement: JSON.stringify({ type: 'streak', value: 14 }),
        category: 'streaks',
      },
      {
        name: 'Marathon Champ',
        description: '30-day streak',
        icon: '🏆',
        requirement: JSON.stringify({ type: 'streak', value: 30 }),
        category: 'streaks',
      },
      {
        name: 'Rising Star',
        description: 'Reach level 2',
        icon: '📈',
        requirement: JSON.stringify({ type: 'level', value: 2 }),
        category: 'levels',
      },
      {
        name: 'Pro Champ',
        description: 'Reach level 5',
        icon: '🎯',
        requirement: JSON.stringify({ type: 'level', value: 5 }),
        category: 'levels',
      },
      {
        name: 'Elite',
        description: 'Reach level 10',
        icon: '💎',
        requirement: JSON.stringify({ type: 'level', value: 10 }),
        category: 'levels',
      },
    ],
  })

  // Award some badges to Emma (she already has points)
  const firstBadge = await prisma.badgeDefinition.findFirst({
    where: { name: 'First Step' },
  })
  const gettingStarted = await prisma.badgeDefinition.findFirst({
    where: { name: 'Getting Started' },
  })
  const onFire = await prisma.badgeDefinition.findFirst({
    where: { name: 'On Fire' },
  })
  const risingStarBadge = await prisma.badgeDefinition.findFirst({
    where: { name: 'Rising Star' },
  })

  if (firstBadge && gettingStarted && onFire && risingStarBadge) {
    await prisma.earnedBadge.createMany({
      data: [
        { badgeId: firstBadge.id, kidId: kid1.id },
        { badgeId: gettingStarted.id, kidId: kid1.id },
        { badgeId: onFire.id, kidId: kid1.id },
        { badgeId: risingStarBadge.id, kidId: kid1.id },
        { badgeId: firstBadge.id, kidId: kid2.id },
        { badgeId: gettingStarted.id, kidId: kid2.id },
      ],
    })
  }

  console.log('\n=== Seed Complete ===')
  console.log(`Parent: ${parent.email}`)
  console.log(`Family: ${parent.family.name}`)
  console.log(`Kids: ${kid1.name} (${kid1.age}), ${kid2.name} (${kid2.age})`)
  console.log(`Chores: ${chores.length} created, assigned to both kids`)
  console.log('Rewards: 6 created')
  console.log('Badges: 12 defined, some pre-earned')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
