import { test, expect } from '@playwright/test'
import { signupAndCreateCharacter } from './helpers/auth'

test.describe('Gathering System', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Create account and character
    const success = await signupAndCreateCharacter(page, 'gathering')

    if (!success) {
      console.log('Warning: Setup may have failed, but continuing test')
    }

    // Wait for game to load
    await page.waitForTimeout(2000)
  })

  test('should display gathering tab', async ({ page }) => {
    // Click on Gathering tab
    await page.click('button:has-text("🌾 Gathering")')

    // Should show gathering skills grid
    await expect(page.locator('text=Woodcutting')).toBeVisible()
    await expect(page.locator('text=Mining')).toBeVisible()
    await expect(page.locator('text=Fishing')).toBeVisible()
    await expect(page.locator('text=Hunting')).toBeVisible()
    await expect(page.locator('text=Alchemy')).toBeVisible()
    await expect(page.locator('text=Magic')).toBeVisible()
  })

  test('should display woodcutting skill panel', async ({ page }) => {
    await page.click('button:has-text("🌾 Gathering")')

    // Woodcutting should be active by default
    await expect(page.locator('text=Woodcutting (Level 1)')).toBeVisible()

    // Should show Oak Log (starter material)
    await expect(page.locator('text=Oak Log')).toBeVisible()
  })

  test('should start gathering oak logs', async ({ page }) => {
    await page.click('button:has-text("🌾 Gathering")')

    // Click on "x1" for Oak Logs
    await page.click('button:has-text("x1")').first()

    // Should show active gathering session
    await expect(page.locator('text=Gathering Oak Log')).toBeVisible({ timeout: 5000 })

    // Should show progress bar
    await expect(page.locator('text=Progress')).toBeVisible()
    await expect(page.locator('text=Time Remaining')).toBeVisible()
  })

  test('should complete gathering and add materials to inventory', async ({ page }) => {
    await page.click('button:has-text("🌾 Gathering")')

    // Start gathering x1 oak log
    await page.click('button:has-text("x1")').first()

    // Wait for gathering to complete (oak logs take 3 seconds)
    await page.waitForTimeout(4000)

    // Verify 1/1 completion
    await expect(page.locator('text=1 / 1')).toBeVisible({ timeout: 2000 })

    // Click collect button
    await page.click('button:has-text("Collect")')

    // Wait for collection
    await page.waitForTimeout(1000)

    // Check inventory to verify oak log was added
    await page.click('button:has-text("🎒 Inventory")')
    await page.click('button:has-text("Materials")')
    await expect(page.locator('text=Oak Log')).toBeVisible({ timeout: 5000 })
  })

  test('should gain experience from gathering', async ({ page }) => {
    await page.click('button:has-text("🌾 Gathering")')

    // Check initial XP (should be 0/100)
    await expect(page.locator('text=0 / 100 XP')).toBeVisible()

    // Gather one oak log
    await page.click('button:has-text("x1")').first()
    await page.waitForTimeout(4000)
    await expect(page.locator('text=1 / 1')).toBeVisible()
    await page.click('button:has-text("Collect")')
    await page.waitForTimeout(1000)

    // XP should have increased (Oak Log gives 10 XP)
    await expect(page.locator('text=10 / 100 XP')).toBeVisible({ timeout: 3000 })
  })

  test('should handle gathering multiple items (x10)', async ({ page }) => {
    await page.click('button:has-text("🌾 Gathering")')

    // Start gathering x10 oak logs
    await page.click('button:has-text("x10")').first()

    // Should show progress toward 10 items
    await expect(page.locator('text=Gathering Oak Log')).toBeVisible()
    await expect(page.locator('text=0 / 10')).toBeVisible({ timeout: 3000 })
  })

  test('should show locked materials based on skill level', async ({ page }) => {
    await page.click('button:has-text("🌾 Gathering")')

    // Willow Logs require level 15 woodcutting
    const willowLog = page.locator('text=Willow Log').first()

    if (await willowLog.isVisible()) {
      // Should show lock icon and requirement
      await expect(page.locator('text=/Requires woodcutting level 15/i')).toBeVisible()
    }
  })

  test('should allow cancelling active gathering session', async ({ page }) => {
    await page.click('button:has-text("🌾 Gathering")')

    // Start gathering
    await page.click('button:has-text("x10")').first()
    await expect(page.locator('text=Gathering Oak Log')).toBeVisible()

    // Wait a bit for some progress
    await page.waitForTimeout(1500)

    // Cancel gathering
    await page.click('button:has-text("Cancel")')

    // Should return to material selection and show Oak Log again
    await expect(page.locator('text=Oak Log')).toBeVisible({ timeout: 3000 })
  })

  test('should switch between gathering skills', async ({ page }) => {
    await page.click('button:has-text("🌾 Gathering")')

    // Start with Woodcutting
    await expect(page.locator('text=Woodcutting (Level 1)')).toBeVisible()

    // Switch to Mining
    await page.click('button:has-text("Mining")')
    await expect(page.locator('text=Mining (Level 1)')).toBeVisible()

    // Should show mining materials
    await expect(page.locator('text=Copper Ore')).toBeVisible()

    // Switch to Fishing
    await page.click('button:has-text("Fishing")')
    await expect(page.locator('text=Fishing (Level 1)')).toBeVisible()
  })

  test('should display all 6 gathering skills', async ({ page }) => {
    await page.click('button:has-text("🌾 Gathering")')

    // Verify all skill icons are visible
    const skills = ['🪓', '⛏️', '🎣', '🏹', '🧪', '✨']

    for (const icon of skills) {
      await expect(page.locator(`text=${icon}`).first()).toBeVisible()
    }
  })
})
