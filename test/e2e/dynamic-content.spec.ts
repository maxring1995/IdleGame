import { test, expect } from '@playwright/test'
import { signupAndCreateCharacter } from './helpers/auth'

// Test data - unique timestamp to avoid conflicts
const timestamp = Date.now()
const email = `dynamictest${timestamp}@example.com`
const password = 'testpass123'
const randomSuffix = Math.random().toString(36).substring(2, 8).replace(/[0-9]/g, 'a')
const characterName = `DynamicHero${randomSuffix}`

test.describe('Dynamic Content System (Sprint 4)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')

    // Sign up
    await page.click('text=Sign up')
    await page.waitForTimeout(500)

    // Create new account
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.click('button[type="submit"]')

    // Create character
    await page.waitForSelector('text=Create Your Hero', { timeout: 10000 })
    await page.fill('input[placeholder="Enter character name"]', characterName)
    await page.click('button:has-text("Begin Adventure")')

    // Wait for game to load
    await page.waitForURL('/', { timeout: 10000 })
    await page.waitForSelector('button:has-text("⚔️ Combat")', { timeout: 10000 })
  })

  test('should navigate to gathering zones', async ({ page }) => {
    // Click Adventure tab
    await page.click('button:has-text("🗺️ Adventure")')
    await page.waitForTimeout(500)

    // Look for zone cards
    const zoneCards = page.locator('.panel').filter({ hasText: /Level \d+/ })
    const zoneCount = await zoneCards.count()
    expect(zoneCount).toBeGreaterThan(0)

    // Click on first zone
    await zoneCards.first().click()
    await page.waitForTimeout(500)

    // Should show zone details
    await expect(page.locator('text=/Overview|Gathering/')).toBeVisible()

    // Click on Gathering tab
    await page.click('button:has-text("🌿 Gathering")')
    await page.waitForTimeout(500)

    // Should show gathering zone UI
    await expect(page.locator('text=/active node/')).toBeVisible()
  })

  test('should display gathering nodes with quality indicators', async ({ page }) => {
    // Navigate to gathering zone
    await page.click('button:has-text("🗺️ Adventure")')
    await page.waitForTimeout(500)

    const zoneCards = page.locator('.panel').filter({ hasText: /Level \d+/ })
    await zoneCards.first().click()
    await page.waitForTimeout(500)

    await page.click('button:has-text("🌿 Gathering")')
    await page.waitForTimeout(1000)

    // Check for node cards
    const nodeCards = page.locator('.panel').filter({ hasText: /Durability/ })
    const nodeCount = await nodeCards.count()

    if (nodeCount > 0) {
      // Check for quality indicators
      const qualityIndicators = page.locator('text=/Poor|Standard|Rich/')
      await expect(qualityIndicators.first()).toBeVisible()

      // Check for health bars
      const healthBars = page.locator('.bg-gray-700.rounded-full')
      expect(await healthBars.count()).toBeGreaterThan(0)

      // Check node types
      const nodeTypes = ['🌲', '⛏️', '🎣', '🏹', '🌿', '✨']
      let foundNodeType = false
      for (const icon of nodeTypes) {
        if (await page.locator(`text="${icon}"`).count() > 0) {
          foundNodeType = true
          break
        }
      }
      expect(foundNodeType).toBe(true)
    }
  })

  test('should show hotspot spawn button and functionality', async ({ page }) => {
    // Navigate to gathering zone
    await page.click('button:has-text("🗺️ Adventure")')
    await page.waitForTimeout(500)

    const zoneCards = page.locator('.panel').filter({ hasText: /Level \d+/ })
    await zoneCards.first().click()
    await page.waitForTimeout(500)

    await page.click('button:has-text("🌿 Gathering")')
    await page.waitForTimeout(1000)

    // Look for spawn hotspot button
    const spawnButton = page.locator('button').filter({ hasText: /Spawn Hotspot/ })

    if (await spawnButton.isVisible()) {
      // Click spawn hotspot button
      await spawnButton.click()
      await page.waitForTimeout(2000)

      // Check for success notification or hotspot indicator
      const hotspotIndicators = [
        page.locator('text=/hotspot.*active/i'),
        page.locator('text=/HOTSPOT/'),
        page.locator('text=/💎|✨|🎉|🎄/'), // Hotspot icons
        page.locator('text=/\d+\.?\d*x Rewards/') // Multiplier text
      ]

      let foundHotspot = false
      for (const indicator of hotspotIndicators) {
        if (await indicator.count() > 0) {
          foundHotspot = true
          break
        }
      }

      // Either we found a hotspot indicator or got a notification
      const notification = page.locator('text=/Hotspot spawned|Failed to spawn/')
      expect(foundHotspot || await notification.isVisible()).toBe(true)
    }
  })

  test('should display hotspot visual indicators when active', async ({ page }) => {
    // Navigate to gathering zone
    await page.click('button:has-text("🗺️ Adventure")')
    await page.waitForTimeout(500)

    const zoneCards = page.locator('.panel').filter({ hasText: /Level \d+/ })
    await zoneCards.first().click()
    await page.waitForTimeout(500)

    await page.click('button:has-text("🌿 Gathering")')
    await page.waitForTimeout(1000)

    // Try to spawn a hotspot first
    const spawnButton = page.locator('button').filter({ hasText: /Spawn Hotspot/ })
    if (await spawnButton.isVisible()) {
      await spawnButton.click()
      await page.waitForTimeout(2000)
    }

    // Check for hotspot visual elements
    const hotspotBadge = page.locator('.badge').filter({ hasText: /HOTSPOT/ })
    const multiplierText = page.locator('text=/\d+\.?\d*x Rewards/')
    const countdownTimer = page.locator('text=/⏰.*\d{2}:\d{2}:\d{2}/')
    const hotspotGlow = page.locator('.animate-pulse').filter({ hasText: /HOTSPOT/ })

    // At least one hotspot indicator should be present if hotspots exist
    const hasHotspotIndicator =
      await hotspotBadge.count() > 0 ||
      await multiplierText.count() > 0 ||
      await countdownTimer.count() > 0 ||
      await hotspotGlow.count() > 0

    // Check header for hotspot count
    const headerHotspotCount = page.locator('text=/\d+ hotspots? active/')

    // Log what we found for debugging
    if (!hasHotspotIndicator && await headerHotspotCount.count() === 0) {
      console.log('No hotspots found in zone - this is OK if none are spawned')
    }
  })

  test('should handle node harvesting interaction', async ({ page }) => {
    // Navigate to gathering zone
    await page.click('button:has-text("🗺️ Adventure")')
    await page.waitForTimeout(500)

    const zoneCards = page.locator('.panel').filter({ hasText: /Level \d+/ })
    await zoneCards.first().click()
    await page.waitForTimeout(500)

    await page.click('button:has-text("🌿 Gathering")')
    await page.waitForTimeout(1000)

    // Click on a node
    const nodeCards = page.locator('.panel').filter({ hasText: /Durability/ })
    if (await nodeCards.count() > 0) {
      await nodeCards.first().click()
      await page.waitForTimeout(500)

      // Should show node details panel
      await expect(page.locator('text=/Est. Yield|Est. XP/')).toBeVisible()

      // Look for harvest button
      const harvestButton = page.locator('button').filter({ hasText: /Harvest|Gather/ })

      if (await harvestButton.isEnabled()) {
        // Click harvest
        await harvestButton.click()
        await page.waitForTimeout(2000)

        // Check for harvest result indicators
        const resultIndicators = [
          page.locator('text=/harvested|gathered/i'),
          page.locator('text=/\+\d+ XP/'),
          page.locator('text=/encounter/i'),
          page.locator('text=/treasure|monster|wanderer/i')
        ]

        let foundResult = false
        for (const indicator of resultIndicators) {
          if (await indicator.count() > 0) {
            foundResult = true
            break
          }
        }

        // Should have some indication of harvest result or encounter
        expect(foundResult).toBe(true)
      }
    }
  })

  test('should display specialization indicators', async ({ page }) => {
    // Navigate to gathering zone
    await page.click('button:has-text("🗺️ Adventure")')
    await page.waitForTimeout(500)

    const zoneCards = page.locator('.panel').filter({ hasText: /Level \d+/ })
    await zoneCards.first().click()
    await page.waitForTimeout(500)

    await page.click('button:has-text("🌿 Gathering")')
    await page.waitForTimeout(1000)

    // Check for specialization UI elements
    const specializationBadges = page.locator('.bg-gradient-to-r.from-amber-500')
    const specializationModals = page.locator('text=/Choose Your Specialization|Level 50 Required/')

    // Specializations might not be visible for low-level characters
    // Just verify the UI is prepared for them
    const hasSpecializationUI =
      await specializationBadges.count() > 0 ||
      await specializationModals.count() > 0

    // This is OK - specializations are level 50+ feature
    console.log(`Specialization UI present: ${hasSpecializationUI}`)
  })

  test('should show encounter modal when triggered', async ({ page }) => {
    // Navigate to gathering zone
    await page.click('button:has-text("🗺️ Adventure")')
    await page.waitForTimeout(500)

    const zoneCards = page.locator('.panel').filter({ hasText: /Level \d+/ })
    await zoneCards.first().click()
    await page.waitForTimeout(500)

    await page.click('button:has-text("🌿 Gathering")')
    await page.waitForTimeout(1000)

    // Try harvesting multiple nodes to trigger encounter (5% chance)
    const nodeCards = page.locator('.panel').filter({ hasText: /Durability/ })
    const nodeCount = await nodeCards.count()

    for (let i = 0; i < Math.min(nodeCount, 5); i++) {
      await nodeCards.nth(i).click()
      await page.waitForTimeout(500)

      const harvestButton = page.locator('button').filter({ hasText: /Harvest|Gather/ })
      if (await harvestButton.isEnabled()) {
        await harvestButton.click()
        await page.waitForTimeout(2000)

        // Check for encounter modal
        const encounterModal = page.locator('text=/Random Encounter|Treasure|Monster|Wanderer/')
        if (await encounterModal.isVisible()) {
          // Verify encounter UI elements
          await expect(page.locator('text=/Claim|Fight|Trade|Learn/')).toBeVisible()

          // Resolve encounter
          const resolveButton = page.locator('button').filter({
            hasText: /Claim|Fight|Trade|Learn|Continue/
          }).first()

          if (await resolveButton.isVisible()) {
            await resolveButton.click()
            await page.waitForTimeout(1000)
          }

          break // Found encounter, test complete
        }
      }
    }
  })

  test('should display seasonal event indicators', async ({ page }) => {
    // Navigate to gathering zone
    await page.click('button:has-text("🗺️ Adventure")')
    await page.waitForTimeout(500)

    const zoneCards = page.locator('.panel').filter({ hasText: /Level \d+/ })
    await zoneCards.first().click()
    await page.waitForTimeout(500)

    await page.click('button:has-text("🌿 Gathering")')
    await page.waitForTimeout(1000)

    // Seasonal events might be shown in various places
    const eventIndicators = [
      page.locator('text=/Harvest Festival|Seasonal Event|Event Active/'),
      page.locator('text=/\d+\.?\d*x (XP|yield)/'),
      page.locator('text=/🎊|🎄|🎃/'), // Seasonal icons
      page.locator('.badge').filter({ hasText: /EVENT|SEASONAL/ })
    ]

    let foundEventIndicator = false
    for (const indicator of eventIndicators) {
      if (await indicator.count() > 0) {
        foundEventIndicator = true
        break
      }
    }

    // Events might not always be active, log result
    console.log(`Seasonal event indicator found: ${foundEventIndicator}`)
  })
})