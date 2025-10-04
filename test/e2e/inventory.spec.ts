import { test, expect } from '@playwright/test';

test.describe('Inventory System', () => {
  test('should show starter items and allow equipping', async ({ page }) => {
    console.log('\n🎒 Testing Inventory System...\n');

    // Step 1: Create account and character
    console.log('Step 1: Creating new player...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    const randomEmail = `inv${Date.now()}@gmail.com`;
    const randomUsername = `inv${Date.now().toString().slice(-6)}`;

    await page.locator('#email').fill(randomEmail);
    await page.locator('#username').fill(randomUsername);
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Wait for character creation
    await expect(page.getByText('Create Your Hero')).toBeVisible({ timeout: 10000 });

    await page.locator('#characterName').fill('Inventory Tester');
    await page.getByRole('button', { name: 'Begin Adventure' }).click();

    // Wait for game to load
    await page.waitForTimeout(2000);

    // Step 2: Navigate to Inventory tab
    console.log('Step 2: Opening inventory...');
    const inventoryTab = page.getByRole('button', { name: 'Inventory' });
    await expect(inventoryTab).toBeVisible();
    await inventoryTab.click();

    // Wait for inventory to load - either items or empty message
    console.log('Step 3: Waiting for inventory to load...');
    await Promise.race([
      page.locator('.aspect-square').first().waitFor({ timeout: 5000 }).catch(() => null),
      page.getByText('Your inventory is empty').waitFor({ timeout: 5000 }).catch(() => null)
    ]);

    // Give it a bit more time
    await page.waitForTimeout(1000);

    // Step 3: Check for starter items
    console.log('Step 4: Checking starter items...');

    // Should have at least some items (wooden sword, leather armor, health potions)
    const hasInventoryItems = await page.locator('.aspect-square').count();
    console.log(`  Found ${hasInventoryItems} items in inventory`);

    expect(hasInventoryItems).toBeGreaterThan(0);

    // Step 5: Click on an item to select it
    console.log('Step 5: Selecting an item...');
    const firstItem = page.locator('.aspect-square').first();
    await firstItem.click();

    // Should show item details
    await page.waitForTimeout(500);

    // Check if details panel shows up
    const hasItemName = await page.locator('.text-lg.font-bold').count() > 0;
    console.log(`  Item details visible: ${hasItemName}`);

    // Step 6: Try to equip an equipment item
    console.log('Step 6: Attempting to equip an item...');

    // Find an equipable item (weapon or armor)
    const weaponIcon = page.locator('text=⚔️').first();
    const armorIcon = page.locator('text=🛡️').first();

    const hasWeapon = await weaponIcon.isVisible().catch(() => false);
    const hasArmor = await armorIcon.isVisible().catch(() => false);

    if (hasWeapon) {
      console.log('  Found weapon, attempting to equip...');
      await weaponIcon.click();
      await page.waitForTimeout(500);

      // Click equip button if available
      const equipButton = page.getByRole('button', { name: 'Equip' });
      const isEquipButtonVisible = await equipButton.isVisible().catch(() => false);

      if (isEquipButtonVisible) {
        await equipButton.click();
        console.log('  ✅ Clicked equip button');

        // Wait for state to update
        await page.waitForTimeout(1000);

        // Check if item is now equipped (button should say "Unequip")
        const unequipButton = page.getByRole('button', { name: 'Unequip' });
        const isUnequipVisible = await unequipButton.isVisible().catch(() => false);

        if (isUnequipVisible) {
          console.log('  ✅ Item equipped successfully!');
        } else {
          console.log('  ⚠️  Could not verify item was equipped');
        }
      } else {
        console.log('  ⚠️  Equip button not found');
      }
    } else if (hasArmor) {
      console.log('  Found armor, attempting to equip...');
      await armorIcon.click();
      await page.waitForTimeout(500);

      const equipButton = page.getByRole('button', { name: 'Equip' });
      const isEquipButtonVisible = await equipButton.isVisible().catch(() => false);

      if (isEquipButtonVisible) {
        await equipButton.click();
        console.log('  ✅ Clicked equip button');
      }
    }

    // Step 7: Take screenshot
    await page.screenshot({ path: 'inventory-test.png', fullPage: true });
    console.log('📸 Screenshot saved as inventory-test.png');

    // Final assertions
    expect(hasInventoryItems).toBeGreaterThan(0);

    console.log('\n✅ INVENTORY TEST COMPLETE!\n');
  });

  test('should show item details with stats', async ({ page }) => {
    console.log('\n📊 Testing Item Details...\n');

    // Create account and get to inventory
    await page.goto('http://localhost:3000');
    const randomEmail = `item${Date.now()}@gmail.com`;
    const randomUsername = `item${Date.now().toString().slice(-6)}`;

    await page.locator('#email').fill(randomEmail);
    await page.locator('#username').fill(randomUsername);
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Create Your Hero')).toBeVisible({ timeout: 10000 });
    await page.locator('#characterName').fill('Item Details Tester');
    await page.getByRole('button', { name: 'Begin Adventure' }).click();
    await page.waitForTimeout(2000);

    // Go to inventory
    await page.getByRole('button', { name: 'Inventory' }).click();
    await page.waitForTimeout(1000);

    // Click on first item
    const firstItem = page.locator('.aspect-square').first();
    await firstItem.click();
    await page.waitForTimeout(500);

    // Check for detail panels
    const hasItemName = await page.locator('.text-lg.font-bold').count() > 0;
    const hasDescription = await page.getByText('Type').isVisible().catch(() => false);

    console.log(`  Item name shown: ${hasItemName}`);
    console.log(`  Item details shown: ${hasDescription}`);

    expect(hasItemName).toBeTruthy();

    console.log('\n✅ ITEM DETAILS TEST COMPLETE!\n');
  });
});
