import { createClient } from '@/utils/supabase/client'
import type {
  QuestTemplate,
  QuestDefinition,
  PlayerContext,
  DynamicQuestHistory
} from './supabase'

/**
 * Analyzes player's current state for quest generation
 * Uses the SQL function get_player_context() from the database
 */
export async function analyzePlayerState(characterId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .rpc('get_player_context', { p_character_id: characterId })

  if (error) {
    console.error('Error analyzing player state:', error)
    return { data: null, error }
  }

  return { data: data as PlayerContext, error: null }
}

/**
 * Gets available quest templates that match player's context
 */
export async function getAvailableTemplates(context: PlayerContext) {
  const supabase = createClient()

  // Get all templates within player's level range
  const { data: templates, error } = await supabase
    .from('quest_templates')
    .select('*')
    .lte('min_character_level', context.level)
    .gte('max_character_level', context.level)
    .order('weight', { ascending: false })

  if (error) {
    console.error('Error fetching quest templates:', error)
    return { data: null, error }
  }

  // Filter templates using the database function
  const matchingTemplates: QuestTemplate[] = []

  for (const template of templates) {
    const { data: matches } = await supabase
      .rpc('check_template_conditions', {
        p_template_id: template.id,
        p_context: context as any
      })

    if (matches) {
      matchingTemplates.push(template as QuestTemplate)
    }
  }

  return { data: matchingTemplates, error: null }
}

/**
 * Substitutes template placeholders with actual values from context
 */
function substituteTemplate(
  template: string,
  values: Record<string, any>
): string {
  let result = template

  // Replace all {placeholder} with actual values
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g')
    result = result.replace(regex, String(value))
  }

  return result
}

/**
 * Generates context-specific values for a quest template
 */
async function generateQuestParams(
  template: QuestTemplate,
  context: PlayerContext
): Promise<Record<string, any> | null> {
  const supabase = createClient()

  switch (template.category) {
    case 'zone_exploration': {
      // Use most recently discovered zone
      if (context.recent_zones.length === 0) return null

      const zoneId = context.recent_zones[0]
      const { data: zone } = await supabase
        .from('world_zones')
        .select('name, id')
        .eq('id', zoneId)
        .single()

      if (!zone) return null

      // Count landmarks in zone
      const { data: landmarks } = await supabase
        .from('zone_landmarks')
        .select('id')
        .eq('zone_id', zoneId)

      return {
        zone_name: zone.name,
        zone_id: zone.id,
        landmark_count: landmarks?.length || 3,
        time_minutes: Math.max(5, context.level * 2)
      }
    }

    case 'combat_item': {
      // Use equipped weapon
      const weaponData = context.equipped_items.weapon
      if (!weaponData) return null

      return {
        weapon_name: weaponData.name,
        weapon_type: weaponData.rarity,
        weapon_id: weaponData.item_id,
        win_count: Math.max(3, Math.floor(context.level / 3)),
        damage_total: context.level * 500
      }
    }

    case 'skill_gathering': {
      // Find highest gathering skill
      const gatheringSkills = ['woodcutting', 'mining', 'fishing', 'hunting', 'alchemy', 'magic']
      let highestSkill = 'woodcutting'
      let highestLevel = 1

      for (const skill of gatheringSkills) {
        const level = context.skills[skill] || 1
        if (level > highestLevel) {
          highestLevel = level
          highestSkill = skill
        }
      }

      // Get a material for this skill at appropriate level
      const { data: materials } = await supabase
        .from('materials')
        .select('*')
        .eq('skill_type', highestSkill)
        .lte('level_requirement', highestLevel)
        .order('level_requirement', { ascending: false })
        .limit(3)

      if (!materials || materials.length === 0) return null

      // Pick a random material from top 3
      const material = materials[Math.floor(Math.random() * materials.length)]

      return {
        skill_name: highestSkill.charAt(0).toUpperCase() + highestSkill.slice(1),
        skill_type: highestSkill,
        material_name: material.name,
        material_id: material.id,
        quantity: Math.max(10, Math.floor(highestLevel / 2)),
        times: Math.max(5, Math.floor(highestLevel / 5))
      }
    }

    case 'merchant_trade': {
      return {
        merchant_count: Math.max(2, Math.floor(context.level / 5)),
        gold_amount: context.level * 100
      }
    }

    case 'boss_challenge': {
      // Find a boss enemy at appropriate level
      const { data: bosses } = await supabase
        .from('enemies')
        .select('*')
        .eq('is_boss', true)
        .lte('level', context.level + 5)
        .gte('level', Math.max(1, context.level - 3))
        .order('level', { ascending: false })
        .limit(3)

      if (!bosses || bosses.length === 0) return null

      const boss = bosses[Math.floor(Math.random() * bosses.length)]

      return {
        boss_name: boss.name,
        boss_id: boss.id,
        times: 1
      }
    }

    case 'crafting_mastery': {
      const rarities = ['uncommon', 'rare', 'epic']
      const rarity = context.level < 10 ? 'uncommon' : context.level < 20 ? 'rare' : 'epic'

      return {
        rarity,
        quantity: Math.max(3, Math.floor(context.level / 5))
      }
    }

    default:
      return null
  }
}

