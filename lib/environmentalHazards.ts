import { supabase } from './supabase'
import type {
  WeatherPattern,
  ExplorationHazard,
  Character
} from './supabase'

export type WeatherType = 'clear' | 'rain' | 'storm' | 'fog' | 'snow' | 'heat_wave' | 'blizzard' | 'sandstorm'
export type HazardType = 'environmental' | 'creature' | 'magical' | 'natural_disaster'

/**
 * Get current weather for a zone
 */
export async function getCurrentWeather(
  zoneId: string
): Promise<{ data: WeatherPattern | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('weather_patterns')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Update weather for a zone (dynamic weather changes)
 */
export async function updateWeather(
  zoneId: string,
  weatherType: WeatherType,
  intensity: number = 50
): Promise<{ data: WeatherPattern | null; error: Error | null }> {
  try {
    // Deactivate old weather
    await supabase
      .from('weather_patterns')
      .update({ is_active: false })
      .eq('zone_id', zoneId)

    // Create new weather
    const { data, error } = await supabase
      .from('weather_patterns')
      .insert({
        zone_id: zoneId,
        weather_type: weatherType,
        intensity,
        is_active: true,
        effects: getWeatherEffects(weatherType, intensity),
        duration_minutes: 60 // 1 hour default
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get weather effects based on type and intensity
 */
function getWeatherEffects(weatherType: WeatherType, intensity: number): Record<string, any> {
  const baseEffects: Record<WeatherType, Record<string, any>> = {
    clear: {
      visibility: 100,
      movement_speed: 100,
      resource_quality: 100
    },
    rain: {
      visibility: 80 - (intensity * 0.3),
      movement_speed: 90 - (intensity * 0.2),
      tracking_difficulty: intensity * 0.5,
      water_resource_bonus: 20 + (intensity * 0.3)
    },
    storm: {
      visibility: 50 - (intensity * 0.4),
      movement_speed: 70 - (intensity * 0.3),
      damage_per_tick: intensity * 0.1,
      shelter_required: intensity > 70
    },
    fog: {
      visibility: 40 - (intensity * 0.5),
      encounter_chance: intensity * 0.4,
      mystery_event_bonus: 30 + (intensity * 0.2)
    },
    snow: {
      visibility: 70 - (intensity * 0.3),
      movement_speed: 80 - (intensity * 0.4),
      cold_damage: intensity * 0.08,
      tracking_bonus: 15 + (intensity * 0.2)
    },
    heat_wave: {
      stamina_drain: intensity * 0.15,
      water_consumption: intensity * 0.2,
      fire_hazard_chance: intensity * 0.3
    },
    blizzard: {
      visibility: 20,
      movement_speed: 50,
      cold_damage: intensity * 0.2,
      shelter_required: true,
      ice_resource_bonus: 40
    },
    sandstorm: {
      visibility: 30,
      movement_speed: 60,
      sand_damage: intensity * 0.15,
      navigation_difficulty: intensity * 0.5
    }
  }

  return baseEffects[weatherType] || baseEffects.clear
}

/**
 * Get active hazards for a zone
 */
export async function getActiveHazards(
  zoneId: string,
  dangerLevel: number
): Promise<{ data: ExplorationHazard[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('exploration_hazards')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('is_active', true)
      .lte('danger_level', dangerLevel)
      .order('severity', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Process hazard encounter during exploration
 */
export async function encounterHazard(
  characterId: string,
  hazard: ExplorationHazard
): Promise<{
  data: {
    success: boolean
    damage: number
    effects: string[]
    message: string
  } | null
  error: Error | null
}> {
  try {
    // Get character for resistance checks
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single()

    if (charError) throw charError

    // Calculate success chance (based on survival skill + luck)
    const survivalSkill = await getSkillLevel(characterId, 'survival')
    const baseSuccessChance = 50 + (survivalSkill * 2) - (hazard.severity * 10)
    const success = Math.random() * 100 < baseSuccessChance

    let damage = 0
    const effects: string[] = []
    let message = ''

    if (success) {
      message = `Successfully avoided ${hazard.hazard_name}!`
      effects.push('Gained hazard experience')
    } else {
      // Calculate damage
      const baseDamage = hazard.damage_amount || 0
      damage = Math.floor(baseDamage * (1 - (survivalSkill / 200)))

      // Apply damage
      if (damage > 0) {
        await supabase
          .from('characters')
          .update({ health: Math.max(0, character.health - damage) })
          .eq('id', characterId)

        effects.push(`Took ${damage} damage`)
      }

      // Apply status effects
      if (hazard.status_effects && Object.keys(hazard.status_effects).length > 0) {
        effects.push(...Object.keys(hazard.status_effects))
      }

      message = `Encountered ${hazard.hazard_name}! ${hazard.description}`
    }

    // Log the encounter
    await supabase
      .from('exploration_event_history')
      .insert({
        character_id: characterId,
        event_type: 'obstacle',
        event_name: hazard.hazard_name,
        outcome: success ? 'success' : 'failure',
        rewards: { hazard_xp: success ? 25 : 10 }
      })

    return {
      data: { success, damage, effects, message },
      error: null
    }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get skill level helper
 */
async function getSkillLevel(characterId: string, skillType: string): Promise<number> {
  const { data } = await supabase
    .from('exploration_skills')
    .select('level')
    .eq('character_id', characterId)
    .eq('skill_type', skillType)
    .single()

  return data?.level || 1
}

/**
 * Check if hazard should trigger based on weather and zone conditions
 */
export async function checkHazardTrigger(
  zoneId: string,
  characterId: string
): Promise<{ data: ExplorationHazard | null; error: Error | null }> {
  try {
    // Get current weather
    const { data: weather } = await getCurrentWeather(zoneId)

    // Get zone's active hazards
    const { data: hazards } = await getActiveHazards(zoneId, 10)

    if (!hazards || hazards.length === 0) {
      return { data: null, error: null }
    }

    // Weather amplifies hazard chance
    let weatherMultiplier = 1.0
    if (weather) {
      if (weather.weather_type === 'storm' || weather.weather_type === 'blizzard') {
        weatherMultiplier = 2.0
      } else if (weather.weather_type === 'rain' || weather.weather_type === 'snow') {
        weatherMultiplier = 1.5
      }
    }

    // Roll for hazard (10% base chance, modified by weather)
    const hazardChance = 10 * weatherMultiplier
    if (Math.random() * 100 > hazardChance) {
      return { data: null, error: null }
    }

    // Select random hazard weighted by severity
    const totalSeverity = hazards.reduce((sum, h) => sum + h.severity, 0)
    let roll = Math.random() * totalSeverity

    for (const hazard of hazards) {
      roll -= hazard.severity
      if (roll <= 0) {
        return { data: hazard, error: null }
      }
    }

    return { data: hazards[0], error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Apply weather effects to exploration
 */
export function applyWeatherEffects(
  weather: WeatherPattern | null,
  baseSpeed: number
): {
  speed: number
  effects: string[]
} {
  if (!weather || !weather.is_active) {
    return { speed: baseSpeed, effects: [] }
  }

  const effects: string[] = []
  let speed = baseSpeed

  const weatherEffects = weather.effects as Record<string, number>

  if (weatherEffects.movement_speed) {
    const speedMod = weatherEffects.movement_speed / 100
    speed = Math.floor(baseSpeed * speedMod)
    effects.push(`Movement speed: ${weatherEffects.movement_speed}%`)
  }

  if (weatherEffects.visibility) {
    effects.push(`Visibility: ${weatherEffects.visibility}%`)
  }

  if (weatherEffects.damage_per_tick) {
    effects.push(`⚠️ Taking ${weatherEffects.damage_per_tick} damage per tick`)
  }

  if (weatherEffects.shelter_required) {
    effects.push(`⛺ Shelter required!`)
  }

  return { speed, effects }
}

/**
 * Seed initial hazards for a zone (call once per zone)
 */
export async function seedHazards(zoneId: string, zoneType: string): Promise<void> {
  const hazardTemplates: Record<string, any[]> = {
    forest: [
      {
        hazard_name: 'Thorny Undergrowth',
        hazard_type: 'environmental',
        description: 'Dense thorny bushes block your path',
        severity: 3,
        damage_amount: 15,
        trigger_chance: 15
      },
      {
        hazard_name: 'Wild Beasts',
        hazard_type: 'creature',
        description: 'Aggressive animals defend their territory',
        severity: 5,
        damage_amount: 30,
        trigger_chance: 10
      },
      {
        hazard_name: 'Poisonous Plants',
        hazard_type: 'environmental',
        description: 'Toxic flora releases harmful spores',
        severity: 4,
        damage_amount: 20,
        trigger_chance: 12,
        status_effects: { poisoned: 30 }
      }
    ],
    mountain: [
      {
        hazard_name: 'Rockslide',
        hazard_type: 'natural_disaster',
        description: 'Loose rocks tumble down the mountainside',
        severity: 7,
        damage_amount: 50,
        trigger_chance: 8
      },
      {
        hazard_name: 'Thin Air',
        hazard_type: 'environmental',
        description: 'High altitude makes breathing difficult',
        severity: 4,
        damage_amount: 10,
        trigger_chance: 20,
        status_effects: { exhausted: 60 }
      },
      {
        hazard_name: 'Ice Patches',
        hazard_type: 'environmental',
        description: 'Slippery ice covers the path',
        severity: 3,
        damage_amount: 25,
        trigger_chance: 15
      }
    ],
    desert: [
      {
        hazard_name: 'Scorching Heat',
        hazard_type: 'environmental',
        description: 'Extreme temperatures drain your stamina',
        severity: 5,
        damage_amount: 20,
        trigger_chance: 25
      },
      {
        hazard_name: 'Quicksand',
        hazard_type: 'environmental',
        description: 'Hidden quicksand threatens to trap you',
        severity: 6,
        damage_amount: 35,
        trigger_chance: 10
      },
      {
        hazard_name: 'Sand Vipers',
        hazard_type: 'creature',
        description: 'Venomous serpents lurk in the dunes',
        severity: 5,
        damage_amount: 30,
        trigger_chance: 12,
        status_effects: { poisoned: 45 }
      }
    ]
  }

  const hazards = hazardTemplates[zoneType] || hazardTemplates.forest

  for (const template of hazards) {
    await supabase.from('exploration_hazards').insert({
      zone_id: zoneId,
      ...template,
      is_active: true,
      danger_level: Math.ceil(template.severity * 1.5)
    })
  }
}
