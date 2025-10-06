/**
 * E2E Tests for Cross-System Feedback Loops
 *
 * Tests the interconnected progression where advancement in one system
 * enhances performance in others:
 * - Combat skills → Gathering speed bonuses
 * - Exploration landmarks → Crafting bonuses
 * - Quest completion → Merchant discounts
 * - Skill requirements → Zone access
 */

import { test, expect, Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Helper: Create test user and character
async function setupTestCharacter(username: string) {
  // Generate unique username
  const testUsername = `${username}_${Date.now()}`

  // Signup
  const { data: authData, error: signupError } = await supabase.auth.signUp({
    email: `${testUsername}@example.com`,
    password: 'test123456789012345678901234567890'
  })

  if (signupError || !authData.user) {
    throw new Error(`Failed to create test user: ${signupError?.message}`)
  }

  // Wait for character to be created by database trigger (retry up to 5 seconds)
  let character = null
  let attempts = 0
  const maxAttempts = 50 // 5 seconds with 100ms intervals

  while (!character && attempts < maxAttempts) {
    const { data } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', authData.user.id)
      .maybeSingle()

    if (data) {
      character = data
      break
    }

    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }

  if (!character) {
    throw new Error('Character was not created after signup')
  }

  return { user: authData.user, character }
}

// Helper: Set character skill level directly in DB
async function setSkillLevel(characterId: string, skillType: string, level: number) {
  const { error } = await supabase
    .from('character_skills')
    .upsert({
      character_id: characterId,
      skill_type: skillType,
      level: level,
      experience: level * 100
    }, {
      onConflict: 'character_id,skill_type'
    })

  if (error) {
    console.error('Error setting skill level:', error)
  }
}

// Helper: Grant permanent bonus directly in DB
async function grantBonus(
  characterId: string,
  bonusType: string,
  bonusValue: number,
  displayName: string
) {
  const { data, error } = await supabase.rpc('grant_permanent_bonus', {
    p_character_id: characterId,
    p_bonus_type: bonusType,
    p_bonus_value: bonusValue,
    p_source_type: 'quest',
    p_source_id: null,
    p_display_name: displayName,
    p_description: 'Test bonus',
    p_expires_at: null
  })

  if (error) {
    console.error('Error granting bonus:', error)
  }

  return data
}

// Helper: Discover landmark for character
async function discoverLandmark(characterId: string, landmarkId: string) {
  const { data: landmark } = await supabase
    .from('zone_landmarks')
    .select('*')
    .eq('id', landmarkId)
    .single()

  if (!landmark) return

  const { error } = await supabase
    .from('character_landmark_bonuses')
    .insert({
      character_id: characterId,
      landmark_id: landmarkId,
      attack_bonus: landmark.attack_bonus || 0,
      defense_bonus: landmark.defense_bonus || 0,
      health_bonus: landmark.health_bonus || 0,
      mana_bonus: landmark.mana_bonus || 0,
      xp_bonus: landmark.xp_bonus || 0,
      gold_find_bonus: landmark.gold_find_bonus || 0,
      crafting_quality_bonus: landmark.crafting_quality_bonus || 0,
      crafting_speed_bonus: landmark.crafting_speed_bonus || 0,
      crafting_cost_reduction: landmark.crafting_cost_reduction || 0,
      discovered_at: new Date().toISOString()
    })

  if (error) {
    console.error('Error discovering landmark:', error)
  }
}

// Helper: Clean up test data
async function cleanupTestData(userId: string) {
  // Delete character and all related data (CASCADE handles most)
  await supabase.from('characters').delete().eq('user_id', userId)
  await supabase.auth.admin.deleteUser(userId)
}

test.describe('Cross-System Feedback Loops', () => {
  test.describe('Combat Skills → Gathering Speed Bonuses', () => {
    test('should grant gathering speed bonus when Attack reaches level 25', async () => {
      const { user, character } = await setupTestCharacter('combat_gathering_test')

      // Set Attack to level 25 (grants "Warrior's Efficiency I" - +5% all gathering)
      await setSkillLevel(character.id, 'attack', 25)

      // Get synergy bonuses from API
      const { data: bonuses } = await supabase.rpc('get_character_synergy_bonuses', {
        p_character_id: character.id
      })

      // Verify synergy bonus exists
      expect(bonuses).toBeDefined()
      expect(bonuses.length).toBeGreaterThan(0)

      const attackBonus = bonuses.find((b: any) =>
        b.source_skill_type === 'attack' && b.required_level === 25
      )

      expect(attackBonus).toBeDefined()
      expect(attackBonus.bonus_type).toBe('speed')
      expect(attackBonus.bonus_value).toBe(0.05) // 5%
      expect(attackBonus.target_category).toBe('gathering')

      // Verify it applies to gathering time calculation
      const { data: speedBonus } = await supabase.rpc('get_gathering_speed_bonus', {
        p_character_id: character.id,
        p_gathering_skill: 'woodcutting'
      })

      expect(speedBonus).toBe(0.05) // 5% bonus applies to all gathering skills

      await cleanupTestData(user.id)
    })

    test('should stack multiple combat skill bonuses', async () => {
      const { user, character } = await setupTestCharacter('stacking_test')

      // Set Attack 50 (+10% gathering) and Strength 30 (+10% woodcutting/mining)
      await setSkillLevel(character.id, 'attack', 50)
      await setSkillLevel(character.id, 'strength', 30)

      // Get woodcutting speed bonus (should be 20% total)
      const { data: woodcuttingBonus } = await supabase.rpc('get_gathering_speed_bonus', {
        p_character_id: character.id,
        p_gathering_skill: 'woodcutting'
      })

      // Attack 50 = +10%, Strength 30 = +10% (for woodcutting)
      expect(woodcuttingBonus).toBe(0.20)

      // Get fishing speed bonus (should be 10% - only Attack applies)
      const { data: fishingBonus } = await supabase.rpc('get_gathering_speed_bonus', {
        p_character_id: character.id,
        p_gathering_skill: 'fishing'
      })

      expect(fishingBonus).toBe(0.10) // Only Attack 50 applies

      await cleanupTestData(user.id)
    })

    test('should cap gathering speed bonus at 75%', async () => {
      const { user, character } = await setupTestCharacter('cap_test')

      // Set extreme skill levels
      await setSkillLevel(character.id, 'attack', 99) // +25%
      await setSkillLevel(character.id, 'strength', 99) // +20% for mining
      await setSkillLevel(character.id, 'defense', 75) // +8% gathering yield (not speed)

      // Get mining speed bonus
      const { data: miningBonus } = await supabase.rpc('get_gathering_speed_bonus', {
        p_character_id: character.id,
        p_gathering_skill: 'mining'
      })

      // Attack 99 = +25%, Strength 60 = +20% = 45% total (under cap)
      expect(miningBonus).toBeLessThanOrEqual(0.75)

      await cleanupTestData(user.id)
    })
  })

  test.describe('Exploration Landmarks → Crafting Bonuses', () => {
    test('should grant crafting bonuses when discovering landmarks', async () => {
      const { user, character } = await setupTestCharacter('landmark_test')

      // Get a crafting landmark from database
      const { data: landmarks } = await supabase
        .from('zone_landmarks')
        .select('*')
        .eq('landmark_type', 'crafting')
        .limit(1)

      if (!landmarks || landmarks.length === 0) {
        console.warn('No crafting landmarks found in database, skipping test')
        await cleanupTestData(user.id)
        return
      }

      const landmarkId = landmarks[0].id

      // Discover the landmark
      await discoverLandmark(character.id, landmarkId)

      // Get crafting bonuses
      const { data: bonuses } = await supabase.rpc('get_character_crafting_bonuses', {
        p_character_id: character.id
      })

      expect(bonuses).toBeDefined()
      expect(bonuses.quality_bonus).toBeGreaterThan(0)
      expect(bonuses.speed_bonus).toBeGreaterThan(0)
      expect(bonuses.cost_reduction).toBeGreaterThan(0)

      await cleanupTestData(user.id)
    })

    test('should stack bonuses from multiple landmarks', async () => {
      const { user, character } = await setupTestCharacter('multi_landmark_test')

      // Get multiple landmarks
      const { data: landmarks } = await supabase
        .from('zone_landmarks')
        .select('*')
        .limit(3)

      if (!landmarks || landmarks.length < 2) {
        console.warn('Not enough landmarks in database, skipping test')
        await cleanupTestData(user.id)
        return
      }

      // Discover all landmarks
      for (const landmark of landmarks) {
        await discoverLandmark(character.id, landmark.id)
      }

      // Get total bonuses
      const { data: bonuses } = await supabase.rpc('get_character_crafting_bonuses', {
        p_character_id: character.id
      })

      expect(bonuses).toBeDefined()
      // Bonuses should be sum of all discovered landmarks
      expect(bonuses.quality_bonus).toBeGreaterThan(0)
      expect(bonuses.speed_bonus).toBeGreaterThan(0)
      expect(bonuses.cost_reduction).toBeGreaterThan(0)

      await cleanupTestData(user.id)
    })
  })

  test.describe('Quest Completion → Merchant Discounts', () => {
    test('should grant merchant discount from quest reward', async () => {
      const { user, character } = await setupTestCharacter('merchant_discount_test')

      // Grant 5% merchant discount (simulating quest completion)
      await grantBonus(character.id, 'merchant_discount', 0.05, 'Merchant Friend')

      // Get total discount
      const { data: discount } = await supabase.rpc('get_character_merchant_discount', {
        p_character_id: character.id
      })

      expect(discount).toBe(0.05)

      await cleanupTestData(user.id)
    })

    test('should stack discounts from multiple quests', async () => {
      const { user, character } = await setupTestCharacter('stacking_discount_test')

      // Grant multiple discounts
      await grantBonus(character.id, 'merchant_discount', 0.05, 'Quest 1')
      await grantBonus(character.id, 'merchant_discount', 0.05, 'Quest 2')
      await grantBonus(character.id, 'merchant_discount', 0.05, 'Quest 3')

      // Get total discount
      const { data: discount } = await supabase.rpc('get_character_merchant_discount', {
        p_character_id: character.id
      })

      expect(discount).toBe(0.15) // 5% + 5% + 5%

      await cleanupTestData(user.id)
    })

    test('should cap merchant discount at 75%', async () => {
      const { user, character } = await setupTestCharacter('cap_discount_test')

      // Grant extreme discounts
      await grantBonus(character.id, 'merchant_discount', 0.50, 'Quest 1')
      await grantBonus(character.id, 'merchant_discount', 0.50, 'Quest 2')

      // Get total discount (should be capped)
      const { data: discount } = await supabase.rpc('get_character_merchant_discount', {
        p_character_id: character.id
      })

      expect(discount).toBe(0.75) // Capped at 75%

      await cleanupTestData(user.id)
    })
  })

  test.describe('Skill Requirements → Zone Access', () => {
    test('should block zone access if skill requirements not met', async () => {
      const { user, character } = await setupTestCharacter('zone_access_test')

      // Find a zone with skill requirements
      const { data: zoneReqs } = await supabase
        .from('zone_skill_requirements')
        .select('zone_id, skill_type, required_level')
        .limit(1)
        .single()

      if (!zoneReqs) {
        console.warn('No zone skill requirements found, skipping test')
        await cleanupTestData(user.id)
        return
      }

      // Check requirements (character has level 1 skills)
      const { data: check } = await supabase.rpc('check_zone_skill_requirements', {
        p_character_id: character.id,
        p_zone_id: zoneReqs.zone_id
      })

      expect(check[0].meets_requirements).toBe(false)
      expect(check[0].missing_requirements.length).toBeGreaterThan(0)

      await cleanupTestData(user.id)
    })

    test('should allow zone access when skill requirements met', async () => {
      const { user, character } = await setupTestCharacter('zone_unlock_test')

      // Find a zone with skill requirements
      const { data: zoneReqs } = await supabase
        .from('zone_skill_requirements')
        .select('zone_id, skill_type, required_level')
        .limit(1)
        .single()

      if (!zoneReqs) {
        console.warn('No zone skill requirements found, skipping test')
        await cleanupTestData(user.id)
        return
      }

      // Level up the required skill
      await setSkillLevel(character.id, zoneReqs.skill_type, zoneReqs.required_level)

      // Check requirements again
      const { data: check } = await supabase.rpc('check_zone_skill_requirements', {
        p_character_id: character.id,
        p_zone_id: zoneReqs.zone_id
      })

      expect(check[0].meets_requirements).toBe(true)
      expect(check[0].missing_requirements.length).toBe(0)

      await cleanupTestData(user.id)
    })
  })

  test.describe('Unified Bonus System', () => {
    test('should return all bonuses in single API call', async () => {
      const { user, character } = await setupTestCharacter('unified_test')

      // Set up multiple bonus sources
      await setSkillLevel(character.id, 'attack', 50)
      await grantBonus(character.id, 'merchant_discount', 0.10, 'Test Quest')

      // Get all bonuses at once
      const { data: allBonuses } = await supabase.rpc('get_all_character_bonuses', {
        p_character_id: character.id
      })

      expect(allBonuses).toBeDefined()
      expect(allBonuses.synergy_bonuses).toBeDefined()
      expect(allBonuses.permanent_bonuses).toBeDefined()
      expect(allBonuses.merchant_discount).toBe(0.10)
      expect(allBonuses.landmark_bonuses).toBeDefined()
      expect(allBonuses.crafting_bonuses).toBeDefined()

      await cleanupTestData(user.id)
    })
  })

  test.describe('Integration: Full Progression Flow', () => {
    test('should demonstrate complete feedback loop', async () => {
      const { user, character } = await setupTestCharacter('full_flow_test')

      // Step 1: Level up combat skills
      await setSkillLevel(character.id, 'attack', 50)
      await setSkillLevel(character.id, 'strength', 30)

      // Verify gathering bonuses granted
      const { data: gatheringBonus } = await supabase.rpc('get_gathering_speed_bonus', {
        p_character_id: character.id,
        p_gathering_skill: 'woodcutting'
      })
      expect(gatheringBonus).toBeGreaterThan(0)

      // Step 2: Discover landmarks
      const { data: landmarks } = await supabase
        .from('zone_landmarks')
        .select('*')
        .limit(2)

      if (landmarks && landmarks.length > 0) {
        for (const landmark of landmarks) {
          await discoverLandmark(character.id, landmark.id)
        }

        // Verify crafting bonuses granted
        const { data: craftingBonus } = await supabase.rpc('get_character_crafting_bonuses', {
          p_character_id: character.id
        })
        expect(craftingBonus.cost_reduction).toBeGreaterThan(0)
      }

      // Step 3: Complete quest for merchant discount
      await grantBonus(character.id, 'merchant_discount', 0.15, 'Merchant Quest Complete')

      // Verify discount granted
      const { data: discount } = await supabase.rpc('get_character_merchant_discount', {
        p_character_id: character.id
      })
      expect(discount).toBe(0.15)

      // Step 4: Verify all bonuses active
      const { data: allBonuses } = await supabase.rpc('get_all_character_bonuses', {
        p_character_id: character.id
      })

      expect(allBonuses.synergy_bonuses.length).toBeGreaterThan(0)
      expect(allBonuses.merchant_discount).toBe(0.15)

      console.log('✅ Full feedback loop verified:')
      console.log('  - Combat skills grant gathering bonuses')
      console.log('  - Landmarks grant crafting bonuses')
      console.log('  - Quests grant merchant discounts')
      console.log('  - All systems interconnected successfully')

      await cleanupTestData(user.id)
    })
  })
})
