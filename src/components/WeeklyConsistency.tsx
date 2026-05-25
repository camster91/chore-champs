'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Flame, Target, Trophy, Check } from 'lucide-react'
import { Card, CardContent, Button, Skeleton } from '@/components/ui'
import type { WeeklySummary } from '@/actions/weeklySummary'
import { cn } from '@/lib/utils'

interface WeeklyConsistencyProps {
  kidId: string
  loadSummary: (kidId: string, weekOffset: number) => Promise<WeeklySummary>
}

export default function WeeklyConsistency({ kidId, loadSummary }: WeeklyConsistencyProps) {
  const [summary, setSummary] = useState<WeeklySummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kidId, weekOffset])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await loadSummary(kidId, weekOffset)
      setSummary(data)
    } catch (e) {
      console.error('Failed to load weekly summary:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="grid grid-cols-7 gap-2">
            {dayLabels.map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!summary || summary.weeklyGoal === 0) {
    return (
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardContent className="p-6 text-center">
          <Target className="w-10 h-10 text-purple-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No chores yet this week</p>
          <p className="text-sm text-gray-400 mt-1">Assign some chores to see consistency tracked</p>
        </CardContent>
      </Card>
    )
  }

  const isPerfectWeek = summary.consistencyPercent === 100
  const streakColor = isPerfectWeek
    ? 'from-orange-400 to-red-500'
    : summary.consistencyPercent >= 70
    ? 'from-green-400 to-emerald-500'
    : summary.consistencyPercent >= 40
    ? 'from-yellow-400 to-orange-500'
    : 'from-gray-300 to-gray-400'

  return (
    <Card>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-gray-800">Weekly Consistency</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset(o => o + 1)}
              className="w-8 h-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-500 w-24 text-center">
              {summary.startDate}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset(o => Math.min(o - 1, 0))}
              disabled={weekOffset === 0}
              className="w-8 h-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Day Grid */}
        <div className="grid grid-cols-7 gap-2 mb-5">
          {summary.days.map((day, i) => {
            const hasChores = day.total > 0
            const isComplete = day.completed >= day.total && day.total > 0
            const isToday = i === new Date().getDay()

            return (
              <motion.div
                key={day.date}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'flex flex-col items-center justify-center p-3 rounded-xl transition-all border-2',
                  isComplete
                    ? 'border-green-300 bg-green-50'
                    : hasChores
                    ? 'border-orange-200 bg-orange-50'
                    : 'border-gray-100 bg-gray-50',
                  isToday && !isComplete && 'ring-2 ring-purple-400 ring-offset-1'
                )}
              >
                <span className={cn(
                  'text-xs font-semibold mb-1',
                  isToday ? 'text-purple-600' : 'text-gray-400'
                )}>
                  {dayLabels[i]}
                </span>
                <span className="text-lg font-bold">
                  {day.completed}
                </span>
                <span className="text-xs text-gray-400">
                  /{day.total}
                </span>
                {isComplete && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center mt-1"
                  >
                    <Check className="w-3 h-3 text-white" />
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Summary Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-gray-600">
                <span className="font-bold">{summary.weeklyTotal}/{summary.weeklyGoal}</span> completed
              </span>
            </div>
            <span className="text-sm text-gray-500">Best: {summary.bestDay}</span>
          </div>

          {/* Ring */}
          <div className="relative w-14 h-14">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle
                cx="18" cy="18" r="15.9"
                fill="none" stroke="#e5e7eb" strokeWidth="3"
              />
              <circle
                cx="18" cy="18" r="15.9"
                fill="none"
                stroke="url(#weeklyRing)"
                strokeWidth="3"
                strokeDasharray={`${summary.consistencyPercent}, 100`}
                className="transition-all duration-700"
              />
              <defs>
                <linearGradient id="weeklyRing">
                  <stop offset="0%" stopColor={isPerfectWeek ? '#f97316' : summary.consistencyPercent >= 70 ? '#22c55e' : '#f59e0b'} />
                  <stop offset="100%" stopColor={isPerfectWeek ? '#ef4444' : summary.consistencyPercent >= 70 ? '#10b981' : '#f97316'} />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
              {summary.consistencyPercent}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
