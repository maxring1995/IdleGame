const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();

  console.log('=== LOADING APP (FRESH) ===');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('=== CLICKING GATHERING TAB ===');
  const gatheringTab = await page.locator('text=Gathering').first();
  await gatheringTab.click();
  await page.waitForTimeout(3000);

  console.log('=== CHECKING FOR ZONE FILTER ===');
  const zoneFilterLabel = await page.locator('text=Filter by Zone:').isVisible();
  console.log('✅ Zone filter label visible:', zoneFilterLabel);

  const zoneCard = await page.locator('.card:has-text("Filter by Zone")').isVisible().catch(() => false);
  console.log('✅ Zone filter card visible:', zoneCard);

  await page.screenshot({ path: 'zone-filter-final.png', fullPage: true });
  console.log('📸 Screenshot: zone-filter-final.png');

  console.log('\n✅ TEST COMPLETE - Check browser!');
  await page.waitForTimeout(15000);

  await browser.close();
})();
