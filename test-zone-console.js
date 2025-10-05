const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = [];

  // Listen to ALL console messages
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    console.log(`[${msg.type().toUpperCase()}]`, text);
  });

  // Navigate to the app
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000);

  // Click on Gathering tab
  await page.click('text=Gathering').catch(() => {});
  await page.waitForTimeout(3000);

  // Click on Woodcutting
  await page.click('text=Woodcutting').catch(() => {});
  await page.waitForTimeout(3000);

  console.log('\n\n=== FILTERING CONSOLE LOGS FOR ZONE-RELATED MESSAGES ===\n');

  const zoneLogs = consoleLogs.filter(log =>
    log.text.toLowerCase().includes('zone') ||
    log.text.includes('[GatheringSkillPanel]')
  );

  zoneLogs.forEach(log => {
    console.log(`[${log.type.toUpperCase()}]`, log.text);
  });

  console.log(`\n\n=== TOTAL CONSOLE LOGS: ${consoleLogs.length} ===`);
  console.log(`=== ZONE-RELATED LOGS: ${zoneLogs.length} ===\n`);

  await browser.close();
})();
