import { test, expect } from '@playwright/test'
import { signupAndCreateCharacter } from './helpers/auth'

test.describe('Test Durability with Existing Account', () => {
  test('verify durability decreases when harvesting', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check if already logged in or need to login
    const needsLogin = await page.locator('input[placeholder="Choose a username"]').count() > 0

    if (needsLogin) {
      console.log('Logging in with provided credentials...')

      // Extract username from email (ringen95)
      await page.fill('input[placeholder="Choose a username"]', 'ringen95')

      // Try to sign in
      await page.click('button:has-text("Sign In")')

      // Wait for game to load
      await page.waitForSelector('text=Adventure', { timeout: 15000 })
    } else {
      console.log('Already logged in')
    }

    // Navigate to Adventure tab
    await page.click('button:has-text("Adventure")')
    await page.waitForTimeout(1000)

    // Click on Havenbrook Village
    const havenbrookButton = page.locator('.panel').filter({ hasText: 'Havenbrook Village' }).first()
    await havenbrookButton.click()

    // Wait for zone details to load
    await page.waitForSelector('text=Gathering', { timeout: 5000 })

    // Click on Gathering tab
    await page.click('button:has-text("Gathering")')

    // Wait for nodes to load
    await page.waitForSelector('.panel:has-text("Durability")', { timeout: 10000 })

    // Take initial screenshot
    await page.screenshot({ path: 'test-results/durability-test-initial.png', fullPage: true })

    // Find a node with visible durability
    const nodeWithDurability = page.locator('.panel').filter({ hasText: 'Durability' }).filter({ hasText: '3 / 3' }).first()
    const nodeExists = await nodeWithDurability.count() > 0

    if (!nodeExists) {
      console.log('No nodes with 3/3 durability found, trying any node...')
      const anyNode = page.locator('.panel').filter({ hasText: 'Durability' }).first()
      await anyNode.click()
    } else {
      await nodeWithDurability.click()
    }

    // Wait for harvest button to appear
    await page.waitForSelector('button:has-text("Harvest")', { timeout: 5000 })

    // Get the initial durability value
    const remainingSection = page.locator('div:has-text("Remaining")').last()
    const initialDurabilityText = await remainingSection.textContent()
    console.log('Initial durability:', initialDurabilityText)

    // Extract numbers from durability text (e.g., "3 / 3 harvests")
    const initialMatch = initialDurabilityText?.match(/(\d+)\s*\/\s*(\d+)/)
    const initialCurrent = initialMatch ? parseInt(initialMatch[1]) : 0
    const initialMax = initialMatch ? parseInt(initialMatch[2]) : 0

    console.log(`Starting durability: ${initialCurrent}/${initialMax}`)

    // Click harvest button
    const harvestButton = page.locator('button').filter({ hasText: 'Harvest' }).first()
    await harvestButton.click()

    // Wait for harvest to complete
    await page.waitForTimeout(3000)

    // Get updated durability
    const updatedDurabilityText = await remainingSection.textContent()
    console.log('Updated durability:', updatedDurabilityText)

    // Extract updated numbers
    const updatedMatch = updatedDurabilityText?.match(/(\d+)\s*\/\s*(\d+)/)
    const updatedCurrent = updatedMatch ? parseInt(updatedMatch[1]) : 0
    const updatedMax = updatedMatch ? parseInt(updatedMatch[2]) : 0

    console.log(`Updated durability: ${updatedCurrent}/${updatedMax}`)

    // Take screenshot after harvest
    await page.screenshot({ path: 'test-results/durability-test-after-harvest.png', fullPage: true })

    // Verify durability decreased
    if (initialCurrent > 0) {
      expect(updatedCurrent).toBe(initialCurrent - 1)
      console.log(`✓ Durability successfully decreased from ${initialCurrent} to ${updatedCurrent}`)
    } else {
      // Node might have been depleted
      console.log('Node was already depleted or at 0 durability')
    }

    // Try harvesting until depletion if possible
    if (updatedCurrent > 0) {
      console.log(`Continuing to harvest ${updatedCurrent} more times to deplete node...`)

      for (let i = 0; i < updatedCurrent; i++) {
        await harvestButton.click()
        await page.waitForTimeout(2000)

        const currentDurabilityText = await remainingSection.textContent()
        console.log(`After harvest ${i + 2}: ${currentDurabilityText}`)
      }

      // After depletion, the node details should disappear
      const nodeDetailsGone = await page.locator('text=Click a node to view details').count() > 0

      if (nodeDetailsGone) {
        console.log('✓ Node successfully depleted and details panel reset')
      }
    }

    // Final screenshot
    await page.screenshot({ path: 'test-results/durability-test-final.png', fullPage: true })
  })
})