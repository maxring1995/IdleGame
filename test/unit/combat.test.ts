import { calculateDamage, rollLoot, rollGold } from '../../lib/combat'

describe('Combat Functions', () => {
  describe('calculateDamage', () => {
    it('should calculate damage with defense reduction', () => {
      const damage = calculateDamage(20, 10)
      // Base: 20 - (10/2) = 15
      // With variance 85-115%, should be between 12.75 and 17.25
      expect(damage).toBeGreaterThanOrEqual(12)
      expect(damage).toBeLessThanOrEqual(18)
    })

    it('should deal minimum 1 damage even with high defense', () => {
      const damage = calculateDamage(1, 100)
      expect(damage).toBeGreaterThanOrEqual(1)
    })

    it('should handle zero defense', () => {
      const damage = calculateDamage(10, 0)
      // Base: 10, with variance should be 8.5-11.5
      expect(damage).toBeGreaterThanOrEqual(8)
      expect(damage).toBeLessThanOrEqual(12)
    })

    it('should return integer values', () => {
      const damage = calculateDamage(15, 6)
      expect(Number.isInteger(damage)).toBe(true)
    })
  })

  describe('rollGold', () => {
    it('should return gold within min-max range', () => {
      const gold = rollGold(50, 100)
      expect(gold).toBeGreaterThanOrEqual(50)
      expect(gold).toBeLessThanOrEqual(100)
    })

    it('should handle equal min and max values', () => {
      const gold = rollGold(75, 75)
      expect(gold).toBe(75)
    })

    it('should return integer values', () => {
      const gold = rollGold(10, 50)
      expect(Number.isInteger(gold)).toBe(true)
    })

    it('should work with large values', () => {
      const gold = rollGold(1000, 5000)
      expect(gold).toBeGreaterThanOrEqual(1000)
      expect(gold).toBeLessThanOrEqual(5000)
    })
  })

  describe('rollLoot', () => {
    it('should return empty array for empty loot table', () => {
      const loot = rollLoot({})
      expect(loot).toEqual([])
    })

    it('should always drop items with 100% chance', () => {
      const lootTable = {
        'health_potion': 1.0,
        'mana_potion': 1.0
      }
      const loot = rollLoot(lootTable)
      expect(loot).toContain('health_potion')
      expect(loot).toContain('mana_potion')
      expect(loot.length).toBe(2)
    })

    it('should never drop items with 0% chance', () => {
      const lootTable = {
        'legendary_sword': 0.0
      }
      const loot = rollLoot(lootTable)
      expect(loot).not.toContain('legendary_sword')
      expect(loot.length).toBe(0)
    })

    it('should handle mixed probabilities', () => {
      const lootTable = {
        'common_item': 1.0,
        'rare_item': 0.0,
        'maybe_item': 0.5
      }
      const loot = rollLoot(lootTable)
      expect(loot).toContain('common_item')
      expect(loot).not.toContain('rare_item')
      // maybe_item may or may not be included (50% chance)
    })

    it('should return array of item IDs', () => {
      const lootTable = {
        'item1': 1.0,
        'item2': 1.0
      }
      const loot = rollLoot(lootTable)
      expect(Array.isArray(loot)).toBe(true)
      expect(loot.every(item => typeof item === 'string')).toBe(true)
    })

    it('should handle probability edge cases', () => {
      // Test with very low probability (should almost never drop)
      const lowProbTable = { 'ultra_rare': 0.001 }
      let dropped = 0
      for (let i = 0; i < 100; i++) {
        const loot = rollLoot(lowProbTable)
        if (loot.includes('ultra_rare')) dropped++
      }
      // With 0.1% chance, should drop ~0 times in 100 rolls
      expect(dropped).toBeLessThan(5)
    })

    it('should be deterministic with probabilities', () => {
      // Test multiple items with different probabilities
      const iterations = 1000
      const lootTable = {
        'common': 0.5,
        'uncommon': 0.2,
        'rare': 0.05
      }

      let commonCount = 0
      let uncommonCount = 0
      let rareCount = 0

      for (let i = 0; i < iterations; i++) {
        const loot = rollLoot(lootTable)
        if (loot.includes('common')) commonCount++
        if (loot.includes('uncommon')) uncommonCount++
        if (loot.includes('rare')) rareCount++
      }

      // Check if drop rates are roughly correct (within reasonable margin)
      expect(commonCount).toBeGreaterThan(iterations * 0.4) // Should be ~50%
      expect(commonCount).toBeLessThan(iterations * 0.6)

      expect(uncommonCount).toBeGreaterThan(iterations * 0.1) // Should be ~20%
      expect(uncommonCount).toBeLessThan(iterations * 0.3)

      expect(rareCount).toBeGreaterThan(iterations * 0.01) // Should be ~5%
      expect(rareCount).toBeLessThan(iterations * 0.1)
    })
  })
})
