// Gamification utilities
export function getPointsMultiplier(difficulty: string): number {
  switch (difficulty) {
    case 'EASY': return 1
    case 'MEDIUM': return 1.5
    case 'HARD': return 2
    default: return 1
  }
}

export function getDifficultyLabel(difficulty: string): string {
  switch (difficulty) {
    case 'EASY': return 'Easy'
    case 'MEDIUM': return 'Medium'
    case 'HARD': return 'Hard'
    default: return 'Unknown'
  }
}
