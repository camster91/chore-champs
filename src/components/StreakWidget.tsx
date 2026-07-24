'use client'

import { Flame, Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { Kid } from '@/stores/kid-store'

interface StreakWidgetProps {
  kid: Pick<Kid, 'currentStreak' | 'longestStreak' | 'lastCompletedAt' | 'name'>
}

/**
 * Returns "active" / "broken" / "never" — drives the widget's color + copy.
 *  - active  : completed today (lastCompletedAt is today)
 *  - broken  : the streak lapsed (currentStreak == 0 and lastCompletedAt exists)
 *  - never   : no completions at all (lastCompletedAt == null)
 *
 * Day comparison is local-time; this is a kids' chore app where a few hours of
 * timezone drift don't matter — completion at 11pm + check at 7am next morning
 * still reads as "consecutive."
 */
function streakStatus(lastCompletedAt: string | null, currentStreak: number): 'active' | 'broken' | 'never' {
  if (!lastCompletedAt) return 'never'
  if (currentStreak === 0) return 'broken'
  // "active" iff the most recent completion was today (or yesterday, but the
  // streak count is still > 0 — gives a 1-day grace window for kids who
  // haven't checked yet today).
  const last = new Date(lastCompletedAt)
  const now = new Date()
  last.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((now.getTime() - last.getTime()) / 86_400_000)
  return diffDays <= 1 ? 'active' : 'broken'
}

const flameColor = (status: 'active' | 'broken' | 'never'): string => {
  if (status === 'active') return 'text-orange-500'
  if (status === 'broken') return 'text-gray-400'
  return 'text-gray-300'
}

const containerGradient = (status: 'active' | 'broken' | 'never'): string => {
  if (status === 'active') return 'from-orange-50 to-amber-50 border-orange-200'
  if (status === 'broken') return 'from-gray-50 to-slate-50 border-gray-200'
  return 'from-gray-50 to-white border-gray-100'
}

const messageFor = (status: 'active' | 'broken' | 'never', currentStreak: number, name: string): string => {
  if (status === 'never') return `${name} hasn't started a streak yet — complete a chore today!`
  if (status === 'broken') return `Streak reset. Complete a chore to start a new one!`
  if (currentStreak === 1) return `Day 1! Keep it going tomorrow.`
  if (currentStreak < 3) return `${currentStreak} days in a row — on fire!`
  return `${currentStreak}-day streak! Don't break the chain.`
}

export function StreakWidget({ kid }: StreakWidgetProps) {
  const status = useMemo(
    () => streakStatus(kid.lastCompletedAt, kid.currentStreak),
    [kid.lastCompletedAt, kid.currentStreak],
  )

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${kid.name}'s streak is ${kid.currentStreak} days`}
      className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border bg-gradient-to-br ${containerGradient(status)}`}
    >
      <div className="shrink-0">
        <Flame className={`w-8 h-8 sm:w-10 sm:h-10 ${flameColor(status)}`} fill="currentColor" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          {/*
           * Animated count: the `key` changes when the streak number changes,
           * forcing framer-motion to remount the span and replay the
           * scale-bounce. ~150ms, springs back to 1 — feels like the number
           * "pops" without being distracting.
           */}
          <motion.span
            key={kid.currentStreak}
            initial={{ scale: 1.4 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className="text-2xl font-bold text-gray-900 inline-block"
          >
            {kid.currentStreak}
          </motion.span>
          <span className="text-sm text-gray-500">
            {kid.currentStreak === 1 ? 'day' : 'days'}
          </span>
        </div>
        <p className="text-sm text-gray-600 truncate">{messageFor(status, kid.currentStreak, kid.name)}</p>
      </div>
      {kid.longestStreak > kid.currentStreak && (
        <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500 shrink-0">
          <Trophy className="w-4 h-4" />
          <span>Best: {kid.longestStreak}</span>
        </div>
      )}
    </div>
  )
}