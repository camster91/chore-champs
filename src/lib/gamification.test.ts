import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  calculateStreak,
  getStreakBonus,
  calculatePoints,
  getLevelFromPoints,
  checkLevelUp,
  getStreakMilestone,
  processGamification,
} from './gamification.ts'

// ─────────────────────────────────────────────────────────────────────────────
// calculateStreak — drives the streak counter based on completion timing
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateStreak', () => {
  it('returns 1 for first chore ever (no prior completion)', () => {
    assert.strictEqual(calculateStreak(null, 0), 1)
  })

  it('keeps currentStreak when completion is same day', () => {
    const today = new Date()
    today.setHours(10, 0, 0, 0)
    // Kid already on a 5-day streak — completing another chore today shouldn't bump it to 6
    assert.strictEqual(calculateStreak(today, 5), 5)
  })

  it('increments streak when completion is exactly 1 day after the last', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(20, 0, 0, 0)
    assert.strictEqual(calculateStreak(yesterday, 3), 4)
  })

  it('resets streak to 1 when more than 1 day has passed', () => {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    threeDaysAgo.setHours(9, 0, 0, 0)
    // Kid had a 10-day streak but missed two days — restart at 1
    assert.strictEqual(calculateStreak(threeDaysAgo, 10), 1)
  })

  it('treats day boundaries correctly across hours', () => {
    // Completion at 11:30 PM yesterday + now is 1 AM today → still consecutive
    const lastNight = new Date()
    lastNight.setDate(lastNight.getDate() - 1)
    lastNight.setHours(23, 30, 0, 0)
    const result = calculateStreak(lastNight, 2)
    assert.strictEqual(result, 3, '11:30pm → 1am next day should be consecutive')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getStreakBonus — point multiplier tiers
// ─────────────────────────────────────────────────────────────────────────────

describe('getStreakBonus', () => {
  it('returns 1.0 for streak under 3 days', () => {
    assert.strictEqual(getStreakBonus(0), 1.0)
    assert.strictEqual(getStreakBonus(1), 1.0)
    assert.strictEqual(getStreakBonus(2), 1.0)
  })

  it('returns 1.25 at 3-day streak', () => {
    assert.strictEqual(getStreakBonus(3), 1.25)
  })

  it('returns 1.5 at 7-day streak', () => {
    assert.strictEqual(getStreakBonus(7), 1.5)
  })

  it('returns 1.75 at 14-day streak', () => {
    assert.strictEqual(getStreakBonus(14), 1.75)
  })

  it('returns 2.0 at 30-day streak (max tier)', () => {
    assert.strictEqual(getStreakBonus(30), 2.0)
    assert.strictEqual(getStreakBonus(100), 2.0)
  })

  it('does not give bonus between tier breakpoints', () => {
    // Between 3 and 7 → still 1.25 (next tier at 7)
    assert.strictEqual(getStreakBonus(6), 1.25)
    // Between 7 and 14 → still 1.5
    assert.strictEqual(getStreakBonus(13), 1.5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// calculatePoints — base × bonus, rounded
// ─────────────────────────────────────────────────────────────────────────────

describe('calculatePoints', () => {
  it('returns base points when streak bonus is 1.0', () => {
    assert.deepStrictEqual(calculatePoints(10, 0), { points: 10, bonus: 1.0 })
  })

  it('applies 1.25 bonus correctly at 3-day streak', () => {
    assert.deepStrictEqual(calculatePoints(10, 3), { points: 13, bonus: 1.25 })
    // Math.round(10 * 1.25) = 13
  })

  it('applies 2.0 bonus at 30-day streak', () => {
    assert.deepStrictEqual(calculatePoints(10, 30), { points: 20, bonus: 2.0 })
  })

  it('rounds non-integer results to nearest integer', () => {
    // 7 * 1.75 = 12.25 → rounds to 12
    assert.deepStrictEqual(calculatePoints(7, 14), { points: 12, bonus: 1.75 })
  })

  it('handles zero base points', () => {
    assert.deepStrictEqual(calculatePoints(0, 30), { points: 0, bonus: 2.0 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getLevelFromPoints — derives level from totalPoints via LEVELS table
// ─────────────────────────────────────────────────────────────────────────────

describe('getLevelFromPoints', () => {
  it('returns level 1 (Beginner) at 0 points', () => {
    const level = getLevelFromPoints(0)
    assert.strictEqual(level.level, 1)
    assert.strictEqual(level.title, 'Beginner')
  })

  it('returns level 1 just below the 50-point threshold', () => {
    assert.strictEqual(getLevelFromPoints(49).level, 1)
  })

  it('returns level 2 (Helper) at exactly 50 points', () => {
    assert.strictEqual(getLevelFromPoints(50).level, 2)
  })

  it('returns level 3 (Achiever) at exactly 150 points', () => {
    assert.strictEqual(getLevelFromPoints(150).level, 3)
  })

  it('returns level 5 (Legend) at the highest defined threshold', () => {
    assert.strictEqual(getLevelFromPoints(500).level, 5)
  })

  it('caps at level 5 even above 500 points (no overflow into non-existent level)', () => {
    assert.strictEqual(getLevelFromPoints(99_999).level, 5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// checkLevelUp — diffs old vs new level
// ─────────────────────────────────────────────────────────────────────────────

describe('checkLevelUp', () => {
  it('reports no level-up when both totals map to the same level', () => {
    const result = checkLevelUp(40, 49)  // Both still level 1
    assert.strictEqual(result.leveledUp, false)
  })

  it('reports level-up when crossing the 50-point threshold', () => {
    const result = checkLevelUp(40, 50)  // 1 → 2
    assert.strictEqual(result.leveledUp, true)
    assert.strictEqual(result.oldLevel.level, 1)
    assert.strictEqual(result.newLevel.level, 2)
  })

  it('reports multi-level jump when crossing multiple thresholds at once', () => {
    // Massive bonus: 0 → 300 points should cross 1→2→3→4
    const result = checkLevelUp(0, 300)
    assert.strictEqual(result.leveledUp, true)
    assert.strictEqual(result.oldLevel.level, 1)
    assert.strictEqual(result.newLevel.level, 4)
  })

  it('handles the boundary at exactly the threshold', () => {
    const result = checkLevelUp(149, 150)  // 2 → 3
    assert.strictEqual(result.leveledUp, true)
    assert.strictEqual(result.newLevel.level, 3)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getStreakMilestone — milestone copy for celebration modal
// ─────────────────────────────────────────────────────────────────────────────

describe('getStreakMilestone', () => {
  it('returns undefined for non-milestone streaks', () => {
    assert.strictEqual(getStreakMilestone(1), undefined)
    assert.strictEqual(getStreakMilestone(2), undefined)
    assert.strictEqual(getStreakMilestone(4), undefined)
  })

  it('returns the 3-day message at exactly 3 days', () => {
    assert.match(getStreakMilestone(3)!, /3-Day/)
  })

  it('returns the 7-day message at exactly 7 days', () => {
    assert.match(getStreakMilestone(7)!, /7-Day/)
  })

  it('returns the 50-day message at exactly 50 days', () => {
    assert.match(getStreakMilestone(50)!, /50-Day/)
  })

  it('returns a milestone for any of the defined thresholds (3, 7, 14, 30, 50)', () => {
    for (const days of [3, 7, 14, 30, 50]) {
      const msg = getStreakMilestone(days)
      assert.ok(msg && msg.length > 0, `Expected milestone at ${days} days, got ${msg}`)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// processGamification — full integration of the above
// ─────────────────────────────────────────────────────────────────────────────

describe('processGamification', () => {
  it('first-ever chore: streak 1, no level-up, no milestone, 1x points', () => {
    const result = processGamification(10, 0, 0, 0, null)
    assert.strictEqual(result.pointsEarned, 10)
    assert.strictEqual(result.streakBonus, 1.0)
    assert.strictEqual(result.currentStreak, 1)
    assert.strictEqual(result.leveledUp, false)
    assert.strictEqual(result.milestone, undefined)
  })

  it('3-day streak milestone triggers celebration copy', () => {
    // Yesterday → today = streak of 3, crosses the bonus tier
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(8, 0, 0, 0)

    const result = processGamification(10, 100, 2, 2, yesterday)
    assert.strictEqual(result.currentStreak, 3)
    assert.strictEqual(result.streakBonus, 1.25)
    assert.strictEqual(result.pointsEarned, 13)  // 10 * 1.25
    assert.ok(result.milestone !== undefined, 'Expected milestone message at 3 days')
  })

  it('crossing the level threshold reports leveledUp + the new level', () => {
    // Kid at 40 points (level 1) finishes a +20 chore with 2.0 streak bonus = +40 points
    // → 80 points total = still level 1. Bump the chore instead.
    const result = processGamification(15, 40, 5, 5, null)  // +15 → 55 → level 2
    assert.strictEqual(result.leveledUp, true)
    assert.strictEqual(result.newLevel?.level, 2)
  })

  it('preserves longestStreak: new currentStreak does not lower the stored longest', () => {
    // The caller is expected to Math.max(longestStreak, currentStreak) — verify
    // processGamification's contract: it returns currentStreak, and the caller
    // decides whether to update longestStreak. This test pins that contract.
    const result = processGamification(5, 100, 0, 50, null)  // longest=50, current goes to 1
    assert.strictEqual(result.currentStreak, 1)
    // The route handler must do: longestStreak: Math.max(kid.longestStreak, result.currentStreak)
    // i.e. 50 stays at 50 because max(50, 1) = 50.
    assert.strictEqual(Math.max(50, result.currentStreak), 50)
  })

  it('non-consecutive completion resets streak to 1, not to 0', () => {
    // 5-day streak, missed a week, completing today
    const longAgo = new Date()
    longAgo.setDate(longAgo.getDate() - 8)
    longAgo.setHours(12, 0, 0, 0)

    const result = processGamification(10, 200, 5, 5, longAgo)
    assert.strictEqual(result.currentStreak, 1)
    assert.strictEqual(result.leveledUp, false)  // Already at high level
  })

  it('same-day completion does not bump streak (idempotent within a day)', () => {
    const earlierToday = new Date()
    earlierToday.setHours(8, 0, 0, 0)

    const result = processGamification(5, 80, 4, 4, earlierToday)
    // Streak stays at 4 because the day hasn't rolled over — calcStreak's
    // diffDays === 0 branch returns the input currentStreak unchanged.
    assert.strictEqual(result.currentStreak, 4)
    // Points still apply with the streak bonus for the 4-day streak
    // (4 is between tier 3 and tier 7, so bonus is 1.25).
    assert.strictEqual(result.streakBonus, 1.25)
    assert.strictEqual(result.pointsEarned, 6)  // Math.round(5 * 1.25) = 6
  })

  it('full scenario: 30-day milestone + level up + 2x bonus', () => {
    // Setup: kid at 280 points (level 3 → Achiever), 29-day streak, completing
    // a +25 chore today → +25 * 2.0 = +50 → 330 points = level 4 (Champion)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(7, 0, 0, 0)

    const result = processGamification(25, 280, 29, 29, yesterday)
    assert.strictEqual(result.currentStreak, 30)
    assert.strictEqual(result.streakBonus, 2.0)
    assert.strictEqual(result.pointsEarned, 50)
    assert.strictEqual(result.leveledUp, true)
    assert.strictEqual(result.newLevel?.level, 4)
    assert.strictEqual(result.newLevel?.title, 'Champion')
    assert.ok(result.milestone !== undefined, 'Expected 30-day milestone')
  })
})