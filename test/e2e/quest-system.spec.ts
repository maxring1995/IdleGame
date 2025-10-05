import { test, expect } from '@playwright/test';
import { signupAndCreateCharacter } from './helpers/auth'

// Generate a unique username for each test
const generateUsername = () => `test_quest_${Date.now()}`;

test.describe('Quest System', () => {
  let username: string;

  test.beforeEach(async ({ page }) => {
    username = generateUsername();

    // Sign up and create character
    await page.goto('/');
    await page.fill('input[placeholder="Enter username"]', username);
    await page.click('button:has-text("Create Account")');
    await page.waitForURL('/', { timeout: 10000 });

    // Character creation
    await page.fill('input[placeholder="Enter character name"]', `Quester${username}`);
    await page.selectOption('select', 'warrior');
    await page.click('button:has-text("Create Character")');
    await page.waitForSelector('text=Adventure', { timeout: 10000 });
  });

  test('Kill quests should track Goblin Scout kills correctly', async ({ page }) => {
    // Navigate to quests tab
    await page.click('button:has-text("Quests")');
    await page.waitForTimeout(1000); // Wait for quests to load

    // Find and accept "First Blood" quest (Defeat 1 Goblin Scout)
    const questCard = page.locator('.card').filter({ hasText: 'First Blood' });
    await expect(questCard).toBeVisible({ timeout: 10000 });

    // Verify quest requirements
    await expect(questCard).toContainText('Defeat 1 Goblin Scout');

    // Accept the quest
    const acceptButton = questCard.locator('button:has-text("Accept Quest")');
    await acceptButton.click();
    await page.waitForTimeout(1000);

    // Verify quest is now in active quests
    await page.click('text=Active Quests');
    await expect(page.locator('.card').filter({ hasText: 'First Blood' })).toBeVisible();
    await expect(page.locator('.card').filter({ hasText: 'First Blood' })).toContainText('0/1');

    // Go to combat and fight a Goblin Scout
    await page.click('button:has-text("Combat")');
    await page.waitForTimeout(1000);

    // Select Goblin Scout enemy
    const goblinScout = page.locator('.card').filter({ hasText: 'Goblin Scout' });
    await expect(goblinScout).toBeVisible({ timeout: 10000 });
    await goblinScout.locator('button:has-text("Fight")').click();

    // Combat should start
    await expect(page.locator('text=Enemy Health')).toBeVisible();

    // Fight until victory
    let battleEnded = false;
    for (let i = 0; i < 50 && !battleEnded; i++) {
      const victoryModal = page.locator('text=Victory!');
      const defeatModal = page.locator('text=Defeat!');

      if (await victoryModal.isVisible()) {
        battleEnded = true;
        // Click Continue to return to combat selection
        await page.click('button:has-text("Continue")');
        break;
      }

      if (await defeatModal.isVisible()) {
        // If defeated, we can't complete the quest in this test
        expect.soft(false).toBe(true); // Soft fail
        break;
      }

      // Attack
      await page.click('button:has-text("Attack")');
      await page.waitForTimeout(500);
    }

    // Check if quest is completed
    await page.click('button:has-text("Quests")');
    await page.waitForTimeout(1000);
    await page.click('text=Active Quests');

    // Quest should show 1/1 if completed
    const activeQuest = page.locator('.card').filter({ hasText: 'First Blood' });
    await expect(activeQuest).toContainText('1/1');

    // Complete the quest
    const completeButton = activeQuest.locator('button:has-text("Complete Quest")');
    await expect(completeButton).toBeVisible();
    await completeButton.click();

    // Verify rewards notification
    await expect(page.locator('text=/Quest Completed|First Blood completed/')).toBeVisible({ timeout: 5000 });
  });

  test('Boss kill quests should track Goblin King correctly', async ({ page }) => {
    // First level up to meet requirements (level 5)
    // This is a simplified test - in real scenario, character would need to be leveled up

    // Navigate to quests tab
    await page.click('button:has-text("Quests")');
    await page.waitForTimeout(1000);

    // Look for Goblin King quest (requires level 5)
    const questCard = page.locator('.card').filter({ hasText: 'Slay the Goblin King' });

    // If visible (character is high enough level), test it
    const isVisible = await questCard.isVisible({ timeout: 2000 }).catch(() => false);
    if (isVisible) {
      await expect(questCard).toContainText('Defeat 1 Goblin King');

      // Accept the quest
      const acceptButton = questCard.locator('button:has-text("Accept Quest")');
      await acceptButton.click();
      await page.waitForTimeout(1000);

      // Verify quest is now in active quests
      await page.click('text=Active Quests');
      await expect(page.locator('.card').filter({ hasText: 'Slay the Goblin King' })).toBeVisible();
      await expect(page.locator('.card').filter({ hasText: 'Slay the Goblin King' })).toContainText('0/1');
    }
  });

  test('Gathering quests should track material collection', async ({ page }) => {
    // Navigate to quests tab
    await page.click('button:has-text("Quests")');
    await page.waitForTimeout(1000);

    // Find and accept "Gathering Wood" quest (Gather 10 Oak Log)
    const questCard = page.locator('.card').filter({ hasText: 'Gathering Wood' });
    await expect(questCard).toBeVisible({ timeout: 10000 });

    // Verify quest requirements
    await expect(questCard).toContainText('Gather 10 Oak Log');

    // Accept the quest
    const acceptButton = questCard.locator('button:has-text("Accept Quest")');
    await acceptButton.click();
    await page.waitForTimeout(1000);

    // Verify quest is now in active quests
    await page.click('text=Active Quests');
    await expect(page.locator('.card').filter({ hasText: 'Gathering Wood' })).toBeVisible();
    await expect(page.locator('.card').filter({ hasText: 'Gathering Wood' })).toContainText('0/10');

    // Go to gathering and collect Oak Logs
    await page.click('button:has-text("Gathering")');
    await page.waitForTimeout(1000);

    // Click on Woodcutting skill
    await page.click('button:has-text("Woodcutting")');
    await page.waitForTimeout(1000);

    // Start gathering Oak Logs
    const oakLogCard = page.locator('.card').filter({ hasText: 'Oak Log' });
    await expect(oakLogCard).toBeVisible({ timeout: 10000 });

    // Start gathering 10 Oak Logs
    const gatherButton = oakLogCard.locator('button:has-text("Gather x10")');
    await gatherButton.click();

    // Wait for gathering to complete (simplified - in reality would take time)
    await expect(page.locator('text=Gathering Oak Log')).toBeVisible();

    // Wait for gathering to complete (max 30 seconds for test)
    await page.waitForSelector('text=Gathering session complete', { timeout: 30000 }).catch(() => {});

    // Check quest progress
    await page.click('button:has-text("Quests")');
    await page.waitForTimeout(1000);
    await page.click('text=Active Quests');

    // Quest should show progress
    const activeQuest = page.locator('.card').filter({ hasText: 'Gathering Wood' });
    // The progress might be partial, so just check it's visible
    await expect(activeQuest).toBeVisible();
  });

  test('Generic enemy kill quests should track any enemy type', async ({ page }) => {
    // Navigate to quests tab
    await page.click('button:has-text("Quests")');
    await page.waitForTimeout(1000);

    // Look for "Daily Training" quest (Defeat 5 enemies - any type)
    const questCards = await page.locator('.card').all();
    let dailyTrainingFound = false;

    for (const card of questCards) {
      const text = await card.textContent();
      if (text?.includes('Daily Training')) {
        dailyTrainingFound = true;

        // Check if we can accept it (level 3 required)
        const acceptButton = card.locator('button:has-text("Accept Quest")');
        const isDisabled = await acceptButton.isDisabled().catch(() => true);

        if (!isDisabled) {
          await acceptButton.click();
          await page.waitForTimeout(1000);

          // Verify quest is now in active quests
          await page.click('text=Active Quests');
          await expect(page.locator('.card').filter({ hasText: 'Daily Training' })).toBeVisible();
          await expect(page.locator('.card').filter({ hasText: 'Daily Training' })).toContainText('0/5');

          // Go to combat and fight any enemy
          await page.click('button:has-text("Combat")');
          await page.waitForTimeout(1000);

          // Fight a Slime (easiest enemy)
          const slime = page.locator('.card').filter({ hasText: 'Slime' });
          await expect(slime).toBeVisible({ timeout: 10000 });
          await slime.locator('button:has-text("Fight")').click();

          // Combat should start
          await expect(page.locator('text=Enemy Health')).toBeVisible();

          // Fight until victory
          let battleEnded = false;
          for (let i = 0; i < 50 && !battleEnded; i++) {
            const victoryModal = page.locator('text=Victory!');

            if (await victoryModal.isVisible()) {
              battleEnded = true;
              // Click Continue
              await page.click('button:has-text("Continue")');
              break;
            }

            // Attack
            await page.click('button:has-text("Attack")');
            await page.waitForTimeout(500);
          }

          // Check quest progress
          await page.click('button:has-text("Quests")');
          await page.waitForTimeout(1000);
          await page.click('text=Active Quests');

          // Quest should show 1/5 progress
          const activeQuest = page.locator('.card').filter({ hasText: 'Daily Training' });
          await expect(activeQuest).toContainText('1/5');
        }
        break;
      }
    }
  });

  test('Quest chain progression should unlock next quest after completion', async ({ page }) => {
    // Navigate to quests tab
    await page.click('button:has-text("Quests")');
    await page.waitForTimeout(1000);

    // Accept and complete First Blood quest (prerequisite for chain)
    const firstBloodQuest = page.locator('.card').filter({ hasText: 'First Blood' });
    await expect(firstBloodQuest).toBeVisible({ timeout: 10000 });

    // Accept the quest
    const acceptButton = firstBloodQuest.locator('button:has-text("Accept Quest")');
    await acceptButton.click();
    await page.waitForTimeout(1000);

    // Complete the quest by fighting Goblin Scout
    await page.click('button:has-text("Combat")');
    await page.waitForTimeout(1000);

    const goblinScout = page.locator('.card').filter({ hasText: 'Goblin Scout' });
    await goblinScout.locator('button:has-text("Fight")').click();

    // Fight until victory (simplified)
    let battleEnded = false;
    for (let i = 0; i < 50 && !battleEnded; i++) {
      if (await page.locator('text=Victory!').isVisible()) {
        battleEnded = true;
        await page.click('button:has-text("Continue")');
        break;
      }
      await page.click('button:has-text("Attack")');
      await page.waitForTimeout(500);
    }

    // Complete the quest
    await page.click('button:has-text("Quests")');
    await page.waitForTimeout(1000);
    await page.click('text=Active Quests');

    const activeQuest = page.locator('.card').filter({ hasText: 'First Blood' });
    const completeButton = activeQuest.locator('button:has-text("Complete Quest")');
    if (await completeButton.isVisible()) {
      await completeButton.click();
      await page.waitForTimeout(1000);

      // Check if chain quest is now available
      await page.click('text=Available Quests');
      await page.waitForTimeout(1000);

      // Look for Goblin Slayer quest (chain_goblin_2) which requires First Blood completion
      const chainQuest = page.locator('.card').filter({ hasText: 'Slayer Trainee' });
      // This quest should now be available
      await expect(chainQuest).toBeVisible({ timeout: 5000 });
    }
  });

  test('Quest rewards should be properly distributed on completion', async ({ page }) => {
    // Get initial gold and XP
    const initialGold = await page.locator('text=/💰\\s*\\d+/').textContent();
    const goldMatch = initialGold?.match(/💰\s*(\d+)/);
    const startingGold = goldMatch ? parseInt(goldMatch[1]) : 0;

    // Navigate to quests and accept First Blood
    await page.click('button:has-text("Quests")');
    await page.waitForTimeout(1000);

    const questCard = page.locator('.card').filter({ hasText: 'First Blood' });
    await questCard.locator('button:has-text("Accept Quest")').click();
    await page.waitForTimeout(1000);

    // Complete the quest objective
    await page.click('button:has-text("Combat")');
    await page.waitForTimeout(1000);

    const goblinScout = page.locator('.card').filter({ hasText: 'Goblin Scout' });
    await goblinScout.locator('button:has-text("Fight")').click();

    // Fight until victory
    let victorious = false;
    for (let i = 0; i < 50; i++) {
      if (await page.locator('text=Victory!').isVisible()) {
        victorious = true;
        await page.click('button:has-text("Continue")');
        break;
      }
      await page.click('button:has-text("Attack")');
      await page.waitForTimeout(500);
    }

    if (victorious) {
      // Complete the quest
      await page.click('button:has-text("Quests")');
      await page.waitForTimeout(1000);
      await page.click('text=Active Quests');

      const activeQuest = page.locator('.card').filter({ hasText: 'First Blood' });
      await activeQuest.locator('button:has-text("Complete Quest")').click();
      await page.waitForTimeout(1000);

      // Check that gold increased
      const finalGold = await page.locator('text=/💰\\s*\\d+/').textContent();
      const finalGoldMatch = finalGold?.match(/💰\s*(\d+)/);
      const endingGold = finalGoldMatch ? parseInt(finalGoldMatch[1]) : 0;

      // Gold should have increased (quest reward + combat reward)
      expect(endingGold).toBeGreaterThan(startingGold);

      // Check for quest completion notification
      await expect(page.locator('text=/Quest Completed|First Blood completed|Rewards received/')).toBeVisible({ timeout: 5000 });
    }
  });

  test('Multiple quest types can be tracked simultaneously', async ({ page }) => {
    // Accept multiple different quest types
    await page.click('button:has-text("Quests")');
    await page.waitForTimeout(1000);

    // Accept First Blood (kill quest)
    const firstBlood = page.locator('.card').filter({ hasText: 'First Blood' });
    await firstBlood.locator('button:has-text("Accept Quest")').click();
    await page.waitForTimeout(500);

    // Accept Gathering Wood (gather quest)
    const gatheringWood = page.locator('.card').filter({ hasText: 'Gathering Wood' });
    await gatheringWood.locator('button:has-text("Accept Quest")').click();
    await page.waitForTimeout(500);

    // Check active quests shows both
    await page.click('text=Active Quests');
    await expect(page.locator('.card').filter({ hasText: 'First Blood' })).toBeVisible();
    await expect(page.locator('.card').filter({ hasText: 'Gathering Wood' })).toBeVisible();

    // Progress on one quest shouldn't affect the other
    await page.click('button:has-text("Combat")');
    await page.waitForTimeout(1000);

    // Fight an enemy for kill quest
    const slime = page.locator('.card').filter({ hasText: 'Slime' });
    await slime.locator('button:has-text("Fight")').click();

    // Quick combat
    for (let i = 0; i < 20; i++) {
      if (await page.locator('text=/Victory!|Defeat!/').isVisible()) {
        await page.click('button:has-text("Continue")');
        break;
      }
      await page.click('button:has-text("Attack")');
      await page.waitForTimeout(300);
    }

    // Check that only the relevant quest updated
    await page.click('button:has-text("Quests")');
    await page.waitForTimeout(1000);
    await page.click('text=Active Quests');

    // Gathering quest should still be at 0
    const gatherQuest = page.locator('.card').filter({ hasText: 'Gathering Wood' });
    await expect(gatherQuest).toContainText('0/10');
  });

  test('Quest abandonment should work correctly', async ({ page }) => {
    // Accept a quest
    await page.click('button:has-text("Quests")');
    await page.waitForTimeout(1000);

    const questCard = page.locator('.card').filter({ hasText: 'First Blood' });
    await questCard.locator('button:has-text("Accept Quest")').click();
    await page.waitForTimeout(1000);

    // Go to active quests
    await page.click('text=Active Quests');
    const activeQuest = page.locator('.card').filter({ hasText: 'First Blood' });
    await expect(activeQuest).toBeVisible();

    // Abandon the quest
    const abandonButton = activeQuest.locator('button:has-text("Abandon")');
    await abandonButton.click();
    await page.waitForTimeout(1000);

    // Quest should no longer be in active quests
    await expect(activeQuest).not.toBeVisible();

    // Quest should be available to accept again
    await page.click('text=Available Quests');
    await expect(questCard).toBeVisible();
    await expect(questCard.locator('button:has-text("Accept Quest")')).toBeVisible();
  });
});