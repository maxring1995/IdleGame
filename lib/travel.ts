import { createClient } from '@/utils/supabase/client'
import type {
  ActiveTravel,
  TravelEncounter,
  TravelUpdate,
  TravelLogEntry,
  ZoneConnection,
  WorldZone
} from './supabase'
import { discoverZone, updateZoneTimeSpent } from './worldZones'
import { addSkillExperience } from './skills'

// ============================================================================
// Travel Time Calculation
// ============================================================================

export interface TravelModifiers {
  characterLevel: number
  weather?: string
  buffs?: Array<{ type: string; value: number }>
}

/**
 * Calculate actual travel time based on base time and modifiers
 */
export function calculateTravelTime(
  baseTime: number,
  modifiers: TravelModifiers,
  connectionType: string
): number {
  let time = baseTime

  // Weather effects
  if (modifiers.weather === 'blizzard') time *= 1.5
  if (modifiers.weather === 'fog') time *= 1.2
  if (modifiers.weather === 'clear') time *= 0.9

  // Character level bonus (experienced travelers move faster)
  const levelBonus = 1 - (modifiers.characterLevel * 0.002) // Max 20% reduction at level 100
  time *= Math.max(levelBonus, 0.8) // Cap at 20% reduction

  // Connection type modifiers
  if (connectionType === 'portal') time *= 0.1 // Near-instant
  if (connectionType === 'teleport') time *= 0.05 // Even faster
  if (connectionType === 'secret_passage') time *= 1.3 // Slower but hidden

  // Buffs (speed potions, mounts, etc.)
  if (modifiers.buffs) {
    modifiers.buffs.forEach(buff => {
      if (buff.type === 'travel_speed') {
        time *= (1 - buff.value)
      }
    })
  }

  return Math.max(Math.floor(time), 5) // Minimum 5 seconds
}

// ============================================================================
// Random Encounter System
// ============================================================================

/**
 * Roll for a random encounter during travel
 */
export function rollTravelEncounter(
  characterLevel: number,
  dangerLevel: number,
  connectionType: string
): TravelEncounter {
  // Base encounter chance: 20%
  let encounterChance = 0.20

  // Danger level increases chance
  encounterChance += (dangerLevel / 200) // +50% at danger 100

  // Secret passages more likely to have encounters
  if (connectionType === 'secret_passage') encounterChance += 0.15

  // Safe routes less likely
  if (connectionType === 'path') encounterChance -= 0.10

  // Portals/teleports have no encounters
  if (connectionType === 'portal' || connectionType === 'teleport') {
    return { type: 'none' }
  }

  if (Math.random() > encounterChance) {
    return { type: 'none' }
  }

  // Roll encounter type
  const roll = Math.random()

  if (roll < 0.40) {
    // Combat encounter (40% of encounters)
    return {
      type: 'combat',
      data: {
        message: 'You encounter enemies on the road!',
        enemyLevel: Math.max(1, characterLevel + Math.floor(Math.random() * 3) - 1)
      }
    }
  }

  if (roll < 0.65) {
    // Loot encounter (25% of encounters)
    const goldFound = Math.floor(Math.random() * characterLevel * 10) + 10
    return {
      type: 'loot',
      data: {
        message: `You discover a hidden cache along the path!`,
        gold: goldFound,
        items: [] // Could add random items here
      }
    }
  }

  if (roll < 0.85) {
    // Merchant encounter (20% of encounters)
    return {
      type: 'merchant',
      data: {
        message: 'A traveling merchant offers their wares.',
        merchantType: 'traveling'
      }
    }
  }

  // Lore encounter (15% of encounters)
  const loreMessages = [
    'You find an ancient inscription on a roadside stone.',
    'A mysterious traveler shares a cryptic riddle.',
    'You notice strange markings on the trees.',
    'An old signpost points to a forgotten path.',
    'You discover remnants of a long-abandoned camp.'
  ]

  return {
    type: 'lore',
    data: {
      message: loreMessages[Math.floor(Math.random() * loreMessages.length)]
    }
  }
}

// ============================================================================
// Travel Management
// ============================================================================

/**
 * Start traveling from one zone to another
 */
