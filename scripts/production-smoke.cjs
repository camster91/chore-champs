const baseUrl = (process.env.CHORE_CHAMPS_BASE_URL || 'https://chores.ashbi.ca').replace(/\/$/, '')
const screenshotDir = process.env.CHORE_CHAMPS_SCREENSHOT_DIR

function required(value, label) {
  if (!value) throw new Error(`${label} is required`)
  return value
}

async function assertStatus(page, path, expected = 200) {
  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle', timeout: 30_000 })
  const status = response?.status()
  if (status !== expected) throw new Error(`${path} returned HTTP ${status}; expected ${expected}`)
  return status
}

async function run() {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  try {
    // Confirm the auth boundary before creating the synthetic QA account.
    await assertStatus(page, '/dashboard')
    if (!page.url().endsWith('/login')) throw new Error('unauthenticated dashboard did not redirect to login')

    const suffix = Date.now()
    const email = process.env.CHORE_CHAMPS_QA_EMAIL || `qa-${suffix}@example.invalid`
    const password = required(process.env.CHORE_CHAMPS_QA_PASSWORD || 'ChoreQA!2026x', 'CHORE_CHAMPS_QA_PASSWORD')

    await assertStatus(page, '/signup')
    await page.getByLabel('Name').fill('QA Family')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: /create account/i }).click()
    await page.waitForURL(/\/dashboard(?:\/|$)/, { timeout: 30_000 })

    const protectedRoutes = ['/dashboard', '/chores', '/habits', '/rewards', '/avatar-shop', '/profile', '/settings']
    for (const path of protectedRoutes) {
      await assertStatus(page, path)
      if ((await page.locator('body').innerText()).includes('Application error')) {
        throw new Error(`${path} rendered an application error`)
      }
    }

    await assertStatus(page, '/dashboard')
    const sampleDataButton = page.getByRole('button', { name: /add sample data/i })
    if (await sampleDataButton.count()) {
      await sampleDataButton.click()
      await page.waitForTimeout(500)
    }

    const viewport = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    if (viewport.scrollWidth > viewport.clientWidth) {
      throw new Error(`mobile horizontal overflow: ${viewport.scrollWidth} > ${viewport.clientWidth}`)
    }
    if (consoleErrors.length) throw new Error(`browser console errors: ${consoleErrors.join(' | ')}`)

    if (screenshotDir) {
      const fs = await import('node:fs')
      fs.mkdirSync(screenshotDir, { recursive: true })
      await page.screenshot({ path: `${screenshotDir}/production-dashboard-mobile.png`, fullPage: false })
    }

    console.log(JSON.stringify({
      baseUrl,
      email,
      protectedRoutes,
      viewport,
      consoleErrors,
      screenshotDir: screenshotDir || null,
      status: 'ok',
    }, null, 2))
  } finally {
    await browser.close()
  }
}

run().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
