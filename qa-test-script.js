
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  
  const BASE = 'https://chores.ashbi.ca';
  
  try {
    // Login with existing test account
    await page.goto(BASE + '/login');
    await page.waitForLoadState('networkidle');
    
    await page.locator('input[type="email"]').fill('qauser-1779764539419@example.com');
    await page.locator('input[type="password"]').fill('Test123!');
    await page.locator('button[type="submit"]').click();
    
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // Check kid count via API
    const kidsResp = await page.evaluate(async () => {
      const r = await fetch('/api/kids');
      return r.json();
    });
    
    console.log(JSON.stringify({ kids: kidsResp, url: page.url() }));
    
    // Create a kid via API if none
    if (!kidsResp || kidsResp.length === 0) {
      const createResp = await page.evaluate(async () => {
        const r = await fetch('/api/kids', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'QA Kid', age: 7, emoji: '🌟' })
        });
        return r.json();
      });
      console.log(JSON.stringify({ created: createResp }));
      await page.waitForTimeout(2000);
    }
    
    // Reload dashboard
    await page.goto(BASE + '/dashboard');
    await page.waitForTimeout(3000);
    
    const weekGrid = await page.locator('[class*="consistency"]').first().isVisible().catch(() => false);
    await page.screenshot({ path: '/tmp/chorechamps-dash2.png', fullPage: false });
    
    console.log(JSON.stringify({
      weekGridVisible: weekGrid,
      screenshot: '/tmp/chorechamps-dash2.png',
      url: page.url()
    }));
  } catch (e) {
    console.log(JSON.stringify({ error: e.message, url: page.url() }));
  } finally {
    await browser.close();
  }
})();
