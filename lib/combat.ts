import { createClient } from '@/utils/supabase/client'
import { Enemy, Character, CombatAction, CombatResult, ActiveCombat, CombatLog } from './supabase'
import { addExperience, addGold } from './character'
import { addItem } from './inventory'
import { trackQuestProgress } from './quests'
import { addSkillExperience } from './skills'

/**
 * Calculate damage dealt by attacker to defender
 */
export function calculateDamage(attackerAttack: number, defenderDefense: number): number {
  // Base damage formula: attack - (defense / 2)
  const baseDamage = attackerAttack - Math.floor(defenderDefense / 2)

  // Add random variance (85% to 115%)
  const variance = 0.85 + Math.random() * 0.3
  const actualDamage = baseDamage * variance

  // Minimum 1 damage
  return Math.max(1, Math.floor(actualDamage))
}

/**
 * Roll for loot drops based on enemy loot table
 */
export function rollLoot(lootTable: Record<string, number>): string[] {
  const loot: string[] = []

  for (const [itemId, dropRate] of Object.entries(lootTable)) {
    const roll = Math.random()
    if (roll <= dropRate) {
      loot.push(itemId)
    }
  }

  return loot
}

/**
 * Calculate random gold reward within enemy's range
 */
export function rollGold(goldMin: number, goldMax: number): number {
  return Math.floor(Math.random() * (goldMax - goldMin + 1)) + goldMin
}

/**
 * Start a new combat session
 */
export async function startCombat(
  characterId: string,
  enemyId: string
): Promise<{ data: ActiveCombat | null; error: any }> {
  try {
    const supabase = createClient()

    // Get character data
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single()

    if (charError) throw charError

    // Get enemy data
    const { data: enemy, error: enemyError } = await supabase
      .from('enemies')
      .select('*')
      .eq('id', enemyId)
      .single()

    if (enemyError) throw enemyError

    // Check if player meets level requirement
    if (character.level < enemy.required_player_level) {
      throw new Error(`You must be level ${enemy.required_player_level} to fight this enemy`)
    }

    // Check if character has enough health
    if (character.health <= 0) {
      throw new Error('Your character has no health. Rest to recover.')
    }

    // Delete any existing active combat for this character
    await supabase
      .from('active_combat')
      .delete()
      .eq('character_id', characterId)

    // Create new active combat session
    const { data, error } = await supabase
      .from('active_combat')
      .insert({
        character_id: characterId,
        enemy_id: enemyId,
        player_current_health: character.health,
        enemy_current_health: enemy.health,
        turn_number: 1,
        combat_log: [],
      })
      .select()
      .single()

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('Start combat error:', error)
    return { data: null, error }
  }
}

/**
 * Execute a single turn of combat
 * @param combatStyle - 'melee', 'magic', or 'ranged'
 */
