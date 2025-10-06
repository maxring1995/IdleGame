import { createClient } from '@/utils/supabase/client'
import { Enemy, Character, CombatAction, CombatResult, ActiveCombat, CombatLog } from './supabase'
import { addExperience, addGold, deleteCharacter } from './character'
import { addItem } from './inventory'
import { trackQuestProgress } from './quests'
import { addSkillExperience } from './skills'

export interface ClassAbility {
  id: string
  class_id: string
  name: string
  description: string
  icon: string
  required_level: number
  required_talent_points: number
  resource_cost: number
  cooldown_seconds: number
  effects: any
  ability_type: 'active' | 'passive'
  damage_type: string | null
}

export interface AbilityCooldown {
  ability_id: string
  last_used: string
  available_at: string
}

/**
 * Calculate damage dealt by attacker to defender with level scaling
 */
export function calculateDamage(attackerAttack: number, defenderDefense: number, attackerLevel: number = 1): number {
  // Base damage formula: attack - (defense / 2)
  const baseDamage = attackerAttack - Math.floor(defenderDefense / 2)

  // Level scaling: +1.5% damage per level
  const levelMultiplier = 1 + (attackerLevel * 0.015)
  const scaledDamage = baseDamage * levelMultiplier

  // Add random variance (85% to 115%)
  const variance = 0.85 + Math.random() * 0.3
  const actualDamage = scaledDamage * variance

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
 * Get character's learned abilities
 */
export async function getCharacterAbilities(characterId: string): Promise<{
  data: ClassAbility[] | null
  error: any
}> {
  try {
    const supabase = createClient()

    // Get character's class
    const { data: character } = await supabase
      .from('characters')
      .select('class_id, level')
      .eq('id', characterId)
      .single()

    if (!character || !character.class_id) {
      return { data: [], error: null }
    }

    // Get all abilities for this class that the character meets requirements for
    const { data: abilities, error } = await supabase
      .from('class_abilities')
      .select('*')
      .eq('class_id', character.class_id)
      .lte('required_level', character.level)
      .eq('ability_type', 'active')
      .order('required_level', { ascending: true })

    if (error) throw error

    return { data: abilities as ClassAbility[], error: null }
  } catch (error) {
    console.error('Get character abilities error:', error)
    return { data: null, error }
  }
}

/**
 * Check ability cooldown status
 */
export function isAbilityOnCooldown(
  abilityId: string,
  cooldowns: Record<string, number>
): boolean {
  const cooldownEnd = cooldowns[abilityId]
  if (!cooldownEnd) return false
  return Date.now() < cooldownEnd
}

/**
 * Calculate ability damage
 */
export function calculateAbilityDamage(
  ability: ClassAbility,
  character: Character
): number {
  const effects = ability.effects

  if (effects.type !== 'damage' && effects.type !== 'aoe_dot') {
    return 0
  }

  let baseDamage = effects.amount || 0
  const multiplier = effects.multiplier || 1

  // Scale based on character stats
  if (effects.scaling === 'attack') {
    baseDamage = character.attack * multiplier
  } else if (effects.scaling === 'mana') {
    baseDamage = character.max_mana * multiplier
  }

  // Add variance
  const variance = 0.9 + Math.random() * 0.2
  return Math.max(1, Math.floor(baseDamage * variance))
}

/**
 * Use a class ability in combat
 */
export async function useAbilityInCombat(
  characterId: string,
  abilityId: string,
  cooldowns: Record<string, number>
): Promise<{
  data: { combat: ActiveCombat; isOver: boolean; victory?: boolean } | null
  error: any
  cooldowns?: Record<string, number>
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

    // Get ability details
    const { data: ability, error: abilityError } = await supabase
      .from('class_abilities')
      .select('*')
      .eq('id', abilityId)
      .single()

    if (abilityError) throw abilityError
    if (!ability) throw new Error('Ability not found')

    // Check cooldown
    if (isAbilityOnCooldown(abilityId, cooldowns)) {
      throw new Error('Ability is on cooldown')
    }

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

    // Check mana cost
    if (character.mana < ability.resource_cost) {
      throw new Error('Not enough mana')
    }

    let combatLog: CombatAction[] = combat.combat_log || []
    let playerHealth = combat.player_current_health
    let enemyHealth = combat.enemy_current_health
    let isOver = false
    let victory = false

    // Apply ability effects
    const effects = ability.effects

    if (effects.type === 'damage') {
      // Damage ability
      const abilityDamage = calculateAbilityDamage(ability as ClassAbility, character)
      enemyHealth -= abilityDamage

      combatLog.push({
        turn: combat.turn_number,
        actor: 'player',
        action: 'ability',
        damage: abilityDamage,
        message: `${ability.icon} ${ability.name} hits ${enemy.name} for ${abilityDamage} ${ability.damage_type || 'magical'} damage!`,
        abilityUsed: ability.name
      })
    } else if (effects.type === 'heal') {
      // Healing ability
      const healAmount = Math.floor(character.max_mana * (effects.multiplier || 1))
      const actualHeal = Math.min(healAmount, character.max_health - playerHealth)
      playerHealth += actualHeal

      combatLog.push({
        turn: combat.turn_number,
        actor: 'player',
        action: 'ability',
        message: `${ability.icon} ${ability.name} heals you for ${actualHeal} health!`,
        abilityUsed: ability.name
      })
    }

    // Deduct mana
    await supabase
      .from('characters')
      .update({ mana: character.mana - ability.resource_cost })
      .eq('id', characterId)

    // Set cooldown
    const newCooldowns = { ...cooldowns }
    newCooldowns[abilityId] = Date.now() + (ability.cooldown_seconds * 1000)

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
      const enemyDamage = calculateDamage(enemy.attack, character.defense, enemy.level)
      playerHealth -= enemyDamage

      combatLog.push({
        turn: combat.turn_number,
        actor: 'enemy',
        action: 'attack',
        damage: enemyDamage,
        message: `${enemy.name} hits you for ${enemyDamage} damage!`
      })

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

    // Update active combat
    const { data: updatedCombat, error: updateError } = await supabase
      .from('active_combat')
      .update({
        player_current_health: playerHealth,
        enemy_current_health: enemyHealth,
        turn_number: combat.turn_number + 1,
        combat_log: combatLog,
      })
      .eq('character_id', characterId)
      .select()
      .single()

    if (updateError) throw updateError

    return {
      data: {
        combat: updatedCombat,
        isOver,
        victory
      },
      error: null,
      cooldowns: newCooldowns
    }
  } catch (error) {
    console.error('Use ability error:', error)
    return { data: null, error }
  }
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
    const playerDamage = calculateDamage(character.attack, enemy.defense, character.level)
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
      message: actionMessages[combatStyle],
      combatStyle: combatStyle // Track which combat style was used
    })

    // Award XP based on combat style (10x increased for balance)
    if (combatStyle === 'melee') {
      // Award Attack XP for attacking (20 XP per attack)
      await addSkillExperience(characterId, 'attack', 20)
      // Award Strength XP based on damage dealt (10 XP per 2 damage)
      const strengthXP = Math.max(10, Math.floor(playerDamage * 5))
      await addSkillExperience(characterId, 'strength', strengthXP)
    } else if (combatStyle === 'magic') {
      // Award Magic XP for casting spells (30 XP per cast + damage bonus)
      const magicXP = 30 + Math.max(10, Math.floor(playerDamage * 5))
      await addSkillExperience(characterId, 'magic', magicXP)
    } else if (combatStyle === 'ranged') {
      // Award Ranged XP for shooting (20 XP per shot + accuracy bonus)
      const rangedXP = 20 + Math.max(10, Math.floor(playerDamage * 3))
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
      const enemyDamage = calculateDamage(enemy.attack, character.defense, enemy.level)
      playerHealth -= enemyDamage

      combatLog.push({
        turn: combat.turn_number,
        actor: 'enemy',
        action: 'attack',
        damage: enemyDamage,
        message: `${enemy.name} hits you for ${enemyDamage} damage!`
      })

      // Award Defense XP for taking damage (10 XP per 2 damage taken)
      const defenseXP = Math.max(10, Math.floor(enemyDamage * 5))
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

    // Track combat XP gains
    const combatXP: { [key: string]: number } = {}

    // Calculate total XP awarded during combat based on combat log and damage
    const combatLog = combat.combat_log || []
    const playerAttacks = combatLog.filter((action: any) => action.actor === 'player' && action.action === 'attack')
    const totalTurns = combat.turn_number - 1

    // Count attacks by combat style
    const meleeAttacks = playerAttacks.filter((action: any) => !action.combatStyle || action.combatStyle === 'melee')
    const magicAttacks = playerAttacks.filter((action: any) => action.combatStyle === 'magic')
    const rangedAttacks = playerAttacks.filter((action: any) => action.combatStyle === 'ranged')

    // Calculate total damage by style
    const meleeDamage = meleeAttacks.reduce((sum: number, action: any) => sum + (action.damage || 0), 0)
    const magicDamage = magicAttacks.reduce((sum: number, action: any) => sum + (action.damage || 0), 0)
    const rangedDamage = rangedAttacks.reduce((sum: number, action: any) => sum + (action.damage || 0), 0)

    // Melee combat skills
    if (meleeAttacks.length > 0) {
      // Attack XP: 2 XP per melee attack
      const attackXP = meleeAttacks.length * 2
      combatXP.attack = attackXP

      // Strength XP: 1 XP per 2 damage dealt
      const strengthXP = Math.max(1, Math.floor(meleeDamage / 2))
      combatXP.strength = strengthXP
    }

    // Magic combat skills
    if (magicAttacks.length > 0) {
      // Magic XP: 3 XP per cast + damage bonus (1 XP per 2 damage)
      const magicXP = (magicAttacks.length * 3) + Math.max(1, Math.floor(magicDamage / 2))
      combatXP.magic = magicXP
    }

    // Ranged combat skills
    if (rangedAttacks.length > 0) {
      // Ranged XP: 2 XP per shot + accuracy bonus (1 XP per 3 damage)
      const rangedXP = (rangedAttacks.length * 2) + Math.max(1, Math.floor(rangedDamage / 3))
      combatXP.ranged = rangedXP
    }

    // Defense XP from damage taken (1 XP per 2 damage)
    const defenseXP = Math.max(1, Math.floor(actualDamageTaken / 2))
    combatXP.defense = defenseXP

    // Constitution XP (1 XP per turn)
    const constitutionXP = totalTurns
    combatXP.constitution = constitutionXP

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
      combatXP.slayer = slayerXP

      // Award Thieving XP for looting items (5 XP per item)
      if (loot.length > 0) {
        const thievingXP = loot.length * 5
        await addSkillExperience(characterId, 'thieving', thievingXP)
        combatXP.thieving = thievingXP
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
      // Defeat: Delete the character (permanent death)
      await deleteCharacter(characterId)
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
      combatXP,
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
