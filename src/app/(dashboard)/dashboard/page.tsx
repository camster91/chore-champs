'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  CheckCircle,
  Clock,
  Star,
  Trophy,
  ArrowRight,
  Sparkles,
  Flame,
  Crown,
  Zap,
} from 'lucide-react'
import { useKidStore } from '@/stores/kid-store'
import { Card, CardContent, Button, Badge, Progress } from '@/components/ui'
import { PointsDisplay, StreakCounter, LevelBadge } from '@/components/gamification'
import { useFetch, apiPost } from '@/hooks/useApi'
import { Confetti } from '@/components/Confetti'
import { LevelUpModal } from '@/components/LevelUpModal'
import { BadgeUnlockToast } from '@/components/BadgeUnlockToast'

interface DashboardData {
  kid: {
    id: string
    points: number
    totalPoints: number
    level: number
    experience: number
    streakDays: number
  }
  today: {
    assignments: Array<{
      id: string
      status: string
      pointsEarned: number | null
      chore: {
        id: string
        title: string
        icon: string
        basePoints: number
        difficulty: string
      }
    }>
    completed: number
    total: number
    points: number
    possiblePoints: number
  }
  weeklyCompleted: number
  totalChoresCompleted: number
  recentBadges: Array<{
    id: string
    name: string
    icon: string
    description: string
    earnedAt: string
  }>
  leaderboard: Array<{
    id: string
    name: string
    avatarId: string
    points: number
    totalPoints: number
    level: number
    streakDays: number
    primaryColor: string
    secondaryColor: string
  }>
}

interface NewBadge {
  name: string
  icon: string
  description: string
}

