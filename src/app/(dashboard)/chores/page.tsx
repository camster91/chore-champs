'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  CheckCircle,
  Clock,
  Star,
  Sparkles,
} from 'lucide-react'
import { useKidStore } from '@/stores/kid-store'
import { Card, CardContent, Button, Badge, Modal, Input } from '@/components/ui'
import { PointsEarned } from '@/components/gamification'
import { Confetti } from '@/components/Confetti'
import { LevelUpModal } from '@/components/LevelUpModal'
import { BadgeUnlockToast } from '@/components/BadgeUnlockToast'
import { useFetch, apiPost } from '@/hooks/useApi'
import { cn } from '@/lib/utils'

interface Assignment {
  id: string
  status: string
  pointsEarned: number | null
  dueDate: string
  chore: {
    id: string
    title: string
    description: string | null
    icon: string
    difficulty: string
    basePoints: number
    timeOfDay: string
  }
}

interface NewBadge {
  name: string
  icon: string
  description: string
}

const difficultyColors = {
  EASY: { bg: 'bg-green-100', text: 'text-green-600' },
  MEDIUM: { bg: 'bg-amber-100', text: 'text-amber-600' },
  HARD: { bg: 'bg-red-100', text: 'text-red-600' },
}

const choreIcons = ['🧹', '🛏️', '🍽️', '🐕', '📚', '🧺', '🗑️', '🌱', '🧼', '🎒', '🪥', '🧸']

