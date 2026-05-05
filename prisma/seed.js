const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Initial Badge Definitions
  const badges = [
    { name: 'Early Bird', description: 'Complete a morning chore', icon: '🌅', category: 'Speed' },
    { name: 'Streak Starter', description: 'Maintain a 3-day streak', icon: '🔥', category: 'Consistency' },
    { name: 'Helping Hand', description: 'Complete 10 total chores', icon: '🤝', category: 'Milestone' },
    { name: 'Clean Sweep', description: 'Complete all daily chores', icon: '🧹', category: 'Milestone' },
    { name: 'Master Habit', description: 'Complete a quantitative habit fully', icon: '💎', category: 'Habit' },
  ]

  for (const badge of badges) {
    await prisma.badgeDefinition.upsert({
      where: { name: badge.name },
      update: {},
      create: badge,
    })
  }

  // 2. Avatar Shop Items
  const avatarItems = [
    // Bases
    { name: 'Cool Cat', category: 'base', imageUrl: '🐱', unlockCost: 0 },
    { name: 'Happy Dog', category: 'base', imageUrl: '🐶', unlockCost: 0 },
    { name: 'Sneaky Fox', category: 'base', imageUrl: '🦊', unlockCost: 50 },
    { name: 'Strong Bear', category: 'base', imageUrl: '🐻', unlockCost: 100 },
    { name: 'Wise Owl', category: 'base', imageUrl: '🦉', unlockCost: 200 },
    
    // Outfits / Hats
    { name: 'Party Hat', category: 'outfit', imageUrl: '🥳', unlockCost: 75 },
    { name: 'Crown', category: 'outfit', imageUrl: '👑', unlockCost: 500 },
    { name: 'Wizard Hat', category: 'outfit', imageUrl: '🧙', unlockCost: 300 },
    { name: 'Space Suit', category: 'outfit', imageUrl: '👨‍🚀', unlockCost: 1000 },
    
    // Accessories
    { name: 'Magic Wand', category: 'accessory', imageUrl: '🪄', unlockCost: 150 },
    { name: 'Golden Guitar', category: 'accessory', imageUrl: '🎸', unlockCost: 400 },
    { name: 'Rocket Shield', category: 'accessory', imageUrl: '🛡️', unlockCost: 600 },
    { name: 'Crystal Ball', category: 'accessory', imageUrl: '🔮', unlockCost: 800 },
  ]

  for (const item of avatarItems) {
    await prisma.avatarItem.upsert({
      where: { id: item.name.toLowerCase().replace(/\s/g, '-') },
      update: item,
      create: {
        id: item.name.toLowerCase().replace(/\s/g, '-'),
        ...item
      },
    })
  }

  console.log('✅ Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
