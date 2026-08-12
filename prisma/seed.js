/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv/config')

const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')

const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
})

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Initial Badge Definitions
  const badges = [
    { id: 'early-bird', name: 'Early Bird', description: 'Complete a morning chore', icon: '🌅', requirement: 'Complete a morning chore' },
    { id: 'streak-starter', name: 'Streak Starter', description: 'Maintain a 3-day streak', icon: '🔥', requirement: 'Maintain a 3-day streak' },
    { id: 'helping-hand', name: 'Helping Hand', description: 'Complete 10 total chores', icon: '🤝', requirement: 'Complete 10 total chores' },
    { id: 'clean-sweep', name: 'Clean Sweep', description: 'Complete all daily chores', icon: '🧹', requirement: 'Complete all daily chores' },
    { id: 'master-habit', name: 'Master Habit', description: 'Complete a quantitative habit fully', icon: '💎', requirement: 'Complete a quantitative habit fully' },
  ]

  for (const badge of badges) {
    await prisma.badgeDefinition.upsert({
      where: { id: badge.id },
      update: {},
      create: badge,
    })
  }

  // 2. Avatar Shop Items
  const avatarItems = [
    // Bases
    { name: 'Cool Cat', category: 'base', emoji: '🐱', imageUrl: '🐱', unlockCost: 0 },
    { name: 'Happy Dog', category: 'base', emoji: '🐶', imageUrl: '🐶', unlockCost: 0 },
    { name: 'Sneaky Fox', category: 'base', emoji: '🦊', imageUrl: '🦊', unlockCost: 50 },
    { name: 'Strong Bear', category: 'base', emoji: '🐻', imageUrl: '🐻', unlockCost: 100 },
    { name: 'Wise Owl', category: 'base', emoji: '🦉', imageUrl: '🦉', unlockCost: 200 },
    
    // Outfits / Hats
    { name: 'Party Hat', category: 'outfit', emoji: '🥳', imageUrl: '🥳', unlockCost: 75 },
    { name: 'Crown', category: 'outfit', emoji: '👑', imageUrl: '👑', unlockCost: 500 },
    { name: 'Wizard Hat', category: 'outfit', emoji: '🧙', imageUrl: '🧙', unlockCost: 300 },
    { name: 'Space Suit', category: 'outfit', emoji: '👨‍🚀', imageUrl: '👨‍🚀', unlockCost: 1000 },
    
    // Accessories
    { name: 'Magic Wand', category: 'accessory', emoji: '🪄', imageUrl: '🪄', unlockCost: 150 },
    { name: 'Golden Guitar', category: 'accessory', emoji: '🎸', imageUrl: '🎸', unlockCost: 400 },
    { name: 'Rocket Shield', category: 'accessory', emoji: '🛡️', imageUrl: '🛡️', unlockCost: 600 },
    { name: 'Crystal Ball', category: 'accessory', emoji: '🔮', imageUrl: '🔮', unlockCost: 800 },
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
