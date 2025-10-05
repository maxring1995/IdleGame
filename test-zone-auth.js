const { chromium } = require('playwright');

(async () => {
  console.log('=== STARTING AUTHENTICATED ZONE FILTER TEST ===\n');

  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();

  // Enable console logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[GatheringSkillPanel]') || text.includes('zone') || text.includes('Zone')) {
      console.log(`[BROWSER] ${msg.type()}: ${text}`);
    }
  });

  try {
    // 1. Navigate to app
    console.log('1. Navigating to app...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    // 2. Check if already logged in
    const isLoggedIn = await page.locator('text=Sign Out').isVisible().catch(() => false);

    if (!isLoggedIn) {
      console.log('2. Not logged in - checking for login page...');

      // Check if we're on sign-in page
      const hasSignIn = await page.locator('text=Sign In').isVisible().catch(() => false);

      if (hasSignIn) {
        console.log('3. Signing in with existing account...');
        await page.locator('#email').fill('indate@example.com');
        await page.locator('#password').fill('password123');
        await page.getByRole('button', { name: 'Sign In' }).click();
        await page.waitForTimeout(3000);
      } else {
        console.log('3. Creating new account...');
        const randomEmail = `test${Date.now()}@example.com`;
        await page.locator('#email').fill(randomEmail);
        await page.locator('#username').fill(`testuser${Date.now()}`);
        await page.locator('#password').fill('TestPassword123');
        await page.locator('#confirmPassword').fill('TestPassword123');
        await page.getByRole('button', { name: 'Create Account' }).click();
        await page.waitForTimeout(3000);

        // Create character if needed
        const hasCharCreate = await page.getByText('Create Your Hero').isVisible().catch(() => false);
        if (hasCharCreate) {
          console.log('4. Creating character...');
          await page.locator('input[type="text"]').fill('TestHero');
          await page.getByRole('button', { name: 'Create Character' }).click();
          await page.waitForTimeout(3000);
        }
      }
    }

    console.log('\n5. Navigating to Gathering tab...');
    const gatheringTab = page.locator('text=Gathering').first();
    await gatheringTab.click();
    await page.waitForTimeout(3000);

    console.log('6. Checking for zone filter...\n');

    // Check for zone filter elements
    const hasZoneLabel = await page.locator('text=Filter by Zone:').isVisible();
    console.log(`   ✅ Zone filter label visible: ${hasZoneLabel}`);

    const zoneSelect = await page.locator('select').count();
    console.log(`   ✅ Number of select elements: ${zoneSelect}`);

    const hasZoneMessage = await page.locator('text=No zones available').isVisible().catch(() => false);
    console.log(`   ✅ "No zones available" message: ${hasZoneMessage}`);

    // Try to find the card
    const cards = await page.locator('.card').count();
    console.log(`   ✅ Total card elements: ${cards}`);

    // Get all visible text to see what's on the page
    console.log('\n7. Visible headings/text:');
    const headings = await page.locator('h2, h3, h4, label').allTextContents();
    headings.slice(0, 10).forEach(h => console.log(`   - ${h}`));

    // Screenshot
    await page.screenshot({ path: 'zone-filter-authenticated.png', fullPage: true });
    console.log('\n📸 Screenshot saved: zone-filter-authenticated.png');

    console.log('\n=== KEEPING BROWSER OPEN FOR 20 SECONDS ===');
    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('❌ Test error:', error);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\n=== TEST COMPLETE ===');
  }
})();
