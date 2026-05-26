'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Check, Loader2, Target, Calendar } from 'lucide-react'
import { useKidStore } from '@/stores/kid-store'
import { Card, CardContent, Button, Modal, Input, ListItemSkeleton, EmptyState, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { getHabits, logHabit, createHabit } from '@/actions/habits'
import { initI18n, t as translate } from '@/lib/i18n'

interface UIHabit {
  id: string
  title: string
  description: string
  icon: string
  points: number
  completed: boolean
  currentCount: number
}

const habitIcons = ['🧘', '💧', '🍎', '🏃', '📖', '🦷', '🧹', '🛌', '🎸', '🎨']

export default function HabitsPage() {
  const { currentKid } = useKidStore()
  const { toast } = useToast()
  const [habits, setHabits] = useState<UIHabit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newHabit, setNewHabit] = useState({ title: '', description: '', icon: '🧘', points: 5 })

  useEffect(() => {
    initI18n()
    loadHabits()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKid])

  const loadHabits = async () => {
    if (!currentKid) return
    setIsLoading(true)
    try {
      const dbHabits = await getHabits()
      if (!dbHabits) return

      const mapped: UIHabit[] = dbHabits.map(habit => {
        const log = habit.logs?.find((l) => l.kidId === currentKid?.id)
        const today = new Date().toDateString()
        const isToday = log?.loggedAt && new Date(log.loggedAt).toDateString() === today

        return {
          id: habit.id,
          title: habit.title,
          description: habit.description || '',
          icon: habit.icon || '✨',
          points: habit.points || 5,
          completed: !!isToday,
          currentCount: 0
        }
      })
      setHabits(mapped)
    } catch (e) {
      console.error('Failed to load habits:', e)
      toast({ title: 'Error', description: 'Failed to load habits. Please try again.', variant: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogHabit = async (habit: UIHabit) => {
    if (!currentKid || habit.completed) return
    try {
      await logHabit(habit.id, currentKid.id)
      loadHabits()
    } catch (e) {
      console.error('Failed to log habit:', e)
    }
  }

  const handleCreateHabit = async () => {
    if (!newHabit.title) return
    setIsSubmitting(true)
    try {
      await createHabit({
        title: newHabit.title,
        description: newHabit.description,
        icon: newHabit.icon,
        points: newHabit.points
      })
      setIsAddModalOpen(false)
      setNewHabit({ title: '', description: '', icon: '🧘', points: 5 })
      loadHabits()
    } catch (e) {
      console.error('Failed to create habit:', e)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!currentKid) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">{translate('habits.selectKidToViewHabits')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{translate('habits.title')}</h1>
          <p className="text-gray-500">{translate('habits.buildHealthyRoutines')}</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} leftIcon={<Plus className="w-5 h-5" />}>
          {translate('habits.addHabit')}
        </Button>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-purple-500" />
              <span className="font-semibold">{translate('habits.todaysProgress')}</span>
            </div>
            <span className="text-2xl font-bold">{habits.filter(h => h.completed).length}/{habits.length}</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: habits.length ? `${(habits.filter(h => h.completed).length / habits.length) * 100}%` : '0%' }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Habits List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={translate('habits.noHabitsYet')}
          description={translate('habits.buildHealthyRoutines')}
          action={{
            label: translate('habits.addHabit'),
            onClick: () => setIsAddModalOpen(true),
            icon: <Plus className="w-5 h-5" />,
          }}
        />
      ) : (
        <div className="space-y-3">
          {habits.map(habit => (
            <motion.div
              key={habit.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'flex items-center justify-between p-4 rounded-xl bg-white shadow-sm border-2 transition-all',
                habit.completed
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-100 hover:border-purple-200 cursor-pointer',
                habit.completed && 'opacity-60'
              )}
              onClick={() => handleLogHabit(habit)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !habit.completed) handleLogHabit(habit) }}
              tabIndex={habit.completed ? -1 : 0}
              role="button"
              aria-label={`Log ${habit.title} for ${habit.points} points`}
            >
              <div className="flex items-center gap-4">
                <div className={cn('w-12 h-12 rounded-full flex items-center justify-center text-2xl', habit.completed ? 'bg-green-100' : 'bg-purple-100')}>
                  {habit.icon}
                </div>
                <div>
                  <h3 className={cn('font-semibold', habit.completed && 'line-through')}>{habit.title}</h3>
                  {habit.description && <p className="text-sm text-gray-500">{habit.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn('px-3 py-1 rounded-full text-sm font-semibold', habit.completed ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700')}>
                  {habit.points} pts
                </span>
                {habit.completed ? (
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-gray-300" />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Habit Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={translate('habits.createNewHabit')}>
        <div className="space-y-4">
          <Input
            label={translate('habits.habitName')}
            value={newHabit.title}
            onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })}
            placeholder={translate('habits.e.gDrinkWater')}
          />
          <Input
            label={translate('common.description')}
            value={newHabit.description}
            onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
            placeholder={translate('rewards.optional')}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{translate('rewards.icon')}</label>
            <div className="flex gap-2 flex-wrap">
              {habitIcons.map(icon => (
                <button
                  key={icon}
                  onClick={() => setNewHabit({ ...newHabit, icon })}
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all',
                    newHabit.icon === icon
                      ? 'bg-purple-100 ring-2 ring-purple-500'
                      : 'bg-gray-100 hover:bg-gray-200'
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={handleCreateHabit} disabled={isSubmitting || !newHabit.title}>
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : translate('habits.createNewHabit')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}