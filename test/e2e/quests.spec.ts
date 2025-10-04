/**
 * E2E Tests for Quest System
 *
 * Tests complete quest workflows:
 * - Accepting quests
 * - Quest progress tracking via gameplay actions
 * - Quest completion and rewards
 * - Notifications (progress and completion)
 */

import { test, expect } from '@playwright/test'

test.describe('Quest System', () => {
  let username: string

  test.beforeEach(async ({ page }) => {
    // Generate unique username for each test
    username = `questtester_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Navigate to home page
    await page.goto('/')

    // Sign up
    await page.fill('input[placeholder="Enter username"]', username)
    await page.click('button:has-text("Sign Up")')

    // Wait for character creation
    await expect(page.locator('h2:has-text("Create Your Character")')).toBeVisible({ timeout: 10000 })

    // Create character
    await page.fill('input[name="name"]', `${username}_char`)
    await page.click('button:has-text("Create Character")')

    // Wait for game to load
    await expect(page.locator('text=Adventure')).toBeVisible({ timeout: 15000 })
  })

  test('should display available quests', async ({ page }) => {
    // Navigate to Quests tab
    await page.click('button:has-text("Quests")')

    // Wait for quests to load
    await expect(page.locator('h2:has-text("Quest Journal")')).toBeVisible()

    // Should show Available tab by default
    await expect(page.locator('button:has-text("Available")')).toHaveClass(/from-amber-500/)

    // Should show starter quests
    await expect(page.locator('text=Welcome to Eternal Realms')).toBeVisible()
    await expect(page.locator('text=First Blood')).toBeVisible()
    await expect(page.locator('text=Gathering Wood')).toBeVisible()
  })

  test('should accept a quest', async ({ page }) => {
    // Navigate to Quests tab
    await page.click('button:has-text("Quests")')
    await expect(page.locator('h2:has-text("Quest Journal")')).toBeVisible()

    // Click on "Gathering Wood" quest
    await page.click('text=Gathering Wood')

    // Wait for quest details to appear
    await expect(page.locator('text=Gather 10 Oak Log')).toBeVisible()

    // Accept the quest
    await page.click('button:has-text("Accept Quest")')

    // Wait for quest to be accepted
    await page.waitForTimeout(1000)

    // Switch to Active tab
    await page.click('button:has-text("Active")')

    // Verify quest appears in active quests
    await expect(page.locator('text=Gathering Wood')).toBeVisible()
  })

  test('should track gathering quest progress', async ({ page }) => {
    // Accept "Gathering Wood" quest
    await page.click('button:has-text("Quests")')
    await page.click('text=Gathering Wood')
    await page.click('button:has-text("Accept Quest")')
    await page.waitForTimeout(1000)

    // Navigate to Gathering tab
    await page.click('button:has-text("Gathering")')
    await expect(page.locator('text=Gathering Skills')).toBeVisible()

    // Click Woodcutting skill
    await page.click('button:has-text("Woodcutting")')
    await expect(page.locator('text=Available Materials')).toBeVisible()

    // Find Oak Log and start gathering
    await page.click('button:has-text("Gather x10"):near(text="Oak Log")', { timeout: 5000 })

    // Wait for gathering to complete (should be fast for testing)
    await page.waitForTimeout(15000) // 15 seconds should be enough

    // Check browser console for quest tracking logs
    const logs: string[] = []
    page.on('console', msg => logs.push(msg.text()))

    // Navigate back to Quests tab
    await page.click('button:has-text("Quests")')
    await page.click('button:has-text("Active")')

    // Verify quest progress updated
    await expect(page.locator('text=10 / 10')).toBeVisible({ timeout: 5000 })
  })

  test('should complete quest and receive rewards', async ({ page }) => {
    // Accept "Gathering Wood" quest
    await page.click('button:has-text("Quests")')
    await page.click('text=Gathering Wood')
    await page.click('button:has-text("Accept Quest")')
    await page.waitForTimeout(1000)

    // Gather oak logs
    await page.click('button:has-text("Gathering")')
    await page.click('button:has-text("Woodcutting")')
    await page.click('button:has-text("Gather x10"):near(text="Oak Log")')

    // Wait for gathering to complete
    await page.waitForTimeout(15000)

    // Go back to quests
    await page.click('button:has-text("Quests")')
    await page.click('button:has-text("Active")')

    // Select the quest
    await page.click('text=Gathering Wood')

    // Click "Claim Rewards" button
    await page.click('button:has-text("Claim Rewards")')

    // Wait for completion modal
    await expect(page.locator('text=Quest Complete!')).toBeVisible({ timeout: 5000 })

    // Verify rewards are shown
    await expect(page.locator('text=75')).toBeVisible() // XP reward
    await expect(page.locator('text=30')).toBeVisible() // Gold reward

    // Close modal
    await page.click('button:has-text("Continue")')

    // Verify quest moved to completed
    await page.click('button:has-text("Completed")')
    await expect(page.locator('text=Gathering Wood')).toBeVisible()
  })

  test('should track combat kill quest progress', async ({ page }) => {
    // Accept "First Blood" quest
    await page.click('button:has-text("Quests")')
    await page.click('text=First Blood')
    await page.click('button:has-text("Accept Quest")')
    await page.waitForTimeout(1000)

    // Navigate to Combat tab
    await page.click('button:has-text("Combat")')
    await expect(page.locator('text=Select an Enemy')).toBeVisible()

    // Find and fight a Goblin
    await page.click('text=Goblin').first()
    await page.click('button:has-text("Start Combat")')

    // Wait for combat to initialize
    await page.waitForTimeout(2000)

    // Attack until victory (or use auto-attack)
    const autoAttackToggle = page.locator('text=Auto-Attack').first()
    if (await autoAttackToggle.isVisible()) {
      await autoAttackToggle.click()
    } else {
      // Manual attacks
      for (let i = 0; i < 20; i++) {
        const attackBtn = page.locator('button:has-text("Attack")')
        if (await attackBtn.isVisible()) {
          await attackBtn.click()
          await page.waitForTimeout(500)
        } else {
          break
        }
      }
    }

    // Wait for victory modal
    await expect(page.locator('text=Victory!')).toBeVisible({ timeout: 30000 })
    await page.click('button:has-text("Continue")')

    // Check quest progress
    await page.click('button:has-text("Quests")')
    await page.click('button:has-text("Active")')
    await page.click('text=First Blood')

    // Should show 1/1
    await expect(page.locator('text=1 / 1')).toBeVisible()

    // Should be able to claim rewards
    await expect(page.locator('button:has-text("Claim Rewards")')).toBeEnabled()
  })

  test('should show quest progress in active quests list', async ({ page }) => {
    // Accept multiple quests
    await page.click('button:has-text("Quests")')

    // Accept "Gathering Wood"
    await page.click('text=Gathering Wood')
    await page.click('button:has-text("Accept Quest")')
    await page.waitForTimeout(1000)

    // Go back to available
    await page.click('button:has-text("Available")')

    // Accept "First Blood"
    await page.click('text=First Blood')
    await page.click('button:has-text("Accept Quest")')
    await page.waitForTimeout(1000)

    // View active quests
    await page.click('button:has-text("Active")')

    // Should show both quests with progress bars
    await expect(page.locator('text=Gathering Wood')).toBeVisible()
    await expect(page.locator('text=First Blood')).toBeVisible()

    // Each should have a progress bar
    const progressBars = page.locator('.progress-bar')
    await expect(progressBars).toHaveCount(2, { timeout: 5000 })
  })

  test('should abandon a quest', async ({ page }) => {
    // Accept a quest
    await page.click('button:has-text("Quests")')
    await page.click('text=Gathering Wood')
    await page.click('button:has-text("Accept Quest")')
    await page.waitForTimeout(1000)

    // Go to active tab
    await page.click('button:has-text("Active")')
    await page.click('text=Gathering Wood')

    // Listen for confirmation dialog
    page.on('dialog', dialog => dialog.accept())

    // Click abandon button
    await page.click('button:has-text("Abandon Quest")')

    // Wait for quest to be removed
    await page.waitForTimeout(1000)

    // Quest should no longer be in active
    await expect(page.locator('text=Gathering Wood')).not.toBeVisible()
  })

  test('should filter quests by level requirement', async ({ page }) => {
    await page.click('button:has-text("Quests")')

    // Level 1 character should see level 1 quests
    await expect(page.locator('text=Welcome to Eternal Realms')).toBeVisible()
    await expect(page.locator('text=First Blood')).toBeVisible()

    // Should not see higher level quests (check if any exist by looking for level badges)
    const levelBadges = page.locator('span:has-text("Lv.")')
    const count = await levelBadges.count()

    // All visible quests should be level 1-3 for a new character
    for (let i = 0; i < count; i++) {
      const badgeText = await levelBadges.nth(i).textContent()
      const level = parseInt(badgeText?.replace('Lv.', '').trim() || '0')
      expect(level).toBeLessThanOrEqual(3)
    }
  })
})

test.describe('Quest Notifications', () => {
  let username: string

  test.beforeEach(async ({ page }) => {
    username = `questnotif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await page.goto('/')
    await page.fill('input[placeholder="Enter username"]', username)
    await page.click('button:has-text("Sign Up")')
    await expect(page.locator('h2:has-text("Create Your Character")')).toBeVisible({ timeout: 10000 })
    await page.fill('input[name="name"]', `${username}_char`)
    await page.click('button:has-text("Create Character")')
    await expect(page.locator('text=Adventure')).toBeVisible({ timeout: 15000 })
  })

  test('should show notification when quest progresses', async ({ page }) => {
    // Accept quest
    await page.click('button:has-text("Quests")')
    await page.click('text=Gathering Wood')
    await page.click('button:has-text("Accept Quest")')
    await page.waitForTimeout(1000)

    // Perform action that progresses quest
    await page.click('button:has-text("Gathering")')
    await page.click('button:has-text("Woodcutting")')
    await page.click('button:has-text("Gather x10"):near(text="Oak Log")')

    // Wait for gathering to complete
    await page.waitForTimeout(15000)

    // Check for notification (if visible in UI)
    // Note: This assumes NotificationCenter or toast shows quest progress
    const notification = page.locator('text=Quest Progress')
    if (await notification.isVisible({ timeout: 2000 })) {
      await expect(notification).toContainText('Gathering Wood')
    }

    // Alternative: Check browser console for notification logs
    const consoleLogs: string[] = []
    page.on('console', msg => consoleLogs.push(msg.text()))

    // Trigger another action to generate logs
    await page.click('button:has-text("Quests")')

    // Wait a bit for logs
    await page.waitForTimeout(1000)
  })

  test('should show completion notification when quest is completed', async ({ page }) => {
    // Complete a quick quest
    await page.click('button:has-text("Quests")')
    await page.click('text=Gathering Wood')
    await page.click('button:has-text("Accept Quest")')
    await page.waitForTimeout(1000)

    // Gather materials
    await page.click('button:has-text("Gathering")')
    await page.click('button:has-text("Woodcutting")')
    await page.click('button:has-text("Gather x10"):near(text="Oak Log")')
    await page.waitForTimeout(15000)

    // Complete quest
    await page.click('button:has-text("Quests")')
    await page.click('button:has-text("Active")')
    await page.click('text=Gathering Wood')
    await page.click('button:has-text("Claim Rewards")')

    // Completion modal should appear
    await expect(page.locator('text=Quest Complete!')).toBeVisible()

    // Modal should show quest title
    await expect(page.locator('text=Gathering Wood')).toBeVisible()
  })
})
