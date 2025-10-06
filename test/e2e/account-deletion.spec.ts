import { test, expect } from '@playwright/test'

test.describe('Account Deletion and Recreation', () => {
  const testEmail = `deletetest_${Date.now()}@test.com`
  const testPassword = 'TestPass123'

  test('should allow account deletion and recreation with same email', async ({ page }) => {
    // Step 1: Navigate to login and switch to sign up
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Toggle to sign up mode
    await page.click('button:has-text("Don\'t have an account? Sign up")')
    await expect(page.locator('text=Create your account')).toBeVisible()

    // Step 2: Create initial account
    await page.fill('#email', testEmail)
    await page.fill('#password', testPassword)
    await page.click('button:has-text("Sign Up")')

    // Wait for character creation screen
    await expect(page.locator('text=Create Your Hero')).toBeVisible({ timeout: 10000 })

    // Step 3: Create character (letters and spaces only)
    const charName = 'Test Character'
    await page.fill('#characterName', charName)
    await page.click('button:has-text("Begin Adventure")')

    // Wait for game to load (check for character name and combat stats panel)
    await expect(page.locator('text=COMBAT STATS')).toBeVisible({ timeout: 10000 })

    // Step 4: Open settings modal
    await page.click('button[title="Settings"]')
    await expect(page.getByRole('heading', { name: /Settings/ })).toBeVisible()

    // Step 5: Delete account
    await page.click('button:has-text("Delete Account")')

    // Confirm deletion
    await expect(page.locator('text=FINAL WARNING')).toBeVisible()
    await page.click('button:has-text("Yes, Delete Everything")')

    // Wait for redirect to login
    await page.waitForURL('/login', { timeout: 10000 })

    // Step 6: Verify we're at login page
    await expect(page.locator('#email')).toBeVisible()

    // Step 7: Try to recreate the same account
    await page.click('button:has-text("Don\'t have an account? Sign up")')
    await page.fill('#email', testEmail)
    await page.fill('#password', testPassword)
    await page.click('button:has-text("Sign Up")')

    // Step 8: Verify account creation succeeds (should NOT get "user already registered" error)
    await expect(page.locator('text=Create Your Hero')).toBeVisible({ timeout: 10000 })

    // Success! We made it to character creation without errors
    console.log('✅ Account successfully deleted and recreated with same email')
  })

  test('should delete character and allow recreation', async ({ page }) => {
    const charTestEmail = `chardelete_${Date.now()}@test.com`
    const charTestPassword = 'TestPass123'
    const firstCharName = 'First Hero'
    const secondCharName = 'Second Hero'

    // Step 1: Create account
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await page.click('button:has-text("Don\'t have an account? Sign up")')
    await page.fill('#email', charTestEmail)
    await page.fill('#password', charTestPassword)
    await page.click('button:has-text("Sign Up")')

    // Step 2: Create first character
    await expect(page.locator('text=Create Your Hero')).toBeVisible({ timeout: 10000 })
    await page.fill('#characterName', firstCharName)
    await page.click('button:has-text("Begin Adventure")')
    await expect(page.locator('text=COMBAT STATS')).toBeVisible({ timeout: 10000 })

    // Step 3: Open settings and delete character
    await page.click('button[title="Settings"]')
    await expect(page.getByRole('heading', { name: /Settings/ })).toBeVisible()
    await page.click('button:has-text("Delete Character")')

    // Step 4: Confirm character deletion
    await expect(page.locator('text=Are you sure? This cannot be undone!')).toBeVisible()
    await page.click('button:has-text("Yes, Delete Character")')

    // Step 5: Should return to character creation screen
    await expect(page.locator('text=Create Your Hero')).toBeVisible({ timeout: 10000 })

    // Step 6: Create new character with different name
    await page.waitForTimeout(1000) // Wait for page to fully reset
    await page.fill('#characterName', secondCharName)
    await page.click('button:has-text("Begin Adventure")')
    await page.waitForTimeout(2000) // Wait for navigation

    // Step 7: Verify new character loaded
    await expect(page.locator('text=COMBAT STATS')).toBeVisible({ timeout: 10000 })
    console.log('✅ Character successfully deleted and recreated')
  })
})
