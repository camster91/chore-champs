import { describe, it } from 'node:test'
import assert from 'node:assert'
import { calculateLevel, getPointsMultiplier, isToday, startOfDay, endOfDay, getExperienceForNextLevel } from './utils'

describe('getPointsMultiplier', () => {
  it('returns 1 for EASY', () => {
    assert.strictEqual(getPointsMultiplier('EASY'), 1)
  })

  it('returns 2 for MEDIUM', () => {
    assert.strictEqual(getPointsMultiplier('MEDIUM'), 2)
  })

  it('returns 3 for HARD', () => {
    assert.strictEqual(getPointsMultiplier('HARD'), 3)
  })
})

describe('calculateLevel', () => {
  it('returns level 1 for 0 points', () => {
    assert.strictEqual(calculateLevel(0), 1)
  })

  it('returns level 1 for 99 points', () => {
    assert.strictEqual(calculateLevel(99), 1)
  })

  it('returns level 2 for 100 points', () => {
    assert.strictEqual(calculateLevel(100), 2)
  })

  it('increases level at higher thresholds', () => {
    const level5 = calculateLevel(1000)
    assert.ok(level5 >= 3, `Expected level >= 3 for 1000 points, got ${level5}`)
  })
})

describe('getExperienceForNextLevel', () => {
  it('returns correct XP for level 1', () => {
    assert.strictEqual(getExperienceForNextLevel(1), 200)
  })

  it('returns higher XP for higher levels', () => {
    assert.ok(getExperienceForNextLevel(5) > getExperienceForNextLevel(1))
  })
})

describe('isToday', () => {
  it('returns true for today', () => {
    assert.strictEqual(isToday(new Date()), true)
  })

  it('returns false for yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    assert.strictEqual(isToday(yesterday), false)
  })
})

describe('startOfDay', () => {
  it('sets time to midnight', () => {
    const result = startOfDay(new Date(2024, 5, 15, 14, 30))
    assert.strictEqual(result.getHours(), 0)
    assert.strictEqual(result.getMinutes(), 0)
    assert.strictEqual(result.getSeconds(), 0)
  })
})

describe('endOfDay', () => {
  it('sets time to 23:59:59', () => {
    const result = endOfDay(new Date(2024, 5, 15, 14, 30))
    assert.strictEqual(result.getHours(), 23)
    assert.strictEqual(result.getMinutes(), 59)
    assert.strictEqual(result.getSeconds(), 59)
  })
})
