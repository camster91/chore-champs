import { useCallback } from 'react'
import confetti from 'canvas-confetti'

export interface GamificationData {
  pointsEarned: number
  streakBonus: number
  currentStreak: number
  leveledUp: boolean
  newLevel?: { level: number; title: string; icon: string; minPoints: number }
  oldLevel?: { level: number; title: string; icon: string; minPoints: number }
  milestone?: string
}

export function useCelebration() {
  const celebrate = useCallback((data: GamificationData | null) => {
    if (!data) return

    // Base confetti for any completion
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1'],
    })

    // Extra celebration for streak milestones
    if (data.milestone) {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#FF4500', '#FFD700', '#FF1493', '#00FF7F'],
        })
      }, 300)
    }

    // Level up gets the big celebration
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
