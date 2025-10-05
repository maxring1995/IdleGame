const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('=== OPENING APP ===');
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);

  console.log('=== CLICKING GATHERING TAB ===');
  await page.click('text=Gathering').catch(() => {});
  await page.waitForTimeout(2000);

  console.log('=== CHECKING FOR ZONE FILTER ===');

  // Check if zone filter label exists
  const hasLabel = await page.locator('text=Filter by Zone:').isVisible();
  console.log('Zone filter label visible:', hasLabel);

  // Check if select dropdown or message exists
  const hasSelect = await page.locator('select').count();
  const hasMessage = await page.locator('text=No zones available').isVisible().catch(() => false);

  console.log('Number of select elements:', hasSelect);
  console.log('Has "No zones available" message:', hasMessage);

  // Take screenshot
  await page.screenshot({ path: 'zone-filter-test.png', fullPage: true });
  console.log('Screenshot saved: zone-filter-test.png');

  // Keep browser open
  console.log('\n=== KEEPING BROWSER OPEN FOR INSPECTION (20 seconds) ===');
  await page.waitForTimeout(20000);

  await browser.close();
  console.log('=== TEST COMPLETE ===');
})();
