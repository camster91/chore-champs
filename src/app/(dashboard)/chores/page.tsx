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
import { useAudio } from '@/lib/audio-context'
import { trackEvent, EVENTS } from '@/lib/telemetry'
import useSWR, { mutate } from 'swr'
import Link from 'next/link'

interface UIChore {
  id: string
  choreId: string
  title: string
  description?: string
  points: number
  completed: boolean
}

export default function ChoresPage() {
  const { currentKid } = useKidStore()
  const { play } = useAudio()

  const { data: dbChores, isLoading: choresLoading } = useSWR(
    currentKid ? `chores-${currentKid.id}` : null,
    () => getChores(),
    { refreshInterval: 30000 }
  )

  const [chores, setChores] = useState<UIChore[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null)
  const [newChore, setNewChore] = useState({
    title: '',
    description: '',
    points: 10,
  })

  useEffect(() => {
    if (dbChores && currentKid) {
      const mappedChores: UIChore[] = dbChores.map(chore => {
        const assignment = chore.assignments.find(a => a.kidId === currentKid.id)
        return {
          id: assignment?.id || chore.id,
          choreId: chore.id,
          title: chore.title,
          description: chore.description || '',
          points: chore.basePoints,
          completed: assignment?.status === 'COMPLETED',
        }
      })
      setChores(mappedChores)
    }
  }, [dbChores, currentKid])

  if (!currentKid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <Sparkles className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Select a Profile</h2>
        <p className="text-gray-500 mb-6">Choose a kid to see their chores.</p>
        <Link href="/profile">
          <Button size="lg">Go to Profiles</Button>
        </Link>
      </div>
    )
  }

  const handleCreateChore = async () => {
    if (!newChore.title) return
    setIsSubmitting(true)
    try {
      await createChore({
        title: newChore.title,
        description: newChore.description,
        basePoints: newChore.points,
        assignToKids: [currentKid.id],
        icon: 'star',
        difficulty: 'EASY'
      })
      
      mutate(`chores-${currentKid.id}`)
      setIsAddModalOpen(false)
      setNewChore({ title: '', description: '', points: 10 })
      play('pop')
      
      trackEvent(EVENTS.CHORE_CREATED, {
        title: newChore.title,
        points: newChore.points,
      })
    } catch (error) {
      console.error('Failed to create chore:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCompleteChore = async (chore: UIChore) => {
    if (chore.completed) return

    try {
      let assignmentId = chore.id
      if (assignmentId === chore.choreId) {
        const newAssignment = await assignChore(chore.choreId, currentKid.id, new Date())
        assignmentId = newAssignment.id
      }

      const result = await completeChore(assignmentId)
      
      play('pop')
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)

      if (result.leveledUp) {
        setLevelUpLevel(result.newLevel)
        play('levelUp')
      } else {
        play('tada')
      }

      mutate(`chores-${currentKid.id}`)
      
      trackEvent(EVENTS.CHORE_COMPLETED, {
        choreTitle: chore.title,
        points: chore.points,
      })
    } catch (error) {
      console.error('Failed to complete chore:', error)
    }
  }

  return (
    <div className="space-y-8">
      <Confetti isActive={showConfetti} />
      <LevelUpModal isOpen={!!levelUpLevel} level={levelUpLevel || 0} onClose={() => setLevelUpLevel(null)} />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{currentKid.name}&apos;s Chores</h1>
          <p className="text-gray-500 mt-1">Complete tasks to earn points and level up!</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} leftIcon={<Plus className="w-5 h-5" />}>Add Chore</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {choresLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-32 bg-gray-100 rounded-xl" />
            </Card>
          ))
        ) : chores.length > 0 ? (
          chores.map((chore, index) => (
            <motion.div key={chore.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Card className={cn('h-full cursor-pointer transition-all hover:scale-[1.02]', chore.completed ? 'bg-green-50 border-green-200' : 'hover:border-[var(--color-primary)]')} onClick={() => handleCompleteChore(chore)}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', chore.completed ? 'bg-green-500 text-white' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]')}>
                      {chore.completed ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                    </div>
                    <Badge variant={chore.completed ? 'success' : 'primary'} size="lg">+{chore.points} XP</Badge>
                  </div>
                  <h3 className={cn('text-xl font-bold mb-2', chore.completed && 'line-through text-gray-400')}>{chore.title}</h3>
                  {chore.description && <p className="text-gray-500 text-sm line-clamp-2">{chore.description}</p>}
                </CardContent>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-medium text-gray-900">No chores yet!</h3>
            <p className="text-gray-500 mt-1 mb-6">Create your first chore to start earning points.</p>
            <Button variant="outline" onClick={() => setIsAddModalOpen(true)}>Create a Chore</Button>
          </div>
        )}
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Chore">
        <div className="space-y-4">
          <Input label="Chore Name" placeholder="e.g. Clean Bedroom" value={newChore.title} onChange={e => setNewChore({ ...newChore, title: e.target.value })} />
          <Input label="Description (Optional)" placeholder="Tidy up toys and make the bed" value={newChore.description} onChange={e => setNewChore({ ...newChore, description: e.target.value })} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Points Reward</label>
            <div className="flex gap-2">
              {[5, 10, 15, 20, 50].map(p => (
                <button key={p} onClick={() => setNewChore({ ...newChore, points: p })} className={cn('flex-1 py-2 px-3 rounded-lg border-2 transition-all font-bold', newChore.points === p ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]' : 'border-gray-100 hover:border-gray-200')}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <Button className="w-full mt-4" onClick={handleCreateChore} disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Chore'}</Button>
        </div>
      </Modal>
    </div>
  )
}