export async function executeTurn(characterId: string, combatStyle: 'melee' | 'magic' | 'ranged' = 'melee'): Promise<{
  data: { combat: ActiveCombat; isOver: boolean; victory?: boolean } | null
  error: any
}> {
  try {
    const supabase = createClient()

    // Get active combat
    const { data: combat, error: combatError } = await supabase
      .from('active_combat')
      .select('*')
      .eq('character_id', characterId)
      .single()

    if (combatError) throw combatError
    if (!combat) throw new Error('No active combat found')

    // Get character and enemy data
    const { data: character } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single()

    const { data: enemy } = await supabase
      .from('enemies')
      .select('*')
      .eq('id', combat.enemy_id)
      .single()

    if (!character || !enemy) throw new Error('Character or enemy not found')

    let combatLog: CombatAction[] = combat.combat_log || []
    let playerHealth = combat.player_current_health
    let enemyHealth = combat.enemy_current_health
    let isOver = false
    let victory = false

    // Player attacks first
    const playerDamage = calculateDamage(character.attack, enemy.defense)
    enemyHealth -= playerDamage

    // Determine action message based on combat style
    const actionMessages = {
      melee: `You hit ${enemy.name} for ${playerDamage} damage!`,
      magic: `Your spell hits ${enemy.name} for ${playerDamage} damage!`,
      ranged: `Your arrow strikes ${enemy.name} for ${playerDamage} damage!`
    }

    combatLog.push({
      turn: combat.turn_number,
      actor: 'player',
      action: 'attack',
      damage: playerDamage,
      message: actionMessages[combatStyle]
    })

    // Award XP based on combat style
    if (combatStyle === 'melee') {
      // Award Attack XP for attacking (2 XP per attack)
      await addSkillExperience(characterId, 'attack', 2)
      // Award Strength XP based on damage dealt (1 XP per 2 damage)
      const strengthXP = Math.max(1, Math.floor(playerDamage / 2))
      await addSkillExperience(characterId, 'strength', strengthXP)
    } else if (combatStyle === 'magic') {
      // Award Magic XP for casting spells (3 XP per cast + damage bonus)
      const magicXP = 3 + Math.max(1, Math.floor(playerDamage / 2))
      await addSkillExperience(characterId, 'magic', magicXP)
    } else if (combatStyle === 'ranged') {
      // Award Ranged XP for shooting (2 XP per shot + accuracy bonus)
      const rangedXP = 2 + Math.max(1, Math.floor(playerDamage / 3))
      await addSkillExperience(characterId, 'ranged', rangedXP)
    }

    // Check if enemy is defeated
    if (enemyHealth <= 0) {
      enemyHealth = 0
      isOver = true
      victory = true

      combatLog.push({
        turn: combat.turn_number,
        actor: 'enemy',
        action: 'defeat',
        message: `${enemy.name} has been defeated!`
      })
    } else {
      // Enemy counterattacks
      const enemyDamage = calculateDamage(enemy.attack, character.defense)
      playerHealth -= enemyDamage

      combatLog.push({
        turn: combat.turn_number,
        actor: 'enemy',
        action: 'attack',
        damage: enemyDamage,
        message: `${enemy.name} hits you for ${enemyDamage} damage!`
      })

      // Award Defense XP for taking damage (1 XP per 2 damage taken)
      const defenseXP = Math.max(1, Math.floor(enemyDamage / 2))
      await addSkillExperience(characterId, 'defense', defenseXP)

      // Check if player is defeated
      if (playerHealth <= 0) {
        playerHealth = 0
        isOver = true
        victory = false

        combatLog.push({
          turn: combat.turn_number,
          actor: 'player',
          action: 'defeat',
          message: 'You have been defeated!'
        })
      }
    }

    // Award Constitution XP for participating in combat (1 XP per turn)
    await addSkillExperience(characterId, 'constitution', 1)

    // Update active combat
    const { data: updatedCombat, error: updateError } = await supabase
      .from('active_combat')
      .update({
        player_current_health: playerHealth,
        enemy_current_health: enemyHealth,
        turn_number: combat.turn_number + 1,
        combat_log: combatLog,
        updated_at: new Date().toISOString(),
      })
      .eq('character_id', characterId)
      .select()
      .single()

    if (updateError) throw updateError

    return {
      data: {
        combat: updatedCombat,
        isOver,
        victory: isOver ? victory : undefined
      },
      error: null
    }
  } catch (error) {
    console.error('Execute turn error:', error)
    return { data: null, error }
  }
}

/**
 * End combat and distribute rewards (or penalties)
 */
