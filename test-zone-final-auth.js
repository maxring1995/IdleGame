const { chromium } = require('playwright');

(async () => {
  console.log('=== ZONE FILTER TEST WITH PROPER AUTH ===\n');

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage();

  // Capture browser console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[GatheringSkillPanel]')) {
      console.log(`[BROWSER] ${text}`);
    }
  });

  try {
    console.log('1. Loading app...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    // Check if we're on login page
    const onLoginPage = await page.locator('#email').isVisible().catch(() => false);

    if (onLoginPage) {
      console.log('2. On login page - signing in...');

      // Use existing account
      await page.locator('#email').fill('test@example.com');
      await page.locator('#password').fill('password123');
      await page.getByRole('button', { name: 'Log In' }).click();
      await page.waitForTimeout(3000);
    }

    // Check if need to create character
    const needsCharacter = await page.locator('text=Create Your Hero').isVisible().catch(() => false);
    if (needsCharacter) {
      console.log('3. Creating character...');
      await page.locator('input[placeholder*="name" i]').fill('TestHero');
      await page.getByRole('button', { name: /create/i }).click();
      await page.waitForTimeout(2000);
    }

    console.log('4. Clicking Gathering tab...');
    await page.locator('text=Gathering').first().click();
    await page.waitForTimeout(3000);

    console.log('\n=== ZONE FILTER CHECK ===');

    // Check for zone filter
    const zoneLabel = await page.locator('text=Filter by Zone:').isVisible().catch(() => false);
    console.log(`Zone filter label: ${zoneLabel ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);

    const selectCount = await page.locator('select').count();
    console.log(`Select dropdowns: ${selectCount}`);

    const noZonesMsg = await page.locator('text=No zones available').isVisible().catch(() => false);
    console.log(`"No zones" message: ${noZonesMsg ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);

    // Count all cards
    const cardCount = await page.locator('.card').count();
    console.log(`Total .card elements: ${cardCount}`);

    // List all visible labels
    console.log('\nVisible labels on page:');
    const labels = await page.locator('label').allTextContents();
    labels.forEach((label, i) => console.log(`  ${i + 1}. ${label}`));

    // Screenshot
    await page.screenshot({ path: 'zone-test-final.png', fullPage: true });
    console.log('\n📸 Screenshot: zone-test-final.png');

    console.log('\n=== BROWSER OPEN FOR 15 SECONDS ===');
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await browser.close();
    console.log('\n=== TEST COMPLETE ===');
  }
})();
