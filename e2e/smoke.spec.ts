import { test, expect } from '@playwright/test'

const TEST_EMAIL = `e2e-${Date.now()}@test.local`
const TEST_PASSWORD = 'TestPass123!'

test.describe('ChoreChamps public pages', () => {
  test('landing page renders', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/ChoreChamps/)
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('signup page renders with resolved i18n', async ({ page }) => {
    await page.goto('/signup')
    await expect(page).toHaveTitle(/ChoreChamps/)
    await page.waitForSelector('.lucide-loader-circle', { state: 'detached', timeout: 5000 }).catch(() => {})
    const body = await page.locator('body').textContent()
    expect(body).not.toMatch(/auth\.createAccount|common\.name|common\.email/)
    await expect(page.locator('input[type="text"]').first()).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('login page renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('health endpoint returns ok', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('ok')
  })
})

test.describe('ChoreChamps auth flow', () => {
  test('signup form accepts input', async ({ page }) => {
    await page.goto('/signup')
    await page.waitForSelector('.lucide-loader-circle', { state: 'detached', timeout: 5000 }).catch(() => {})
    await page.locator('input[type="text"]').first().fill('E2E Parent')
    await page.locator('input[type="email"]').fill(TEST_EMAIL)
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD)
    expect(await page.locator('input[type="text"]').first().inputValue()).toBe('E2E Parent')
    expect(await page.locator('input[type="email"]').inputValue()).toBe(TEST_EMAIL)
  })
})
