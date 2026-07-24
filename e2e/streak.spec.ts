import { test, expect } from '@playwright/test'

/**
 * Streak widget E2E flow.
 *
 * This test is wired up but currently SKIPPED — it requires:
 *   1. A real auth flow (signup → login → land on /dashboard)
 *   2. A test kid with currentStreak > 0 to render the widget
 *   3. A chore assignment that, when completed, triggers the gamification
 *      pipeline (route → processGamification → celebration modal)
 *
 * The smoke spec (smoke.spec.ts) covers the public pages + health endpoint,
 * which is what CI runs today. This file documents the target flow so it's
 * clear what to wire up when we have a test seed.
 *
 * To enable: remove `.skip` from each test AND ensure the test seed
 * (prisma/seed.js) creates a parent + kid with currentStreak = 3 so the
 * widget renders the "3 days" copy.
 */

const TEST_PARENT_EMAIL = `streak-e2e-${Date.now()}@test.local`
const TEST_PARENT_NAME = 'Streak Test Parent'
const TEST_PASSWORD = 'TestPass123!'

test.describe.skip('Streak flow (requires test seed)', () => {
  test('parent can sign up and reach /dashboard', async ({ page }) => {
    await page.goto('/signup')
    await page.waitForSelector('.lucide-loader-circle', { state: 'detached', timeout: 5000 }).catch(() => {})
    await page.locator('input[type="text"]').first().fill(TEST_PARENT_NAME)
    await page.locator('input[type="email"]').fill(TEST_PARENT_EMAIL)
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /create.*account|sign.*up/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 })
  })

  test('streak widget renders on dashboard when a kid is selected', async ({ page }) => {
    // Login with a seed parent
    await page.goto('/login')
    await page.locator('input[type="email"]').fill(TEST_PARENT_EMAIL)
    await page.locator('input[type="password"]').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /log.*in|sign.*in/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 })

    // The streak widget should render if a kid exists in the seed.
    // The seed should create a kid with currentStreak = 3 so the widget
    // shows "3 days" copy.
    const streakWidget = page.locator('[role="status"][aria-label*="streak"]').first()
    await expect(streakWidget).toBeVisible({ timeout: 5_000 })
    const streakText = await streakWidget.textContent()
    expect(streakText).toMatch(/day/i)
  })

  test('completing a chore triggers celebration modal', async ({ page }) => {
    // Same login flow as above. Then click an uncompleted chore card on
    // the dashboard. Expect the celebration modal to appear with confetti.
    await page.goto('/login')
    await page.locator('input[type="email"]').fill(TEST_PARENT_EMAIL)
    await page.locator('input[type="password"]').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /log.*in|sign.*in/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 })

    // Find the first uncompleted chore (aria-disabled = false)
    const choreCard = page.locator('[role="button"][aria-label*="Complete"]').first()
    if (await choreCard.count() === 0) {
      test.skip(true, 'No uncompleted chores in seed')
      return
    }
    await choreCard.click()

    // Celebration modal should appear (tier-specific bursts also fire but
    // they're canvas-confetti — not easily asserted in Playwright)
    const celebration = page.locator('[role="status"]').filter({ hasText: /points|level|streak/i }).first()
    await expect(celebration).toBeVisible({ timeout: 5_000 })
  })
})