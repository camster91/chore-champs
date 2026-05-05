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
  Target,
  Plus,
} from 'lucide-react'
import { useKidStore } from '@/stores/kid-store'
import { Card, CardContent, Button, Badge, Progress, Modal, Input } from '@/components/ui'
import { PointsDisplay, StreakCounter, LevelBadge, GemDisplay, FamilyGoals } from '@/components/gamification'
import { getChores, completeChore, assignChore } from '@/actions/chores'
import { getFamilyGoals, createFamilyGoal } from '@/actions/goals'
import { Confetti } from '@/components/Confetti'
import { LevelUpModal } from '@/components/LevelUpModal'
import { cn, getLevelProgress, getExperienceForNextLevel, calculateLevel } from '@/lib/utils'
import { useAudio } from '@/lib/audio-context'
import { trackEvent, EVENTS } from '@/lib/telemetry'
import useSWR, { mutate } from 'swr'

interface DashboardChore {
  id: string
  choreId: string
  title: string
  points: number
  completed: boolean
}

export default function DashboardPage() {
  const { currentKid, updateKid: updateKidInStore } = useKidStore()
  const { play } = useAudio()
  
  // SWR for Chores
  const { data: dbChores, isLoading: choresLoading } = useSWR(
    currentKid ? `chores-${currentKid?.id}` : null,
    () => getChores(),
    { refreshInterval: 30000 } // Poll every 30s
  )

  // SWR for Family Goals
  const { data: familyGoals, isLoading: goalsLoading } = useSWR(
    'family-goals',
    () => getFamilyGoals(),
    { refreshInterval: 60000 } // Poll every 1m
  )

  const [todaysChores, setTodaysChores] = useState<DashboardChore[]>([])
  const [showConfetti, setShowConfetti] = useState(false)
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null)
  const [isGoalModalOpen, setIsAddGoalModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newGoal, setNewGoal] = useState({ title: '', description: '', targetPoints: 1000, reward: '' })

  useEffect(() => {
    if (dbChores && currentKid) {
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
    }
  }, [dbChores, currentKid])

  if (!currentKid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <Sparkles className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Welcome to ChoreChamps!</h2>
        <p className="text-gray-500 mb-6">Select a profile to start your adventure.</p>
        <Link href="/profile">
          <Button size="lg">Go to Profiles</Button>
        </Link>
      </div>
    )
  }

  const handleCreateGoal = async () => {
    if (!newGoal.title || !newGoal.targetPoints) return
    setIsSubmitting(true)
    try {
      await createFamilyGoal(newGoal)
      mutate('family-goals') // Refresh goals
      setIsAddGoalModalOpen(false)
      
      trackEvent(EVENTS.GOAL_CREATED, {
        title: newGoal.title,
        targetPoints: newGoal.targetPoints,
      })

      setNewGoal({ title: '', description: '', targetPoints: 1000, reward: '' })
    } catch (error) {
      console.error('Failed to create goal:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCompleteChore = async (chore: DashboardChore) => {
    if (chore.completed || !currentKid) return

    // Optimistic UI Update
    const previousChores = [...todaysChores]
    const previousKid = { ...currentKid }

    setTodaysChores((prev) =>
      prev.map((c) => (c.choreId === chore.choreId ? { ...c, completed: true } : c))
    )

    updateKidInStore(currentKid.id, {
      points: currentKid.points + chore.points,
      totalPoints: currentKid.totalPoints + chore.points,
      experience: currentKid.experience + chore.points
    })

    play('pop')
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 2000)

    trackEvent(EVENTS.CHORE_COMPLETED, {
      choreTitle: chore.title,
      points: chore.points,
      kidId: currentKid.id,
    })

    try {
      let assignmentId = chore.id
      if (assignmentId === chore.choreId) {
        const newAssignment = await assignChore(chore.choreId, currentKid.id, new Date())
        assignmentId = newAssignment.id
      }

      await completeChore(assignmentId)
      mutate(`chores-${currentKid.id}`) // Sync background
      mutate('family-goals')
      play('tada')

      // Check if leveled up
      const newLevel = calculateLevel(currentKid.totalPoints + chore.points)
      if (newLevel > currentKid.level) {
        setLevelUpLevel(newLevel)
        play('levelUp')
        trackEvent(EVENTS.LEVEL_UP, {
          level: newLevel,
          kidId: currentKid.id,
        })
      }
    } catch (error) {
      console.error('Failed to complete chore:', error)
      setTodaysChores(previousChores)
      updateKidInStore(currentKid.id, previousKid)
    }
  }

  const isLoading = choresLoading || (currentKid && todaysChores.length === 0 && !dbChores)

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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow"><StreakCounter days={currentKid.streakDays} size="md" /></div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow min-w-[120px]"><PointsDisplay points={currentKid.points} size="md" /></div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow min-w-[120px]"><GemDisplay gems={currentKid.gems} size="md" /></div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
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
                <div><p className="text-sm text-gray-500">Day Goal</p><p className="text-3xl font-bold">{totalPointsEarned}</p></div>
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center"><Star className="w-7 h-7 text-amber-500" /></div>
              </div>
              <Progress value={totalPointsEarned} max={possiblePoints || 1} className="mt-4" />
            </Card>
            <Card className="p-6">
              <div className="flex justify-between items-center">
                <div><p className="text-sm text-gray-500">Level</p><p className="text-3xl font-bold">Lv.{currentKid.level}</p></div>
                <LevelBadge level={currentKid.level} experience={currentKid.experience} experienceToNext={getExperienceForNextLevel(currentKid.level)} size="md" showProgress={false} />
              </div>
              <Progress value={getLevelProgress(currentKid.experience)} max={100} label="XP to next level" className="mt-4" />
            </Card>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-[var(--color-primary)]" /><h2 className="text-xl font-bold">Today&apos;s Chores</h2></div>
                <Link href="/chores"><Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>View All</Button></Link>
              </div>
              {todaysChores.length > 0 ? (
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
              ) : (
                <div className="text-center py-8 text-gray-500 italic">No chores assigned for today!</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2"><Target className="w-5 h-5" /> Family Goals</h2>
            <Button size="sm" variant="outline" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsAddGoalModalOpen(true)}>Add</Button>
          </div>
          <FamilyGoals goals={familyGoals || []} />
        </div>
      </div>

      <Modal isOpen={isGoalModalOpen} onClose={() => setIsAddGoalModalOpen(false)} title="New Family Quest">
        <div className="space-y-4">
          <Input label="Goal Title" placeholder="e.g. Summer Vacation" value={newGoal.title} onChange={e => setNewGoal({ ...newGoal, title: e.target.value })} />
          <Input label="Target Points (Family Total)" type="number" value={newGoal.targetPoints} onChange={e => setNewGoal({ ...newGoal, targetPoints: parseInt(e.target.value) })} />
          <Input label="Reward" placeholder="e.g. Trip to the Zoo" value={newGoal.reward} onChange={e => setNewGoal({ ...newGoal, reward: e.target.value })} />
          <Button className="w-full mt-4" onClick={handleCreateGoal} disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Launch Quest'}</Button>
        </div>
      </Modal>
    </div>
  )
}