export async function startTravel(
  characterId: string,
  fromZoneId: string,
  toZoneId: string,
  characterLevel: number
): Promise<{ data: ActiveTravel | null; error: Error | null }> {
  const supabase = createClient()
  try {
    // Get the connection between zones
    const { data: connection, error: connError } = await supabase
      .from('zone_connections')
      .select('*')
      .eq('from_zone_id', fromZoneId)
      .eq('to_zone_id', toZoneId)
      .maybeSingle()

    if (connError) throw new Error('Error finding route: ' + connError.message)
    if (!connection) throw new Error('No route found between these zones')

    // Get destination zone for danger level
    const { data: toZone, error: zoneError } = await supabase
      .from('world_zones')
      .select('*')
      .eq('id', toZoneId)
      .maybeSingle()

    if (zoneError) throw new Error('Error finding zone: ' + zoneError.message)
    if (!toZone) throw new Error('Destination zone not found')

    // Calculate travel time
    const actualTravelTime = calculateTravelTime(
      connection.base_travel_time,
      { characterLevel },
      connection.connection_type
    )

    const now = new Date()
    const estimatedArrival = new Date(now.getTime() + actualTravelTime * 1000)

    // Roll for encounter (but don't execute yet)
    const encounter = rollTravelEncounter(
      characterLevel,
      toZone.danger_level,
      connection.connection_type
    )

    // Create travel session
    const { data, error } = await supabase
      .from('active_travels')
      .insert({
        character_id: characterId,
        from_zone_id: fromZoneId,
        to_zone_id: toZoneId,
        connection_id: connection.id,
        started_at: now.toISOString(),
        estimated_arrival: estimatedArrival.toISOString(),
        actual_travel_time: actualTravelTime,
        status: 'traveling',
        can_cancel: true,
        encounter_rolled: true,
        encounter_type: encounter.type === 'none' ? null : encounter.type,
        encounter_data: encounter.type === 'none' ? null : encounter.data
      })
      .select()
      .single()

    if (error) throw error

    // Update character's current zone to traveling state
    await supabase
      .from('characters')
      .update({ current_zone_id: null })
      .eq('id', characterId)

    return { data, error: null }
  } catch (err) {
    console.error('Error starting travel:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get active travel session for a character
 */
export async function getActiveTravel(
  characterId: string
): Promise<{ data: ActiveTravel | null; error: Error | null }> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('active_travels')
      .select('*')
      .eq('character_id', characterId)
      .eq('status', 'traveling')
      .maybeSingle()

    if (error) throw error
    return { data: data || null, error: null }
  } catch (err) {
    console.error('Error fetching active travel:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Process travel progress and check for completion/encounters
 */
export async function processTravel(
  characterId: string
): Promise<{ data: TravelUpdate | null; error: Error | null }> {
  const supabase = createClient()
  try {
    const { data: travel, error: travelError } = await getActiveTravel(characterId)
    if (travelError) throw travelError
    if (!travel) throw new Error('No active travel session')

    const now = new Date()
    const arrival = new Date(travel.estimated_arrival)
    const started = new Date(travel.started_at)
    const totalTime = arrival.getTime() - started.getTime()
    const elapsed = now.getTime() - started.getTime()
    const remaining = arrival.getTime() - now.getTime()

    const progress = Math.min(Math.max((elapsed / totalTime) * 100, 0), 100)

    // Check if travel is complete
    if (now >= arrival) {
      return {
        data: {
          status: 'completed',
          progress: 100,
          timeRemaining: 0
        },
        error: null
      }
    }

    // Check if encounter should trigger (at 50% progress)
    if (progress >= 50 && travel.encounter_type && !travel.encounter_data?.triggered) {
      return {
        data: {
          status: 'encounter',
          progress,
          timeRemaining: remaining,
          encounter: {
            type: travel.encounter_type,
            data: travel.encounter_data
          }
        },
        error: null
      }
    }

    return {
      data: {
        status: 'in_progress',
        progress,
        timeRemaining: remaining
      },
      error: null
    }
  } catch (err) {
    console.error('Error processing travel:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Complete travel and update character location
 */
export async function completeTravel(
  characterId: string
): Promise<{ data: boolean; error: Error | null }> {
  const supabase = createClient()
  try {
    // Get travel session
    const { data: travel } = await getActiveTravel(characterId)
    if (!travel) throw new Error('No active travel session')

    // Discover destination zone
    await discoverZone(characterId, travel.to_zone_id)

    // Update character location
    await supabase
      .from('characters')
      .update({ current_zone_id: travel.to_zone_id })
      .eq('id', characterId)

    // Add travel log entry
    const { data: toZone } = await supabase
      .from('world_zones')
      .select('name')
      .eq('id', travel.to_zone_id)
      .maybeSingle()

    await addTravelLogEntry(
      characterId,
      travel.to_zone_id,
      'travel_completed',
      `Arrived at ${toZone?.name || 'destination'}`
    )

    // Award Agility XP for completing travel (10 XP per travel)
    await addSkillExperience(characterId, 'agility', 10)

    // Delete travel session
    await supabase
      .from('active_travels')
      .delete()
      .eq('id', travel.id)

    return { data: true, error: null }
  } catch (err) {
    console.error('Error completing travel:', err)
    return { data: false, error: err as Error }
  }
}

/**
 * Cancel active travel (returns character to origin)
 */
export async function cancelTravel(
  characterId: string
): Promise<{ data: boolean; error: Error | null }> {
  const supabase = createClient()
  try {
    const { data: travel } = await getActiveTravel(characterId)
    if (!travel) throw new Error('No active travel session')

    if (!travel.can_cancel) {
      throw new Error('This travel cannot be cancelled')
    }

    // Return character to origin
    await supabase
      .from('characters')
      .update({ current_zone_id: travel.from_zone_id })
      .eq('id', characterId)

    // Delete travel session
    await supabase
      .from('active_travels')
      .delete()
      .eq('id', travel.id)

    return { data: true, error: null }
  } catch (err) {
    console.error('Error cancelling travel:', err)
    return { data: false, error: err as Error }
  }
}

/**
 * Handle encounter during travel
 */
export async function handleTravelEncounter(
  characterId: string,
  action: 'engage' | 'flee'
): Promise<{ data: any; error: Error | null }> {
  const supabase = createClient()
  try {
    const { data: travel } = await getActiveTravel(characterId)
    if (!travel) throw new Error('No active travel session')

    // Mark encounter as triggered
    await supabase
      .from('active_travels')
      .update({
        encounter_data: {
          ...travel.encounter_data,
          triggered: true,
          action
        }
      })
      .eq('id', travel.id)

    // For loot encounters, immediately grant rewards
    if (travel.encounter_type === 'loot' && action === 'engage') {
      const gold = travel.encounter_data?.gold || 0

      // Get current gold
      const { data: charData } = await supabase
        .from('characters')
        .select('gold')
        .eq('id', characterId)
        .single()

      await supabase
        .from('characters')
        .update({ gold: (charData?.gold || 0) + gold })
        .eq('id', characterId)

      await addTravelLogEntry(
        characterId,
        null,
        'encounter',
        `Found ${gold} gold during travel`
      )

      return {
        data: { type: 'loot', gold, success: true },
        error: null
      }
    }

    // For other encounter types, just log
    if (action === 'engage') {
      await addTravelLogEntry(
        characterId,
        null,
        'encounter',
        travel.encounter_data?.message || 'Had an encounter during travel'
      )
    }

    return { data: { type: travel.encounter_type, action }, error: null }
  } catch (err) {
    console.error('Error handling travel encounter:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// Travel Log
// ============================================================================

/**
 * Add entry to travel log
 */
export async function addTravelLogEntry(
  characterId: string,
  zoneId: string | null,
  entryType: TravelLogEntry['entry_type'],
  entryText: string,
  entryData?: any
): Promise<{ data: TravelLogEntry | null; error: Error | null }> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('travel_log')
      .insert({
        character_id: characterId,
        zone_id: zoneId,
        entry_type: entryType,
        entry_text: entryText,
        entry_data: entryData,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error('Error adding travel log entry:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get travel log for a character
 */
export async function getTravelLog(
  characterId: string,
  limit: number = 50
): Promise<{ data: TravelLogEntry[] | null; error: Error | null }> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('travel_log')
      .select('*')
      .eq('character_id', characterId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error('Error fetching travel log:', err)
    return { data: null, error: err as Error }
  }
}
