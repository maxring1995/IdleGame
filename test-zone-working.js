const { chromium } = require('playwright');

(async () => {
  console.log('=== ZONE FILTER DEBUG TEST ===\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  // Capture ALL browser console
  page.on('console', msg => console.log(`[BROWSER ${msg.type()}]`, msg.text()));

  try {
    console.log('1. Loading app...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    const onLoginPage = await page.locator('#email').isVisible().catch(() => false);

    if (onLoginPage) {
      console.log('2. Creating NEW account...');

      // Toggle to sign up mode
      const signUpToggle = await page.locator('text=Sign up').isVisible().catch(() => false);
      if (signUpToggle) {
        await page.locator('text=Sign up').click();
        await page.waitForTimeout(500);
      }

      const email = `test${Date.now()}@example.com`;
      console.log(`   Email: ${email}`);
      console.log(`   Password: TestPass123`);

      await page.locator('#email').fill(email);
      await page.locator('#password').fill('TestPass123');
      await page.getByRole('button', { name: /sign up/i }).click();
      await page.waitForTimeout(3000);

      // Create character
      const needsChar = await page.locator('input[type="text"]').isVisible().catch(() => false);
      if (needsChar) {
        console.log('3. Creating character...');
        await page.locator('input[type="text"]').fill(`Hero${Date.now()}`);
        await page.getByRole('button').first().click();
        await page.waitForTimeout(2000);
      }
    }

    console.log('\n4. Navigating to Gathering...');
    await page.locator('text=Gathering').first().click();
    await page.waitForTimeout(5000); // Wait longer for load

    console.log('\n=== ZONE FILTER CHECK ===\n');

    const zoneLabel = await page.locator('text=Filter by Zone:').count();
    console.log(`"Filter by Zone:" labels found: ${zoneLabel}`);

    const cards = await page.locator('.card').count();
    console.log(`Card elements found: ${cards}`);

    const selects = await page.locator('select').count();
    console.log(`Select elements found: ${selects}`);

    // Get HTML of the gathering panel
    console.log('\n=== GATHERING PANEL HTML ===');
    const gatheringHTML = await page.locator('[class*="space-y"]').first().innerHTML();
    console.log(gatheringHTML.substring(0, 500) + '...\n');

    await page.screenshot({ path: 'zone-debug.png', fullPage: true });
    console.log('📸 Screenshot: zone-debug.png');

    console.log('\n[Keeping browser open for 20 seconds...]');
    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    await page.screenshot({ path: 'error.png' });
  } finally {
    await browser.close();
  }
})();
