const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to all console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[GatheringSkillPanel]') || text.includes('zone')) {
      console.log('BROWSER:', msg.type(), text);
    }
  });

  // Navigate to the app
  await page.goto('http://localhost:3000');

  console.log('=== NAVIGATING TO APP ===');

  // Wait a bit for potential auth
  await page.waitForTimeout(2000);

  // Check if we need to sign in
  const hasSignIn = await page.locator('text=Sign In').isVisible().catch(() => false);

  if (hasSignIn) {
    console.log('=== NEED TO SIGN IN ===');
    await page.click('text=Sign In');
    await page.fill('input[type="text"]', 'testuser123');
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(2000);
  }

  // Check if we're at character creation
  const hasCharCreate = await page.locator('text=Create Your Character').isVisible().catch(() => false);

  if (hasCharCreate) {
    console.log('=== AT CHARACTER CREATION - SKIPPING TEST ===');
    console.log('Please create a character first');
    await browser.close();
    return;
  }

  console.log('=== CLICKING GATHERING TAB ===');

  // Click on Gathering tab
  await page.click('text=Gathering').catch(() => console.log('Could not find Gathering tab'));
  await page.waitForTimeout(2000);

  console.log('=== GATHERING TAB LOADED ===');

  // Click on Woodcutting skill (should be selected by default, but click to be sure)
  await page.click('text=Woodcutting').catch(() => console.log('Could not find Woodcutting'));
  await page.waitForTimeout(2000);

  console.log('=== WOODCUTTING SELECTED ===');

  // Check if zone filter dropdown exists
  const zoneDropdown = await page.locator('select').filter({ hasText: 'All Zones' }).isVisible().catch(() => false);

  console.log('=== ZONE DROPDOWN VISIBLE:', zoneDropdown, '===');

  // Try to find the zone filter section
  const zoneFilterCard = await page.locator('text=Filter by Zone').isVisible().catch(() => false);
  console.log('=== ZONE FILTER CARD VISIBLE:', zoneFilterCard, '===');

  // Get all select elements on the page
  const selects = await page.locator('select').count();
  console.log('=== NUMBER OF SELECT ELEMENTS:', selects, '===');

  // Screenshot
  await page.screenshot({ path: 'gathering-test.png', fullPage: true });
  console.log('=== SCREENSHOT SAVED: gathering-test.png ===');

  // Keep browser open for manual inspection
  console.log('=== KEEPING BROWSER OPEN FOR 30 SECONDS ===');
  await page.waitForTimeout(30000);

  await browser.close();
})();