/**
 * Generates a quest definition from a template and player context
 */
async function generateQuestFromTemplate(
  template: QuestTemplate,
  context: PlayerContext
): Promise<QuestDefinition | null> {
  const supabase = createClient()

  // Generate quest-specific parameters
  const params = await generateQuestParams(template, context)
  if (!params) return null

  // Calculate scaled rewards
  const { data: rewards } = await supabase
    .rpc('calculate_quest_rewards', {
      p_template_id: template.id,
      p_character_level: context.level,
      p_difficulty_modifier: 1.0
    })

  if (!rewards) return null

  // Substitute template strings
  const title = substituteTemplate(template.title_template, params)
  const description = template.description_template
    ? substituteTemplate(template.description_template, params)
    : undefined
  const objective = substituteTemplate(template.objective_template, params)

  // Generate unique quest ID
  const questId = `dyn_${template.category}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const questDef: QuestDefinition = {
    id: questId,
    title,
    description,
    level_requirement: template.min_character_level,
    objective,
    xp_reward: rewards.xp_reward,
    gold_reward: rewards.gold_reward,
    item_rewards: rewards.item_rewards,
    icon: template.icon,
    quest_type: 'standard',
    repeatable: template.is_repeatable,
    reset_interval: template.reset_interval,
    is_dynamic: true,
    template_id: template.id,
    context_snapshot: {
      ...params,
      player_level: context.level,
      generated_at: new Date().toISOString()
    },
    generated_at: new Date().toISOString()
  }

  return questDef
}

/**
 * Generates contextual quests for a character
 * @param characterId Character UUID
 * @param count Number of quests to generate (default: 3)
 */
export async function generateContextualQuests(
  characterId: string,
  count: number = 3
) {
  const supabase = createClient()

  // 1. Analyze player state
  const { data: context, error: contextError } = await analyzePlayerState(characterId)
  if (contextError || !context) {
    console.error('Failed to get player context:', contextError)
    return { data: null, error: contextError }
  }

  // 2. Get matching templates
  const { data: templates, error: templateError } = await getAvailableTemplates(context)
  if (templateError || !templates || templates.length === 0) {
    console.error('No matching templates found:', templateError)
    return { data: [], error: null } // Return empty array, not an error
  }

  // 3. Check which templates already have active quests
  const { data: activeHistory } = await supabase
    .from('dynamic_quest_history')
    .select('template_id, quest_definition_id')
    .eq('character_id', characterId)
    .is('completed_at', null)

  const activeTemplateIds = new Set(activeHistory?.map(h => h.template_id) || [])

  // Filter out templates with active quests
  const availableTemplates = templates.filter(t => !activeTemplateIds.has(t.id))

  if (availableTemplates.length === 0) {
    return { data: [], error: null }
  }

  // 4. Generate quests from templates (weighted random selection)
  const generatedQuests: QuestDefinition[] = []
  const selectedTemplates = selectTemplatesByWeight(availableTemplates, count)

  for (const template of selectedTemplates) {
    const quest = await generateQuestFromTemplate(template, context)
    if (quest) {
      generatedQuests.push(quest)

      // Insert into quest_definitions table
      const { error: insertError } = await supabase
        .from('quest_definitions')
        .insert({
          id: quest.id,
          title: quest.title,
          description: quest.description,
          level_requirement: quest.level_requirement,
          objective: quest.objective,
          xp_reward: quest.xp_reward,
          gold_reward: quest.gold_reward,
          item_rewards: quest.item_rewards,
          icon: quest.icon,
          quest_type: quest.quest_type,
          repeatable: quest.repeatable,
          reset_interval: quest.reset_interval,
          is_dynamic: quest.is_dynamic,
          template_id: quest.template_id,
          context_snapshot: quest.context_snapshot,
          generated_at: quest.generated_at
        })

      if (insertError) {
        console.error('Failed to insert quest definition:', insertError)
        continue
      }

      // Track in history
      await supabase
        .from('dynamic_quest_history')
        .insert({
          character_id: characterId,
          template_id: template.id,
          quest_definition_id: quest.id,
          context_snapshot: quest.context_snapshot,
          generated_at: quest.generated_at
        })
    }
  }

  return { data: generatedQuests, error: null }
}

/**
 * Selects templates using weighted random selection
 */
function selectTemplatesByWeight(
  templates: QuestTemplate[],
  count: number
): QuestTemplate[] {
  if (templates.length <= count) {
    return templates
  }

  const selected: QuestTemplate[] = []
  const remaining = [...templates]

  for (let i = 0; i < count; i++) {
    if (remaining.length === 0) break

    // Calculate total weight
    const totalWeight = remaining.reduce((sum, t) => sum + t.weight, 0)

    // Pick random weighted index
    let random = Math.random() * totalWeight
    let selectedIndex = 0

    for (let j = 0; j < remaining.length; j++) {
      random -= remaining[j].weight
      if (random <= 0) {
        selectedIndex = j
        break
      }
    }

    // Add selected template and remove from remaining
    selected.push(remaining[selectedIndex])
    remaining.splice(selectedIndex, 1)
  }

  return selected
}

/**
 * Refreshes dynamic quests for a character
 * Generates new quests if player has fewer than the target count
 */
export async function refreshDynamicQuests(
  characterId: string,
  targetCount: number = 3
) {
  const supabase = createClient()

  // Count current active dynamic quests
  const { data: activeQuests } = await supabase
    .from('quests')
    .select(`
      quest_id,
      quest_definitions!inner(is_dynamic)
    `)
    .eq('character_id', characterId)
    .eq('status', 'active')
    .eq('quest_definitions.is_dynamic', true)

  const currentCount = activeQuests?.length || 0

  if (currentCount >= targetCount) {
    return { data: [], error: null }
  }

  // Generate new quests to reach target count
  const neededCount = targetCount - currentCount
  return await generateContextualQuests(characterId, neededCount)
}

/**
 * Marks a dynamic quest as completed in history
 */
export async function completeDynamicQuest(
  characterId: string,
  questDefinitionId: string
) {
  const supabase = createClient()

  const { error } = await supabase
    .from('dynamic_quest_history')
    .update({ completed_at: new Date().toISOString() })
    .eq('character_id', characterId)
    .eq('quest_definition_id', questDefinitionId)

  if (error) {
    console.error('Error completing dynamic quest:', error)
    return { error }
  }

  return { error: null }
}
