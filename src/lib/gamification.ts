import { LEVELS } from './constants'

export interface GamificationResult {
  pointsEarned: number
  streakBonus: number
  currentStreak: number
  leveledUp: boolean
  newLevel?: typeof LEVELS[number]
  oldLevel?: typeof LEVELS[number]
  milestone?: string
}

/**
 * Calculate streak based on last completion date.
 * Returns the new streak count.
 */
export function calculateStreak(
  lastCompletedAt: Date | null,
  currentStreak: number
): number {
  if (!lastCompletedAt) {
    return 1 // First chore ever
  }

  const last = new Date(lastCompletedAt)
  const now = new Date()

  // Reset to midnight for day comparison
  last.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)

  const diffMs = now.getTime() - last.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    // Same day — already completed today, don't increment streak
    return currentStreak
  } else if (diffDays === 1) {
    // Yesterday — streak continues
    return currentStreak + 1
  } else {
    // More than 1 day gap — streak broken
    return 1
  }
}

/**
 * Calculate streak bonus multiplier.
 */
export function getStreakBonus(streak: number): number {
  if (streak >= 30) return 2.0
  if (streak >= 14) return 1.75
  if (streak >= 7) return 1.5
  if (streak >= 3) return 1.25
  return 1.0
}

/**
 * Calculate points for completing a chore.
 */
export function calculatePoints(
  basePoints: number,
  streak: number
): { points: number; bonus: number } {
  const bonus = getStreakBonus(streak)
  const points = Math.round(basePoints * bonus)
  return { points, bonus }
}

/**
 * Get level info from total points.
 */
export function getLevelFromPoints(totalPoints: number): typeof LEVELS[number] {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalPoints >= LEVELS[i].minPoints) {
      return LEVELS[i]
    }
  }
  return LEVELS[0]
}

/**
 * Check if kid leveled up.
 */
export function checkLevelUp(
  oldTotal: number,
  newTotal: number
): { leveledUp: boolean; oldLevel: typeof LEVELS[number]; newLevel: typeof LEVELS[number] } {
  const oldLevel = getLevelFromPoints(oldTotal)
  const newLevel = getLevelFromPoints(newTotal)
  return {
    leveledUp: newLevel.level > oldLevel.level,
    oldLevel,
    newLevel,
  }
}

/**
 * Get milestone message for streak.
 */
export function getStreakMilestone(streak: number): string | undefined {
  if (streak === 3) return '🔥 3-Day Streak!'
  if (streak === 7) return '🔥🔥 7-Day Streak!'
  if (streak === 14) return '🔥🔥🔥 14-Day Streak!'
  if (streak === 30) return '🏆 30-Day Streak! Legendary!'
  if (streak === 50) return '👑 50-Day Streak! Unstoppable!'
  return undefined
}

/**
 * Process full gamification for a chore completion.
 */
export function processGamification(
  basePoints: number,
  currentTotalPoints: number,
  currentStreak: number,
  longestStreak: number,
  lastCompletedAt: Date | null
): GamificationResult {
  const newStreak = calculateStreak(lastCompletedAt, currentStreak)
  const { points: pointsEarned, bonus: streakBonus } = calculatePoints(basePoints, newStreak)
  const newTotal = currentTotalPoints + pointsEarned
  const { leveledUp, oldLevel, newLevel } = checkLevelUp(currentTotalPoints, newTotal)
  const milestone = getStreakMilestone(newStreak)

  return {
    pointsEarned,
    streakBonus,
    currentStreak: newStreak,
    leveledUp,
    newLevel: leveledUp ? newLevel : undefined,
    oldLevel: leveledUp ? oldLevel : undefined,
    milestone,
  }
}
