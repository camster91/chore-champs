'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  CheckCircle,
  Clock,
  Sparkles,
} from 'lucide-react'
import { useKidStore } from '@/stores/kid-store'
import { Card, CardContent, Button, Badge, Modal, Input, useServerAction } from '@/components/ui'
import { Confetti } from '@/components/Confetti'
import { LevelUpModal } from '@/components/LevelUpModal'
import { cn, calculateLevel } from '@/lib/utils'
import { getChores, createChore, completeChore, assignChore } from '@/actions/chores'
import { useAudio } from '@/lib/audio-context'
import { trackEvent, EVENTS } from '@/lib/telemetry'
import useSWR, { mutate } from 'swr'
import Link from 'next/link'
import { initI18n, t as translate } from '@/lib/i18n'

interface UIChore {
  id: string
  choreId: string
  title: string
  description?: string
  points: number
  completed: boolean
}

const suggestedChores = [
  { title: 'Make my bed', description: 'Straighten sheets and arrange pillows', points: 10 },
  { title: 'Brush teeth', description: 'Brush for 2 minutes, morning and night', points: 10 },
  { title: 'Feed the dog', description: 'Give food and fresh water', points: 15 },
  { title: 'Clean my room', description: 'Pick up toys and put clothes away', points: 30 },
  { title: 'Take out trash', description: 'Empty bins and replace bags', points: 15 },
  { title: 'Set the table', description: 'Plates, utensils, and napkins for everyone', points: 10 },
  { title: 'Water plants', description: 'Check soil and water as needed', points: 10 },
  { title: 'Do homework', description: 'Finish school assignments before play', points: 20 },
  { title: 'Walk the dog', description: '15-minute walk around the block', points: 25 },
  { title: 'Load dishwasher', description: 'Rinse and stack dishes properly', points: 15 },
]

