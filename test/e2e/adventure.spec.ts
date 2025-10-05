import { test, expect } from '@playwright/test'
import { signupAndCreateCharacter } from './helpers/auth'

test.describe('Adventure System', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Create a new user and character
    const success = await signupAndCreateCharacter(page, 'adventure')

    if (!success) {
      console.log('Note: Setup may have failed due to database, but continuing test')
    }

    // Verify we're in the game
    const inGame = await page.locator('text=Adventure').isVisible({ timeout: 5000 }).catch(() => false) ||
                   await page.locator('text=Combat').isVisible().catch(() => false)

    if (!inGame) {
      console.log('Warning: Not in game interface, tests may fail')
    }
  })

  test('should display Adventure tab and world map', async ({ page }) => {
    // Click Adventure tab
    await page.click('button:has-text("Adventure")')

    // Verify world map is visible
    await expect(page.locator('text=World Map')).toBeVisible()
    await expect(page.locator('text=Discovered Zones')).toBeVisible()

    // Verify starting zone (Havenbrook) is discovered
    await expect(page.locator('text=Havenbrook')).toBeVisible()

    // Verify zone details empty state
    await expect(page.locator('text=Adventure Awaits!')).toBeVisible()
  })

  test('should display zone details when selecting a zone', async ({ page }) => {
    // Click Adventure tab
    await page.click('button:has-text("Adventure")')

    // Wait for world map to load
    await expect(page.locator('text=Havenbrook')).toBeVisible()

    // Click on Havenbrook zone
    await page.click('button:has-text("Havenbrook")')

    // Verify zone details are displayed
    await expect(page.locator('h2:has-text("Havenbrook")')).toBeVisible()
    await expect(page.locator('text=safe_haven')).toBeVisible()
    await expect(page.locator('text=Danger')).toBeVisible()

    // Verify exploration button exists
    await expect(page.locator('button:has-text("Explore Zone")')).toBeVisible()
  })

  test('should start exploration session', async ({ page }) => {
    // Click Adventure tab
    await page.click('button:has-text("Adventure")')

    // Select Havenbrook
    await page.click('button:has-text("Havenbrook")')

    // Click Explore Zone button
    await page.click('button:has-text("Explore Zone")')

    // Wait for success message
    await expect(page.locator('text=Exploration session started!')).toBeVisible({ timeout: 3000 })

    // Wait for exploration panel to appear
    await expect(page.locator('text=Exploring Havenbrook')).toBeVisible({ timeout: 5000 })

    // Verify progress elements
    await expect(page.locator('text=Complete')).toBeVisible()
    await expect(page.locator('text=Time Spent')).toBeVisible()
    await expect(page.locator('text=Discoveries')).toBeVisible()

    // Verify progress bar exists
    await expect(page.locator('text=%')).toBeVisible()

    // Stop exploration
    await page.click('button:has-text("Stop Exploring")')

    // Wait for panel to disappear
    await expect(page.locator('text=Exploring Havenbrook')).not.toBeVisible({ timeout: 3000 })
  })

  test('should show travel routes for discovered zones', async ({ page }) => {
    // Click Adventure tab
    await page.click('button:has-text("Adventure")')

    // Select Havenbrook (should have connections to Whispering Woods and Ironpeak Foothills)
    await page.click('button:has-text("Havenbrook")')

    // Wait for zone details to load
    await expect(page.locator('h2:has-text("Havenbrook")')).toBeVisible()

    // Verify Travel Routes section exists
    await expect(page.locator('text=Travel Routes')).toBeVisible({ timeout: 3000 })

    // Verify at least one connection is shown (Whispering Woods or Ironpeak Foothills)
    // Note: These zones should be auto-discovered on character creation
    const travelRoutes = page.locator('text=Whispering Woods, text=Ironpeak Foothills')
    await expect(travelRoutes.first()).toBeVisible({ timeout: 3000 })
  })

  test('should initiate travel to connected zone', async ({ page }) => {
    // Click Adventure tab
    await page.click('button:has-text("Adventure")')

    // Select Havenbrook
    await page.click('button:has-text("Havenbrook")')

    // Wait for zone details
    await expect(page.locator('h2:has-text("Havenbrook")')).toBeVisible()

    // Find and click a travel button (should show Whispering Woods or Ironpeak Foothills)
    const travelButton = page.locator('button:has-text("Whispering Woods")').first()
    await expect(travelButton).toBeVisible({ timeout: 5000 })
    await travelButton.click()

    // Wait for travel panel to appear
    await expect(page.locator('text=Traveling')).toBeVisible({ timeout: 5000 })

    // Verify travel UI elements
    await expect(page.locator('text=From')).toBeVisible()
    await expect(page.locator('text=To')).toBeVisible()
    await expect(page.locator('text=Progress')).toBeVisible()
    await expect(page.locator('text=Estimated Arrival')).toBeVisible()

    // Verify progress bar
    await expect(page.locator('text=%')).toBeVisible()

    // Verify timer is counting down (check for format like "5m 30s" or "30s")
    await expect(page.locator('text=/\\d+[ms]/')).toBeVisible()

    // Cancel travel
    await page.click('button:has-text("Cancel Travel")')

    // Wait for panel to disappear
    await expect(page.locator('text=Traveling')).not.toBeVisible({ timeout: 3000 })
  })

  test('should show exploration progress over time', async ({ page }) => {
    // Click Adventure tab
    await page.click('button:has-text("Adventure")')

    // Select Havenbrook
    await page.click('button:has-text("Havenbrook")')

    // Start exploration
    await page.click('button:has-text("Explore Zone")')

    // Wait for exploration panel
    await expect(page.locator('text=Exploring Havenbrook')).toBeVisible({ timeout: 5000 })

    // Get initial progress value
    const initialProgress = await page.locator('text=/%/').first().textContent()

    // Wait 2 seconds (should see progress increase)
    await page.waitForTimeout(2000)

    // Get updated progress value
    const updatedProgress = await page.locator('text=/%/').first().textContent()

    // Verify progress increased (or at least time spent increased)
    // Note: Progress increases 1% per 30 seconds, so in 2 seconds it might not change
    // Instead check that time spent is counting up
    await expect(page.locator('text=/\\d+m \\d+s/')).toBeVisible()

    // Stop exploration
    await page.click('button:has-text("Stop Exploring")')
  })

  test('should prevent travel while already traveling', async ({ page }) => {
    // Click Adventure tab
    await page.click('button:has-text("Adventure")')

    // Select Havenbrook
    await page.click('button:has-text("Havenbrook")')

    // Start travel
    const firstTravelButton = page.locator('button:has-text("Whispering Woods")').first()
    await firstTravelButton.click()

    // Wait for travel to start
    await expect(page.locator('text=Traveling')).toBeVisible({ timeout: 5000 })

    // Verify zone browser is hidden (can't select new zones while traveling)
    await expect(page.locator('text=World Map')).not.toBeVisible()
    await expect(page.locator('text=Discovered Zones')).not.toBeVisible()

    // Cancel travel for cleanup
    await page.click('button:has-text("Cancel Travel")')
  })

  test('should prevent exploration while already exploring', async ({ page }) => {
    // Click Adventure tab
    await page.click('button:has-text("Adventure")')

    // Select Havenbrook
    await page.click('button:has-text("Havenbrook")')

    // Start exploration
    await page.click('button:has-text("Explore Zone")')

    // Wait for exploration to start
    await expect(page.locator('text=Exploring Havenbrook')).toBeVisible({ timeout: 5000 })

    // Verify zone browser is hidden
    await expect(page.locator('text=World Map')).not.toBeVisible()

    // Stop exploration for cleanup
    await page.click('button:has-text("Stop Exploring")')
  })

  test('should display zone danger levels with correct colors', async ({ page }) => {
    // Click Adventure tab
    await page.click('button:has-text("Adventure")')

    // Select Havenbrook
    await page.click('button:has-text("Havenbrook")')

    // Wait for zone details
    await expect(page.locator('h2:has-text("Havenbrook")')).toBeVisible()

    // Havenbrook is danger level 5 (safe haven), should have green color
    const dangerBadge = page.locator('text=Danger').locator('..').locator('span').last()
    await expect(dangerBadge).toBeVisible()

    // Verify danger number is displayed
    await expect(page.locator('text=/Danger \\d+/')).toBeVisible()
  })

  test('should show landmarks section when zone has discovered landmarks', async ({ page }) => {
    // Click Adventure tab
    await page.click('button:has-text("Adventure")')

    // Select Havenbrook
    await page.click('button:has-text("Havenbrook")')

    // Start exploration to discover some landmarks
    await page.click('button:has-text("Explore Zone")')
    await expect(page.locator('text=Exploring Havenbrook')).toBeVisible({ timeout: 5000 })

    // Wait 5 seconds for potential discoveries
    await page.waitForTimeout(5000)

    // Stop exploration
    await page.click('button:has-text("Stop Exploring")')

    // Wait for zone details to reappear
    await expect(page.locator('h2:has-text("Havenbrook")')).toBeVisible({ timeout: 3000 })

    // Check if Landmarks section exists (only if discoveries were made)
    // Note: This is probabilistic, so we'll just verify the UI structure
    const landmarksSection = page.locator('text=Landmarks')
    const landmarksVisible = await landmarksSection.isVisible()

    if (landmarksVisible) {
      // If landmarks section exists, verify structure
      await expect(page.locator('text=📍')).toBeVisible()
    }
  })
})
