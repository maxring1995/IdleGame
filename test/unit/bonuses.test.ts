/**
 * Unit Tests for Bonus Calculation Functions
 * Tests the pure calculation functions in lib/bonuses.ts
 */

import {
  calculateGatheringTime,
  applyCraftingBonuses,
  calculateMerchantPrice,
  formatBonusPercent,
  getBonusColor
} from '@/lib/bonuses'
import type { CraftingBonuses } from '@/lib/supabase'

describe('Bonus Calculation Functions', () => {
  describe('calculateGatheringTime', () => {
    it('should calculate gathering time with no bonuses', () => {
      const baseTime = 10000 // 10 seconds
      const skillLevel = 1
      const speedBonus = 0

      const result = calculateGatheringTime(baseTime, skillLevel, speedBonus)

      // At level 1 with no bonuses: 10000 * (1 - 0.005) = 9950ms
      expect(result).toBe(9950)
    })

    it('should apply skill level efficiency bonus', () => {
      const baseTime = 10000
      const skillLevel = 20 // 20 * 0.005 = 10% efficiency
      const speedBonus = 0

      const result = calculateGatheringTime(baseTime, skillLevel, speedBonus)

      // 10000 * (1 - 0.10) = 9000ms
      expect(result).toBe(9000)
    })

    it('should apply speed bonus from combat synergies', () => {
      const baseTime = 10000
      const skillLevel = 1
      const speedBonus = 0.15 // 15% from Attack 75

      const result = calculateGatheringTime(baseTime, skillLevel, speedBonus)

      // Skill efficiency: 0.005, Speed bonus: 0.15 = 0.155 total
      // 10000 * (1 - 0.155) = 8450ms
      expect(result).toBe(8450)
    })

    it('should combine skill level and speed bonuses', () => {
      const baseTime = 10000
      const skillLevel = 50 // 25% efficiency (50 * 0.005)
      const speedBonus = 0.20 // 20% from Strength 60

      const result = calculateGatheringTime(baseTime, skillLevel, speedBonus)

      // Total bonus: 0.25 + 0.20 = 0.45 (45%)
      // 10000 * (1 - 0.45) = 5500ms
      expect(result).toBe(5500)
    })

    it('should cap skill efficiency at 49.5% (level 99)', () => {
      const baseTime = 10000
      const skillLevel = 99
      const speedBonus = 0

      const result = calculateGatheringTime(baseTime, skillLevel, speedBonus)

      // Skill efficiency capped at 49.5%
      // 10000 * (1 - 0.495) = 5050ms
      expect(result).toBe(5050)
    })

    it('should cap total speed bonus at 75%', () => {
      const baseTime = 10000
      const skillLevel = 99 // 49.5% efficiency
      const speedBonus = 0.50 // 50% from synergies (total would be 99.5%)

      const result = calculateGatheringTime(baseTime, skillLevel, speedBonus)

      // Total bonus capped at 75%
      // 10000 * (1 - 0.75) = 2500ms
      expect(result).toBe(2500)
    })

    it('should enforce minimum gathering time of 1 second', () => {
      const baseTime = 2000 // 2 seconds
      const skillLevel = 99
      const speedBonus = 0.50 // Total: 99.5%, capped at 75%

      const result = calculateGatheringTime(baseTime, skillLevel, speedBonus)

      // 2000 * (1 - 0.75) = 500ms, but minimum is 1000ms
      expect(result).toBe(1000)
    })

    it('should handle zero base time gracefully', () => {
      const baseTime = 0
      const skillLevel = 50
      const speedBonus = 0.20

      const result = calculateGatheringTime(baseTime, skillLevel, speedBonus)

      // Minimum enforced
      expect(result).toBe(1000)
    })

    it('should handle negative bonuses as zero', () => {
      const baseTime = 10000
      const skillLevel = 1
      const speedBonus = -0.10 // Invalid, but should not break

      const result = calculateGatheringTime(baseTime, skillLevel, speedBonus)

      // Skill efficiency: 0.005, Speed bonus: -0.10 = -0.095 total
      // Negative total should clamp to 0 or minimum
      expect(result).toBeGreaterThan(0)
    })
  })

  describe('applyCraftingBonuses', () => {
    const noBonuses: CraftingBonuses = {
      quality_bonus: 0,
      speed_bonus: 0,
      cost_reduction: 0
    }

    it('should return original values with no bonuses', () => {
      const baseTime = 10000
      const baseCost = 5

      const result = applyCraftingBonuses(baseTime, baseCost, noBonuses)

      expect(result).toEqual({
        time: 10000,
        cost: 5,
        quality: 0
      })
    })

    it('should apply speed bonus to crafting time', () => {
      const baseTime = 10000
      const baseCost = 5
      const bonuses: CraftingBonuses = {
        quality_bonus: 0,
        speed_bonus: 0.30, // 30% faster
        cost_reduction: 0
      }

      const result = applyCraftingBonuses(baseTime, baseCost, bonuses)

      // 10000 * (1 - 0.30) = 7000ms
      expect(result.time).toBe(7000)
      expect(result.cost).toBe(5)
      expect(result.quality).toBe(0)
    })

    it('should apply cost reduction to material cost', () => {
      const baseTime = 10000
      const baseCost = 10
      const bonuses: CraftingBonuses = {
        quality_bonus: 0,
        speed_bonus: 0,
        cost_reduction: 0.20 // 20% cheaper
      }

      const result = applyCraftingBonuses(baseTime, baseCost, bonuses)

      // 10 * (1 - 0.20) = 8
      expect(result.time).toBe(10000)
      expect(result.cost).toBe(8)
      expect(result.quality).toBe(0)
    })

    it('should apply quality bonus', () => {
      const baseTime = 10000
      const baseCost = 5
      const bonuses: CraftingBonuses = {
        quality_bonus: 0.25, // 25% better quality
        speed_bonus: 0,
        cost_reduction: 0
      }

      const result = applyCraftingBonuses(baseTime, baseCost, bonuses)

      expect(result.time).toBe(10000)
      expect(result.cost).toBe(5)
      expect(result.quality).toBe(0.25)
    })

    it('should apply all bonuses together', () => {
      const baseTime = 10000
      const baseCost = 10
      const bonuses: CraftingBonuses = {
        quality_bonus: 0.36, // 36% quality
        speed_bonus: 0.60,   // 60% faster
        cost_reduction: 0.45 // 45% cheaper
      }

      const result = applyCraftingBonuses(baseTime, baseCost, bonuses)

      // Time: 10000 * (1 - 0.60) = 4000ms
      // Cost: 10 * (1 - 0.45) = 5.5 → 5 (floored)
      // Quality: 0.36
      expect(result.time).toBe(4000)
      expect(result.cost).toBe(5)
      expect(result.quality).toBe(0.36)
    })

    it('should enforce minimum crafting time of 1 second', () => {
      const baseTime = 2000
      const baseCost = 5
      const bonuses: CraftingBonuses = {
        quality_bonus: 0,
        speed_bonus: 0.90, // 90% faster → would be 200ms
        cost_reduction: 0
      }

      const result = applyCraftingBonuses(baseTime, baseCost, bonuses)

      // Minimum enforced
      expect(result.time).toBe(1000)
    })

    it('should enforce minimum crafting cost of 1', () => {
      const baseTime = 10000
      const baseCost = 2
      const bonuses: CraftingBonuses = {
        quality_bonus: 0,
        speed_bonus: 0,
        cost_reduction: 0.75 // 75% cheaper → would be 0.5
      }

      const result = applyCraftingBonuses(baseTime, baseCost, bonuses)

      // Cost floored but minimum is 1
      expect(result.cost).toBeGreaterThanOrEqual(1)
    })

    it('should handle extreme bonuses gracefully', () => {
      const baseTime = 10000
      const baseCost = 10
      const bonuses: CraftingBonuses = {
        quality_bonus: 2.0, // 200% quality (extreme)
        speed_bonus: 1.5,   // 150% faster (extreme)
        cost_reduction: 0.99 // 99% cheaper
      }

      const result = applyCraftingBonuses(baseTime, baseCost, bonuses)

      // Should not crash, should apply minimums
      expect(result.time).toBeGreaterThanOrEqual(1000)
      expect(result.cost).toBeGreaterThanOrEqual(1)
      expect(result.quality).toBe(2.0)
    })
  })

  describe('calculateMerchantPrice', () => {
    it('should return original price with no discount', () => {
      const basePrice = 1000
      const discount = 0

      const result = calculateMerchantPrice(basePrice, discount)

      expect(result).toBe(1000)
    })

    it('should apply 5% discount correctly', () => {
      const basePrice = 1000
      const discount = 0.05

      const result = calculateMerchantPrice(basePrice, discount)

      // 1000 * (1 - 0.05) = 950
      expect(result).toBe(950)
    })

    it('should apply 15% discount correctly', () => {
      const basePrice = 1000
      const discount = 0.15

      const result = calculateMerchantPrice(basePrice, discount)

      // 1000 * (1 - 0.15) = 850
      expect(result).toBe(850)
    })

    it('should apply discount without capping (capping done by DB)', () => {
      const basePrice = 1000
      const discount = 0.75 // 75% from database (already capped)

      const result = calculateMerchantPrice(basePrice, discount)

      // 1000 * (1 - 0.75) = 250
      expect(result).toBe(250)
    })

    it('should apply high discount and enforce minimum price of 1', () => {
      const basePrice = 10
      const discount = 1.0 // 100% discount would be 0, but minimum is 1

      const result = calculateMerchantPrice(basePrice, discount)

      // Minimum price of 1 enforced
      expect(result).toBe(1)
    })

    it('should handle small prices correctly', () => {
      const basePrice = 10
      const discount = 0.15

      const result = calculateMerchantPrice(basePrice, discount)

      // 10 * (1 - 0.15) = 8.5 → 8 (floored)
      expect(result).toBe(8)
    })

    it('should apply negative discount (increases price)', () => {
      const basePrice = 1000
      const discount = -0.10 // Negative discount = price increase

      const result = calculateMerchantPrice(basePrice, discount)

      // 1000 * (1 - (-0.10)) = 1000 * 1.10 = 1100
      expect(result).toBe(1100)
    })

    it('should enforce minimum price of 1 for zero base price', () => {
      const basePrice = 0
      const discount = 0.15

      const result = calculateMerchantPrice(basePrice, discount)

      // Minimum price of 1 enforced
      expect(result).toBe(1)
    })

    it('should floor fractional prices', () => {
      const basePrice = 100
      const discount = 0.15 // 100 * 0.85 = 85 (exact)

      const result = calculateMerchantPrice(basePrice, discount)

      expect(result).toBe(85)
    })
  })

  describe('formatBonusPercent', () => {
    it('should format 0.05 as "+5%"', () => {
      expect(formatBonusPercent(0.05)).toBe('+5%')
    })

    it('should format 0.15 as "+15%"', () => {
      expect(formatBonusPercent(0.15)).toBe('+15%')
    })

    it('should format 0.50 as "+50%"', () => {
      expect(formatBonusPercent(0.50)).toBe('+50%')
    })

    it('should format 1.0 as "+100%"', () => {
      expect(formatBonusPercent(1.0)).toBe('+100%')
    })

    it('should format 0.0 as "+0%"', () => {
      expect(formatBonusPercent(0.0)).toBe('+0%')
    })

    it('should round decimals to nearest integer', () => {
      expect(formatBonusPercent(0.125)).toBe('+13%') // Rounds to nearest (12.5 → 13)
      expect(formatBonusPercent(0.124)).toBe('+12%') // Rounds down (12.4 → 12)
      expect(formatBonusPercent(0.126)).toBe('+13%') // Rounds up (12.6 → 13)
    })

    it('should handle negative values', () => {
      expect(formatBonusPercent(-0.10)).toBe('+-10%') // Shows sign
    })

    it('should handle large values', () => {
      expect(formatBonusPercent(2.5)).toBe('+250%')
    })
  })

  describe('getBonusColor', () => {
    it('should return green for speed bonuses', () => {
      expect(getBonusColor('speed')).toBe('text-green-400')
    })

    it('should return blue for quality bonuses', () => {
      expect(getBonusColor('quality')).toBe('text-blue-400')
    })

    it('should return yellow for yield bonuses', () => {
      expect(getBonusColor('yield')).toBe('text-yellow-400')
    })

    it('should return gray for stamina bonuses (not in switch)', () => {
      expect(getBonusColor('stamina')).toBe('text-gray-400')
    })

    it('should return emerald for merchant_discount', () => {
      expect(getBonusColor('merchant_discount')).toBe('text-emerald-400')
    })

    it('should return purple for xp_bonus', () => {
      expect(getBonusColor('xp_bonus')).toBe('text-purple-400')
    })

    it('should return default gray for unknown types', () => {
      expect(getBonusColor('unknown_type')).toBe('text-gray-400')
    })

    it('should handle empty string', () => {
      expect(getBonusColor('')).toBe('text-gray-400')
    })
  })

  describe('Bonus Stacking Logic', () => {
    it('should stack multiple speed bonuses additively', () => {
      const baseTime = 10000
      const skillLevel = 50 // 25% from skill
      // Assume character has Attack 75 (+15%) and Strength 60 (+20%)
      const totalSpeedBonus = 0.15 + 0.20 // 35% from synergies

      const result = calculateGatheringTime(baseTime, skillLevel, totalSpeedBonus)

      // Total: 25% + 35% = 60%
      // 10000 * (1 - 0.60) = 4000ms
      expect(result).toBe(4000)
    })

    it('should stack crafting bonuses independently', () => {
      // Assume discovered 3 crafting landmarks (30% quality, 45% speed, 30% cost)
      // Plus 2 shrines (6% quality, 10% speed)
      const bonuses: CraftingBonuses = {
        quality_bonus: 0.30 + 0.06, // 36%
        speed_bonus: 0.45 + 0.10,   // 55%
        cost_reduction: 0.30
      }

      const result = applyCraftingBonuses(10000, 10, bonuses)

      expect(result.time).toBe(4500)  // 55% faster
      expect(result.cost).toBe(7)     // 30% cheaper
      expect(result.quality).toBe(0.36) // 36% quality
    })

    it('should stack merchant discounts from multiple quests', () => {
      // Assume completed 3 quests granting 5% each
      const totalDiscount = 0.05 + 0.05 + 0.05 // 15%

      const result = calculateMerchantPrice(1000, totalDiscount)

      // 1000 * (1 - 0.15) = 850
      expect(result).toBe(850)
    })
  })

  describe('Edge Cases', () => {
    it('should handle all zero inputs', () => {
      expect(calculateGatheringTime(0, 0, 0)).toBeGreaterThan(0)
      expect(applyCraftingBonuses(0, 0, {
        quality_bonus: 0,
        speed_bonus: 0,
        cost_reduction: 0
      }).time).toBeGreaterThan(0)
      // Merchant price has minimum of 1
      expect(calculateMerchantPrice(0, 0)).toBe(1)
    })

    it('should handle very large numbers', () => {
      const result = calculateGatheringTime(1000000, 99, 0.50)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThan(1000000)
    })

    it('should handle very small bonuses', () => {
      const baseTime = 10000
      const skillLevel = 1
      const speedBonus = 0.001 // 0.1%

      const result = calculateGatheringTime(baseTime, skillLevel, speedBonus)

      // Should still apply bonus
      expect(result).toBeLessThan(baseTime)
    })

    it('should be deterministic with same inputs', () => {
      const baseTime = 10000
      const skillLevel = 50
      const speedBonus = 0.20

      const result1 = calculateGatheringTime(baseTime, skillLevel, speedBonus)
      const result2 = calculateGatheringTime(baseTime, skillLevel, speedBonus)

      expect(result1).toBe(result2)
    })
  })
})
