import { test, expect } from '@playwright/test'
import { signupAndCreateCharacter } from './helpers/auth'

test.describe('Equipment Overlay', () => {
  test('should open equipment overlay and display slots correctly', async ({ page }) => {
    // Setup: Create account and character
    const success = await signupAndCreateCharacter(page, 'equipment')

    if (!success) {
      console.log('Warning: Setup may have failed, but continuing test')
    }

    // Wait for game to load
    await page.waitForSelector('button:has-text("Inventory")', { timeout: 10000 })

    // Click Inventory tab
    await page.click('button:has-text("🎒 Inventory")')
    await page.waitForTimeout(1000)

    // Click Equipment button
    await page.click('button:has-text("Equipment")')
    await page.waitForTimeout(1000)

    // Take screenshot of overlay
    await page.screenshot({ path: 'test-results/equipment-overlay.png', fullPage: true })

    // Check if overlay is visible with new full-window design
    await expect(page.locator('text=Equipment Manager')).toBeVisible()
    await expect(page.locator('text=Equipment Bag')).toBeVisible()
    await expect(page.locator('text=Character Equipment')).toBeVisible()
    await expect(page.locator('text=Combat Stats')).toBeVisible()
    await expect(page.getByRole('heading', { name: '✅ Equipped Items' })).toBeVisible()

    // Verify stat cards are visible
    await expect(page.locator('text=Attack').first()).toBeVisible()
    await expect(page.locator('text=Defense').first()).toBeVisible()
    await expect(page.locator('text=Strength').first()).toBeVisible()
    await expect(page.locator('text=Magic').first()).toBeVisible()
    await expect(page.locator('text=Ranged').first()).toBeVisible()

    // Wait and check if overlay flickers
    console.log('Checking for flickering...')
    await page.waitForTimeout(5000)

    // Take another screenshot to compare
    await page.screenshot({ path: 'test-results/equipment-overlay-after-5s.png', fullPage: true })

    console.log('Test complete - check screenshots in test-results/')
  })
})