export default function ChoresPage() {
  const { currentKid, updateKid } = useKidStore()
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'COMPLETED'>('all')
  const [showPointsEarned, setShowPointsEarned] = useState<number | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null)
  const [newBadges, setNewBadges] = useState<NewBadge[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedChoreToAssign, setSelectedChoreToAssign] = useState('')
  const [newChore, setNewChore] = useState({
    title: '',
    basePoints: 10,
    difficulty: 'EASY' as 'EASY' | 'MEDIUM' | 'HARD',
    icon: '⭐',
    timeOfDay: 'ANYTIME',
  })

  const { data: assignments, isLoading, mutate } = useFetch<Assignment[]>(
    currentKid ? `/api/chores?kidId=${currentKid.id}` : null
  )

  interface FamilyChore {
    id: string
    title: string
    icon: string
    difficulty: string
    basePoints: number
  }

  const { data: familyChores } = useFetch<FamilyChore[]>(
    currentKid ? '/api/chores' : null
  )

  const filteredAssignments = (assignments || []).filter((a) => {
    if (filter === 'PENDING') return a.status === 'PENDING'
    if (filter === 'COMPLETED') return a.status === 'COMPLETED'
    return true
  })

  const handleCompleteChore = async (assignmentId: string) => {
    try {
      const result = await apiPost<{
        pointsEarned: number
        kid: { points: number; totalPoints: number; level: number; streakDays: number; experience: number }
        leveledUp: boolean
        newLevel: number | null
        newBadges: NewBadge[]
      }>(`/api/assignments/${assignmentId}/complete`)

      // Show points animation
      setShowPointsEarned(result.pointsEarned)
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 100)

      // Update local store with server response
      if (currentKid) {
        updateKid(currentKid.id, {
          points: result.kid.points,
          totalPoints: result.kid.totalPoints,
          level: result.kid.level,
          streakDays: result.kid.streakDays,
          experience: result.kid.experience,
        })
      }

      if (result.leveledUp && result.newLevel) {
        setLevelUpLevel(result.newLevel)
      }

      if (result.newBadges?.length > 0) {
        setNewBadges(result.newBadges)
        setTimeout(() => setNewBadges([]), 5000)
      }

      mutate()
    } catch (err) {
      console.error('Failed to complete chore:', err)
    }
  }

  const handleAddChore = async () => {
    if (!newChore.title || !currentKid) return

    try {
      await apiPost('/api/chores', {
        ...newChore,
        assignToKids: [currentKid.id],
      })
      setIsAddModalOpen(false)
      setNewChore({ title: '', basePoints: 10, difficulty: 'EASY', icon: '⭐', timeOfDay: 'ANYTIME' })
      mutate()
    } catch (err) {
      console.error('Failed to add chore:', err)
    }
  }

  const handleAssignChore = async () => {
    if (!selectedChoreToAssign || !currentKid) return

    try {
      await apiPost('/api/chores/assign', {
        choreId: selectedChoreToAssign,
        kidIds: [currentKid.id],
      })
      setIsAssignModalOpen(false)
      setSelectedChoreToAssign('')
      mutate()
    } catch (err) {
      console.error('Failed to assign chore:', err)
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
        <p className="text-gray-500 mb-6">Select a kid profile to view chores</p>
        <Link href="/profile">
          <Button>Go to Profiles</Button>
        </Link>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-12 h-12 text-[var(--color-primary)]" />
        </motion.div>
      </div>
    )
  }

  const pendingCount = (assignments || []).filter((a) => a.status === 'PENDING').length
  const completedCount = (assignments || []).filter((a) => a.status === 'COMPLETED').length

  return (
    <div className="space-y-8">
      <Confetti isActive={showConfetti} />
      <LevelUpModal
        isOpen={!!levelUpLevel}
        level={levelUpLevel || 0}
        onClose={() => setLevelUpLevel(null)}
      />
      <BadgeUnlockToast badges={newBadges} onDismiss={() => setNewBadges([])} />

      {/* Points earned animation */}
      <AnimatePresence>
        {showPointsEarned && (
          <PointsEarned
            amount={showPointsEarned}
            onComplete={() => setShowPointsEarned(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold">{currentKid.name}&apos;s Chores</h1>
          <p className="text-gray-500 mt-1">
            {pendingCount > 0
              ? `${pendingCount} chore${pendingCount !== 1 ? 's' : ''} left today`
              : assignments && assignments.length > 0
              ? 'All done for today!'
              : 'No chores assigned yet'}
          </p>
        </div>
        <div className="flex gap-2">
          {familyChores && familyChores.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setIsAssignModalOpen(true)}
            >
              Assign Existing
            </Button>
          )}
          <Button
            leftIcon={<Plus className="w-5 h-5" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            New Chore
          </Button>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'All', count: (assignments || []).length },
          { key: 'PENDING', label: 'To Do', count: pendingCount },
          { key: 'COMPLETED', label: 'Done', count: completedCount },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            className={cn(
              'px-4 py-2 rounded-xl font-medium transition-colors',
              filter === tab.key
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-white hover:bg-gray-100 text-gray-600'
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Chores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAssignments.map((assignment, index) => {
          const completed = assignment.status === 'COMPLETED'
          const difficulty = assignment.chore.difficulty as keyof typeof difficultyColors
          const colors = difficultyColors[difficulty] || difficultyColors.EASY

          return (
            <motion.div
              key={assignment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={cn('transition-all', completed && 'opacity-60')}
                hoverable={!completed}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <motion.button
                      onClick={() => !completed && handleCompleteChore(assignment.id)}
                      disabled={completed}
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                        completed
                          ? 'bg-green-500'
                          : 'border-2 border-gray-300 hover:border-[var(--color-primary)] cursor-pointer'
                      )}
                      whileHover={!completed ? { scale: 1.1 } : {}}
                      whileTap={!completed ? { scale: 0.9 } : {}}
                    >
                      {completed ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : (
                        <span className="text-xl">{assignment.chore.icon}</span>
                      )}
                    </motion.button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={cn(
                            'font-semibold',
                            completed && 'line-through text-gray-400'
                          )}
                        >
                          {assignment.chore.title}
                        </h3>
                        <Badge className={cn(colors.bg, colors.text)} size="sm">
                          {difficulty}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 mt-2">
                        {assignment.chore.timeOfDay !== 'ANYTIME' && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            {assignment.chore.timeOfDay.charAt(0) + assignment.chore.timeOfDay.slice(1).toLowerCase()}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-sm font-semibold text-amber-600">
                          <Star className="w-4 h-4" />
                          +{assignment.chore.basePoints}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {filteredAssignments.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="text-6xl mb-4">
            {filter === 'COMPLETED' ? '&#x1F3AF;' : '&#x1F389;'}
          </div>
          <h3 className="text-xl font-semibold">
            {filter === 'COMPLETED'
              ? 'No completed chores yet'
              : filter === 'PENDING'
              ? 'All done for today!'
              : 'No chores yet'}
          </h3>
          <p className="text-gray-500 mt-1">
            {filter === 'COMPLETED'
              ? 'Complete some chores to see them here'
              : filter === 'PENDING'
              ? 'Great job, ChoreChamp!'
              : 'Add a chore to get started!'}
          </p>
        </motion.div>
      )}

      {/* Add Chore Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Chore"
        size="md"
      >
        <div className="space-y-6">
          <Input
            label="Chore Name"
            placeholder="What needs to be done?"
            value={newChore.title}
            onChange={(e) => setNewChore({ ...newChore, title: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {choreIcons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setNewChore({ ...newChore, icon })}
                  className={cn(
                    'w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all',
                    newChore.icon === icon
                      ? 'bg-[var(--color-primary)] scale-110'
                      : 'bg-gray-100 hover:bg-gray-200'
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty
            </label>
            <div className="flex gap-2">
              {(['EASY', 'MEDIUM', 'HARD'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setNewChore({ ...newChore, difficulty: diff })}
                  className={cn(
                    'flex-1 py-2 px-4 rounded-xl font-medium transition-all',
                    newChore.difficulty === diff
                      ? cn(difficultyColors[diff].bg, difficultyColors[diff].text, 'ring-2 ring-offset-2')
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time of Day
            </label>
            <div className="flex flex-wrap gap-2">
              {['ANYTIME', 'MORNING', 'AFTERNOON', 'EVENING'].map((time) => (
                <button
                  key={time}
                  onClick={() => setNewChore({ ...newChore, timeOfDay: time })}
                  className={cn(
                    'px-4 py-2 rounded-xl font-medium transition-all text-sm',
                    newChore.timeOfDay === time
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {time.charAt(0) + time.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Points: {newChore.basePoints}
            </label>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={newChore.basePoints}
              onChange={(e) => setNewChore({ ...newChore, basePoints: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-400">
              <span>5</span>
              <span>50</span>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleAddChore}
              disabled={!newChore.title}
            >
              Add Chore
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Existing Chore Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false)
          setSelectedChoreToAssign('')
        }}
        title="Assign Existing Chore"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-500 text-sm">
            Pick a chore to assign to {currentKid?.name} for today:
          </p>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(familyChores || []).map((chore) => (
              <button
                key={chore.id}
                onClick={() => setSelectedChoreToAssign(chore.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                  selectedChoreToAssign === chore.id
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <span className="text-xl">{chore.icon}</span>
                <div className="flex-1">
                  <p className="font-medium">{chore.title}</p>
                  <p className="text-xs text-gray-500">
                    {chore.difficulty} | +{chore.basePoints} pts
                  </p>
                </div>
                {selectedChoreToAssign === chore.id && (
                  <CheckCircle className="w-5 h-5 text-[var(--color-primary)]" />
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setIsAssignModalOpen(false)
                setSelectedChoreToAssign('')
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleAssignChore}
              disabled={!selectedChoreToAssign}
            >
              Assign
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
