'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Plus,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react'
import { useKidStore } from '@/stores/kid-store'
import { Card, CardContent, Button, Badge, Modal, Input } from '@/components/ui'
import { PointsEarned } from '@/components/gamification'
import { cn } from '@/lib/utils'
import { getHabits, logHabit, createHabit } from '@/actions/habits'
import { TimeOfDay } from '@prisma/client'
import { useAudio } from '@/lib/audio-context'
import { trackEvent, EVENTS } from '@/lib/telemetry'
import useSWR, { mutate } from 'swr'
import Link from 'next/link'

interface UIHabit {
  id: string
  title: string
  description?: string
  icon: string
  timeOfDay: string
  points: number
  targetCount: number
  unit?: string
  completed: boolean
  currentCount: number
}

const habitIcons = ['🧘', '💧', '🍎', '🏃', '📖', '🦷', '🧹', '🛌', '🎸', '🎨']
const timeOfDayOptions: TimeOfDay[] = ['MORNING', 'AFTERNOON', 'EVENING', 'ANYTIME']

export default function HabitsPage() {
  const { currentKid, updateKid: updateKidInStore } = useKidStore()
  const { play } = useAudio()

  const { data: dbHabits, isLoading: habitsLoading } = useSWR(
    currentKid ? `habits-${currentKid.id}` : null,
    () => getHabits(),
    { refreshInterval: 45000 }
  )

  const [habits, setHabits] = useState<UIHabit[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPointsEarned, setShowPointsEarned] = useState<number | null>(null)
  const [newHabit, setNewHabit] = useState({
    title: '',
    description: '',
    icon: '🧘',
    timeOfDay: 'ANYTIME' as TimeOfDay,
    points: 5,
    targetCount: 1,
    unit: '',
  })

  useEffect(() => {
    if (dbHabits && currentKid) {
      const mappedHabits: UIHabit[] = dbHabits.map(habit => {
        const log = habit.logs.find(l => l.kidId === currentKid.id)
        return {
          id: habit.id,
          title: habit.title,
          description: habit.description || '',
          icon: habit.icon,
          timeOfDay: habit.timeOfDay,
          points: habit.points,
          targetCount: habit.targetCount,
          unit: habit.unit || '',
          completed: log?.completed || false,
          currentCount: log?.count || 0,
        }
      })
      setHabits(mappedHabits)
    }
  }, [dbHabits, currentKid])

  if (!currentKid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <Sparkles className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Select a Profile</h2>
        <p className="text-gray-500 mb-6">Choose a kid to track their habits.</p>
        <Link href="/profile">
          <Button size="lg">Go to Profiles</Button>
        </Link>
      </div>
    )
  }

  const handleCreateHabit = async () => {
    if (!newHabit.title) return
    setIsSubmitting(true)
    try {
      await createHabit({
        ...newHabit,
        points: newHabit.points,
        targetCount: newHabit.targetCount,
      })
      mutate(`habits-${currentKid.id}`)
      setIsAddModalOpen(false)
      setNewHabit({ title: '', description: '', icon: '🧘', timeOfDay: 'ANYTIME', points: 5, targetCount: 1, unit: '' })
      play('pop')
    } catch (error) {
      console.error('Failed to create habit:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogHabit = async (habit: UIHabit) => {
    if (habit.completed && habit.targetCount === 1) return

    try {
      const result = await logHabit(habit.id, currentKid.id, !habit.completed)
      
      if (result.completed) {
        play('tada')
        setShowPointsEarned(habit.points)
        setTimeout(() => setShowPointsEarned(null), 2000)
      } else {
        play('pop')
      }

      mutate(`habits-${currentKid.id}`)
      
      trackEvent(EVENTS.HABIT_LOGGED, {
        habitTitle: habit.title,
        completed: result.completed,
      })
    } catch (error) {
      console.error('Failed to log habit:', error)
    }
  }

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {showPointsEarned && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50">
            <PointsEarned amount={showPointsEarned} />
          </div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{currentKid.name}&apos;s Habits</h1>
          <p className="text-gray-500 mt-1">Build daily streaks and grow stronger!</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} leftIcon={<Plus className="w-5 h-5" />}>New Habit</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {habitsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse h-32 bg-gray-50" />
          ))
        ) : habits.length > 0 ? (
          habits.map((habit, index) => (
            <motion.div key={habit.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }} onClick={() => handleLogHabit(habit)}>
              <Card className={cn('cursor-pointer transition-all hover:shadow-md border-2', habit.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100 hover:border-[var(--color-primary)]')}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{habit.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className={cn('font-bold truncate', habit.completed && 'text-gray-400')}>{habit.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{habit.timeOfDay}</span>
                        {habit.targetCount > 1 && <span>• {habit.currentCount}/{habit.targetCount} {habit.unit}</span>}
                      </div>
                    </div>
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2', habit.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200')}>
                      {habit.completed ? <CheckCircle2 className="w-6 h-6" /> : <div className="text-xs font-bold text-gray-400">+{habit.points}</div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold">Start a New Habit</h3>
            <p className="text-gray-500 mb-6">Habits help you earn points even faster!</p>
            <Button variant="outline" onClick={() => setIsAddModalOpen(true)}>Create Habit</Button>
          </div>
        )}
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Build New Habit">
        <div className="space-y-4">
          <Input label="Habit Name" placeholder="e.g. Read for 20 mins" value={newHabit.title} onChange={e => setNewHabit({ ...newHabit, title: e.target.value })} />
          <div className="flex flex-wrap gap-2 py-2">
            {habitIcons.map(icon => (
              <button key={icon} onClick={() => setNewHabit({ ...newHabit, icon })} className={cn('w-12 h-12 text-2xl flex items-center justify-center rounded-xl border-2 transition-all', newHabit.icon === icon ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-gray-100 hover:border-gray-200')}>
                {icon}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Time of Day</label>
              <select className="w-full p-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-[var(--color-primary)]" value={newHabit.timeOfDay} onChange={e => setNewHabit({ ...newHabit, timeOfDay: e.target.value as TimeOfDay })}>
                {timeOfDayOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <Input label="Points" type="number" value={newHabit.points} onChange={e => setNewHabit({ ...newHabit, points: parseInt(e.target.value) })} />
          </div>
          <Button className="w-full mt-4" onClick={handleCreateHabit} disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Start Habit'}</Button>
        </div>
      </Modal>
    </div>
  )
}
