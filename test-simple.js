const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => logs.push(msg.text()));

  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);

  await page.click('text=Gathering').catch(() => {});
  await page.waitForTimeout(2000);

  await page.click('text=Woodcutting').catch(() => {});
  await page.waitForTimeout(3000);

  console.log('\n=== GATHERING SKILL PANEL LOGS ===\n');
  logs
    .filter(log => log.includes('[GatheringSkillPanel]'))
    .forEach(log => console.log(log));

  await browser.close();
})();
