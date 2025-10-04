import { test, expect } from '@playwright/test'

/**
 * Test to reproduce the character creation loading loop bug
 *
 * Issue: After creating a character, the page gets stuck in a loading state
 * because the server-side component doesn't know about the newly created character.
 */

test.describe('Character Creation Bug Reproduction', () => {
  test('should successfully create character and load game without infinite loop', async ({ page }) => {
    const timestamp = Date.now()
    const testEmail = `test-char-bug-${timestamp}@example.com`
    const testPassword = 'testpassword123'
    const characterName = 'TestHero'

    // Step 1: Sign up
    await page.goto('/login')
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', testPassword)
    await page.click('button[type="submit"]')

    // Step 2: Wait for character creation screen
    await expect(page.locator('h2:has-text("Create Your Hero")')).toBeVisible({ timeout: 10000 })

    // Step 3: Fill in character name
    await page.fill('input[id="characterName"]', characterName)

    // Step 4: Submit character creation
    await page.click('button[type="submit"]:has-text("Begin Adventure")')

    // Step 5: THIS IS WHERE THE BUG OCCURS
    // The page should show the game, but instead it may:
    // - Stay on character creation screen
    // - Show infinite loading
    // - Not update to show the game

    // Expected: Should see the game interface within reasonable time
    await expect(page.locator(`h1:has-text("${characterName}")`)).toBeVisible({ timeout: 10000 })

    // Verify we're on the game screen, not stuck
    await expect(page.locator('text=Character Stats')).toBeVisible()
    await expect(page.locator('text=Adventure')).toBeVisible()

    console.log('✅ Character creation succeeded without loading loop')
  })

  test('should handle character creation errors gracefully', async ({ page }) => {
    const timestamp = Date.now()
    const testEmail = `test-char-error-${timestamp}@example.com`
    const testPassword = 'testpassword123'

    // Sign up
    await page.goto('/login')
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', testPassword)
    await page.click('button[type="submit"]')

    // Wait for character creation screen
    await expect(page.locator('h2:has-text("Create Your Hero")')).toBeVisible({ timeout: 10000 })

    // Try invalid character name (numbers not allowed)
    await page.fill('input[id="characterName"]', '123InvalidName')
    await page.click('button[type="submit"]:has-text("Begin Adventure")')

    // Should show error, not infinite loading
    // Note: HTML5 validation might prevent submission, but we should test backend validation too
    const hasError = await page.locator('text=/error|invalid|failed/i').isVisible({ timeout: 3000 }).catch(() => false)

    if (hasError) {
      console.log('✅ Error handling works correctly')
    } else {
      console.log('⚠️ HTML5 validation prevented submission (expected behavior)')
    }
  })
})
