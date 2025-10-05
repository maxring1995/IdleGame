const { chromium } = require('playwright');

(async () => {
  console.log('=== TESTING REBUILT GATHERING COMPONENT ===\n');

  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();

  // Capture zone filter logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[Zone Filter]')) {
      console.log(`🗺️  ${text}`);
    }
  });

  try {
    console.log('1. Loading app...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    // Check login page
    const onLogin = await page.locator('#email').isVisible().catch(() => false);

    if (onLogin) {
      console.log('2. Toggling to Sign Up...');
      const signUpToggle = await page.locator('text=Sign up').isVisible().catch(() => false);
      if (signUpToggle) {
        await page.locator('text=Sign up').click();
        await page.waitForTimeout(500);
      }

      const email = `rebuilt${Date.now()}@test.com`;
      console.log(`3. Creating account: ${email}`);

      await page.locator('#email').fill(email);
      await page.locator('#password').fill('Rebuilt123!');
      await page.getByRole('button', { name: /sign up/i }).click();
      await page.waitForTimeout(3000);

      // Create character
      const hasCharInput = await page.locator('input[type="text"]').isVisible().catch(() => false);
      if (hasCharInput) {
        console.log('4. Creating character...');
        await page.locator('input[type="text"]').fill('ZoneTester');
        await page.getByRole('button').first().click();
        await page.waitForTimeout(2000);
      }
    }

    console.log('\n5. Opening Gathering tab...');
    await page.locator('text=Gathering').first().click();
    await page.waitForTimeout(4000);

    console.log('\n=== ZONE FILTER CHECK ===\n');

    // Check for zone filter card
    const zoneFilterCard = await page.locator('text=Zone Filter').isVisible();
    console.log(`📍 Zone Filter heading: ${zoneFilterCard ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);

    const zoneIcon = await page.locator('text=🗺️').isVisible().catch(() => false);
    console.log(`📍 Map icon (🗺️): ${zoneIcon ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);

    const filterLabel = await page.locator('text=Filter by Zone:').isVisible();
    console.log(`📍 "Filter by Zone:" label: ${filterLabel ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);

    const select = await page.locator('select').count();
    console.log(`📍 Select dropdown count: ${select}`);

    if (select > 0) {
      const options = await page.locator('select option').allTextContents();
      console.log(`📍 Dropdown options:`);
      options.forEach(opt => console.log(`   - ${opt}`));
    }

    // Screenshot
    await page.screenshot({ path: 'rebuilt-test.png', fullPage: true });
    console.log('\n📸 Screenshot: rebuilt-test.png');

    console.log('\n✅ Test complete - browser stays open 20s');
    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: 'rebuilt-error.png' });
  } finally {
    await browser.close();
  }
})();
