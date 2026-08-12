import { test, expect } from '@playwright/test'

test.describe('ChoreChamps authenticated flow', () => {
  test.skip(!process.env.E2E_AUTH, 'Set E2E_AUTH=1 to run against a database-backed environment')

  test('signup, sample data, and core dashboard routes work', async ({ page }) => {
    const email = `e2e-${Date.now()}@test.local`
    await page.goto('/signup')
    await page.getByLabel('Name', { exact: true }).fill('E2E Parent')
    await page.getByLabel('Email', { exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill('TestPass123!')
    await page.getByRole('button', { name: 'Create Account', exact: true }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })

    await expect(page.getByText('Add Sample Data', { exact: true })).toBeVisible()
    await page.getByText('Add Sample Data', { exact: true }).click()
    await expect(page.getByText('Sample data added!', { exact: false })).toBeVisible({ timeout: 10_000 })

    for (const route of ['/chores', '/habits', '/rewards', '/avatar-shop', '/profile', '/settings']) {
      await page.goto(route)
      await expect(page.locator('main')).toBeVisible()
      await expect(page.locator('body')).not.toContainText('Application error')
    }
  })
})