export default function DashboardPage() {
  const { currentKid, updateKid } = useKidStore()
  const [showConfetti, setShowConfetti] = useState(false)
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null)
  const [newBadges, setNewBadges] = useState<NewBadge[]>([])
  const [dailyGenerated, setDailyGenerated] = useState(false)

  const { data, isLoading, mutate } = useFetch<DashboardData>(
    currentKid ? `/api/dashboard?kidId=${currentKid.id}` : null
  )

  // Auto-generate daily assignments from recurring chores on first load
  useEffect(() => {
    if (currentKid && !dailyGenerated) {
      setDailyGenerated(true)
      fetch('/api/chores/generate-daily', { method: 'POST' })
        .then((res) => res.json())
        .then((result) => {
          if (result.created > 0) mutate()
        })
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKid?.id])

  // Sync server data back to local store
  useEffect(() => {
    if (data?.kid && currentKid) {
      updateKid(currentKid.id, {
        points: data.kid.points,
        totalPoints: data.kid.totalPoints,
        level: data.kid.level,
        streakDays: data.kid.streakDays,
        experience: data.kid.experience,
      })
    }
  // Only run when data changes, not on every store update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.kid?.points, data?.kid?.totalPoints, data?.kid?.level])

  const handleCompleteChore = async (assignmentId: string) => {
    try {
      const result = await apiPost<{
        pointsEarned: number
        leveledUp: boolean
        newLevel: number | null
        newBadges: NewBadge[]
      }>(`/api/assignments/${assignmentId}/complete`)

      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 100)

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
        <h1 className="text-2xl font-bold mb-2">Welcome to ChoreChamps!</h1>
        <p className="text-gray-500 mb-6 max-w-md">
          Select or create a kid profile to start tracking chores and earning rewards!
        </p>
        <Link href="/profile">
          <Button size="lg">Go to Profiles</Button>
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

  const todayData = data?.today
  const completedCount = todayData?.completed ?? 0
  const totalCount = todayData?.total ?? 0
  const todayPoints = todayData?.points ?? 0
  const possiblePoints = todayData?.possiblePoints ?? 0
  const allDone = totalCount > 0 && completedCount === totalCount

  return (
    <div className="space-y-8">
      <Confetti isActive={showConfetti} />
      <LevelUpModal
        isOpen={!!levelUpLevel}
        level={levelUpLevel || 0}
        onClose={() => setLevelUpLevel(null)}
      />
      <BadgeUnlockToast badges={newBadges} onDismiss={() => setNewBadges([])} />

      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold">
            Hey, {currentKid.name}! <span className="animate-wiggle inline-block">&#x1F44B;</span>
          </h1>
          <p className="text-gray-500 mt-1">
            {allDone
              ? 'All chores done today! You rock!'
              : totalCount > 0
              ? `${totalCount - completedCount} chores left today - you got this!`
              : 'No chores assigned yet today.'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow">
            <StreakCounter days={currentKid.streakDays} size="md" />
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow">
            <PointsDisplay points={currentKid.points} size="md" />
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today</p>
                <p className="text-3xl font-bold mt-1">
                  {completedCount}/{totalCount}
                </p>
              </div>
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-500" />
              </div>
            </div>
            {totalCount > 0 && (
              <Progress value={completedCount} max={totalCount} className="mt-4" />
            )}
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Points Today</p>
                <p className="text-3xl font-bold mt-1">
                  {todayPoints}
                  {possiblePoints > 0 && <span className="text-lg text-gray-400">/{possiblePoints}</span>}
                </p>
              </div>
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                <Star className="w-7 h-7 text-amber-500" />
              </div>
            </div>
            {possiblePoints > 0 && (
              <Progress value={todayPoints} max={possiblePoints} className="mt-4" />
            )}
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">This Week</p>
                <p className="text-3xl font-bold mt-1">{data?.weeklyCompleted ?? 0}</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                <Zap className="w-7 h-7 text-blue-500" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">chores completed</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Level</p>
                <p className="text-3xl font-bold mt-1">{currentKid.level}</p>
              </div>
              <LevelBadge
                level={currentKid.level}
                experience={currentKid.experience}
                experienceToNext={100}
                size="md"
                showProgress={false}
              />
            </div>
            <Progress
              value={currentKid.experience % 100}
              max={100}
              label="XP to next level"
              className="mt-4"
            />
          </Card>
        </motion.div>
      </div>

      {/* Today's Chores */}
      {todayData && todayData.assignments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[var(--color-primary)]" />
                  <h2 className="text-xl font-bold">Today&apos;s Chores</h2>
                </div>
                <Link href="/chores">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    View All
                  </Button>
                </Link>
              </div>

              <div className="space-y-3">
                {todayData.assignments.map((assignment, index) => {
                  const completed = assignment.status === 'COMPLETED'
                  return (
                    <motion.div
                      key={assignment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all
                        ${
                          completed
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-gray-200 hover:border-[var(--color-primary)]'
                        }`}
                    >
                      <motion.button
                        onClick={() => !completed && handleCompleteChore(assignment.id)}
                        disabled={completed}
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                          ${completed ? 'bg-green-500' : 'border-2 border-gray-300 hover:border-[var(--color-primary)] cursor-pointer'}`}
                        whileHover={!completed ? { scale: 1.1 } : {}}
                        whileTap={!completed ? { scale: 0.9 } : {}}
                      >
                        {completed ? (
                          <CheckCircle className="w-6 h-6 text-white" />
                        ) : (
                          <span className="text-xl">{assignment.chore.icon}</span>
                        )}
                      </motion.button>
                      <span
                        className={`flex-1 font-medium ${
                          completed ? 'line-through text-gray-400' : 'text-gray-700'
                        }`}
                      >
                        {assignment.chore.title}
                      </span>
                      <Badge variant={completed ? 'success' : 'primary'}>
                        +{assignment.chore.basePoints}
                      </Badge>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* All Done Celebration */}
      {allDone && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8"
        >
          <div className="text-6xl mb-4">&#x1F389;</div>
          <h3 className="text-2xl font-bold text-green-600">All Done for Today!</h3>
          <p className="text-gray-500 mt-2">Amazing job, ChoreChamp! Enjoy your day!</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h2 className="text-xl font-bold">Recent Badges</h2>
                </div>
                <Link href="/profile">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    View All
                  </Button>
                </Link>
              </div>

              {data?.recentBadges && data.recentBadges.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {data.recentBadges.map((badge, index) => (
                    <motion.div
                      key={badge.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      className="flex flex-col items-center p-4 rounded-xl min-w-[100px] bg-amber-50 border-2 border-amber-200"
                    >
                      <span className="text-3xl mb-2">{badge.icon}</span>
                      <span className="text-sm font-medium text-center">{badge.name}</span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">
                  Complete chores to earn badges!
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Family Leaderboard */}
        {data?.leaderboard && data.leaderboard.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <h2 className="text-xl font-bold">Family Leaderboard</h2>
                </div>

                <div className="space-y-3">
                  {data.leaderboard.map((kid, index) => (
                    <motion.div
                      key={kid.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      className={`flex items-center gap-4 p-3 rounded-xl ${
                        kid.id === currentKid.id
                          ? 'bg-[var(--color-primary)]/10 border-2 border-[var(--color-primary)]'
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                        style={{
                          background: index === 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#e5e7eb',
                          color: index === 0 ? 'white' : '#6b7280',
                        }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{kid.name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>Lv.{kid.level}</span>
                          <span>|</span>
                          <Flame className="w-3 h-3 text-orange-500" />
                          <span>{kid.streakDays}d</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 font-bold text-amber-600">
                        <Star className="w-4 h-4 fill-amber-500" />
                        {kid.totalPoints}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}
