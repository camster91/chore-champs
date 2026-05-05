import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPointsMultiplier(difficulty: 'EASY' | 'MEDIUM' | 'HARD'): number {
  const multipliers = {
    EASY: 1,
    MEDIUM: 2,
    HARD: 3,
  }
  return multipliers[difficulty]
}

export function calculateLevel(totalPoints: number): number {
  // Exponential curve: floor(100 * (level ^ 1.5))
  // Level 1: 0
  // Level 2: 100
  // Level 3: 282
  // Level 4: 519
  // Level 5: 800
  let level = 1
  while (true) {
    const xpRequired = Math.floor(100 * Math.pow(level, 1.5))
    if (totalPoints < xpRequired) break
    level++
  }
  return level
}

export function getTotalExperienceForLevel(level: number): number {
  if (level <= 1) return 0
  return Math.floor(100 * Math.pow(level - 1, 1.5))
}

export function getExperienceForNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5))
}

export function getLevelProgress(totalPoints: number): number {
  const currentLevel = calculateLevel(totalPoints)
  const currentLevelXp = getTotalExperienceForLevel(currentLevel)
  const nextLevelXp = getExperienceForNextLevel(currentLevel)
  
  const xpInLevel = totalPoints - currentLevelXp
  const xpForLevel = nextLevelXp - currentLevelXp
  
  return Math.min(Math.floor((xpInLevel / xpForLevel) * 100), 100)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

export function startOfDay(date: Date): Date {
  const newDate = new Date(date)
  newDate.setHours(0, 0, 0, 0)
  return newDate
}

export function endOfDay(date: Date): Date {
  const newDate = new Date(date)
  newDate.setHours(23, 59, 59, 999)
  return newDate
}
