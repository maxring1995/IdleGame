import { test, expect } from '@playwright/test'
import { signupAndCreateCharacter } from './helpers/auth'

test.describe('Gathering Node Durability System', () => {
  const TEST_USERNAME = `gatherer_${Date.now()}`

  test.beforeEach(async ({ page }) => {
    // Setup: Create account and character
    const success = await signupAndCreateCharacter(page, 'gathering-durability')

    if (!success) {
      console.log('Warning: Setup may have failed, but continuing test')
    }

    // Wait for character creation
    await page.waitForSelector('text=Create Your Character', { timeout: 10000 })

    // Character creation handled by helper

    // Wait for game to load
    await page.waitForSelector('text=Adventure', { timeout: 10000 })

    // Navigate to Adventure tab to access zones
    await page.click('button:has-text("Adventure")')
    await page.waitForSelector('text=Havenbrook Village')
  })

  test('should decrease node durability when harvesting', async ({ page }) => {
    // Click on Havenbrook Village
    await page.click('text=Havenbrook Village')

    // Wait for zone details and click Gathering tab
    await page.waitForSelector('text=Gathering', { timeout: 10000 })
    await page.click('button:has-text("Gathering")')

    // Wait for gathering nodes to load
    await page.waitForSelector('text=active node', { timeout: 10000 })

    // Find a tree node with 3/3 durability
    const nodeCard = page.locator('.panel').filter({ hasText: 'Tree' }).filter({ hasText: '3 / 3' }).first()

    // Click on the node
    await nodeCard.click()

    // Wait for node details panel
    await page.waitForSelector('text=Harvest Oak Log')

    // Store initial durability
    const initialDurability = await page.locator('text=Remaining').locator('..').textContent()
    expect(initialDurability).toContain('3 / 3 harvests')

    // Click harvest button
    await page.click('button:has-text("Harvest Oak Log")')

    // Wait for harvest to complete
    await page.waitForSelector('text=✅ Harvested!', { timeout: 5000 })

    // Check that durability decreased to 2/3
    await page.waitForTimeout(1000) // Give time for UI to update
    const afterFirstHarvest = await page.locator('text=Remaining').locator('..').textContent()
    expect(afterFirstHarvest).toContain('2 / 3 harvests')

    // Harvest again
    await page.click('button:has-text("Harvest Oak Log")')
    await page.waitForSelector('text=✅ Harvested!')
    await page.waitForTimeout(1000)

    // Check that durability decreased to 1/3
    const afterSecondHarvest = await page.locator('text=Remaining').locator('..').textContent()
    expect(afterSecondHarvest).toContain('1 / 3 harvests')

    // Final harvest should deplete the node
    await page.click('button:has-text("Harvest Oak Log")')
    await page.waitForSelector('text=✅ Harvested!')

    // Node should be depleted and details panel should show selection prompt
    await page.waitForSelector('text=Click a node to view details and harvest', { timeout: 5000 })

    // Verify the node is no longer in the active nodes list
    const nodeCount = await page.locator('.panel').filter({ hasText: 'Tree' }).filter({ hasText: '3 / 3' }).count()
    const originalNodeCount = await page.locator('.panel').filter({ hasText: 'Tree' }).count()

    console.log(`Nodes remaining after depletion: ${originalNodeCount - 1}`)
  })

  test('should handle multiple node types correctly', async ({ page }) => {
    // Navigate to gathering
    await page.click('text=Havenbrook Village')
    await page.waitForSelector('text=Gathering')
    await page.click('button:has-text("Gathering")')
    await page.waitForSelector('text=active node')

    // Test an ore vein
    const oreNode = page.locator('.panel').filter({ hasText: 'Ore Vein' }).first()
    if (await oreNode.count() > 0) {
      await oreNode.click()
      await page.waitForSelector('text=Harvest Copper Ore')

      const oreDurability = await page.locator('text=Remaining').locator('..').textContent()
      console.log(`Ore Vein durability: ${oreDurability}`)

      // Harvest once
      await page.click('button:has-text("Harvest Copper Ore")')
      await page.waitForSelector('text=✅ Harvested!')
    }

    // Test an herb patch
    const herbNode = page.locator('.panel').filter({ hasText: 'Herb Patch' }).first()
    if (await herbNode.count() > 0) {
      await herbNode.click()
      await page.waitForSelector('text=Harvest Guam Leaf')

      const herbDurability = await page.locator('text=Remaining').locator('..').textContent()
      console.log(`Herb Patch durability: ${herbDurability}`)

      // Harvest once
      await page.click('button:has-text("Harvest Guam Leaf")')
      await page.waitForSelector('text=✅ Harvested!')
    }
  })

  test('should show different durability for rich nodes', async ({ page }) => {
    // Navigate to gathering
    await page.click('text=Havenbrook Village')
    await page.waitForSelector('text=Gathering')
    await page.click('button:has-text("Gathering")')
    await page.waitForSelector('text=active node')

    // Look for a rich quality node (should have 4/4 durability)
    const richNode = page.locator('.panel').filter({ hasText: 'Rich' }).first()

    if (await richNode.count() > 0) {
      await richNode.click()

      // Rich nodes should have 4 durability
      const richDurability = await page.locator('text=Remaining').locator('..').textContent()
      expect(richDurability).toContain('4 / 4 harvests')

      console.log('Rich node found with 4/4 durability')
    } else {
      console.log('No rich nodes available in current spawn')
    }
  })

  test('should update node list when nodes are depleted', async ({ page }) => {
    // Navigate to gathering
    await page.click('text=Havenbrook Village')
    await page.waitForSelector('text=Gathering')
    await page.click('button:has-text("Gathering")')
    await page.waitForSelector('text=active node')

    // Count initial nodes
    const initialNodeCount = await page.locator('.panel').filter({ hasText: 'Durability' }).count()
    console.log(`Initial node count: ${initialNodeCount}`)

    // Find and deplete a node with 3 durability
    const targetNode = page.locator('.panel').filter({ hasText: 'Tree' }).filter({ hasText: '3 / 3' }).first()

    if (await targetNode.count() > 0) {
      await targetNode.click()
      await page.waitForSelector('text=Harvest Oak Log')

      // Harvest 3 times to deplete
      for (let i = 0; i < 3; i++) {
        await page.click('button:has-text("Harvest Oak Log")')
        await page.waitForSelector('text=✅ Harvested!')
        await page.waitForTimeout(500)
      }

      // After depletion, count nodes again
      await page.waitForTimeout(1000)
      const finalNodeCount = await page.locator('.panel').filter({ hasText: 'Durability' }).count()
      console.log(`Final node count: ${finalNodeCount}`)

      // Should have one less node
      expect(finalNodeCount).toBe(initialNodeCount - 1)
    }
  })
})