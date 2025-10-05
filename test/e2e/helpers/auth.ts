import { Page } from '@playwright/test'

export async function signupAndCreateCharacter(page: Page, testId: string) {
  // Generate unique credentials
  const email = `test${testId}${Date.now()}@example.com`
  const password = 'TestPassword123'
  const characterName = `Hero${testId}`

  // Navigate to the app
  await page.goto('http://localhost:3000')
  await page.waitForLoadState('networkidle')

  // Click sign up link
  const signupLink = page.getByText("Don't have an account? Sign up")
  if (await signupLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signupLink.click()
  }

  // Fill signup form
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign Up' }).click()

  // Wait for redirect and character creation
  await page.waitForURL('**/', { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(2000)

  // Check if we reached character creation or got an error
  const hasCharacterCreation = await page.locator('text=Create Your Hero').isVisible().catch(() => false)
  const hasError = await page.locator('.bg-red-900\\/50').isVisible().catch(() => false)

  if (hasError) {
    const errorText = await page.locator('.bg-red-900\\/50').textContent()
    console.log('⚠️ Signup error:', errorText)
    // If database error, might be duplicate - return false
    return false
  }

  if (hasCharacterCreation) {
    // Create character
    await page.locator('#characterName').fill(characterName)
    await page.getByRole('button', { name: 'Begin Adventure' }).click()

    // Wait for game to load
    await page.waitForTimeout(3000)

    // Check if we reached the game
    const hasGame = await page.locator('text=Adventure').isVisible().catch(() => false) ||
                    await page.locator('text=Combat').isVisible().catch(() => false) ||
                    await page.locator('text=Inventory').isVisible().catch(() => false)

    return hasGame
  }

  // Already have a character, should be in game
  return true
}

export async function loginExistingUser(page: Page, email: string, password: string) {
  await page.goto('http://localhost:3000')
  await page.waitForLoadState('networkidle')

  // Should be on login page by default
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Log In' }).click()

  // Wait for redirect
  await page.waitForTimeout(3000)

  // Check if logged in (character creation or game)
  const success = await page.locator('text=Create Your Hero').isVisible().catch(() => false) ||
                  await page.locator('text=Adventure').isVisible().catch(() => false)

  return success
}