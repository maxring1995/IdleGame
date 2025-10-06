/**
 * Zone Modifiers Unit Tests
 * Tests for zone modifier helper functions and formatting
 */

import {
  formatModifier,
  describeCombatModifiers,
  describeGatheringModifiers,
  describeCraftingModifiers,
  describeMerchantModifiers,
  hasActiveModifiers,
  type CombatModifiers,
  type GatheringModifiers,
  type CraftingModifiers,
  type MerchantModifiers,
  type ZoneModifiers
} from '@/lib/zone-modifiers'

describe('Zone Modifiers - Helper Functions', () => {
  describe('formatModifier', () => {
    it('should format positive modifiers with plus sign', () => {
      expect(formatModifier(0.15)).toBe('+15%')
      expect(formatModifier(0.25, true)).toBe('+25%')
    })

    it('should format negative modifiers with minus sign', () => {
      expect(formatModifier(-0.1)).toBe('-10%')
      expect(formatModifier(-0.05)).toBe('-5%')
    })

    it('should format zero modifier', () => {
      expect(formatModifier(0)).toBe('0%')
    })

    it('should respect showPlus parameter', () => {
      expect(formatModifier(0.1, false)).toBe('10%')
      expect(formatModifier(0.1, true)).toBe('+10%')
    })
  })

  describe('describeCombatModifiers', () => {
    it('should describe all combat bonuses', () => {
      const mods: CombatModifiers = {
        damage_bonus: 0.15,
        defense_bonus: 0.1,
        hp_regen_bonus: 0.05,
        mp_regen_bonus: 0.2,
        enemy_types: ['orc', 'troll']
      }

      const descriptions = describeCombatModifiers(mods)
      expect(descriptions).toContain('+15% Attack')
      expect(descriptions).toContain('+10% Defense')
      expect(descriptions).toContain('+5% HP Regen')
      expect(descriptions).toContain('+20% MP Regen')
    })

    it('should handle negative bonuses', () => {
      const mods: CombatModifiers = {
        damage_bonus: 0,
        defense_bonus: -0.05,
        hp_regen_bonus: -0.1,
        mp_regen_bonus: 0,
        enemy_types: []
      }

      const descriptions = describeCombatModifiers(mods)
      expect(descriptions).toContain('-5% Defense')
      expect(descriptions).toContain('-10% HP Regen')
      expect(descriptions.length).toBe(2)
    })

    it('should skip zero bonuses', () => {
      const mods: CombatModifiers = {
        damage_bonus: 0,
        defense_bonus: 0,
        hp_regen_bonus: 0,
        mp_regen_bonus: 0,
        enemy_types: []
      }

      const descriptions = describeCombatModifiers(mods)
      expect(descriptions.length).toBe(0)
    })
  })

  describe('describeGatheringModifiers', () => {
    it('should describe gathering speed bonuses', () => {
      const mods: GatheringModifiers = {
        spawn_rate_modifiers: {
          woodcutting: 1.5,
          mining: 2.0,
          fishing: 0.5
        },
        xp_bonus: 0.1
      }

      const descriptions = describeGatheringModifiers(mods)
      expect(descriptions.some(d => d.includes('Woodcutting'))).toBe(true)
      expect(descriptions.some(d => d.includes('Mining'))).toBe(true)
      expect(descriptions.some(d => d.includes('Fishing'))).toBe(true)
      expect(descriptions).toContain('+10% Gathering XP')
    })

    it('should handle penalties (spawn rate < 1.0)', () => {
      const mods: GatheringModifiers = {
        spawn_rate_modifiers: {
          mining: 0.3
        },
        xp_bonus: 0
      }

      const descriptions = describeGatheringModifiers(mods)
      expect(descriptions.some(d => d.includes('-70%'))).toBe(true)
    })

    it('should skip 1.0 spawn rates (no change)', () => {
      const mods: GatheringModifiers = {
        spawn_rate_modifiers: {
          woodcutting: 1.0,
          mining: 1.5
        },
        xp_bonus: 0
      }

      const descriptions = describeGatheringModifiers(mods)
      expect(descriptions.some(d => d.includes('Woodcutting'))).toBe(false)
      expect(descriptions.some(d => d.includes('Mining'))).toBe(true)
    })
  })

  describe('describeCraftingModifiers', () => {
    it('should describe success rate bonuses', () => {
      const mods: CraftingModifiers = {
        success_rate_bonus: {
          smithing: 0.3,
          all: 0.05
        },
        cost_reduction: {},
        quality_bonus: 0.1
      }

      const descriptions = describeCraftingModifiers(mods)
      expect(descriptions.some(d => d.includes('Smithing Success'))).toBe(true)
      expect(descriptions.some(d => d.includes('All Crafting Success'))).toBe(true)
      expect(descriptions).toContain('+10% Quality Chance')
    })

    it('should describe cost reductions', () => {
      const mods: CraftingModifiers = {
        success_rate_bonus: {},
        cost_reduction: {
          alchemy: 0.15,
          all: 0.1
        },
        quality_bonus: 0
      }

      const descriptions = describeCraftingModifiers(mods)
      expect(descriptions.some(d => d.includes('Alchemy Cost'))).toBe(true)
      expect(descriptions.some(d => d.includes('All Crafting Cost'))).toBe(true)
    })
  })

  describe('describeMerchantModifiers', () => {
    it('should describe price discounts', () => {
      const mods: MerchantModifiers = {
        price_modifier: 0.95,
        unique_items: []
      }

      const descriptions = describeMerchantModifiers(mods)
      expect(descriptions).toContain('5% Cheaper Prices')
    })

    it('should describe price increases', () => {
      const mods: MerchantModifiers = {
        price_modifier: 1.2,
        unique_items: []
      }

      const descriptions = describeMerchantModifiers(mods)
      expect(descriptions).toContain('20% Higher Prices')
    })

    it('should describe unique items', () => {
      const mods: MerchantModifiers = {
        price_modifier: 1.0,
        unique_items: ['item1', 'item2', 'item3']
      }

      const descriptions = describeMerchantModifiers(mods)
      expect(descriptions).toContain('3 Unique Items')
    })
  })

  describe('hasActiveModifiers', () => {
    it('should return true for zones with combat modifiers', () => {
      const mods: ZoneModifiers = {
        combat: {
          damage_bonus: 0.15,
          defense_bonus: 0,
          hp_regen_bonus: 0,
          mp_regen_bonus: 0,
          enemy_types: []
        }
      }

      expect(hasActiveModifiers(mods)).toBe(true)
    })

    it('should return true for zones with gathering modifiers', () => {
      const mods: ZoneModifiers = {
        gathering: {
          spawn_rate_modifiers: {
            woodcutting: 1.5
          },
          xp_bonus: 0
        }
      }

      expect(hasActiveModifiers(mods)).toBe(true)
    })

    it('should return true for zones with crafting modifiers', () => {
      const mods: ZoneModifiers = {
        crafting: {
          success_rate_bonus: {
            all: 0.05
          },
          cost_reduction: {},
          quality_bonus: 0
        }
      }

      expect(hasActiveModifiers(mods)).toBe(true)
    })

    it('should return true for zones with merchant modifiers', () => {
      const mods: ZoneModifiers = {
        merchants: {
          price_modifier: 0.95,
          unique_items: []
        }
      }

      expect(hasActiveModifiers(mods)).toBe(true)
    })

    it('should return false for zones with no active modifiers', () => {
      const mods: ZoneModifiers = {
        combat: {
          damage_bonus: 0,
          defense_bonus: 0,
          hp_regen_bonus: 0,
          mp_regen_bonus: 0,
          enemy_types: []
        },
        gathering: {
          spawn_rate_modifiers: {
            woodcutting: 1.0,
            mining: 1.0
          },
          xp_bonus: 0
        }
      }

      expect(hasActiveModifiers(mods)).toBe(false)
    })

    it('should return false for empty modifiers', () => {
      const mods: ZoneModifiers = {}
      expect(hasActiveModifiers(mods)).toBe(false)
    })
  })
})

