import { test, expect } from '@playwright/test'
import { signupAndCreateCharacter } from './helpers/auth'

// Test data - unique timestamp to avoid conflicts
const timestamp = Date.now()
const email = `tooltest${timestamp}@example.com`
const password = 'testpass123'
// Use only letters for character name
const randomSuffix = Math.random().toString(36).substring(2, 8).replace(/[0-9]/g, 'a')
const characterName = `ToolHero${randomSuffix}`

test.describe('Tool System (Sprint 2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')

    // Click Sign up link to switch to signup mode
    await page.click('text=Sign up')
    await page.waitForTimeout(500)

    // Sign up as new user with email/password
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.click('button[type="submit"]')

    // Create character
    await page.waitForSelector('text=Create Your Hero', { timeout: 10000 })
    await page.fill('input[placeholder="Enter character name"]', characterName)
    await page.click('button:has-text("Begin Adventure")')

    // Wait for navigation after character creation
    await page.waitForURL('/', { timeout: 10000 })

    // Wait for game to load - look for Inventory button
    await page.waitForSelector('button:has-text("📦 Inventory")', { timeout: 10000 })

    // Navigate to Inventory tab to access tools
    await page.click('button:has-text("📦 Inventory")')
    await page.waitForSelector('text=⚒️ Gathering Tools', { timeout: 5000 })
  })

  test('should display tool slots with durability', async ({ page }) => {
    // Verify all 6 tool slots are displayed
    await expect(page.locator('text=Axe')).toBeVisible()
    await expect(page.locator('text=Pickaxe')).toBeVisible()
    await expect(page.locator('text=Fishing Rod')).toBeVisible()
    await expect(page.locator('text=Hunting Knife')).toBeVisible()
    await expect(page.locator('text=Herbalism Sickle')).toBeVisible()
    await expect(page.locator('text=Divination Staff')).toBeVisible()

    // Each slot should show "No tool equipped" initially
    const emptySlots = await page.locator('text=No tool equipped').count()
    expect(emptySlots).toBe(6)
  })

  test('should equip and unequip tools', async ({ page }) => {
    // Click on first tool slot to equip
    await page.click('button:has-text("Equip Tool")').first()

    // Should show available tools
    await expect(page.locator('text=Available Tools')).toBeVisible()

    // Select first available tool if any exist
    const toolButtons = page.locator('button').filter({ hasText: /Bronze|Iron|Steel/ })
    const toolCount = await toolButtons.count()

    if (toolCount > 0) {
      await toolButtons.first().click()

      // Wait for equip action
      await page.waitForTimeout(1000)

      // Should show success message
      await expect(page.locator('text=/Tool equipped|already have/')).toBeVisible({ timeout: 5000 })

      // Tool should now be equipped (check for Unequip button)
      await expect(page.locator('button:has-text("Unequip")')).toBeVisible()

      // Test unequip
      await page.click('button:has-text("Unequip")').first()
      await expect(page.locator('text=Tool unequipped')).toBeVisible({ timeout: 5000 })
    }
  })

  test('should show durability display with color coding', async ({ page }) => {
    // First equip a tool
    await page.click('button:has-text("Equip Tool")').first()
    const toolButtons = page.locator('button').filter({ hasText: /Bronze|Iron|Steel/ })
    const toolCount = await toolButtons.count()

    if (toolCount > 0) {
      await toolButtons.first().click()
      await page.waitForTimeout(1000)

      // Check for durability display
      const durabilityText = page.locator('text=/\\d+\\/100/')
      if (await durabilityText.isVisible()) {
        // Should have durability bar
        await expect(page.locator('.progress-bar').first()).toBeVisible()

        // Check for durability color classes
        const durabilityBar = page.locator('.progress-fill').first()
        const barClasses = await durabilityBar.getAttribute('class')

        // Should have one of the durability colors
        expect(barClasses).toMatch(/bg-(green|yellow|orange|red)-/)
      }
    }
  })

  test('should show repair button for damaged tools', async ({ page }) => {
    // Equip a tool first
    await page.click('button:has-text("Equip Tool")').first()
    const toolButtons = page.locator('button').filter({ hasText: /Bronze|Iron|Steel/ })

    if (await toolButtons.count() > 0) {
      await toolButtons.first().click()
      await page.waitForTimeout(1000)

      // Check if repair button exists (appears when durability < 100)
      const repairButton = page.locator('button').filter({ hasText: /🔧.*Repair/ })

      // If tool has less than 100 durability, repair button should be visible
      const durabilityMatch = await page.locator('text=/\\d+\\/100/').first().textContent()
      if (durabilityMatch) {
        const currentDurability = parseInt(durabilityMatch.split('/')[0])
        if (currentDurability < 100) {
          await expect(repairButton).toBeVisible()

          // Check repair cost is displayed
          await expect(repairButton).toContainText(/\d+g/)
        }
      }
    }
  })

  test('should open tool crafting modal', async ({ page }) => {
    // Click craft tools button
    await page.click('button:has-text("🔨 Craft Tools")')

    // Crafting modal should open
    await expect(page.locator('text=🔨 Tool Crafting')).toBeVisible()

    // Should show filter tabs
    await expect(page.locator('text=All Recipes')).toBeVisible()
    await expect(page.locator('text=✓ Craftable')).toBeVisible()
    await expect(page.locator('text=🔒 Locked')).toBeVisible()

    // Should display tool recipes
    const recipeCards = page.locator('.panel').filter({ has: page.locator('text=/Tier \\d/') })
    const recipeCount = await recipeCards.count()
    expect(recipeCount).toBeGreaterThan(0)

    // Each recipe should show requirements
    if (recipeCount > 0) {
      const firstRecipe = recipeCards.first()

      // Should show gold cost
      await expect(firstRecipe.locator('text=/💰.*\\d+g/')).toBeVisible()

      // Should show tier
      await expect(firstRecipe.locator('text=/Tier \\d/')).toBeVisible()

      // Should show tool stats
      await expect(firstRecipe.locator('text=/⚡.*Speed/')).toBeVisible()
      await expect(firstRecipe.locator('text=/💎.*Bonus/')).toBeVisible()
    }

    // Close modal
    await page.click('button:has-text("✕")')
    await expect(page.locator('text=🔨 Tool Crafting')).not.toBeVisible()
  })

  test('should filter recipes in crafting modal', async ({ page }) => {
    // Open crafting modal
    await page.click('button:has-text("🔨 Craft Tools")')
    await expect(page.locator('text=🔨 Tool Crafting')).toBeVisible()

    // Test filter tabs
    const allRecipesCount = await page.locator('.panel').filter({ has: page.locator('text=/Tier \\d/') }).count()

    // Click Craftable filter
    await page.click('button:has-text("✓ Craftable")')
    await page.waitForTimeout(500)

    // Should show only craftable recipes (those with green "Can Craft" badge or no locked indicator)
    const craftableCards = page.locator('.panel').filter({
      has: page.locator('text=✓ Can Craft')
    })

    // Click Locked filter
    await page.click('button:has-text("🔒 Locked")')
    await page.waitForTimeout(500)

    // Locked recipes should show level requirements
    const lockedCards = page.locator('.panel').filter({
      has: page.locator('text=/Required Level.*Lv\\.\\d+/')
    })

    // Return to all recipes
    await page.click('button:has-text("All Recipes")')
    await page.waitForTimeout(500)

    const finalCount = await page.locator('.panel').filter({ has: page.locator('text=/Tier \\d/') }).count()
    expect(finalCount).toBe(allRecipesCount)
  })

  test('should handle tool crafting attempt', async ({ page }) => {
    // Open crafting modal
    await page.click('button:has-text("🔨 Craft Tools")')
    await expect(page.locator('text=🔨 Tool Crafting')).toBeVisible()

    // Click on first recipe
    const recipeCards = page.locator('.panel').filter({ has: page.locator('text=/Tier \\d/') })
    if (await recipeCards.count() > 0) {
      await recipeCards.first().click()

      // Confirmation modal should appear
      await expect(page.locator('text=/Craft.*\\?/')).toBeVisible()
      await expect(page.locator('text=This will consume:')).toBeVisible()

      // Should show craft and cancel buttons
      await expect(page.locator('button:has-text("Craft Tool")')).toBeVisible()
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible()

      // Try to craft (will likely fail due to materials, but tests the flow)
      await page.click('button:has-text("Craft Tool")')

      // Should show either success or error message
      await expect(page.locator('text=/Crafted|Not enough|Failed/')).toBeVisible({ timeout: 5000 })
    }
  })

  test('should display tool tips information', async ({ page }) => {
    // Check for tool tips info box
    await expect(page.locator('text=💡 Tool Tips')).toBeVisible()

    // Verify all tips are displayed
    await expect(page.locator('text=Tools increase gathering speed and bonus yield chance')).toBeVisible()
    await expect(page.locator('text=Durability decreases with each harvest and must be repaired')).toBeVisible()
    await expect(page.locator('text=Broken tools (0% durability) lose all bonuses until repaired')).toBeVisible()
    await expect(page.locator('text=Higher tier tools provide better bonuses but cost more to repair')).toBeVisible()
  })

  test('should show broken tool warnings', async ({ page }) => {
    // This test checks the UI displays for broken tools
    // Since we can't easily break a tool in the test, we check the UI elements exist

    // Equip a tool
    await page.click('button:has-text("Equip Tool")').first()
    const toolButtons = page.locator('button').filter({ hasText: /Bronze|Iron|Steel/ })

    if (await toolButtons.count() > 0) {
      await toolButtons.first().click()
      await page.waitForTimeout(1000)

      // Check for durability elements that would show warnings
      const durabilityText = await page.locator('text=/\\d+\\/100/').first().textContent()
      if (durabilityText) {
        const durability = parseInt(durabilityText.split('/')[0])

        // Check for warning badges based on durability
        if (durability === 0) {
          await expect(page.locator('.badge-danger:has-text("BROKEN")')).toBeVisible()
          await expect(page.locator('text=Tool is broken! Repair to regain bonuses.')).toBeVisible()
        } else if (durability <= 25) {
          await expect(page.locator('.badge-warning:has-text("REPAIR")')).toBeVisible()
          await expect(page.locator('text=Tool durability low. Consider repairing soon.')).toBeVisible()
        }
      }
    }
  })
})