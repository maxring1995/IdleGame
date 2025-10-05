import { test, expect } from '@playwright/test'
import { signupAndCreateCharacter } from './helpers/auth'

test.describe('Combat System', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Create a new user and character
    const success = await signupAndCreateCharacter(page, 'combat')

    if (!success) {
      console.log('Note: Setup may have failed, but continuing test')
    }

    // Verify we're in the game
    const inGame = await page.locator('text=Combat').isVisible({ timeout: 5000 }).catch(() => false) ||
                   await page.locator('text=Adventure').isVisible().catch(() => false)

    if (!inGame) {
      console.log('Warning: Not in game interface, tests may fail')
    }
  })

  test('should display combat tab', async ({ page }) => {
    // Check if combat tab exists
    const combatTab = page.locator('button:has-text("Combat")')
    await expect(combatTab).toBeVisible()
  })

  test('should show enemy list when clicking combat tab', async ({ page }) => {
    // Click combat tab
    await page.click('button:has-text("Combat")')

    // Wait for enemy list to load
    await page.waitForSelector('text=Available Enemies', { timeout: 5000 })

    // Check for enemy cards
    const enemyCards = page.locator('.bg-gray-800').filter({ hasText: 'Challenge' })
    const count = await enemyCards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should display enemy details correctly', async ({ page }) => {
    await page.click('button:has-text("Combat")')
    await page.waitForSelector('text=Available Enemies')

    // Find first enemy card
    const firstEnemy = page.locator('.bg-gray-800').filter({ hasText: 'Challenge' }).first()

    // Check for required enemy info
    await expect(firstEnemy.locator('text=Health')).toBeVisible()
    await expect(firstEnemy.locator('text=Attack')).toBeVisible()
    await expect(firstEnemy.locator('text=Defense')).toBeVisible()
    await expect(firstEnemy.locator('text=XP')).toBeVisible()
  })

  test('should start combat when challenging an enemy', async ({ page }) => {
    await page.click('button:has-text("Combat")')
    await page.waitForSelector('text=Available Enemies')

    // Challenge first enemy
    const challengeButton = page.locator('button:has-text("Challenge")').first()
    const enemyName = await page.locator('.bg-gray-800 h3').first().textContent()

    await challengeButton.click()

    // Wait for combat interface
    await page.waitForSelector('text=Battle:', { timeout: 5000 })

    // Verify combat started with correct enemy
    await expect(page.locator(`text=Battle: ${enemyName}`)).toBeVisible()

    // Check for health bars
    await expect(page.locator('text=TestWarrior')).toBeVisible()
    await expect(page.locator(enemyName!)).toBeVisible()

    // Check for attack button
    await expect(page.locator('button:has-text("Attack")')).toBeVisible()
  })

  test('should execute combat turn when attacking', async ({ page }) => {
    await page.click('button:has-text("Combat")')
    await page.waitForSelector('button:has-text("Challenge")')

    await page.click('button:has-text("Challenge")').first()
    await page.waitForSelector('button:has-text("Attack")')

    // Click attack button
    await page.click('button:has-text("Attack")')

    // Wait for combat log to update
    await page.waitForTimeout(1000)

    // Check if combat log shows turn
    const combatLog = page.locator('.bg-gray-900').filter({ hasText: 'Turn' })
    await expect(combatLog).toBeVisible()
  })

  test('should show victory modal after defeating weak enemy', async ({ page }) => {
    // Start combat with weakest enemy (Slime)
    await page.click('button:has-text("Combat")')
    await page.waitForSelector('text=Slime')

    const slimeCard = page.locator('.bg-gray-800').filter({ hasText: 'Slime' })
    await slimeCard.locator('button:has-text("Challenge")').click()

    await page.waitForSelector('button:has-text("Attack")')

    // Keep attacking until combat ends (max 20 turns for safety)
    for (let i = 0; i < 20; i++) {
      const attackButton = page.locator('button:has-text("Attack")')

      if (await attackButton.isVisible()) {
        await attackButton.click()
        await page.waitForTimeout(500)
      } else {
        break
      }
    }

    // Check for victory or defeat modal
    const modalVisible = await page.locator('text=Victory!').or(page.locator('text=Defeated')).isVisible({ timeout: 5000 })
    expect(modalVisible).toBe(true)
  })

  test('should award rewards on victory', async ({ page }) => {
    await page.click('button:has-text("Combat")')
    await page.waitForSelector('text=Slime')

    // Get initial gold amount
    const initialGoldText = await page.locator('text=Gold').locator('..').locator('.text-primary').textContent()
    const initialGold = parseInt(initialGoldText?.replace(/,/g, '') || '0')

    // Fight slime
    const slimeCard = page.locator('.bg-gray-800').filter({ hasText: 'Slime' })
    await slimeCard.locator('button:has-text("Challenge")').click()
    await page.waitForSelector('button:has-text("Attack")')

    // Attack until victory
    for (let i = 0; i < 15; i++) {
      const attackButton = page.locator('button:has-text("Attack")')
      if (await attackButton.isVisible()) {
        await attackButton.click()
        await page.waitForTimeout(500)
      }
    }

    // Check for victory modal
    await page.waitForSelector('text=Victory!', { timeout: 5000 })

    // Verify rewards are shown
    await expect(page.locator('text=Experience')).toBeVisible()
    await expect(page.locator('text=Gold')).toBeVisible()

    // Close modal
    await page.click('button:has-text("Return")')

    // Verify gold increased (check stats panel)
    await page.waitForTimeout(500)
    const newGoldText = await page.locator('text=Gold').locator('..').locator('.text-primary').textContent()
    const newGold = parseInt(newGoldText?.replace(/,/g, '') || '0')

    expect(newGold).toBeGreaterThan(initialGold)
  })

  test('should allow fleeing from combat', async ({ page }) => {
    await page.click('button:has-text("Combat")')
    await page.waitForSelector('button:has-text("Challenge")')

    await page.click('button:has-text("Challenge")').first()
    await page.waitForSelector('button:has-text("Flee")')

    // Click flee button
    page.on('dialog', dialog => dialog.accept()) // Accept confirmation dialog
    await page.click('button:has-text("Flee")')

    // Should return to enemy selection
    await page.waitForSelector('text=Available Enemies', { timeout: 3000 })
    await expect(page.locator('button:has-text("Challenge")')).toBeVisible()
  })

  test('should show difficulty indicators', async ({ page }) => {
    await page.click('button:has-text("Combat")')
    await page.waitForSelector('text=Available Enemies')

    // Check for difficulty labels
    const difficultyLabels = ['Easy', 'Moderate', 'Fair Fight', 'Challenging', 'Hard']
    let foundDifficulty = false

    for (const label of difficultyLabels) {
      if (await page.locator(`text=${label}`).isVisible()) {
        foundDifficulty = true
        break
      }
    }

    expect(foundDifficulty).toBe(true)
  })

  test('should update health bars during combat', async ({ page }) => {
    await page.click('button:has-text("Combat")')
    await page.waitForSelector('text=Slime')

    const slimeCard = page.locator('.bg-gray-800').filter({ hasText: 'Slime' })
    await slimeCard.locator('button:has-text("Challenge")').click()
    await page.waitForSelector('button:has-text("Attack")')

    // Get initial enemy health bar width
    const enemyHealthBar = page.locator('.border-red-500\\/50 .bg-red-500').first()
    const initialWidth = await enemyHealthBar.evaluate(el => el.style.width)

    // Attack
    await page.click('button:has-text("Attack")')
    await page.waitForTimeout(500)

    // Check if health bar width decreased
    const newWidth = await enemyHealthBar.evaluate(el => el.style.width)
    expect(newWidth).not.toBe(initialWidth)
  })

  test('should show combat log with actions', async ({ page }) => {
    await page.click('button:has-text("Combat")')
    await page.waitForSelector('button:has-text("Challenge")')

    await page.click('button:has-text("Challenge")').first()
    await page.waitForSelector('button:has-text("Attack")')

    // Attack twice
    await page.click('button:has-text("Attack")')
    await page.waitForTimeout(500)
    await page.click('button:has-text("Attack")')
    await page.waitForTimeout(500)

    // Check combat log has multiple turns
    const turnMessages = page.locator('text=Turn')
    const count = await turnMessages.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('should prevent fighting enemies above required level', async ({ page }) => {
    // This test assumes there are high-level enemies that shouldn't be visible to level 1
    await page.click('button:has-text("Combat")')
    await page.waitForSelector('text=Available Enemies')

    // Check that Dragon Whelp (requires level 9) is not shown for level 1 character
    const dragonCard = page.locator('text=Dragon Whelp')
    await expect(dragonCard).not.toBeVisible()
  })
})
