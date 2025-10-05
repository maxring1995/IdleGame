const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to ALL console messages
  page.on('console', async msg => {
    const text = msg.text();
    const type = msg.type();

    // Try to get the actual arguments for better logging
    const args = msg.args();
    const values = [];
    for (const arg of args) {
      try {
        const val = await arg.jsonValue();
        values.push(val);
      } catch (e) {
        values.push(text);
        break;
      }
    }

    console.log(`[${type.toUpperCase()}]`, ...values);
  });

  // Navigate to the app
  console.log('=== LOADING APP ===');
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000);

  console.log('\n=== CLICKING GATHERING TAB ===');
  await page.click('text=Gathering').catch(() => console.log('Could not click Gathering'));
  await page.waitForTimeout(3000);

  console.log('\n=== CLICKING WOODCUTTING ===');
  await page.click('text=Woodcutting').catch(() => console.log('Could not click Woodcutting'));
  await page.waitForTimeout(5000);

  console.log('\n=== TEST COMPLETE - KEEPING BROWSER OPEN ===');
  await page.waitForTimeout(20000);

  await browser.close();
})();
