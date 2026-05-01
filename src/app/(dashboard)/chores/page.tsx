'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  CheckCircle,
  Clock,
  Star,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { useKidStore } from '@/stores/kid-store'
import { Card, CardContent, Button, Badge, Modal, Input } from '@/components/ui'
import { PointsEarned } from '@/components/gamification'
import { Confetti } from '@/components/Confetti'
import { LevelUpModal } from '@/components/LevelUpModal'
import { BadgeUnlockToast } from '@/components/BadgeUnlockToast'
import { cn } from '@/lib/utils'
import { getChores, createChore, completeChore, assignChore } from '@/actions/chores'

interface UIChore {
  id: string // assignmentId if exists, else choreId
  choreId: string
  title: string
  description?: string
  points: number
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  completed: boolean
  dueTime?: string
  icon: string
}

const difficultyColors = {
  EASY: { bg: 'bg-green-100', text: 'text-green-600' },
  MEDIUM: { bg: 'bg-amber-100', text: 'text-amber-600' },
  HARD: { bg: 'bg-red-100', text: 'text-red-600' },
}

const choreIcons = ['🧹', '🛏️', '🍽️', '🐕', '📚', '🧺', '🗑️', '🌱', '🧼', '🎒', '🪥', '🧸']

export default function ChoresPage() {
  const { currentKid, updateKid: updateKidInStore } = useKidStore()
  const [chores, setChores] = useState<UIChore[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [showPointsEarned, setShowPointsEarned] = useState<number | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newChore, setNewChore] = useState({
    title: '',
    points: 10,
    difficulty: 'EASY' as 'EASY' | 'MEDIUM' | 'HARD',
    icon: '🧹',
  })

  useEffect(() => {
    async function loadChores() {
      if (!currentKid) return
      
      try {
        const dbChores = await getChores()
        const mappedChores: UIChore[] = dbChores.map(chore => {
          const assignment = chore.assignments.find(a => a.kidId === currentKid.id)
          return {
            id: assignment?.id || chore.id,
            choreId: chore.id,
            title: chore.title,
            description: chore.description || '',
            points: chore.basePoints,
            difficulty: chore.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
            completed: assignment?.status === 'COMPLETED',
            dueTime: assignment?.dueDate ? new Date(assignment.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
            icon: chore.icon,
          }
        })
        setChores(mappedChores)
      } catch (error) {
        console.error('Failed to load chores:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadChores()
  }, [currentKid])

  const filteredChores = chores.filter((chore) => {
    if (filter === 'pending') return !chore.completed
    if (filter === 'completed') return chore.completed
    return true
  })

  const handleCompleteChore = async (uiChore: UIChore) => {
    if (uiChore.completed || !currentKid) return

    try {
      let assignmentId = uiChore.id
      if (assignmentId === uiChore.choreId) {
        const newAssignment = await assignChore(uiChore.choreId, currentKid.id, new Date())
        assignmentId = newAssignment.id
      }

      await completeChore(assignmentId)

      setChores((prev) =>
        prev.map((c) => (c.choreId === uiChore.choreId ? { ...c, completed: true, id: assignmentId } : c))
      )

      setShowPointsEarned(uiChore.points)
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)

      updateKidInStore(currentKid.id, {
        points: currentKid.points + uiChore.points,
        totalPoints: currentKid.totalPoints + uiChore.points,
        experience: currentKid.experience + uiChore.points * 2
      })

    } catch (error) {
      console.error('Failed to complete chore:', error)
    }
  }

  const handleAddChore = async () => {
    if (!newChore.title || !currentKid) return

    setIsSubmitting(true)
    try {
      const dbChore = await createChore({
        title: newChore.title,
        icon: newChore.icon,
        difficulty: newChore.difficulty,
        basePoints: newChore.points,
      })

      const uiChore: UIChore = {
        id: dbChore.id,
        choreId: dbChore.id,
        title: dbChore.title,
        points: dbChore.basePoints,
        difficulty: dbChore.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
        completed: false,
        icon: dbChore.icon,
      }

      setChores((prev) => [uiChore, ...prev])
      setIsAddModalOpen(false)
      setNewChore({ title: '', points: 10, difficulty: 'EASY', icon: '🧹' })
    } catch (error) {
      console.error('Failed to add chore:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!currentKid) return <div className="p-8 text-center">Please select a profile.</div>

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
    </div>
  )

  const pendingCount = chores.filter((c) => !c.completed).length

  return (
    <div className="space-y-8">
      <Confetti isActive={showConfetti} />
      <LevelUpModal isOpen={!!levelUpLevel} level={levelUpLevel || 0} onClose={() => setLevelUpLevel(null)} />
      
      <AnimatePresence>
        {showPointsEarned && (
          <PointsEarned amount={showPointsEarned} onComplete={() => setShowPointsEarned(null)} />
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{currentKid.name}&apos;s Chores</h1>
          <p className="text-gray-500">{pendingCount} chores left today</p>
        </div>
        <Button leftIcon={<Plus className="w-5 h-5" />} onClick={() => setIsAddModalOpen(true)}>
          Add Chore
        </Button>
      </motion.div>

      <div className="flex gap-2">
        {['all', 'pending', 'completed'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab as any)}
            className={cn(
              'px-4 py-2 rounded-xl font-medium capitalize',
              filter === tab ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-gray-600'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredChores.map((chore, index) => (
          <motion.div key={chore.choreId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
            <Card className={cn('transition-all', chore.completed && 'opacity-60')} hoverable={!chore.completed}>
              <CardContent className="p-4 flex items-start gap-4">
                <motion.button
                  onClick={() => handleCompleteChore(chore)}
                  disabled={chore.completed}
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    chore.completed ? 'bg-green-500' : 'border-2 border-gray-300'
                  )}
                >
                  {chore.completed ? <CheckCircle className="w-6 h-6 text-white" /> : <span className="text-xl">{chore.icon}</span>}
                </motion.button>
                <div className="flex-1">
                  <h3 className={cn('font-semibold', chore.completed && 'line-through text-gray-400')}>{chore.title}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge className={cn(difficultyColors[chore.difficulty].bg, difficultyColors[chore.difficulty].text)} size="sm">{chore.difficulty}</Badge>
                    <div className="flex items-center gap-1 text-sm font-semibold text-amber-600"><Star className="w-4 h-4" />+{chore.points}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Chore">
        <div className="space-y-6">
          <Input label="Chore Name" value={newChore.title} onChange={(e) => setNewChore({ ...newChore, title: e.target.value })} />
          <div>
            <label className="block text-sm font-medium mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {choreIcons.map(icon => (
                <button key={icon} onClick={() => setNewChore({ ...newChore, icon })} className={cn('w-10 h-10 rounded-lg text-xl', newChore.icon === icon ? 'bg-[var(--color-primary)]' : 'bg-gray-100')}>{icon}</button>
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={handleAddChore} disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Chore'}</Button>
        </div>
      </Modal>
    </div>
  )
}
