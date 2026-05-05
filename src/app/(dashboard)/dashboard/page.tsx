'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  CheckCircle,
  Clock,
  Star,
  ArrowRight,
  Sparkles,
  Loader2,
  Target,
  Plus,
} from 'lucide-react'
import { useKidStore } from '@/stores/kid-store'
import { Card, CardContent, Button, Badge, Progress, Modal, Input } from '@/components/ui'
import { PointsDisplay, StreakCounter, LevelBadge, GemDisplay, FamilyGoals } from '@/components/gamification'
import { getChores, completeChore, assignChore } from '@/actions/chores'
import { getFamilyGoals, createFamilyGoal } from '@/actions/goals'
import { getKids } from '@/actions/kids'
import { Confetti } from '@/components/Confetti'
import { LevelUpModal } from '@/components/LevelUpModal'
import { SetupWizard } from '@/components/SetupWizard'
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

function DashboardContent() {
  const { currentKid, updateKid: updateKidInStore, setKids, setCurrentKid } = useKidStore()
  const { play } = useAudio()
  
  const [showSetup, setShowSetup] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Refs to prevent stale closures
  const currentKidRef = useRef(currentKid)
  useEffect(() => { currentKidRef.current = currentKid }, [currentKid])
  
  // Check if user has any kids on mount
  useEffect(() => {
    async function checkKids() {
      try {
        const kids = await getKids()
        if (kids.length === 0) {
          setShowSetup(true)
        }
        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to check kids:', error)
        setIsInitialized(true)
      }
    }
    checkKids()
  }, [])
  
  // SWR for Chores
  const { data: dbChores, isLoading: choresLoading } = useSWR(
    currentKid ? `chores-${currentKid.id}` : null,
    () => getChores(),
    { refreshInterval: 30000, revalidateOnFocus: true }
  )

  // SWR for Family Goals
  const { data: familyGoals, isLoading: goalsLoading } = useSWR(
    'family-goals',
    () => getFamilyGoals(),
    { refreshInterval: 60000, revalidateOnFocus: true }
  )

  const [todaysChores, setTodaysChores] = useState<DashboardChore[]>([])
  const [showConfetti, setShowConfetti] = useState(false)
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null)
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [isSubmittingGoal, setIsSubmittingGoal] = useState(false)
  const [completingChoreId, setCompletingChoreId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
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

  // Show setup wizard if no kids
  if (showSetup && isInitialized) {
    return (
      <SetupWizard 
        onComplete={() => {
          setShowSetup(false)
          // Refresh kids data
          getKids().then(kids => {
            setKids(kids)
            if (kids.length > 0) {
              setCurrentKid(kids[0])
            }
          })
        }} 
      />
    )
  }

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

  // Clear error after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

  const handleCreateGoal = async () => {
    if (!newGoal.title || !newGoal.targetPoints) return
    setIsSubmittingGoal(true)
    try {
      await createFamilyGoal(newGoal)
      mutate('family-goals')
      setIsGoalModalOpen(false)
      
      trackEvent(EVENTS.GOAL_CREATED, {
        title: newGoal.title,
        targetPoints: newGoal.targetPoints,
      })

      setNewGoal({ title: '', description: '', targetPoints: 1000, reward: '' })
      play('pop')
    } catch (error) {
      console.error('Failed to create goal:', error)
      setErrorMessage('Failed to create goal. Please try again.')
    } finally {
      setIsSubmittingGoal(false)
    }
  }

  const handleCompleteChore = useCallback(async (chore: DashboardChore) => {
    const kid = currentKidRef.current
    if (!kid || chore.completed || completingChoreId) return

    // Optimistic UI Update
    setTodaysChores(prev => prev.map(c => 
      c.choreId === chore.choreId ? { ...c, completed: true } : c
    ))
    setCompletingChoreId(chore.choreId)

    updateKidInStore(kid.id, {
      points: kid.points + chore.points,
      totalPoints: kid.totalPoints + chore.points,
      experience: kid.experience + chore.points
    })

    play('pop')
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 2000)

    trackEvent(EVENTS.CHORE_COMPLETED, {
      choreTitle: chore.title,
      points: chore.points,
      kidId: kid.id,
    })

    try {
      let assignmentId = chore.id
      if (assignmentId === chore.choreId) {
        const newAssignment = await assignChore(chore.choreId, kid.id, new Date())
        assignmentId = newAssignment.id
      }

      await completeChore(assignmentId)
      
      // Re-fetch fresh data
      mutate(`chores-${kid.id}`)
      mutate('family-goals')
      play('tada')

      // Check if leveled up
      const newLevel = calculateLevel(kid.totalPoints + chore.points)
      if (newLevel > kid.level) {
        setLevelUpLevel(newLevel)
        play('levelUp')
        trackEvent(EVENTS.LEVEL_UP, {
          level: newLevel,
          kidId: kid.id,
        })
      }
    } catch (error) {
      console.error('Failed to complete chore:', error)
      // Rollback optimistic update
      setTodaysChores(prev => prev.map(c => 
        c.choreId === chore.choreId ? { ...c, completed: false } : c
      ))
      updateKidInStore(kid.id, {
        points: kid.points,
        totalPoints: kid.totalPoints,
        experience: kid.experience
      })
      setErrorMessage('Failed to complete chore. Please try again.')
    } finally {
      setCompletingChoreId(null)
    }
  }, [completingChoreId, updateKidInStore, play])

  const completedCount = todaysChores.filter((c) => c.completed).length
  const totalPointsEarned = todaysChores.reduce((sum, c) => (c.completed ? sum + c.points : sum), 0)
  const possiblePoints = todaysChores.reduce((sum, c) => sum + c.points, 0)
  const isLoading = choresLoading || (currentKid && todaysChores.length === 0 && !dbChores)

  return (
    <div className="space-y-8">
      <Confetti isActive={showConfetti} />
      <LevelUpModal isOpen={!!levelUpLevel} level={levelUpLevel || 0} onClose={() => setLevelUpLevel(null)} />

      {/* Error Toast */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg"
          >
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

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
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : todaysChores.length > 0 ? (
                <div className="space-y-3">
                  {todaysChores.map((chore, index) => (
                    <motion.div 
                      key={chore.choreId} 
                      initial={{ opacity: 0, x: -20 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ delay: index * 0.05 }} 
                      onClick={() => handleCompleteChore(chore)}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer',
                        chore.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-[var(--color-primary)]',
                        completingChoreId === chore.choreId && 'opacity-50 pointer-events-none'
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', chore.completed ? 'bg-green-500' : 'border-2 border-gray-300')}>
                        {completingChoreId === chore.choreId ? (
                          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                        ) : chore.completed ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : null}
                      </div>
                      <span className={cn('flex-1 font-medium', chore.completed && 'line-through text-gray-400')}>{chore.title}</span>
                      <Badge variant={chore.completed ? 'success' : 'primary'}>+{chore.points}</Badge>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="w-10 h-10 text-gray-300" />
                  </div>
                  <p className="text-gray-500 italic mb-4">No chores assigned for today!</p>
                  <Link href="/chores">
                    <Button variant="outline" leftIcon={<Plus className="w-4 h-4" />}>
                      Add Your First Chore
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2"><Target className="w-5 h-5" /> Family Goals</h2>
            <Button size="sm" variant="outline" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsGoalModalOpen(true)}>Add</Button>
          </div>
          {goalsLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <FamilyGoals goals={familyGoals || []} />
          )}
        </div>
      </div>

      <Modal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} title="New Family Quest">
        <div className="space-y-4">
          <Input label="Goal Title" placeholder="e.g. Summer Vacation" value={newGoal.title} onChange={e => setNewGoal({ ...newGoal, title: e.target.value })} />
          <Input label="Target Points (Family Total)" type="number" value={newGoal.targetPoints} onChange={e => setNewGoal({ ...newGoal, targetPoints: parseInt(e.target.value) })} />
          <Input label="Reward" placeholder="e.g. Trip to the Zoo" value={newGoal.reward} onChange={e => setNewGoal({ ...newGoal, reward: e.target.value })} />
          <Button 
            className="w-full mt-4" 
            onClick={handleCreateGoal} 
            disabled={isSubmittingGoal || !newGoal.title}
          >
            {isSubmittingGoal ? 'Creating...' : 'Launch Quest'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

// Wrap in Suspense for useSearchParams
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
