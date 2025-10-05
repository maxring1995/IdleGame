'use server'

import { createClient } from '@/utils/supabase/server'
import {
  getActiveHotspots,
  isNodeHotspot,
  getActiveSeasonalEvents,
  recordEncounter,
  resolveEncounter,
  getUnresolvedEncounters
} from '@/lib/hotspots'

/**
 * Spawn a random hotspot in a zone (admin only)
 */
export async function spawnHotspotAction(zoneId: string, durationHours: number = 1) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // TODO: Add admin check here
  // For now, allow any authenticated user to spawn hotspots for testing

  try {
    // Call the database function to spawn a hotspot
    const { data, error } = await supabase
      .rpc('spawn_random_hotspot', {
        p_zone_id: zoneId,
        p_duration_hours: durationHours
      })

    if (error) {
      console.error('[hotspots] Error spawning hotspot:', error)
      return { success: false, error: error.message }
    }

    return { success: true, hotspotId: data }
  } catch (err) {
    console.error('[hotspots] Unexpected error:', err)
    return { success: false, error: 'Failed to spawn hotspot' }
  }
}

/**
 * Expire all outdated hotspots
 */
export async function expireHotspotsAction() {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .rpc('expire_hotspots')

    if (error) {
      console.error('[hotspots] Error expiring hotspots:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[hotspots] Unexpected error:', err)
    return { success: false, error: 'Failed to expire hotspots' }
  }
}

/**
 * Get all active hotspots for a zone
 */
export async function getZoneHotspotsAction(zoneId: string) {
  try {
    const result = await getActiveHotspots(zoneId)

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true, hotspots: result.data }
  } catch (err) {
    console.error('[hotspots] Unexpected error:', err)
    return { success: false, error: 'Failed to get hotspots' }
  }
}

/**
 * Check if a specific node is a hotspot
 */
export async function checkNodeHotspotAction(nodeId: string) {
  try {
    const result = await isNodeHotspot(nodeId)

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true, ...result.data }
  } catch (err) {
    console.error('[hotspots] Unexpected error:', err)
    return { success: false, error: 'Failed to check hotspot status' }
  }
}

/**
 * Get active seasonal events
 */
export async function getSeasonalEventsAction() {
  try {
    const result = await getActiveSeasonalEvents()

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true, events: result.data }
  } catch (err) {
    console.error('[hotspots] Unexpected error:', err)
    return { success: false, error: 'Failed to get seasonal events' }
  }
}

/**
 * Record a new encounter
 */
export async function recordEncounterAction(
  characterId: string,
  nodeId: string,
  encounterType: string,
  encounterData?: any
) {
  try {
    const result = await recordEncounter(characterId, nodeId, encounterType, encounterData)

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true, encounter: result.data }
  } catch (err) {
    console.error('[hotspots] Unexpected error:', err)
    return { success: false, error: 'Failed to record encounter' }
  }
}

/**
 * Resolve an encounter with rewards
 */
export async function resolveEncounterAction(
  encounterId: string,
  resolution: string,
  rewards?: any
) {
  try {
    const result = await resolveEncounter(encounterId, resolution, rewards)

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[hotspots] Unexpected error:', err)
    return { success: false, error: 'Failed to resolve encounter' }
  }
}

/**
 * Get unresolved encounters for current character
 */
export async function getMyEncountersAction(characterId: string) {
  try {
    const result = await getUnresolvedEncounters(characterId)

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true, encounters: result.data }
  } catch (err) {
    console.error('[hotspots] Unexpected error:', err)
    return { success: false, error: 'Failed to get encounters' }
  }
}

/**
 * Create a seasonal event (admin only)
 */
export async function createSeasonalEventAction(
  name: string,
  description: string,
  startDate: Date,
  endDate: Date,
  bonuses: {
    yield_multiplier?: number
    xp_multiplier?: number
    rare_chance?: number
    hotspot_frequency?: number
  },
  affectedZones?: string[],
  affectedMaterials?: string[]
) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // TODO: Add admin check here

  try {
    const { data, error } = await supabase
      .from('seasonal_events')
      .insert({
        name,
        description,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_active: true,
        event_bonuses: bonuses,
        affected_zones: affectedZones,
        affected_materials: affectedMaterials
      })
      .select()
      .single()

    if (error) {
      console.error('[hotspots] Error creating event:', error)
      return { success: false, error: error.message }
    }

    return { success: true, event: data }
  } catch (err) {
    console.error('[hotspots] Unexpected error:', err)
    return { success: false, error: 'Failed to create event' }
  }
}

/**
 * Spawn multiple hotspots at once (for testing/events)
 */
export async function spawnMultipleHotspotsAction(
  zones: string[],
  count: number = 1,
  durationHours: number = 1
) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const spawned = []
  const errors = []

  for (const zone of zones) {
    for (let i = 0; i < count; i++) {
      try {
        const { data, error } = await supabase
          .rpc('spawn_random_hotspot', {
            p_zone_id: zone,
            p_duration_hours: durationHours
          })

        if (error) {
          errors.push({ zone, error: error.message })
        } else {
          spawned.push({ zone, hotspotId: data })
        }
      } catch (err) {
        errors.push({ zone, error: 'Unexpected error' })
      }
    }
  }

  return {
    success: errors.length === 0,
    spawned,
    errors: errors.length > 0 ? errors : undefined
  }
}