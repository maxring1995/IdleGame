import { test, expect } from '@playwright/test'
import { signupAndCreateCharacter } from './helpers/auth'

test.describe('Gathering Zone Filter', () => {
  test('should display zone filter dropdown in gathering panel', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000')

    // Sign up with a new user
        const signupButton = page.getByRole('button', { name: /sign up/i })

    if (await signupButton.isVisible()) {
      await page.getByPlaceholder(/username/i).fill(username)
      await signupButton.click()

      // Wait for character creation
      await expect(page.getByText(/create your character/i)).toBeVisible({ timeout: 10000 })

      // Create character
      await page.getByPlaceholder(/character name/i).fill('TestChar')
      await page.getByRole('button', { name: /create character/i }).click()
    }

    // Wait for game to load
    await expect(page.getByText(/gathering/i).first()).toBeVisible({ timeout: 15000 })

    // Click on Gathering tab
    await page.getByRole('button', { name: /gathering/i }).click()

    // Wait for gathering panel to load
    await expect(page.getByText(/woodcutting/i)).toBeVisible({ timeout: 5000 })

    // Click on Mining skill
    await page.getByRole('button', { name: /mining/i }).click()

    // Wait for mining panel to load
    await expect(page.getByText(/Mining \(Level 1\)/i)).toBeVisible({ timeout: 5000 })

    // Check if zone filter exists
    const zoneFilterLabel = page.getByText(/filter by zone/i)
    console.log('Looking for zone filter label...')

    // Wait a bit for zones to load
    await page.waitForTimeout(2000)

    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/zone-filter-debug.png', fullPage: true })

    // Check for zone filter
    const zoneFilterExists = await zoneFilterLabel.isVisible()
    console.log('Zone filter visible:', zoneFilterExists)

    if (zoneFilterExists) {
      // Check for dropdown
      const zoneSelect = page.locator('select').filter({ hasText: /all zones/i })
      await expect(zoneSelect).toBeVisible()

      // Check if zones are in the dropdown
      const selectElement = await zoneSelect.elementHandle()
      if (selectElement) {
        const options = await page.evaluate((select) => {
          return Array.from(select.querySelectorAll('option')).map(opt => opt.textContent)
        }, selectElement)

        console.log('Zone options:', options)

        // Verify some zones exist
        expect(options.some(opt => opt?.includes('Havenbrook') || opt?.includes('Whispering'))).toBe(true)
      }
    } else {
      console.log('Zone filter not found!')

      // Debug: Check what's actually on the page
      const pageContent = await page.content()
      console.log('Page includes "zone":', pageContent.toLowerCase().includes('zone'))
      console.log('Page includes "filter":', pageContent.toLowerCase().includes('filter'))

      // Fail the test with helpful message
      throw new Error('Zone filter is not visible on the gathering panel')
    }
  })
})
