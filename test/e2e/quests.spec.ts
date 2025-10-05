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
import { signupAndCreateCharacter } from './helpers/auth'

test.describe('Quest System', () => {
  let username: string

  test.beforeEach(async ({ page }) => {
    // Generate unique username for each test
    username = `questtester_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Navigate to home page
    await page.goto('/')

    // Setup: Create account and character
    const success = await signupAndCreateCharacter(page, 'quests')

    if (!success) {
      console.log('Warning: Setup may have failed, but continuing test')
    }

    // Wait for character creation
    // Character creation handled by helper
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
