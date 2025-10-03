import { test, expect } from '@playwright/test'

test('adventure completion modal stays open until user closes it', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:3003')

  // Sign in (using existing test pattern)
  const username = `testuser_${Date.now()}`
  await page.fill('input[placeholder="Enter username"]', username)
  await page.click('button:has-text("Sign Up")')

  // Wait for character creation
  await page.waitForSelector('text=Create Your Character', { timeout: 10000 })

  // Create character
  await page.fill('input[placeholder="Enter character name"]', 'TestHero')
  await page.click('button:has-text("Create Character")')

  // Wait for game to load
  await page.waitForSelector('text=Adventure', { timeout: 10000 })

  // Click Adventure tab
  await page.click('button:has-text("Adventure")')

  // Wait for map to load
  await page.waitForSelector('text=World Map', { timeout: 5000 })

  // Click on Havenbrook zone
  await page.click('button:has-text("Havenbrook")')

  // Wait for zone details
  await page.waitForSelector('text=Explore Zone', { timeout: 5000 })

  // Start exploration
  await page.click('button:has-text("Explore Zone")')

  // Wait for exploration panel to appear
  await page.waitForSelector('text=Exploring Havenbrook', { timeout: 5000 })

  // Wait 10 seconds for some progress
  console.log('Waiting 10 seconds for exploration progress...')
  await page.waitForTimeout(10000)

  // Click "Stop Exploring"
  await page.click('button:has-text("Stop Exploring")')

  // Wait for modal to appear
  await page.waitForSelector('text=Adventure Complete!', { timeout: 5000 })
  console.log('Modal appeared successfully')

  // Wait 20+ seconds and verify modal is still visible
  console.log('Waiting 25 seconds to verify modal persistence...')
  await page.waitForTimeout(25000)

  // Check that modal is still visible
  const modalVisible = await page.isVisible('text=Adventure Complete!')
  expect(modalVisible).toBeTruthy()
  console.log('Modal is still visible after 25 seconds ✓')

  // Additional check: verify modal has "Continue" or close button
  const continueButton = await page.isVisible('button:has-text("Continue")')
  expect(continueButton).toBeTruthy()
  console.log('Continue button is visible ✓')

  // Click Continue to close modal
  await page.click('button:has-text("Continue")')

  // Verify modal closes
  await page.waitForSelector('text=Adventure Complete!', { state: 'hidden', timeout: 2000 })
  console.log('Modal closed successfully after clicking Continue ✓')

  // Verify we're back to the map view
  await page.waitForSelector('text=World Map', { timeout: 5000 })
  console.log('Returned to map view ✓')
})
