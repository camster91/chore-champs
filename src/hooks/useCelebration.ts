import { useCallback } from 'react'
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

/**
 * Extract the milestone streak-day count from the milestone string.
 * Milestones use copy like "🔥 3-Day Streak!" — parse out the number.
 * Returns null if no number is found (i.e. not a milestone).
 */
function milestoneDays(milestone: string | undefined): number | null {
  if (!milestone) return null
  const m = milestone.match(/(\d+)-Day/i)
  return m ? Number(m[1]) : null
}

/**
 * Tier-specific confetti bursts. Bigger milestones = bigger celebration.
 *  - 3-day : small gold burst (one-shot)
 *  - 7-day : orange flame burst (one-shot)
 *  - 14-day: pink/purple confetti shower (one-shot)
 *  - 30-day: full-screen rainbow with side cannons (cascading)
 *  - 50-day: gold + silver confetti rain (cascading)
 *
 * Below 3 days, no milestone-specific burst — the generic burst covers it.
 */
function tierBurst(days: number | null) {
  if (days === null) return

  if (days === 3) {
    // Small gold burst, centered
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
    // Orange flame burst, wider spread
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
    // Pink/purple shower — two staggered bursts
    confetti({
      particleCount: 150,
      spread: 100,
      startVelocity: 45,
      origin: { y: 0.5 },
      colors: ['#E91E63', '#9C27B0', '#673AB7', '#F48FB1'],
      shapes: ['circle', 'square'],
    })
    setTimeout(() => {
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
    // Full-screen rainbow with side cannons — 2 second cascade
    const end = Date.now() + 2000
    const frame = () => {
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
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
    return
  }

  if (days === 50) {
    // Gold + silver rain — heaviest, reserved for the legendary 50-day mark
    const end = Date.now() + 2500
    const frame = () => {
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
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }
}

export function useCelebration() {
  const celebrate = useCallback((data: GamificationData | null) => {
    if (!data) return

    // Telemetry — emit the gamification events. Level/milestone events fire
    // only when the condition is true (so we don't pollute analytics with
    // no-op completions).
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

    // Base confetti for any completion
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1'],
    })

    // Tier-specific burst for streak milestones (separate from the base burst)
    const days = milestoneDays(data.milestone)
    if (days !== null && days >= 3) {
      // Fire the tier burst after the base burst settles
      setTimeout(() => tierBurst(days), 150)
    }

    // Level up gets the big celebration (existing — kept as-is)
    if (data.leveledUp) {
      setTimeout(() => {
        const duration = 2000
        const end = Date.now() + duration

        const frame = () => {
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

          if (Date.now() < end) {
            requestAnimationFrame(frame)
          }
        }
        frame()
      }, 600)
    }
  }, [])

  return { celebrate }
}
