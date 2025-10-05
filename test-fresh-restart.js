const { chromium } = require('playwright');

(async () => {
  console.log('=== FRESH TEST AFTER SERVER RESTART ===\n');

  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.text().includes('[GatheringSkillPanel]')) {
      console.log(`[BROWSER] ${msg.text()}`);
    }
  });

  try {
    console.log('1. Loading fresh app...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Create new account
    console.log('2. Creating new account...');
    const signUpBtn = await page.locator('text=Sign up').isVisible().catch(() => false);
    if (signUpBtn) {
      await page.locator('text=Sign up').click();
      await page.waitForTimeout(500);
    }

    const email = `fresh${Date.now()}@test.com`;
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('Fresh123Pass');
    await page.getByRole('button', { name: /sign up/i }).click();
    await page.waitForTimeout(3000);

    // Create character
    console.log('3. Creating character...');
    await page.locator('input[type="text"]').fill('FreshHero');
    await page.getByRole('button').first().click();
    await page.waitForTimeout(2000);

    // Go to Gathering
    console.log('4. Opening Gathering tab...');
    await page.locator('text=Gathering').first().click();
    await page.waitForTimeout(4000);

    console.log('\n=== CHECKING FOR ZONE FILTER ===\n');

    const zoneLabel = await page.locator('text=Filter by Zone:').count();
    console.log(`"Filter by Zone:" found: ${zoneLabel > 0 ? '✅ YES' : '❌ NO'}`);

    const cards = await page.locator('.card').count();
    console.log(`Card elements: ${cards}`);

    // Check if zone filter card exists
    const zoneCard = await page.locator('.card:has-text("Filter by Zone")').count();
    console.log(`Zone filter card: ${zoneCard > 0 ? '✅ FOUND' : '❌ MISSING'}`);

    // Screenshot
    await page.screenshot({ path: 'fresh-test.png', fullPage: true });
    console.log('\n📸 Screenshot: fresh-test.png');

    console.log('\n✅ Test complete - browser stays open for 15s');
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();
