'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  CheckCircle,
  Clock,
  Star,
  Trophy,
  ArrowRight,
  Sparkles,
  Loader2,
  Zap,
  Flame,
  Crown,
} from 'lucide-react'
import { useKidStore } from '@/stores/kid-store'
import { Card, CardContent, Button, Badge, Progress } from '@/components/ui'
import { PointsDisplay, StreakCounter, LevelBadge } from '@/components/gamification'
import { getChores, completeChore, assignChore } from '@/actions/chores'
import { Confetti } from '@/components/Confetti'
import { LevelUpModal } from '@/components/LevelUpModal'

interface DashboardChore {
  id: string
  choreId: string
  title: string
  points: number
  completed: boolean
}

export default function DashboardPage() {
  const { currentKid, updateKid: updateKidInStore } = useKidStore()
  const [todaysChores, setTodaysChores] = useState<DashboardChore[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showConfetti, setShowConfetti] = useState(false)
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null)

  useEffect(() => {
    async function loadDashboardData() {
      if (!currentKid) return
      
      try {
        const dbChores = await getChores()
        const mappedChores: DashboardChore[] = dbChores.map(chore => {
          const assignment = chore.assignments.find(a => a.kidId === currentKid.id)
          return {
            id: assignment?.id || chore.id,
            choreId: chore.id,
            title: chore.title,
            points: chore.basePoints,
            completed: assignment?.status === 'COMPLETED',
          }
        })
        setTodaysChores(mappedChores)
      } catch (error) {
        console.error('Failed to load dashboard chores:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadDashboardData()
  }, [currentKid])

  const handleCompleteChore = async (chore: DashboardChore) => {
    if (chore.completed || !currentKid) return

    try {
      let assignmentId = chore.id
      if (assignmentId === chore.choreId) {
        const newAssignment = await assignChore(chore.choreId, currentKid.id, new Date())
        assignmentId = newAssignment.id
      }

      await completeChore(assignmentId)

      setTodaysChores((prev) =>
        prev.map((c) => (c.choreId === chore.choreId ? { ...c, completed: true, id: assignmentId } : c))
      )

      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)

      updateKidInStore(currentKid.id, {
        points: currentKid.points + chore.points,
        totalPoints: currentKid.totalPoints + chore.points,
        experience: currentKid.experience + chore.points
      })
    } catch (error) {
      console.error('Failed to complete chore:', error)
    }
  }

  if (!currentKid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mb-6">
          <Sparkles className="w-12 h-12 text-[var(--color-primary)]" />
        </motion.div>
        <h1 className="text-2xl font-bold mb-2">Welcome to ChoreChamps!</h1>
        <p className="text-gray-500 mb-6 max-w-md">Select or create a kid profile to start tracking chores!</p>
        <Link href="/profile"><Button size="lg">Go to Profiles</Button></Link>
      </div>
    )
  }

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
    </div>
  )

  const completedCount = todaysChores.filter((c) => c.completed).length
  const totalPointsEarned = todaysChores.reduce((sum, c) => (c.completed ? sum + c.points : sum), 0)
  const possiblePoints = todaysChores.reduce((sum, c) => sum + c.points, 0)

  return (
    <div className="space-y-8">
      <Confetti isActive={showConfetti} />
      <LevelUpModal isOpen={!!levelUpLevel} level={levelUpLevel || 0} onClose={() => setLevelUpLevel(null)} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Hey, {currentKid.name}! <span className="inline-block animate-wiggle">👋</span></h1>
          <p className="text-gray-500 mt-1">Ready to conquer some chores today?</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow"><StreakCounter days={currentKid.streakDays} size="md" /></div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow"><PointsDisplay points={currentKid.points} size="md" /></div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex justify-between items-center">
            <div><p className="text-sm text-gray-500">Progress</p><p className="text-3xl font-bold">{completedCount}/{todaysChores.length}</p></div>
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle className="w-7 h-7 text-green-500" /></div>
          </div>
          <Progress value={completedCount} max={todaysChores.length || 1} className="mt-4" />
        </Card>
        <Card className="p-6">
          <div className="flex justify-between items-center">
            <div><p className="text-sm text-gray-500">Points</p><p className="text-3xl font-bold">{totalPointsEarned}/{possiblePoints}</p></div>
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center"><Star className="w-7 h-7 text-amber-500" /></div>
          </div>
          <Progress value={totalPointsEarned} max={possiblePoints || 1} className="mt-4" />
        </Card>
        <Card className="p-6">
          <div className="flex justify-between items-center">
            <div><p className="text-sm text-gray-500">Level</p><p className="text-3xl font-bold">Lv.{currentKid.level}</p></div>
            <LevelBadge level={currentKid.level} experience={currentKid.experience} experienceToNext={100} size="md" showProgress={false} />
          </div>
          <Progress value={currentKid.experience % 100} max={100} label="XP to next level" className="mt-4" />
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-[var(--color-primary)]" /><h2 className="text-xl font-bold">Today&apos;s Chores</h2></div>
            <Link href="/chores"><Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>View All</Button></Link>
          </div>
          <div className="space-y-3">
            {todaysChores.map((chore, index) => (
              <motion.div key={chore.choreId} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} onClick={() => handleCompleteChore(chore)}
                className={cn('flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer', chore.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-[var(--color-primary)]')}>
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', chore.completed ? 'bg-green-500' : 'border-2 border-gray-300')}>
                  {chore.completed && <CheckCircle className="w-5 h-5 text-white" />}
                </div>
                <span className={cn('flex-1 font-medium', chore.completed && 'line-through text-gray-400')}>{chore.title}</span>
                <Badge variant={chore.completed ? 'success' : 'primary'}>+{chore.points}</Badge>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
