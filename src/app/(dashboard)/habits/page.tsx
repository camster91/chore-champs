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

  const handleToggleHabit = async (habit: UIHabit) => {
    if (!currentKid) return
    if (habit.completed) return

    try {
      const isQuantitative = habit.targetCount > 1
      const newCount = habit.currentCount + 1
      const isNowCompleted = newCount >= habit.targetCount

      // Optimistic state
      setHabits(prev => 
        prev.map(h => h.id === habit.id ? { 
          ...h, 
          completed: isNowCompleted, 
          currentCount: newCount 
        } : h)
      )

      await logHabit(habit.id, currentKid.id, !isQuantitative)
      mutate(`habits-${currentKid.id}`) // Sync background
      
      play('pop')

      trackEvent(EVENTS.HABIT_LOGGED, {
        habitTitle: habit.title,
        points: isNowCompleted ? habit.points : 0,
        count: newCount,
        targetCount: habit.targetCount,
        isCompleted: isNowCompleted,
      })

      if (isNowCompleted) {
        play('tada')
        setShowPointsEarned(habit.points)
        updateKidInStore(currentKid.id, {
          points: currentKid.points + habit.points,
          totalPoints: currentKid.totalPoints + habit.points,
          experience: currentKid.experience + habit.points
        })
      }
    } catch (error) {
      console.error('Failed to log habit:', error)
      mutate(`habits-${currentKid.id}`) // Rollback from server
    }
  }

  const handleAddHabit = async () => {
    if (!newHabit.title || !currentKid) return

    setIsSubmitting(true)
    try {
      await createHabit(newHabit)
      mutate(`habits-${currentKid.id}`)
      setIsAddModalOpen(false)
      setNewHabit({ title: '', description: '', icon: '🧘', timeOfDay: 'ANYTIME', points: 5, targetCount: 1, unit: '' })
    } catch (error) {
      console.error('Failed to create habit:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = habitsLoading || (currentKid && habits.length === 0 && !dbHabits)

  return (
    <div className="space-y-8">
      {/* Points earned animation */}
      <AnimatePresence>
        {showPointsEarned && (
          <PointsEarned
            amount={showPointsEarned}
            onComplete={() => setShowPointsEarned(null)}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold">Daily Habits</h1>
          <p className="text-gray-500 mt-1">Small steps every day lead to big results!</p>
        </div>
        <Button
          leftIcon={<Plus className="w-5 h-5" />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Add Habit
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {habits.map((habit, index) => (
          <motion.div
            key={habit.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className={cn(
                'transition-all cursor-pointer',
                habit.completed && 'bg-green-50/50 border-green-100'
              )}
              onClick={() => handleToggleHabit(habit)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-3xl">{habit.icon}</div>
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors',
                    habit.completed 
                      ? 'bg-green-500 border-green-500' 
                      : 'border-gray-200'
                  )}>
                    {habit.completed && <CheckCircle2 className="w-5 h-5 text-white" />}
                  </div>
                </div>
                <h3 className={cn(
                  'text-lg font-bold',
                  habit.completed && 'text-green-700'
                )}>
                  {habit.title}
                </h3>
                {habit.description && (
                  <p className="text-gray-500 text-sm mt-1">{habit.description}</p>
                )}

                {habit.targetCount > 1 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <span>Progress</span>
                      <span>{habit.currentCount} / {habit.targetCount} {habit.unit}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(habit.currentCount / habit.targetCount) * 100}%` }}
                        className="h-full bg-[var(--color-primary)]"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <Badge variant="info" size="sm" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {habit.timeOfDay}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm font-bold text-amber-600">
                    <Sparkles className="w-4 h-4" />
                    +{habit.points}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Habit"
        size="md"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Habit Name"
              placeholder="e.g. Drink Water"
              value={newHabit.title}
              onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })}
              className="col-span-2"
            />
            <Input
              label="Points"
              type="number"
              value={newHabit.points}
              onChange={(e) => setNewHabit({ ...newHabit, points: parseInt(e.target.value) })}
            />
            <Input
              label="Target Count"
              type="number"
              value={newHabit.targetCount}
              onChange={(e) => setNewHabit({ ...newHabit, targetCount: parseInt(e.target.value) })}
            />
            <Input
              label="Unit (Optional)"
              placeholder="e.g. glasses, mins"
              value={newHabit.unit}
              onChange={(e) => setNewHabit({ ...newHabit, unit: e.target.value })}
              className="col-span-2"
            />
          </div>
          <Input
            label="Description"
            placeholder="Why is this habit important?"
            value={newHabit.description}
            onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {habitIcons.map(icon => (
                <button
                  key={icon}
                  onClick={() => setNewHabit({ ...newHabit, icon })}
                  className={cn(
                    'w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all',
                    newHabit.icon === icon ? 'bg-[var(--color-primary)] scale-110' : 'bg-gray-100 hover:bg-gray-200'
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time of Day</label>
            <div className="flex flex-wrap gap-2">
              {timeOfDayOptions.map(time => (
                <button
                  key={time}
                  onClick={() => setNewHabit({ ...newHabit, timeOfDay: time })}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                    newHabit.timeOfDay === time ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleAddHabit} disabled={!newHabit.title || isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Habit'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
