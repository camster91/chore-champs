import { useCallback, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { trackEvent } from '@/lib/telemetry'

export interface GamificationData {
  pointsEarned: number
  streakBonus: number
  currentStreak: number
  leveledUp: boolean
  newLevel?: { level: number; title: string; icon: string; minPoints: number }
  oldLevel?: { level: number; title: string; icon: string; minPoints: number }
  milestone?: string
}

function milestoneDays(milestone: string | undefined): number | null {
  if (!milestone) return null
  const m = milestone.match(/(\d+)-Day/i)
  return m ? Number(m[1]) : null
}

export function useCelebration() {
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const rafRef = useRef<number[]>([])
  const cancelledRef = useRef(false)

  const clearAll = useCallback(() => {
    cancelledRef.current = true
    for (const t of timeoutsRef.current) clearTimeout(t)
    timeoutsRef.current = []
    for (const id of rafRef.current) cancelAnimationFrame(id)
    rafRef.current = []
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    return () => clearAll()
  }, [clearAll])

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      if (!cancelledRef.current) fn()
    }, ms)
    timeoutsRef.current.push(id)
  }, [])

  const scheduleRaf = useCallback((fn: () => void) => {
    const id = requestAnimationFrame(() => {
      if (!cancelledRef.current) fn()
    })
    rafRef.current.push(id)
  }, [])

  const tierBurst = useCallback(
    (days: number | null) => {
      if (days === null || cancelledRef.current) return

      if (days === 3) {
        confetti({
          particleCount: 80,
          spread: 60,
          startVelocity: 35,
          origin: { y: 0.55 },
          colors: ['#FFD700', '#FFC107', '#FF9800'],
          shapes: ['circle'],
        })
        return
      }

      if (days === 7) {
        confetti({
          particleCount: 120,
          spread: 90,
          startVelocity: 40,
          origin: { y: 0.5 },
          colors: ['#FF5722', '#FF9800', '#FF6F00', '#FFD700'],
          shapes: ['circle'],
          scalar: 1.2,
        })
        return
      }

      if (days === 14) {
        confetti({
          particleCount: 150,
          spread: 100,
          startVelocity: 45,
          origin: { y: 0.5 },
          colors: ['#E91E63', '#9C27B0', '#673AB7', '#F48FB1'],
          shapes: ['circle', 'square'],
        })
        scheduleTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 120,
            origin: { y: 0.4 },
            colors: ['#FF1493', '#BA68C8', '#7B1FA2'],
          })
        }, 250)
        return
      }

      if (days === 30) {
        const end = Date.now() + 2000
        const frame = () => {
          if (cancelledRef.current) return
          confetti({
            particleCount: 8,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#8B00FF'],
          })
          confetti({
            particleCount: 8,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#8B00FF'],
          })
          if (Date.now() < end) scheduleRaf(frame)
        }
        frame()
        return
      }

      if (days === 50) {
        const end = Date.now() + 2500
        const frame = () => {
          if (cancelledRef.current) return
          confetti({
            particleCount: 10,
            spread: 360,
            startVelocity: 30,
            origin: { x: Math.random(), y: Math.random() * 0.3 },
            colors: ['#FFD700', '#FFC107', '#C0C0C0', '#E5E4E2'],
            shapes: ['circle'],
            gravity: 0.6,
            scalar: 1.4,
          })
          if (Date.now() < end) scheduleRaf(frame)
        }
        frame()
      }
    },
    [scheduleTimeout, scheduleRaf]
  )

  const celebrate = useCallback(
    (data: GamificationData | null) => {
      if (!data) return
      cancelledRef.current = false

      if (data.leveledUp) {
        trackEvent('level_up', {
          newLevel: data.newLevel?.level,
          levelTitle: data.newLevel?.title,
          totalPoints: data.pointsEarned,
        })
      }
      if (data.milestone) {
        trackEvent('streak_milestone', {
          milestone: data.milestone,
          days: milestoneDays(data.milestone),
          currentStreak: data.currentStreak,
        })
      }

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1'],
      })

      const days = milestoneDays(data.milestone)
      if (days !== null && days >= 3) {
        scheduleTimeout(() => tierBurst(days), 150)
      }

      if (data.leveledUp) {
        scheduleTimeout(() => {
          const end = Date.now() + 2000
          const frame = () => {
            if (cancelledRef.current) return
            confetti({
              particleCount: 5,
              angle: 60,
              spread: 55,
              origin: { x: 0, y: 0.7 },
              colors: ['#FFD700', '#FF6B6B', '#4ECDC4'],
            })
            confetti({
              particleCount: 5,
              angle: 120,
              spread: 55,
              origin: { x: 1, y: 0.7 },
              colors: ['#FFD700', '#FF6B6B', '#4ECDC4'],
            })
            if (Date.now() < end) scheduleRaf(frame)
          }
          frame()
        }, 600)
      }
    },
    [scheduleTimeout, scheduleRaf, tierBurst]
  )

  return { celebrate, cancelCelebration: clearAll }
}
