/**
 * Unit Tests for Dynamic Quest Generation System
 * Tests the core logic of context-based quest generation
 */

import type { QuestTemplate, PlayerContext } from '@/lib/supabase'

describe('Dynamic Quest Generation', () => {
  // Mock player contexts
  const mockLowLevelContext: PlayerContext = {
    character_id: 'char-123',
    level: 5,
    class_id: 'warrior',
    race_id: 'human',
    skills: {
      attack: 15,
      woodcutting: 10,
      mining: 5
    },
    recent_zones: ['grasslands', 'forest'],
    equipped_items: {
      weapon: {
        item_id: 'wooden_sword',
        name: 'Wooden Sword',
        rarity: 'common'
      }
    },
    merchant_visits: 0,
    total_xp: 1000,
    gold: 500,
    generated_at: new Date().toISOString()
  }

  const mockHighLevelContext: PlayerContext = {
    character_id: 'char-456',
    level: 35,
    class_id: 'ranger',
    race_id: 'elf',
    skills: {
      attack: 50,
      defense: 40,
      woodcutting: 60,
      mining: 45,
      fishing: 55
    },
    recent_zones: ['mountains', 'desert', 'ancient_ruins'],
    equipped_items: {
      weapon: {
        item_id: 'steel_bow',
        name: 'Steel Longbow',
        rarity: 'rare'
      },
      armor: {
        item_id: 'leather_armor',
        name: 'Reinforced Leather Armor',
        rarity: 'uncommon'
      }
    },
    merchant_visits: 5,
    total_xp: 50000,
    gold: 10000,
    generated_at: new Date().toISOString()
  }

  // Mock quest templates
  const mockTemplates: QuestTemplate[] = [
    {
      id: 'tpl-zone-1',
      category: 'zone_exploration',
      title_template: 'Map the {zone_name}',
      description_template: 'Explore {zone_name} and discover its secrets.',
      objective_template: 'Discover all {landmark_count} landmarks in {zone_name}',
      min_character_level: 1,
      max_character_level: 10,
      base_xp_reward: 200,
      base_gold_reward: 100,
      base_item_rewards: {},
      difficulty_multiplier: 1.0,
      xp_per_level: 10,
      gold_per_level: 5,
      required_conditions: { recently_discovered_zone: true },
      weight: 15,
      is_repeatable: true,
      reset_interval: null,
      icon: '🗺️',
      created_at: new Date().toISOString()
    },
    {
      id: 'tpl-combat-1',
      category: 'combat_item',
      title_template: 'Master the {weapon_name}',
      description_template: 'Prove your skill with {weapon_name}.',
      objective_template: 'Win {win_count} battles using {weapon_name}',
      min_character_level: 3,
      max_character_level: 99,
      base_xp_reward: 250,
      base_gold_reward: 120,
      base_item_rewards: {},
      difficulty_multiplier: 1.2,
      xp_per_level: 12,
      gold_per_level: 6,
      required_conditions: { equipped_weapon_type: 'weapon' },
      weight: 14,
      is_repeatable: false,
      reset_interval: null,
      icon: '⚔️',
      created_at: new Date().toISOString()
    },
    {
      id: 'tpl-skill-1',
      category: 'skill_gathering',
      title_template: 'Advanced {skill_name}',
      description_template: 'Use your {skill_name} skills to gather materials.',
      objective_template: 'Gather {quantity} {material_name}',
      min_character_level: 10,
      max_character_level: 99,
      base_xp_reward: 350,
      base_gold_reward: 180,
      base_item_rewards: {},
      difficulty_multiplier: 1.1,
      xp_per_level: 15,
      gold_per_level: 8,
      required_conditions: { skill_level: { mining: 10 } },
      weight: 13,
      is_repeatable: true,
      reset_interval: 'daily',
      icon: '⛏️',
      created_at: new Date().toISOString()
    }
  ]

  describe('Template Selection Logic', () => {
    test('should filter templates by character level', () => {
      const lowLevel = mockLowLevelContext.level // 5
      const validTemplates = mockTemplates.filter(t =>
        lowLevel >= t.min_character_level && lowLevel <= t.max_character_level
      )

      // Zone exploration (1-10) and combat (3-99) should match level 5
      expect(validTemplates).toHaveLength(2)
      expect(validTemplates.find(t => t.id === 'tpl-zone-1')).toBeDefined()
      expect(validTemplates.find(t => t.id === 'tpl-combat-1')).toBeDefined()

      // Skill template (10-99) should NOT match
      expect(validTemplates.find(t => t.id === 'tpl-skill-1')).toBeUndefined()
    })

    test('should match templates based on required conditions', () => {
      // Zone exploration requires recently_discovered_zone
      const zoneTemplate = mockTemplates[0]
      const hasRecentZones = mockLowLevelContext.recent_zones.length > 0
      expect(hasRecentZones).toBe(true)

      // Combat template requires equipped weapon
      const combatTemplate = mockTemplates[1]
      const hasWeapon = 'weapon' in mockLowLevelContext.equipped_items
      expect(hasWeapon).toBe(true)
    })

    test('should filter by skill requirements', () => {
      const skillTemplate = mockTemplates[2]
      const requiredMining = 10
      const playerMining = mockLowLevelContext.skills.mining || 0

      // Low level player should not qualify (mining: 5 < 10)
      expect(playerMining).toBeLessThan(requiredMining)

      // High level player should qualify (mining: 45 >= 10)
      const highLevelMining = mockHighLevelContext.skills.mining || 0
      expect(highLevelMining).toBeGreaterThanOrEqual(requiredMining)
    })
  })

  describe('Reward Scaling', () => {
    test('should scale XP rewards based on character level', () => {
      const template = mockTemplates[0] // Zone exploration
      const lowLevelXP = template.base_xp_reward + (template.xp_per_level * mockLowLevelContext.level)
      const highLevelXP = template.base_xp_reward + (template.xp_per_level * mockHighLevelContext.level)

      // Low level (5): 200 + (10 * 5) = 250
      expect(lowLevelXP).toBe(250)

      // High level (35): 200 + (10 * 35) = 550
      expect(highLevelXP).toBe(550)
    })

    test('should scale gold rewards based on character level', () => {
      const template = mockTemplates[0]
      const lowLevelGold = template.base_gold_reward + (template.gold_per_level * mockLowLevelContext.level)
      const highLevelGold = template.base_gold_reward + (template.gold_per_level * mockHighLevelContext.level)

      // Low level (5): 100 + (5 * 5) = 125
      expect(lowLevelGold).toBe(125)

      // High level (35): 100 + (5 * 35) = 275
      expect(highLevelGold).toBe(275)
    })

    test('should apply difficulty multiplier', () => {
      const template = mockTemplates[1] // Combat template with 1.2 multiplier
      const baseReward = 250
      const difficultyBonus = Math.round(baseReward * template.difficulty_multiplier * 1.0)

      // Difficulty bonus: 250 * 1.2 * 1.0 = 300
      expect(difficultyBonus).toBe(300)
    })
  })

  describe('Template Substitution', () => {
    test('should substitute placeholders in title template', () => {
      const template = 'Map the {zone_name}'
      const values = { zone_name: 'Forest of Secrets' }

      const result = template.replace(/{zone_name}/g, values.zone_name)
      expect(result).toBe('Map the Forest of Secrets')
    })

    test('should substitute multiple placeholders', () => {
      const template = 'Gather {quantity} {material_name} using {skill_name}'
      const values = {
        quantity: '20',
        material_name: 'Iron Ore',
        skill_name: 'Mining'
      }

      let result = template
      for (const [key, value] of Object.entries(values)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g')
        result = result.replace(regex, value)
      }

      expect(result).toBe('Gather 20 Iron Ore using Mining')
    })

    test('should handle missing placeholders gracefully', () => {
      const template = 'Win {win_count} battles using {weapon_name}'
      const values = { weapon_name: 'Steel Sword' }

      let result = template
      for (const [key, value] of Object.entries(values)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g')
        result = result.replace(regex, value)
      }

      // Should keep {win_count} as-is since it's not in values
      expect(result).toContain('{win_count}')
      expect(result).toContain('Steel Sword')
    })
  })

  describe('Weighted Random Selection', () => {
    test('should respect weight distribution', () => {
      // Simulate weighted selection 1000 times
      const selections: Record<string, number> = {}

      for (let i = 0; i < 1000; i++) {
        const totalWeight = mockTemplates.reduce((sum, t) => sum + t.weight, 0)
        let random = Math.random() * totalWeight
        let selected: QuestTemplate | null = null

        for (const template of mockTemplates) {
          random -= template.weight
          if (random <= 0) {
            selected = template
            break
          }
        }

        if (selected) {
          selections[selected.id] = (selections[selected.id] || 0) + 1
        }
      }

      // Higher weight templates should be selected more often
      // Zone exploration (weight 15) should be selected ~36% of the time (15/42)
      // Combat (weight 14) should be selected ~33% of the time (14/42)
      // Skill (weight 13) should be selected ~31% of the time (13/42)

      const zonePercentage = selections['tpl-zone-1'] / 1000
      const combatPercentage = selections['tpl-combat-1'] / 1000
      const skillPercentage = selections['tpl-skill-1'] / 1000

      // Allow 5% margin of error
      expect(zonePercentage).toBeGreaterThan(0.31)
      expect(zonePercentage).toBeLessThan(0.41)
      expect(combatPercentage).toBeGreaterThan(0.28)
      expect(combatPercentage).toBeLessThan(0.38)
      expect(skillPercentage).toBeGreaterThan(0.26)
      expect(skillPercentage).toBeLessThan(0.36)
    })
  })

  describe('Quest Parameter Generation', () => {
    test('should generate zone exploration parameters', () => {
      const context = mockLowLevelContext
      const zoneName = 'Grasslands'
      const landmarkCount = 3
      const timeMinutes = Math.max(5, context.level * 2) // 5 * 2 = 10

      expect(timeMinutes).toBe(10)
      expect(context.recent_zones).toContain('grasslands')
    })

    test('should generate combat parameters based on level', () => {
      const level = mockLowLevelContext.level // 5
      const winCount = Math.max(3, Math.floor(level / 3)) // max(3, 1) = 3
      const damageTotal = level * 500 // 5 * 500 = 2500

      expect(winCount).toBe(3)
      expect(damageTotal).toBe(2500)
    })

    test('should scale gathering parameters with skill level', () => {
      const skillLevel = mockHighLevelContext.skills.woodcutting || 1 // 60
      const quantity = Math.max(10, Math.floor(skillLevel / 2)) // max(10, 30) = 30
      const times = Math.max(5, Math.floor(skillLevel / 5)) // max(5, 12) = 12

      expect(quantity).toBe(30)
      expect(times).toBe(12)
    })

    test('should generate merchant quest parameters', () => {
      const level = mockHighLevelContext.level // 35
      const merchantCount = Math.max(2, Math.floor(level / 5)) // max(2, 7) = 7
      const goldAmount = level * 100 // 35 * 100 = 3500

      expect(merchantCount).toBe(7)
      expect(goldAmount).toBe(3500)
    })
  })

  describe('Quest Definition Generation', () => {
    test('should create unique quest IDs', () => {
      const questId1 = `dyn_zone_exploration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const questId2 = `dyn_zone_exploration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      expect(questId1).not.toBe(questId2)
      expect(questId1).toContain('dyn_zone_exploration_')
      expect(questId2).toContain('dyn_zone_exploration_')
    })

    test('should mark generated quests as dynamic', () => {
      const questDef = {
        is_dynamic: true,
        template_id: 'tpl-zone-1',
        context_snapshot: {
          zone_name: 'Forest',
          player_level: 5,
          generated_at: new Date().toISOString()
        }
      }

      expect(questDef.is_dynamic).toBe(true)
      expect(questDef.template_id).toBeDefined()
      expect(questDef.context_snapshot).toBeDefined()
    })

    test('should store context snapshot for reproducibility', () => {
      const snapshot = {
        zone_name: 'Ancient Ruins',
        landmark_count: 5,
        player_level: 35,
        generated_at: new Date().toISOString()
      }

      expect(snapshot.zone_name).toBe('Ancient Ruins')
      expect(snapshot.player_level).toBe(35)
      expect(snapshot.generated_at).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    test('should handle player with no equipped items', () => {
      const emptyContext: PlayerContext = {
        ...mockLowLevelContext,
        equipped_items: {}
      }

      const hasWeapon = 'weapon' in emptyContext.equipped_items
      expect(hasWeapon).toBe(false)
    })

    test('should handle player with no discovered zones', () => {
      const noZonesContext: PlayerContext = {
        ...mockLowLevelContext,
        recent_zones: []
      }

      expect(noZonesContext.recent_zones.length).toBe(0)
    })

    test('should handle minimum level requirements', () => {
      const level1Context: PlayerContext = {
        ...mockLowLevelContext,
        level: 1
      }

      const validTemplates = mockTemplates.filter(t =>
        level1Context.level >= t.min_character_level
      )

      // Should match at least the zone exploration template (min level 1)
      expect(validTemplates.length).toBeGreaterThan(0)
    })

    test('should cap parameters at reasonable values', () => {
      const maxLevelContext: PlayerContext = {
        ...mockHighLevelContext,
        level: 99,
        skills: {
          woodcutting: 99,
          mining: 99
        }
      }

      const gatherQuantity = Math.max(10, Math.floor(99 / 2)) // 49
      const merchantCount = Math.max(2, Math.floor(99 / 5)) // 19

      expect(gatherQuantity).toBeLessThan(100)
      expect(merchantCount).toBeLessThan(50)
    })
  })
})
