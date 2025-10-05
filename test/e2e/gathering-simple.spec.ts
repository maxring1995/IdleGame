import { test, expect } from '@playwright/test'
import { signupAndCreateCharacter } from './helpers/auth'

test.describe('Gathering System - Basic Flow', () => {
  
  test('complete gathering flow', async ({ page }) => {
    // Setup: Create account and character
    const success = await signupAndCreateCharacter(page, 'gathering-simple')

    if (!success) {
      console.log('Warning: Setup may have failed, but continuing test')
    }

    // Character creation handled by helper

    // Wait for game
    await page.waitForSelector('text=TestHero', { timeout: 10000 })

    // Go to Gathering tab
    await page.click('button:has-text("🌾 Gathering")')
    await page.waitForTimeout(1000)

    // Verify Woodcutting is visible
    await expect(page.locator('text=Woodcutting (Level 1)')).toBeVisible()

    // Verify Oak Log is visible
    await expect(page.locator('text=Oak Log')).toBeVisible()

    // Start gathering 1 Oak Log
    await page.click('button:has-text("x1")').first()
    await page.waitForTimeout(500)

    // Verify gathering session started
    await expect(page.locator('text=Gathering Oak Log')).toBeVisible()

    // Wait for completion (3 seconds + buffer)
    await page.waitForTimeout(4000)

    // Verify complete
    await expect(page.locator('text=1 / 1')).toBeVisible()

    // Collect
    await page.click('button:has-text("Collect")')
    await page.waitForTimeout(2000)

    // Go to inventory
    await page.click('button:has-text("🎒 Inventory")')
    await page.waitForTimeout(500)

    // Click Materials tab
    await page.click('button:has-text("Materials")')
    await page.waitForTimeout(500)

    // Verify Oak Log in inventory
    await expect(page.locator('text=Oak Log')).toBeVisible()

    console.log('✅ Gathering flow complete!')
  })
})
