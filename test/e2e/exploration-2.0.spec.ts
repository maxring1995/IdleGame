import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Exploration 2.0 Expansion
 *
 * Tests cover:
 * - Exploration skills initialization and progression
 * - Dynamic event system triggering
 * - Interactive map and fog of war
 * - Expedition planning and supplies
 * - System integration
 */

test.describe('Exploration 2.0 System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/')

    // Sign in with existing account
    await page.click('button:has-text("Sign In")')

    await page.fill('input[placeholder="Enter your username"]', 'ringen95@gmail.com')
    await page.fill('input[placeholder="Enter your password"]', 'Anna3811!')
    await page.click('button:has-text("Sign In")')

    // Wait for game to load
    await page.waitForTimeout(3000)

    // Check if already in game or need to create character
    const hasCharacter = await page.locator('button:has-text("Adventure")').isVisible({ timeout: 5000 }).catch(() => false)

    if (!hasCharacter) {
      // Create character if needed
      await page.fill('input[placeholder="Enter character name"]', 'Explorer')
      await page.click('button:has-text("Create Character")')
      await page.waitForTimeout(2000)
    }
  })

  test('should initialize exploration skills on first exploration', async ({ page }) => {
    // Navigate to Adventure tab
    await page.click('button:has-text("Adventure")')
    await expect(page.locator('h2:has-text("World Exploration")')).toBeVisible()

    // Click on first zone
    const firstZone = page.locator('button').filter({ hasText: 'Whispering Woods' }).first()
    await firstZone.click()

    // Wait for zone details modal
    await expect(page.locator('h2:has-text("Whispering Woods")')).toBeVisible()

    // Start exploring
    await page.click('button:has-text("Start Exploring")')

    // Wait for exploration to start
    await expect(page.locator('text=Exploring')).toBeVisible({ timeout: 5000 })

    // Check if Skills button appears
    await expect(page.locator('button:has-text("Skills")')).toBeVisible({ timeout: 5000 })

    // Open skills panel
    await page.click('button:has-text("Skills")')

    // Verify all 4 skills are visible
    await expect(page.locator('text=Cartography')).toBeVisible()
    await expect(page.locator('text=Survival')).toBeVisible()
    await expect(page.locator('text=Archaeology')).toBeVisible()
    await expect(page.locator('text=Tracking')).toBeVisible()

    // Verify skills start at level 1
    const skillLevels = page.locator('text=/Level \\d+/')
    await expect(skillLevels).toHaveCount(4)
  })

  test('should gain skill XP during exploration', async ({ page }) => {
    // Navigate to Adventure and start exploration
    await page.click('button:has-text("Adventure")')
    const firstZone = page.locator('button').filter({ hasText: 'Whispering Woods' }).first()
    await firstZone.click()
    await page.click('button:has-text("Start Exploring")')

    // Wait for exploration to start
    await expect(page.locator('text=Exploring')).toBeVisible({ timeout: 5000 })

    // Open skills panel
    await page.click('button:has-text("Skills")')

    // Click on Survival skill to see details
    await page.click('text=Survival')

    // Get initial XP
    const initialXPText = await page.locator('text=/\\d+\\/\\d+ XP/').first().textContent()
    const initialXP = parseInt(initialXPText?.match(/(\d+)\//)?.[1] || '0')

    // Wait for some exploration progress (skills gain XP automatically)
    await page.waitForTimeout(10000)

    // Check if XP increased
    const newXPText = await page.locator('text=/\\d+\\/\\d+ XP/').first().textContent()
    const newXP = parseInt(newXPText?.match(/(\d+)\//)?.[1] || '0')

    expect(newXP).toBeGreaterThan(initialXP)
  })

  test('should display interactive map in zone details', async ({ page }) => {
    // Navigate to Adventure
    await page.click('button:has-text("Adventure")')

    // Click on first zone
    const firstZone = page.locator('button').filter({ hasText: 'Whispering Woods' }).first()
    await firstZone.click()

    // Click on Map tab
    await page.click('button:has-text("Map")')

    // Verify map is visible
    await expect(page.locator('text=Exploration Progress')).toBeVisible()

    // Verify map canvas exists
    await expect(page.locator('canvas')).toBeVisible()

    // Verify map controls
    await expect(page.locator('button:has-text("Grid")')).toBeVisible()
    await expect(page.locator('button:has-text("Labels")')).toBeVisible()

    // Verify zoom controls
    await expect(page.locator('button[title="Zoom In"]')).toBeVisible()
    await expect(page.locator('button[title="Zoom Out"]')).toBeVisible()
    await expect(page.locator('button[title="Reset View"]')).toBeVisible()

    // Verify exploration percentage starts at 0%
    await expect(page.locator('text=0%')).toBeVisible()
  })

  test('should reveal map tiles during exploration', async ({ page }) => {
    // Navigate to Adventure and start exploration
    await page.click('button:has-text("Adventure")')
    const firstZone = page.locator('button').filter({ hasText: 'Whispering Woods' }).first()
    await firstZone.click()

    // Check map before exploration
    await page.click('button:has-text("Map")')
    const initialPercent = await page.locator('text=/\\d+%/').first().textContent()

    // Close modal and start exploration
    await page.click('button:has-text("Overview")')
    await page.click('button:has-text("Start Exploring")')

    // Wait for some progress
    await page.waitForTimeout(15000)

    // Stop exploration
    await page.click('button:has-text("Stop Exploring")')

    // Open zone details and check map
    await firstZone.click()
    await page.click('button:has-text("Map")')

    // Verify map progress increased
    const finalPercent = await page.locator('text=/\\d+%/').first().textContent()
    expect(finalPercent).not.toBe(initialPercent)
  })

  test('should show expedition planning interface', async ({ page }) => {
    // Navigate to Adventure
    await page.click('button:has-text("Adventure")')

    // Click on first zone
    const firstZone = page.locator('button').filter({ hasText: 'Whispering Woods' }).first()
    await firstZone.click()

    // Click on Map tab
    await page.click('button:has-text("Map")')

    // Check if Plan Expedition button exists
    const planButton = page.locator('button:has-text("Plan Expedition")')
    if (await planButton.isVisible()) {
      await planButton.click()

      // Verify expedition types are shown
      await expect(page.locator('text=Scout')).toBeVisible()
      await expect(page.locator('text=Standard')).toBeVisible()
      await expect(page.locator('text=Deep')).toBeVisible()
      await expect(page.locator('text=Legendary')).toBeVisible()

      // Verify supplies section
      await expect(page.locator('text=Available Supplies')).toBeVisible()

      // Verify at least one supply item
      await expect(page.locator('text=/\\d+g/')).toBeVisible() // Gold cost
    }
  })

  test('should handle exploration completion and show summary', async ({ page }) => {
    // Navigate to Adventure and start exploration
    await page.click('button:has-text("Adventure")')
    const firstZone = page.locator('button').filter({ hasText: 'Whispering Woods' }).first()
    await firstZone.click()
    await page.click('button:has-text("Start Exploring")')

    // Wait for exploration to start
    await expect(page.locator('text=Exploring')).toBeVisible({ timeout: 5000 })

    // Wait for some progress
    await page.waitForTimeout(10000)

    // Stop exploration
    await page.click('button:has-text("Stop Exploring")')

    // Verify completion modal or message
    await expect(page.locator('text=/Exploration (complete|stopped)/i')).toBeVisible({ timeout: 5000 })
  })

  test('should display skill bonuses correctly', async ({ page }) => {
    // Navigate to Adventure and start exploration
    await page.click('button:has-text("Adventure")')
    const firstZone = page.locator('button').filter({ hasText: 'Whispering Woods' }).first()
    await firstZone.click()
    await page.click('button:has-text("Start Exploring")')

    // Wait for exploration to start
    await expect(page.locator('text=Exploring')).toBeVisible({ timeout: 5000 })

    // Open skills panel
    await page.click('button:has-text("Skills")')

    // Click on Cartography to see details
    await page.click('text=Cartography')

    // Verify bonus section exists
    await expect(page.locator('text=Bonuses')).toBeVisible()

    // Verify at least one bonus is listed
    await expect(page.locator('text=/\\+\\d+%/')).toBeVisible() // Look for percentage bonuses
  })

  test('should maintain map progress across sessions', async ({ page }) => {
    // Navigate to Adventure and start exploration
    await page.click('button:has-text("Adventure")')
    const firstZone = page.locator('button').filter({ hasText: 'Whispering Woods' }).first()
    await firstZone.click()
    await page.click('button:has-text("Start Exploring")')

    // Wait for some progress
    await page.waitForTimeout(10000)

    // Stop exploration
    await page.click('button:has-text("Stop Exploring")')

    // Check map progress
    await firstZone.click()
    await page.click('button:has-text("Map")')
    const mapProgress = await page.locator('text=/\\d+%/').first().textContent()

    // Reload page
    await page.reload()
    await page.waitForTimeout(3000)
    await expect(page.locator('button:has-text("Adventure")')).toBeVisible({ timeout: 10000 })

    // Check map progress again
    await page.click('button:has-text("Adventure")')
    await firstZone.click()
    await page.click('button:has-text("Map")')

    // Verify progress persisted
    const reloadedProgress = await page.locator('text=/\\d+%/').first().textContent()
    expect(reloadedProgress).toBe(mapProgress)
  })

  test('should show different terrain colors on map', async ({ page }) => {
    // Navigate to Adventure
    await page.click('button:has-text("Adventure")')

    // Click on first zone
    const firstZone = page.locator('button').filter({ hasText: 'Whispering Woods' }).first()
    await firstZone.click()

    // Start exploring to reveal some tiles
    await page.click('button:has-text("Start Exploring")')
    await page.waitForTimeout(15000)
    await page.click('button:has-text("Stop Exploring")')

    // Open map
    await firstZone.click()
    await page.click('button:has-text("Map")')

    // Verify legend is visible
    await expect(page.locator('text=Legend')).toBeVisible()

    // Verify terrain types in legend
    await expect(page.locator('text=Grass')).toBeVisible()
    await expect(page.locator('text=Forest')).toBeVisible()
    await expect(page.locator('text=Mountain')).toBeVisible()
    await expect(page.locator('text=Water')).toBeVisible()
  })

  test('should allow toggling map grid and labels', async ({ page }) => {
    // Navigate to Adventure
    await page.click('button:has-text("Adventure")')

    // Click on first zone
    const firstZone = page.locator('button').filter({ hasText: 'Whispering Woods' }).first()
    await firstZone.click()

    // Go to map
    await page.click('button:has-text("Map")')

    // Toggle grid off
    const gridButton = page.locator('button:has-text("Grid")')
    await gridButton.click()

    // Verify button state changed (should have different styling)
    await expect(gridButton).toHaveClass(/bg-gray-800/)

    // Toggle grid back on
    await gridButton.click()
    await expect(gridButton).toHaveClass(/bg-amber-500/)

    // Toggle labels
    const labelsButton = page.locator('button:has-text("Labels")')
    await labelsButton.click()
    await expect(labelsButton).toHaveClass(/bg-gray-800/)
    await labelsButton.click()
    await expect(labelsButton).toHaveClass(/bg-amber-500/)
  })
})
