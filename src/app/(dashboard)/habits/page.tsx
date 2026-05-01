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

interface UIHabit {
  id: string
  title: string
  description?: string
  icon: string
  timeOfDay: string
  completed: boolean
}

const habitIcons = ['🧘', '💧', '🍎', '🏃', '📖', '🦷', '🧹', '🛌', '🎸', '🎨']
const timeOfDayOptions = ['MORNING', 'AFTERNOON', 'EVENING', 'ANYTIME']

export default function HabitsPage() {
  const { currentKid, updateKid: updateKidInStore } = useKidStore()
  const [habits, setHabits] = useState<UIHabit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPointsEarned, setShowPointsEarned] = useState<number | null>(null)
  const [newHabit, setNewHabit] = useState({
    title: '',
    description: '',
    icon: '🧘',
    timeOfDay: 'ANYTIME',
  })

  useEffect(() => {
    async function loadHabits() {
      if (!currentKid) return
      
      try {
        const dbHabits = await getHabits()
        const mappedHabits: UIHabit[] = dbHabits.map(habit => {
          const log = habit.logs.find(l => l.kidId === currentKid.id)
          return {
            id: habit.id,
            title: habit.title,
            description: habit.description || '',
            icon: habit.icon,
            timeOfDay: habit.timeOfDay,
            completed: log?.completed || false,
          }
        })
        setHabits(mappedHabits)
      } catch (error) {
        console.error('Failed to load habits:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadHabits()
  }, [currentKid])

  const handleToggleHabit = async (habitId: string, currentStatus: boolean) => {
    if (!currentKid) return

    try {
      await logHabit(habitId, currentKid.id, !currentStatus)
      
      if (!currentStatus) {
        setShowPointsEarned(5)
        updateKidInStore(currentKid.id, {
          points: currentKid.points + 5,
          totalPoints: currentKid.totalPoints + 5,
        })
      }

      setHabits(prev => 
        prev.map(h => h.id === habitId ? { ...h, completed: !currentStatus } : h)
      )
    } catch (error) {
      console.error('Failed to log habit:', error)
    }
  }

  const handleAddHabit = async () => {
    if (!newHabit.title) return

    setIsSubmitting(true)
    try {
      const dbHabit = await createHabit(newHabit)
      const uiHabit: UIHabit = {
        id: dbHabit.id,
        title: dbHabit.title,
        description: dbHabit.description || '',
        icon: dbHabit.icon,
        timeOfDay: dbHabit.timeOfDay,
        completed: false,
      }
      setHabits(prev => [...prev, uiHabit])
      setIsAddModalOpen(false)
      setNewHabit({ title: '', description: '', icon: '🧘', timeOfDay: 'ANYTIME' })
    } catch (error) {
      console.error('Failed to create habit:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!currentKid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mb-6"
        >
          <Sparkles className="w-12 h-12 text-[var(--color-primary)]" />
        </motion.div>
        <h1 className="text-2xl font-bold mb-2">No Profile Selected</h1>
        <p className="text-gray-500 mb-6">Select a kid profile to view habits</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    )
  }

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
              onClick={() => handleToggleHabit(habit.id, habit.completed)}
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
                <div className="mt-4 flex items-center gap-2">
                  <Badge variant="info" size="sm" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {habit.timeOfDay}
                  </Badge>
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
          <Input
            label="Habit Name"
            placeholder="e.g. Drink Water, Read 20 mins"
            value={newHabit.title}
            onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })}
          />
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
