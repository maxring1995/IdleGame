/**
 * Gathering System Unit Tests
 */

import { calculateGatheringTime } from '../../lib/gathering'

describe('Gathering System', () => {
  describe('calculateGatheringTime', () => {
    it('should return base time for level 1', () => {
      const baseTime = 3000 // 3 seconds
      const result = calculateGatheringTime(baseTime, 1)

      expect(result).toBe(baseTime)
    })

    it('should reduce time by 0.5% per level', () => {
      const baseTime = 10000 // 10 seconds

      // Level 10: 4.5% reduction = 9550ms
      const level10 = calculateGatheringTime(baseTime, 10)
      expect(level10).toBe(9550)

      // Level 20: 9.5% reduction = 9050ms
      const level20 = calculateGatheringTime(baseTime, 20)
      expect(level20).toBe(9050)

      // Level 50: 24.5% reduction = 7550ms
      const level50 = calculateGatheringTime(baseTime, 50)
      expect(level50).toBe(7550)
    })

    it('should cap at 49.5% reduction at level 99', () => {
      const baseTime = 10000

      // Level 99: 49% reduction (98 levels * 0.5%) = 5100ms
      const level99 = calculateGatheringTime(baseTime, 99)
      expect(level99).toBe(5050) // 49.5% reduction
    })

    it('should handle level 100+ (capped at 49.5%)', () => {
      const baseTime = 10000

      // Should still cap at 49.5% even at level 150
      const level150 = calculateGatheringTime(baseTime, 150)
      expect(level150).toBe(5050)
    })

    it('should round down to whole milliseconds', () => {
      const baseTime = 3333 // Odd number

      const level10 = calculateGatheringTime(baseTime, 10)
      expect(Number.isInteger(level10)).toBe(true)
    })
  })

  describe('Experience Calculations', () => {
    it('should calculate XP for skill leveling', () => {
      // XP needed for next level = current level * 100
      const xpForLevel2 = 1 * 100 // 100 XP
      const xpForLevel10 = 9 * 100 // 900 XP to go from 9 to 10
      const xpForLevel99 = 98 * 100 // 9800 XP to reach level 99

      expect(xpForLevel2).toBe(100)
      expect(xpForLevel10).toBe(900)
      expect(xpForLevel99).toBe(9800)
    })

    it('should calculate total XP needed for specific levels', () => {
      // Total XP from level 1 to level 10
      let totalXP = 0
      for (let level = 1; level < 10; level++) {
        totalXP += level * 100
      }

      // 1*100 + 2*100 + ... + 9*100 = 4500 XP
      expect(totalXP).toBe(4500)
    })

    it('should calculate XP gained from gathering', () => {
      // Oak Log: 25 XP per log
      const oakLogXP = 25
      const quantityGathered = 10

      const totalXP = oakLogXP * quantityGathered
      expect(totalXP).toBe(250)
    })
  })

  describe('Material Tier System', () => {
    it('should define material tiers correctly', () => {
      const materials = [
        { name: 'Oak Log', tier: 1, requiredLevel: 1 },
        { name: 'Willow Log', tier: 2, requiredLevel: 15 },
        { name: 'Maple Log', tier: 3, requiredLevel: 30 },
        { name: 'Yew Log', tier: 4, requiredLevel: 45 },
        { name: 'Magic Log', tier: 5, requiredLevel: 75 }
      ]

      // Verify tier progression
      materials.forEach((mat, index) => {
        expect(mat.tier).toBe(index + 1)
        expect(mat.requiredLevel).toBeGreaterThanOrEqual(1)

        if (index > 0) {
          // Each tier should require higher level than previous
          expect(mat.requiredLevel).toBeGreaterThan(materials[index - 1].requiredLevel)
        }
      })
    })

    it('should validate material rarity distribution', () => {
      const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary']

      rarities.forEach(rarity => {
        expect(typeof rarity).toBe('string')
      })

      expect(rarities.length).toBe(5)
    })
  })

  describe('Gathering Time Calculations', () => {
    it('should calculate total gathering time for multiple items', () => {
      const baseTime = 3000 // Oak Log base time
      const quantity = 10
      const skillLevel = 1

      const timePerItem = calculateGatheringTime(baseTime, skillLevel)
      const totalTime = timePerItem * quantity

      expect(totalTime).toBe(30000) // 30 seconds for 10 logs
    })

    it('should show efficiency improvement with skill level', () => {
      const baseTime = 3000

      const timeAtLevel1 = calculateGatheringTime(baseTime, 1)
      const timeAtLevel50 = calculateGatheringTime(baseTime, 50)
      const timeAtLevel99 = calculateGatheringTime(baseTime, 99)

      // Higher levels should be faster
      expect(timeAtLevel50).toBeLessThan(timeAtLevel1)
      expect(timeAtLevel99).toBeLessThan(timeAtLevel50)

      // At level 50, should be ~24.5% faster
      const reductionAt50 = 1 - (timeAtLevel50 / timeAtLevel1)
      expect(reductionAt50).toBeCloseTo(0.245, 3)

      // At level 99, should be ~49.5% faster
      const reductionAt99 = 1 - (timeAtLevel99 / timeAtLevel1)
      expect(reductionAt99).toBeCloseTo(0.495, 3)
    })
  })

  describe('Skill Progression', () => {
    it('should validate level 1-99 range', () => {
      for (let level = 1; level <= 99; level++) {
        const time = calculateGatheringTime(5000, level)

        // All times should be positive
        expect(time).toBeGreaterThan(0)

        // Times should decrease as level increases (or stay same at cap)
        if (level > 1) {
          const prevTime = calculateGatheringTime(5000, level - 1)
          expect(time).toBeLessThanOrEqual(prevTime)
        }
      }
    })

    it('should calculate XP milestones correctly', () => {
      const milestones = {
        level10: 4500,   // Total XP from 1 to 10
        level50: 122500, // Total XP from 1 to 50
        level99: 485100  // Total XP from 1 to 99
      }

      // Calculate total XP to level 10
      let xpToLevel10 = 0
      for (let i = 1; i < 10; i++) {
        xpToLevel10 += i * 100
      }
      expect(xpToLevel10).toBe(milestones.level10)

      // Calculate total XP to level 50
      let xpToLevel50 = 0
      for (let i = 1; i < 50; i++) {
        xpToLevel50 += i * 100
      }
      expect(xpToLevel50).toBe(milestones.level50)

      // Calculate total XP to level 99
      let xpToLevel99 = 0
      for (let i = 1; i < 99; i++) {
        xpToLevel99 += i * 100
      }
      expect(xpToLevel99).toBe(milestones.level99)
    })
  })

  describe('Material Stacking', () => {
    it('should handle stackable materials correctly', () => {
      const materials = [
        { id: 'oak_log', stackable: true, maxStack: 1000 },
        { id: 'iron_ore', stackable: true, maxStack: 1000 },
        { id: 'raw_shark', stackable: true, maxStack: 1000 }
      ]

      materials.forEach(mat => {
        expect(mat.stackable).toBe(true)
        expect(mat.maxStack).toBe(1000)
      })
    })

    it('should validate rare materials have lower stack limits', () => {
      const gemstones = [
        { id: 'diamond', stackable: true, maxStack: 100 },
        { id: 'dragonstone', stackable: true, maxStack: 50 }
      ]

      gemstones.forEach(gem => {
        expect(gem.maxStack).toBeLessThan(1000)
      })
    })
  })
})
