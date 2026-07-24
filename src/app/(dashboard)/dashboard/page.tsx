'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trophy, Star, CheckCircle, Clock, Loader2, Sparkles, Plus, Zap } from 'lucide-react'
import Link from 'next/link'
import { useKidStore } from '@/stores/kid-store'
import { Card, CardContent, Button, Modal, Input, useServerAction } from '@/components/ui'
import { Confetti } from '@/components/Confetti'
import { StreakWidget } from '@/components/StreakWidget'
import { cn } from '@/lib/utils'
import { getKids, createKid } from '@/actions/kids'
import { getChores, completeChore, assignChore } from '@/actions/chores'
import { addSampleData } from '@/actions/sampleData'
import { getWeeklySummary } from '@/actions/weeklySummary'
import WeeklyConsistency from '@/components/WeeklyConsistency'
import { initI18n, t as translate } from '@/lib/i18n'

interface DashboardChore {
  id: string
  choreId: string
  title: string
  description: string | null
  points: number
  completed: boolean
  icon: string
}

// avatarId field is overloaded: it's used both for an emoji (legacy) and for
// a comma-separated list of purchased avatar-shop item IDs. Only treat it as
// a display emoji if it actually looks like one.
function isEmojiString(value: string | null | undefined): boolean {
  if (!value) return false
  // 1-4 chars, all in the emoji unicode block (incl. variation selectors + ZWJ)
  return /^[\p{Extended_Pictographic}\u200D\uFE0F]{1,4}$/u.test(value)
}