export default function ChoresPage() {
  const { currentKid } = useKidStore()
  const { play } = useAudio()

  useEffect(() => {
    initI18n()
  }, [])

  const { data: dbChores, isLoading: choresLoading } = useSWR(
    currentKid ? `chores-${currentKid.id}` : null,
    () => getChores(),
    { refreshInterval: 30000 }
  )

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null)
  const [newChore, setNewChore] = useState({
    title: '',
    description: '',
    points: 10,
  })

  // Hook must be called unconditionally — placed before any early returns
  const { run: runCreateChore, isPending: isCreatingChore } = useServerAction(
    createChore,
    {
      success: { title: 'Chore created!' },
      error: { title: 'Failed to create chore' },
    }
  )

  // Derive chores via useMemo so we don't trigger a cascading render.
  // Reads the same dbChores + currentKid inputs and returns a stable
  // reference when nothing relevant changed.
  const mappedChores = useMemo<UIChore[]>(() => {
    if (!dbChores || !currentKid) return []
    return dbChores.map(chore => {
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
  }, [dbChores, currentKid])

  if (!currentKid) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <Sparkles className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold mb-2">{translate('chores.selectProfile')}</h2>
        <p className="text-gray-500 mb-6">{translate('chores.chooseKidToSeeChores')}</p>
        <Link href="/profile">
          <Button size="lg">{translate('chores.goToProfiles')}</Button>
        </Link>
      </div>
    )
  }

  const handleCreateChore = async () => {
    if (!newChore.title) return
    const result = await runCreateChore({
      title: newChore.title,
      description: newChore.description,
      basePoints: newChore.points,
      assignToKids: [currentKid.id],
      icon: 'star',
      difficulty: 'EASY'
    })
    if (!result) return // hook already toasted the error

    mutate(`chores-${currentKid.id}`)
    setIsAddModalOpen(false)
    setNewChore({ title: '', description: '', points: 10 })
    play('pop')

    trackEvent(EVENTS.CHORE_CREATED, {
      title: newChore.title,
      points: newChore.points,
    })
  }

  const handleCompleteChore = async (chore: UIChore) => {
    if (chore.completed) return

    try {
      let assignmentId = chore.id
      if (assignmentId === chore.choreId) {
        const newAssignment = await assignChore(chore.choreId, currentKid.id, new Date())
        assignmentId = newAssignment.id
      }

      const result = await completeChore(assignmentId, chore.points, currentKid.id)

      play('pop')
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)

      // Check for level-up
      if (result.kidTotalPoints) {
        const oldLevel = calculateLevel(result.kidTotalPoints - chore.points)
        const newLevel = calculateLevel(result.kidTotalPoints)
        if (newLevel > oldLevel) {
          setLevelUpLevel(newLevel)
        }
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
          <h1 className="text-3xl font-bold">{currentKid.name}&apos;s {translate('chores.title')}</h1>
          <p className="text-gray-500 mt-1">{translate('chores.completeTasks')}</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} leftIcon={<Plus className="w-5 h-5" />}>{translate('chores.addChore')}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {choresLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-32 bg-gray-100 rounded-xl" />
            </Card>
          ))
        ) : mappedChores.length > 0 ? (
          mappedChores.map((chore, index) => (
            <motion.div key={chore.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Card
                className={cn('h-full cursor-pointer transition-all hover:scale-[1.02]', chore.completed ? 'bg-green-50 border-green-200' : 'hover:border-[var(--color-primary)]')}
                onClick={() => handleCompleteChore(chore)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !chore.completed) handleCompleteChore(chore) }}
                tabIndex={0}
                role="button"
                aria-label={`Complete ${chore.title} for ${chore.points} points`}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', chore.completed ? 'bg-green-500 text-white' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]')}>
                      {chore.completed ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                    </div>
                    <Badge variant={chore.completed ? 'success' : 'primary'} size="lg">+{chore.points} {translate('chores.xp')}</Badge>
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
            <h3 className="text-xl font-medium text-gray-900">{translate('chores.noChoresYetCreate')}</h3>
            <p className="text-gray-500 mt-1 mb-6">{translate('chores.createAChore')}</p>
            <Button variant="outline" onClick={() => setIsAddModalOpen(true)}>{translate('chores.createAChore')}</Button>
          </div>
        )}
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={translate('chores.addNewChore')}>
        <div className="space-y-4">
          {/* Suggested Chores */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{translate('chores.suggestedChores') || 'Suggested Chores'}</label>
            <div className="flex flex-wrap gap-2">
              {suggestedChores.map((chore) => (
                <button
                  key={chore.title}
                  onClick={() => setNewChore({ title: chore.title, description: chore.description, points: chore.points })}
                  className={cn(
                    'px-3 py-2 rounded-lg border-2 text-sm transition-all',
                    newChore.title === chore.title
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
                      : 'border-gray-100 hover:border-gray-200 text-gray-600'
                  )}
                >
                  {chore.title} ({chore.points} pts)
                </button>
              ))}
            </div>
          </div>

          <Input label={translate('chores.choreName')} placeholder={translate('chores.eGCleanBedroom')} value={newChore.title} onChange={e => setNewChore({ ...newChore, title: e.target.value })} />
          <Input label={translate('chores.descriptionOptional')} placeholder={translate('chores.tidyUpToys')} value={newChore.description} onChange={e => setNewChore({ ...newChore, description: e.target.value })} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">{translate('chores.pointsReward')}</label>
            <div className="flex gap-2">
              {[5, 10, 15, 20, 50].map(p => (
                <button key={p} onClick={() => setNewChore({ ...newChore, points: p })} className={cn('flex-1 py-2 px-3 rounded-lg border-2 transition-all font-bold', newChore.points === p ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]' : 'border-gray-100 hover:border-gray-200')}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <Button className="w-full mt-4" onClick={handleCreateChore} disabled={isCreatingChore}>{isCreatingChore ? translate('chores.creating') : translate('chores.createChore')}</Button>
        </div>
      </Modal>
    </div>
  )
}