export async function endCombat(
  characterId: string,
  victory: boolean
): Promise<{ data: CombatResult | null; error: any }> {
  try {
    const supabase = createClient()
    const startTime = Date.now()

    // Get active combat
    const { data: combat, error: combatError } = await supabase
      .from('active_combat')
      .select('*')
      .eq('character_id', characterId)
      .single()

    if (combatError) throw combatError

    // Get enemy data
    const { data: enemy } = await supabase
      .from('enemies')
      .select('*')
      .eq('id', combat.enemy_id)
      .single()

    if (!enemy) throw new Error('Enemy not found')

    let experience = 0
    let gold = 0
    let loot: string[] = []
    const damageDealt = enemy.health - combat.enemy_current_health
    const damageTaken = combat.player_current_health // Will calculate from initial health

    // Get initial player health
    const { data: character } = await supabase
      .from('characters')
      .select('health')
      .eq('id', characterId)
      .single()

    const actualDamageTaken = (character?.health || 100) - combat.player_current_health

    if (victory) {
      // Calculate rewards
      experience = enemy.experience_reward
      gold = rollGold(enemy.gold_min, enemy.gold_max)
      loot = rollLoot(enemy.loot_table)

      // Award experience
      await addExperience(characterId, experience)

      // Award gold
      await addGold(characterId, gold)

      // Award loot
      for (const itemId of loot) {
        await addItem(characterId, itemId, 1)
      }

      // Award Slayer XP for defeating enemy (10 XP base + level bonus)
      const slayerXP = 10 + (enemy.level * 2)
      await addSkillExperience(characterId, 'slayer', slayerXP)

      // Award Thieving XP for looting items (5 XP per item)
      if (loot.length > 0) {
        const thievingXP = loot.length * 5
        await addSkillExperience(characterId, 'thieving', thievingXP)
      }

      // Track quest progress for kill quests
      await trackQuestProgress(characterId, 'kill', {
        targetId: enemy.id,
        amount: 1
      })

      // Update character health (keep current health)
      await supabase
        .from('characters')
        .update({
          health: combat.player_current_health,
          last_active: new Date().toISOString(),
        })
        .eq('id', characterId)
    } else {
      // Defeat penalty: restore to 50% health
      const { data: char } = await supabase
        .from('characters')
        .select('max_health')
        .eq('id', characterId)
        .single()

      const restoredHealth = Math.floor((char?.max_health || 100) * 0.5)

      await supabase
        .from('characters')
        .update({
          health: restoredHealth,
          last_active: new Date().toISOString(),
        })
        .eq('id', characterId)
    }

    // Log combat to history
    const combatDuration = Date.now() - new Date(combat.started_at).getTime()

    await supabase
      .from('combat_logs')
      .insert({
        character_id: characterId,
        enemy_id: combat.enemy_id,
        victory,
        turns_taken: combat.turn_number - 1,
        damage_dealt: damageDealt,
        damage_taken: actualDamageTaken,
        experience_gained: experience,
        gold_gained: gold,
        items_looted: loot,
        combat_duration_ms: combatDuration,
        started_at: combat.started_at,
        ended_at: new Date().toISOString(),
      })

    // Delete active combat
    await supabase
      .from('active_combat')
      .delete()
      .eq('character_id', characterId)

    const result: CombatResult = {
      victory,
      experience,
      gold,
      loot,
      damageDealt,
      damageTaken: actualDamageTaken,
      turns: combat.turn_number - 1,
    }

    return { data: result, error: null }
  } catch (error) {
    console.error('End combat error:', error)
    return { data: null, error }
  }
}

/**
 * Get active combat for a character
 */
export async function getActiveCombat(
  characterId: string
): Promise<{ data: ActiveCombat | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('active_combat')
      .select('*')
      .eq('character_id', characterId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      throw error
    }

    return { data: data || null, error: null }
  } catch (error) {
    console.error('Get active combat error:', error)
    return { data: null, error }
  }
}

/**
 * Get combat history for a character
 */
export async function getCombatHistory(
  characterId: string,
  limit: number = 10
): Promise<{ data: CombatLog[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('combat_logs')
      .select('*')
      .eq('character_id', characterId)
      .order('ended_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('Get combat history error:', error)
    return { data: null, error }
  }
}

/**
 * Abandon current combat (counts as defeat)
 */
export async function abandonCombat(characterId: string): Promise<{ error: any }> {
  try {
    const supabase = createClient()

    // Check if there's active combat
    const { data: combat } = await supabase
      .from('active_combat')
      .select('*')
      .eq('character_id', characterId)
      .single()

    if (combat) {
      // End combat as defeat
      await endCombat(characterId, false)
    }

    return { error: null }
  } catch (error) {
    console.error('Abandon combat error:', error)
    return { error }
  }
}