describe('Zone Modifiers - Integration Examples', () => {
  it('should correctly describe Ironpeak Foothills modifiers', () => {
    const ironpeak: ZoneModifiers = {
      combat: {
        damage_bonus: 0.15,
        defense_bonus: 0.1,
        hp_regen_bonus: 0,
        mp_regen_bonus: -0.1,
        enemy_types: ['orc', 'troll', 'stone_elemental']
      },
      gathering: {
        spawn_rate_modifiers: {
          mining: 2.0,
          woodcutting: 0.3
        },
        xp_bonus: 0.15
      }
    }

    const combatDesc = describeCombatModifiers(ironpeak.combat!)
    const gatheringDesc = describeGatheringModifiers(ironpeak.gathering!)

    expect(combatDesc).toContain('+15% Attack')
    expect(combatDesc).toContain('+10% Defense')
    expect(combatDesc).toContain('-10% MP Regen')
    expect(gatheringDesc.some(d => d.includes('Mining'))).toBe(true)
    expect(gatheringDesc).toContain('+15% Gathering XP')
  })

  it('should correctly describe Whispering Woods modifiers', () => {
    const whisperingWoods: ZoneModifiers = {
      combat: {
        damage_bonus: 0,
        defense_bonus: 0,
        hp_regen_bonus: 0.1,
        mp_regen_bonus: 0.2,
        enemy_types: ['forest_creature', 'nature_spirit']
      },
      gathering: {
        spawn_rate_modifiers: {
          woodcutting: 1.5,
          alchemy: 1.8
        },
        xp_bonus: 0.1
      },
      crafting: {
        success_rate_bonus: {
          alchemy: 0.25,
          all: 0.05
        },
        cost_reduction: {
          alchemy: 0.15
        },
        quality_bonus: 0.1
      },
      merchants: {
        price_modifier: 0.95,
        unique_items: ['forest_cloak', 'nature_staff']
      }
    }

    expect(hasActiveModifiers(whisperingWoods)).toBe(true)

    const combatDesc = describeCombatModifiers(whisperingWoods.combat!)
    expect(combatDesc).toContain('+10% HP Regen')
    expect(combatDesc).toContain('+20% MP Regen')

    const craftingDesc = describeCraftingModifiers(whisperingWoods.crafting!)
    expect(craftingDesc.some(d => d.includes('Alchemy'))).toBe(true)

    const merchantDesc = describeMerchantModifiers(whisperingWoods.merchants!)
    expect(merchantDesc).toContain('5% Cheaper Prices')
    expect(merchantDesc).toContain('2 Unique Items')
  })
})