export default function DashboardPage() {
  const { currentKid, setCurrentKid, setKids, kids } = useKidStore()
  const [chores, setChores] = useState<DashboardChore[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddKidModalOpen, setIsAddKidModalOpen] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [newKid, setNewKid] = useState({ name: '', age: '' })

  useEffect(() => {
    initI18n()
  }, [])

  const loadChores = useCallback(async () => {
    if (!currentKid) {
      setChores([])
      return
    }
    try {
      const dbChores = await getChores()
      if (!dbChores) return
      const mapped = dbChores.map((chore) => {
        const assignment = chore.assignments?.find((a) => a.kidId === currentKid?.id)
        return {
          id: assignment?.id || chore.id,
          choreId: chore.id,
          title: chore.title,
          description: chore.description,
          points: chore.basePoints || 5,
          completed: assignment?.status === 'COMPLETED',
          icon: chore.icon || '📋'
        }
      })
      setChores(mapped)
    } catch (e) {
      console.error('Failed to load chores:', e)
    }
  }, [currentKid])

  const loadKids = useCallback(async () => {
    setIsLoading(true)
    try {
      const kidsData = await getKids()
      setKids(kidsData)
      const firstKid = kidsData.length > 0 ? kidsData[0] : null
      if (firstKid && !currentKid) {
        setCurrentKid(firstKid)
      }
    } catch (e) {
      console.error('Failed to load kids:', e)
    } finally {
      setIsLoading(false)
    }
  }, [currentKid, setCurrentKid, setKids])

  useEffect(() => {
     
    loadKids()
  }, [loadKids])

  useEffect(() => {
    if (currentKid) {
       
      loadChores()
    }
  }, [currentKid, loadChores])

  const handleCompleteChore = async (chore: DashboardChore) => {
    if (chore.completed) return
    try {
      let assignmentId = chore.id
      if (assignmentId === chore.choreId) {
        const newAssignment = await assignChore(chore.choreId, currentKid!.id, new Date())
        assignmentId = newAssignment.id
      }
      await completeChore(assignmentId)
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)
      loadChores()
    } catch (e) {
      // Surfaced via the global error boundary toast; logged for debugging.
      console.error('Failed to complete chore:', e)
    }
  }

  // Wire server actions through the unified feedback hook so failures always
  // surface to the user instead of failing silently.
  const { run: runAddSampleData, isPending: isAddingSample } = useServerAction(
    addSampleData,
    {
      success: {
        title: 'Sample data added!',
        getDescription: (r) => {
          const result = r as { added?: boolean; kidsCount?: number; choresCount?: number; message?: string } | undefined
          if (!result) return undefined
          return result.added
            ? `${result.kidsCount ?? 0} kids, ${result.choresCount ?? 0} chores`
            : result.message || 'Your family already has data.'
        },
      },
      error: { title: 'Failed to add sample data' },
    }
  )

  const handleAddSampleData = async () => {
    await runAddSampleData()
    await loadKids()
    await loadChores()
  }

  const { run: runCreateKid, isPending: isCreatingKid } = useServerAction(
    createKid,
    {
      success: { title: 'Added!' },
      error: { title: 'Failed to add kid' },
    }
  )

  const handleAddKid = async () => {
    if (!newKid.name || !newKid.age || isCreatingKid) return
    const result = await runCreateKid({ name: newKid.name, age: parseInt(newKid.age) })
    if (result) {
      setIsAddKidModalOpen(false)
      setNewKid({ name: '', age: '' })
      await loadKids()
      await loadChores()
    }
  }

  const completedChores = chores.filter(c => c.completed).length
  const pendingChores = chores.filter(c => !c.completed)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!kids || kids.length === 0) {
    return (
      <div className="space-y-6">
        <div
          className="animate-fade-in text-center py-16"
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-4">{translate('dashboard.welcomeTitle')}</h1>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            {translate('dashboard.welcomeSubtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => setIsAddKidModalOpen(true)} leftIcon={<Plus className="w-5 h-5" />}>
              {translate('dashboard.addFirstKid')}
            </Button>
            <Button variant="outline" onClick={handleAddSampleData} disabled={isAddingSample}>
              {translate('dashboard.addSampleData')}
            </Button>
          </div>

          {/* 3-step explainer — gives a new user context beyond the two CTAs */}
          <ol className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
            <li className="rounded-xl bg-white/60 p-4 border border-gray-100">
              <span className="inline-flex w-7 h-7 rounded-full bg-purple-100 text-purple-600 items-center justify-center font-bold text-sm mb-2">1</span>
              <p className="font-semibold text-sm text-gray-800">Add your kids</p>
              <p className="text-xs text-gray-500 mt-1">One profile per child. Each gets their own points, chores, and avatar.</p>
            </li>
            <li className="rounded-xl bg-white/60 p-4 border border-gray-100">
              <span className="inline-flex w-7 h-7 rounded-full bg-purple-100 text-purple-600 items-center justify-center font-bold text-sm mb-2">2</span>
              <p className="font-semibold text-sm text-gray-800">Create chores</p>
              <p className="text-xs text-gray-500 mt-1">Daily, weekly, or one-time. Set point values for the reward kids earn.</p>
            </li>
            <li className="rounded-xl bg-white/60 p-4 border border-gray-100">
              <span className="inline-flex w-7 h-7 rounded-full bg-purple-100 text-purple-600 items-center justify-center font-bold text-sm mb-2">3</span>
              <p className="font-semibold text-sm text-gray-800">Approve & reward</p>
              <p className="text-xs text-gray-500 mt-1">Kids mark chores done. You approve. They spend points in the reward shop.</p>
            </li>
          </ol>
        </div>

        <Modal isOpen={isAddKidModalOpen} onClose={() => setIsAddKidModalOpen(false)} title={translate('dashboard.addChild')}>
          <div className="space-y-4">
            <Input id="add-kid-name" label={translate('common.name') || 'Name'} value={newKid.name} onChange={(e) => setNewKid({ ...newKid, name: e.target.value })} placeholder={translate('common.name') || 'Enter name'} />
            <Input id="add-kid-age" label={translate('common.age') || 'Age'} type="number" value={newKid.age} onChange={(e) => setNewKid({ ...newKid, age: e.target.value })} placeholder={translate('common.age') || 'Enter age'} />
            <Button className="w-full" onClick={handleAddKid} disabled={isCreatingKid}>
              {isCreatingKid ? <Loader2 className="w-5 h-5 animate-spin" /> : translate('common.add')}
            </Button>
          </div>
        </Modal>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showConfetti && <Confetti isActive={showConfetti} />}

      {/* Kid Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {kids.map((kid) => (
          <button
            key={kid.id}
            onClick={() => setCurrentKid(kid)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all',
              kid.id === currentKid?.id
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            <span className="text-xl">{isEmojiString(kid.avatarId) ? kid.avatarId : '👧'}</span>
            <span className="font-medium">{kid.name}</span>
          </button>
        ))}
        <button type="button" onClick={() => setIsAddKidModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
          <Plus className="w-4 h-4" /> {translate('dashboard.addKid')}
        </button>
      </div>

      {/* Streak Widget — surfaces the gamification engine's per-kid streak */}
      {currentKid && (
        <StreakWidget kid={currentKid} />
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-400 to-orange-500 text-white">
          <CardContent className="p-4 text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-3xl font-bold">{completedChores}</p>
            <p className="text-sm opacity-80">{translate('dashboard.completed')}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-400 to-emerald-500 text-white">
          <CardContent className="p-4 text-center">
            <Star className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-3xl font-bold">{chores.reduce((sum, c) => sum + (c.completed ? c.points : 0), 0)}</p>
            <p className="text-sm opacity-80">{translate('dashboard.points')}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white">
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-3xl font-bold">{pendingChores.length}</p>
            <p className="text-sm opacity-80">{translate('dashboard.toDo')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Chores */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          {translate('dashboard.todaysChores')}
        </h2>

        {chores.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-gray-500">{translate('dashboard.noChoresYet')}</p>
              <Button variant="outline" className="mt-4" onClick={handleAddSampleData} disabled={isAddingSample}>{translate('dashboard.addSampleData')}</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {chores.map((chore, idx) => (
              <div
                key={chore.id}
                className={cn(
                  'flex items-center justify-between p-4 rounded-xl bg-white shadow-sm border-2 transition-all animate-fade-in',
                  chore.completed ? 'border-green-200 bg-green-50' : 'border-gray-100 hover:border-purple-200 cursor-pointer',
                  chore.completed && 'opacity-60'
                )}
                style={{ animationDelay: `${idx * 40}ms` }}
                onClick={() => handleCompleteChore(chore)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !chore.completed) handleCompleteChore(chore) }}
                tabIndex={chore.completed ? -1 : 0}
                role="button"
                aria-label={`Complete ${chore.title} for ${chore.points} points`}
              >
                <div className="flex items-center gap-4">
                  <div className={cn('w-12 h-12 rounded-full flex items-center justify-center text-2xl', chore.completed ? 'bg-green-100' : 'bg-purple-100')}>
                    {chore.icon}
                  </div>
                  <div>
                    <h3 className={cn('font-semibold', chore.completed && 'line-through')}>{chore.title}</h3>
                    {chore.description && <p className="text-sm text-gray-500">{chore.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('px-3 py-1 rounded-full text-sm font-semibold', chore.completed ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700')}>
                    {chore.points} pts
                  </span>
                  {chore.completed ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly Consistency */}
      {currentKid && (
        <WeeklyConsistency kidId={currentKid.id} loadSummary={getWeeklySummary} />
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: '/chores', label: translate('navigation.allChores'), icon: '📋' },
          { href: '/rewards', label: translate('navigation.rewards'), icon: '🎁' },
          { href: '/habits', label: translate('navigation.habits'), icon: '✨' },
          { href: '/avatar-shop', label: translate('navigation.avatarShop'), icon: '👕' },
        ].map(link => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <span className="text-3xl">{link.icon}</span>
                <p className="mt-2 font-medium">{link.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Add Kid Modal */}
      <Modal isOpen={isAddKidModalOpen} onClose={() => setIsAddKidModalOpen(false)} title={translate('dashboard.addChild')}>
        <div className="space-y-4">
          <Input id="add-kid-name" label={translate('common.name') || 'Name'} value={newKid.name} onChange={(e) => setNewKid({ ...newKid, name: e.target.value })} placeholder={translate('common.name') || 'Enter name'} />
          <Input id="add-kid-age" label={translate('common.age') || 'Age'} type="number" value={newKid.age} onChange={(e) => setNewKid({ ...newKid, age: e.target.value })} placeholder={translate('common.age') || 'Enter age'} />
          <Button className="w-full" onClick={handleAddKid} disabled={isCreatingKid}>
            {isCreatingKid ? <Loader2 className="w-5 h-5 animate-spin" /> : translate('common.add')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}