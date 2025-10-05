import { test, expect } from '@playwright/test'
import { signupAndCreateCharacter } from './helpers/auth'

test.describe('Simple Durability Test', () => {
  test('verify node durability decreases', async ({ page }) => {
    // Use existing test account
    await page.goto('/')

    // Try to sign in with a test account
    // Setup: Create account and character
    const success = await signupAndCreateCharacter(page, 'simple-durability-test')

    if (!success) {
      console.log('Warning: Setup may have failed, but continuing test')
    }

      // Character creation handled by helper
    }

    // Wait for game to load
    await page.waitForSelector('text=Adventure', { timeout: 15000 })

    // Navigate to Adventure
    await page.click('button:has-text("Adventure")')

    // Click on Havenbrook Village
    await page.waitForSelector('text=Havenbrook Village')
    await page.click('text=Havenbrook Village')

    // Go to Gathering tab
    await page.waitForSelector('button:has-text("Gathering")')
    await page.click('button:has-text("Gathering")')

    // Wait for nodes to load
    await page.waitForSelector('text=active node', { timeout: 10000 })

    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/durability-initial.png', fullPage: true })

    // Find any node and click it
    const firstNode = page.locator('.panel').filter({ hasText: 'Durability' }).first()
    await firstNode.click()

    // Wait for harvest button
    await page.waitForSelector('button[class*="btn-primary"]:has-text("Harvest")')

    // Get initial durability text
    const durabilityElement = page.locator('text=Remaining').locator('..')
    const initialDurability = await durabilityElement.textContent()
    console.log('Initial durability:', initialDurability)

    // Take screenshot before harvest
    await page.screenshot({ path: 'test-results/durability-before-harvest.png', fullPage: true })

    // Click harvest
    const harvestButton = page.locator('button[class*="btn-primary"]').filter({ hasText: 'Harvest' }).first()
    await harvestButton.click()

    // Wait for success message
    await page.waitForSelector('text=✅ Harvested!', { timeout: 10000 })

    // Wait a bit for UI to update
    await page.waitForTimeout(2000)

    // Get updated durability
    const updatedDurability = await durabilityElement.textContent()
    console.log('Updated durability:', updatedDurability)

    // Take screenshot after harvest
    await page.screenshot({ path: 'test-results/durability-after-harvest.png', fullPage: true })

    // Verify durability changed
    expect(initialDurability).not.toBe(updatedDurability)

    // Parse the numbers to verify decrease
    const initialMatch = initialDurability?.match(/(\d+)\s*\/\s*(\d+)/)
    const updatedMatch = updatedDurability?.match(/(\d+)\s*\/\s*(\d+)/)

    if (initialMatch && updatedMatch) {
      const initialCurrent = parseInt(initialMatch[1])
      const updatedCurrent = parseInt(updatedMatch[1])
      console.log(`Durability changed from ${initialCurrent} to ${updatedCurrent}`)
      expect(updatedCurrent).toBe(initialCurrent - 1)
    }
  })
})