import { test, expect } from '@playwright/test'

test.describe('Gathering System - Basic Flow', () => {
  const testUsername = `gatherer_${Date.now()}`

  test('complete gathering flow', async ({ page }) => {
    // Sign up
    await page.goto('/login')
    await page.click('text=Sign up')
    await page.fill('input[name="email"]', `${testUsername}@test.com`)
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.click('button:has-text("Sign Up")')

    // Create character
    await page.waitForSelector('h2:has-text("Create Your Character")', { timeout: 10000 })
    await page.fill('input[placeholder="Enter character name"]', 'TestHero')
    await page.click('button:has-text("Create Character")')

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
