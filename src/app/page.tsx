'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Star, Trophy, Flame, CheckCircle, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui'

const features = [
  {
    icon: CheckCircle,
    title: 'Track Chores',
    description: 'Make daily chores fun with colorful cards and satisfying check-offs!',
    color: '#22c55e',
  },
  {
    icon: Star,
    title: 'Earn Points',
    description: 'Complete tasks to earn coins and climb the leaderboard!',
    color: '#f59e0b',
  },
  {
    icon: Trophy,
    title: 'Win Badges',
    description: 'Unlock cool achievements and show off your progress!',
    color: '#6366f1',
  },
  {
    icon: Flame,
    title: 'Build Streaks',
    description: 'Keep your streak alive by completing tasks every day!',
    color: '#ef4444',
  },
]

const floatingIcons = [
  { icon: '🌟', delay: 0, x: '10%', y: '20%' },
  { icon: '🏆', delay: 0.5, x: '85%', y: '15%' },
  { icon: '🎮', delay: 1, x: '75%', y: '70%' },
  { icon: '🎨', delay: 1.5, x: '15%', y: '75%' },
  { icon: '🚀', delay: 2, x: '50%', y: '10%' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Floating background icons */}
      {floatingIcons.map((item, index) => (
        <motion.div
          key={index}
          className="absolute text-4xl pointer-events-none opacity-20"
          style={{ left: item.x, top: item.y }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 4,
            delay: item.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {item.icon}
        </motion.div>
      ))}

      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent">
              ChoreChamps
            </span>
          </motion.div>

          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Link href="/login">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </motion.div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              Make Chores{' '}
              <span className="bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-accent)] to-[var(--color-secondary)] bg-clip-text text-transparent">
                Super Fun!
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Turn everyday tasks into exciting adventures! Earn points, collect badges,
              and watch your character grow while helping around the house.
            </p>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link href="/signup">
              <Button size="xl" rightIcon={<ArrowRight className="w-5 h-5" />}>
                Start Your Adventure
              </Button>
            </Link>
            <Link href="/login">
              <Button size="xl" variant="outline">
                I Have an Account
              </Button>
            </Link>
          </motion.div>

          {/* Preview Card */}
          <motion.div
            className="relative max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-[var(--color-primary)]/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-2xl">
                    🦄
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg">Emma</p>
                    <p className="text-sm text-gray-500">Level 5 ChoreChamp</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Flame className="w-6 h-6 text-orange-500" />
                    <span className="font-bold text-orange-500">7</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-6 h-6 text-amber-500" />
                    <span className="font-bold text-amber-500">850</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {['Make my bed', 'Brush teeth', 'Feed the dog'].map((task, i) => (
                  <motion.div
                    key={task}
                    className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border-2 border-green-200"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                  >
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <span className="line-through text-gray-400">{task}</span>
                    <span className="ml-auto text-sm font-bold text-green-600">+10</span>
                  </motion.div>
                ))}
                <motion.div
                  className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-gray-200"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.1 }}
                >
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                  <span className="text-gray-700">Clean my room</span>
                  <span className="ml-auto text-sm font-bold text-[var(--color-primary)]">+30</span>
                </motion.div>
              </div>
            </div>

            {/* Decorative elements */}
            <motion.div
              className="absolute -top-4 -right-4 w-16 h-16 bg-amber-400 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ⭐
            </motion.div>
            <motion.div
              className="absolute -bottom-4 -left-4 w-14 h-14 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center text-xl shadow-lg"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              🏆
            </motion.div>
          </motion.div>
        </div>

        {/* Features Section */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: `${feature.color}20` }}
              >
                <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
              </div>
              <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-gray-500 text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          className="text-center mt-24"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
        >
          <h2 className="text-3xl font-bold mb-4">Ready to become a ChoreChamp?</h2>
          <p className="text-gray-600 mb-8">Join thousands of families making chores fun!</p>
          <Link href="/signup">
            <Button size="xl">
              Create Free Account
            </Button>
          </Link>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Sparkles className="w-5 h-5" />
            <span>ChoreChamps</span>
          </div>
          <p className="text-sm text-gray-400">
            Made with love for awesome kids everywhere
          </p>
        </div>
      </footer>
    </div>
  )
}
