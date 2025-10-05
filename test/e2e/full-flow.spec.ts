import { test, expect } from '@playwright/test';
import { signupAndCreateCharacter } from './helpers/auth'

test('Complete user journey: signup → character creation → game', async ({ page }) => {
  console.log('\n🎮 Starting full game flow test...\n');

  // Step 1: Navigate and signup
  console.log('Step 1: Navigating to app...');
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Fill in signup form
  console.log('Step 2: Filling signup form...');
  const randomEmail = `player${Date.now()}@gmail.com`;
  const randomUsername = `player${Date.now().toString().slice(-6)}`;

  await page.locator('#email').fill(randomEmail);
  await page.locator('#username').fill(randomUsername);

  console.log(`  Email: ${randomEmail}`);
  console.log(`  Username: ${randomUsername}`);

  // Click Create Account
  console.log('Step 3: Creating account...');
  await page.getByRole('button', { name: 'Create Account' }).click();

  // Wait for character creation screen
  console.log('Step 4: Waiting for character creation...');
  await expect(page.getByText('Create Your Hero')).toBeVisible({ timeout: 10000 });
  console.log('✅ Character creation screen loaded!');

  // Fill in character name (letters and spaces only)
  console.log('Step 5: Creating character...');
  const characterName = 'Brave Hero';
  await page.locator('#characterName').fill(characterName);
  console.log(`  Character name: ${characterName}`);

  // Check starting stats are displayed
  await expect(page.getByText('Starting Stats')).toBeVisible();
  await expect(page.getByText('Level:')).toBeVisible();
  await expect(page.getByText('Health:')).toBeVisible();

  // Click Begin Adventure
  await page.getByRole('button', { name: 'Begin Adventure' }).click();

  // Wait for game screen
  console.log('Step 6: Entering game world...');
  await page.waitForTimeout(2000);

  // Check if we're in the game (should see character name and stats)
  const isInGame = await page.getByText(characterName).isVisible().catch(() => false);
  const hasStats = await page.getByText('Character Stats').isVisible().catch(() => false);

  if (isInGame && hasStats) {
    console.log('✅ SUCCESS: Player is in the game!');
    console.log('✅ Character name visible');
    console.log('✅ Stats panel visible');

    // Check for health bar
    const hasHealthBar = await page.getByText('Health').isVisible();
    if (hasHealthBar) {
      console.log('✅ Health bar visible');
    }

    // Check for experience bar (use first() to avoid strict mode violation)
    const hasExpBar = await page.getByText('Experience').first().isVisible().catch(() => false);
    if (hasExpBar) {
      console.log('✅ Experience bar visible');
    }

    // Take a screenshot of success
    await page.screenshot({ path: 'game-success.png', fullPage: true });
    console.log('📸 Screenshot saved as game-success.png');

  } else {
    console.log('❌ FAILED: Did not reach game screen');
    await page.screenshot({ path: 'game-failure.png', fullPage: true });
    console.log('📸 Failure screenshot saved');
  }

  // Assert success
  expect(isInGame && hasStats).toBeTruthy();

  console.log('\n✅ FULL TEST COMPLETE!\n');
});
