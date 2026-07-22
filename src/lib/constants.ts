/**
 * Shared app constants — single source of truth for level progression.
 *
 * The Kid model's `level` column is a numeric mirror of `LEVELS[].level`; the
 * application logic in `@/lib/gamification` always derives levels from total
 * points via `getLevelFromPoints`. Keep these thresholds in sync with any
 * product-side reward curve changes.
 */
export interface Level {
  level: number
  minPoints: number
  title: string
  icon: string
}

export const LEVELS: ReadonlyArray<Level> = [
  { level: 1, minPoints: 0, title: 'Beginner', icon: '🌱' },
  { level: 2, minPoints: 50, title: 'Helper', icon: '🤝' },
  { level: 3, minPoints: 150, title: 'Achiever', icon: '⭐' },
  { level: 4, minPoints: 300, title: 'Champion', icon: '🏆' },
  { level: 5, minPoints: 500, title: 'Legend', icon: '👑' },
]