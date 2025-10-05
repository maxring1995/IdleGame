import { createClient } from '@/utils/supabase/client'
import type {
  WorldZone,
  WorldZoneWithDiscovery,
  ZoneLandmark,
  ZoneLandmarkWithDiscovery,
  ZoneConnection,
  CharacterZoneDiscovery,
  CharacterLandmarkDiscovery,
  ZoneDetails,
  WorldState
} from './supabase'
import { trackQuestProgress } from './quests'

const supabase = createClient()

// ============================================================================
// Zone Discovery & Management
// ============================================================================

/**
 * Get all discovered zones for a character (fog-of-war system)
 */
export async function getDiscoveredZones(
  characterId: string
): Promise<{ data: WorldZoneWithDiscovery[] | null; error: Error | null }> {
  try {
    // Get character's discoveries
    const { data: discoveries, error: discError } = await supabase
      .from('character_zone_discoveries')
      .select('*')
      .eq('character_id', characterId)

    if (discError) throw discError

    // Get all zones
    const { data: zones, error: zonesError } = await supabase
      .from('world_zones')
      .select('*')
      .order('required_level', { ascending: true })

    if (zonesError) throw zonesError

    // Map zones with discovery info
    const zonesWithDiscovery: WorldZoneWithDiscovery[] = (zones || []).map(zone => {
      const discovery = (discoveries || []).find(d => d.zone_id === zone.id)
      return {
        ...zone,
        isDiscovered: !!discovery,
        discoveredAt: discovery?.discovered_at,
        timeSpent: discovery?.total_time_spent || 0
      }
    })

    return { data: zonesWithDiscovery, error: null }
  } catch (err) {
    console.error('Error fetching discovered zones:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get all zones that can be auto-discovered (no special requirements)
 */
export async function getAutoDiscoverableZones(
  characterLevel: number
): Promise<{ data: WorldZone[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('world_zones')
      .select('*')
      .eq('is_hidden', false)
      .eq('discovery_method', 'auto')
      .lte('required_level', characterLevel)
      .order('required_level', { ascending: true })

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error('Error fetching auto-discoverable zones:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Discover a new zone for a character
 */
export async function discoverZone(
  characterId: string,
  zoneId: string
): Promise<{ data: CharacterZoneDiscovery | null; error: Error | null }> {
  try {
    // Check if already discovered
    const { data: existing, error: existError } = await supabase
      .from('character_zone_discoveries')
      .select('*')
      .eq('character_id', characterId)
      .eq('zone_id', zoneId)
      .maybeSingle()

    if (existError) throw existError

    if (existing) {
      return { data: existing, error: null }
    }

    // Insert new discovery
    const { data, error } = await supabase
      .from('character_zone_discoveries')
      .insert({
        character_id: characterId,
        zone_id: zoneId,
        discovered_at: new Date().toISOString(),
        total_time_spent: 0
      })
      .select()
      .single()

    if (error) throw error

    // Track quest progress for exploration quests
    await trackQuestProgress(characterId, 'explore', {
      amount: 1
    })

    return { data, error: null }
  } catch (err) {
    console.error('Error discovering zone:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Check if a character can access a specific zone
 */
export async function canAccessZone(
  characterId: string,
  zoneId: string,
  characterLevel: number
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    // Get zone details
    const { data: zone, error } = await supabase
      .from('world_zones')
      .select('*')
      .eq('id', zoneId)
      .single()

    if (error || !zone) {
      return { allowed: false, reason: 'Zone not found' }
    }

    // Check level requirement
    if (characterLevel < zone.required_level) {
      return {
        allowed: false,
        reason: `Requires character level ${zone.required_level}`
      }
    }

    // Check if zone is hidden and requires discovery
    if (zone.is_hidden) {
      const { data: discovery } = await supabase
        .from('character_zone_discoveries')
        .select('*')
        .eq('character_id', characterId)
        .eq('zone_id', zoneId)
        .maybeSingle()

      if (!discovery) {
        return {
          allowed: false,
          reason: 'This zone must be discovered first'
        }
      }
    }

    return { allowed: true }
  } catch (err) {
    console.error('Error checking zone access:', err)
    return { allowed: false, reason: 'Error checking access' }
  }
}

/**
 * Get detailed information about a zone including landmarks and connections
 */
export async function getZoneDetails(
  zoneId: string,
  characterId: string
): Promise<{ data: ZoneDetails | null; error: Error | null }> {
  try {
    // Get zone
    const { data: zone, error: zoneError } = await supabase
      .from('world_zones')
      .select('*')
      .eq('id', zoneId)
      .single()

    if (zoneError) throw zoneError

    // Get landmarks
    const { data: landmarks, error: landmarksError } = await supabase
      .from('zone_landmarks')
      .select('*')
      .eq('zone_id', zoneId)

    if (landmarksError) throw landmarksError

    // Get landmark discoveries
    const { data: landmarkDiscoveries } = await supabase
      .from('character_landmark_discoveries')
      .select('*')
      .eq('character_id', characterId)

    // Map landmarks with discovery info
    const landmarksWithDiscovery: ZoneLandmarkWithDiscovery[] = (landmarks || []).map(landmark => {
      const discovery = (landmarkDiscoveries || []).find(d => d.landmark_id === landmark.id)
      return {
        ...landmark,
        isDiscovered: !!discovery || !landmark.is_hidden,
        discoveredAt: discovery?.discovered_at
      }
    })

    // Get connections FROM this zone
    const { data: connections, error: connectionsError } = await supabase
      .from('zone_connections')
      .select('*')
      .eq('from_zone_id', zoneId)
      .eq('is_hidden', false) // Only show non-hidden connections

    if (connectionsError) throw connectionsError

    // Get discovery info
    const { data: discoveryInfo } = await supabase
      .from('character_zone_discoveries')
      .select('*')
      .eq('character_id', characterId)
      .eq('zone_id', zoneId)
      .maybeSingle()

    return {
      data: {
        zone,
        landmarks: landmarksWithDiscovery,
        connections: connections || [],
        discoveryInfo: discoveryInfo || undefined
      },
      error: null
    }
  } catch (err) {
    console.error('Error fetching zone details:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// Landmark Discovery
// ============================================================================

/**
 * Get landmarks in a zone with discovery status
 */
export async function getZoneLandmarks(
  zoneId: string,
  characterId: string
): Promise<{ data: ZoneLandmarkWithDiscovery[] | null; error: Error | null }> {
  try {
    // Get all landmarks in zone
    const { data: landmarks, error: landmarksError } = await supabase
      .from('zone_landmarks')
      .select('*')
      .eq('zone_id', zoneId)

    if (landmarksError) throw landmarksError

    // Get character's landmark discoveries
    const { data: discoveries } = await supabase
      .from('character_landmark_discoveries')
      .select('*')
      .eq('character_id', characterId)

    // Map with discovery status
    const landmarksWithDiscovery: ZoneLandmarkWithDiscovery[] = (landmarks || []).map(landmark => {
      const discovery = (discoveries || []).find(d => d.landmark_id === landmark.id)
      return {
        ...landmark,
        isDiscovered: !!discovery || !landmark.is_hidden,
        discoveredAt: discovery?.discovered_at
      }
    })

    return { data: landmarksWithDiscovery, error: null }
  } catch (err) {
    console.error('Error fetching zone landmarks:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Attempt to discover a hidden landmark (random chance based on discovery_chance)
 */
export async function attemptLandmarkDiscovery(
  characterId: string,
  zoneId: string
): Promise<{ data: ZoneLandmark | null; error: Error | null }> {
  try {
    // Get hidden landmarks in zone that haven't been discovered yet
    const { data: landmarks, error: landmarksError } = await supabase
      .from('zone_landmarks')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('is_hidden', true)

    if (landmarksError) throw landmarksError
    if (!landmarks || landmarks.length === 0) {
      return { data: null, error: null } // No hidden landmarks
    }

    // Get already discovered landmarks
    const { data: discoveries } = await supabase
      .from('character_landmark_discoveries')
      .select('landmark_id')
      .eq('character_id', characterId)

    const discoveredIds = new Set((discoveries || []).map(d => d.landmark_id))

    // Filter out already discovered landmarks
    const undiscovered = landmarks.filter(l => !discoveredIds.has(l.id))
    if (undiscovered.length === 0) {
      return { data: null, error: null } // All discovered
    }

    // Roll for discovery
    for (const landmark of undiscovered) {
      const roll = Math.random() * 100
      if (roll < (landmark.discovery_chance || 0)) {
        // Success! Discover this landmark
        const { error: insertError } = await supabase
          .from('character_landmark_discoveries')
          .insert({
            character_id: characterId,
            landmark_id: landmark.id,
            discovered_at: new Date().toISOString()
          })

        if (insertError) throw insertError

        // Grant landmark bonuses
        await grantLandmarkBonuses(characterId, landmark.id)

        return { data: landmark, error: null }
      }
    }

    return { data: null, error: null } // No discovery this time
  } catch (err) {
    console.error('Error attempting landmark discovery:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Grant stat bonuses from a discovered landmark
 */
async function grantLandmarkBonuses(
  characterId: string,
  landmarkId: string
): Promise<void> {
  try {
    // Get landmark details with bonuses
    const { data: landmark, error: landmarkError } = await supabase
      .from('zone_landmarks')
      .select('*')
      .eq('id', landmarkId)
      .single()

    if (landmarkError || !landmark) return

    // Create landmark bonus record
    const { error: bonusError } = await supabase
      .from('character_landmark_bonuses')
      .insert({
        character_id: characterId,
        landmark_id: landmarkId,
        attack_bonus: landmark.attack_bonus || 0,
        defense_bonus: landmark.defense_bonus || 0,
        health_bonus: landmark.health_bonus || 0,
        mana_bonus: landmark.mana_bonus || 0,
        speed_bonus: landmark.speed_bonus || 0,
        discovery_bonus: landmark.discovery_bonus || 0,
        gold_find_bonus: landmark.gold_find_bonus || 0,
        xp_bonus: landmark.xp_bonus || 0
      })

    if (bonusError) {
      console.error('Error creating landmark bonus:', bonusError)
      return
    }

    // Update character stats immediately if there are stat bonuses
    if (landmark.attack_bonus || landmark.defense_bonus || landmark.health_bonus || landmark.mana_bonus) {
      const { updateCharacterStats } = await import('./inventory')
      await updateCharacterStats(characterId)
    }
  } catch (err) {
    console.error('Error granting landmark bonuses:', err)
  }
}

/**
 * Manually discover a landmark (e.g., from quest completion)
 */
export async function discoverLandmark(
  characterId: string,
  landmarkId: string
): Promise<{ data: CharacterLandmarkDiscovery | null; error: Error | null }> {
  try {
    // Check if already discovered
    const { data: existing } = await supabase
      .from('character_landmark_discoveries')
      .select('*')
      .eq('character_id', characterId)
      .eq('landmark_id', landmarkId)
      .maybeSingle()

    if (existing) {
      return { data: existing, error: null }
    }

    // Insert new discovery
    const { data, error } = await supabase
      .from('character_landmark_discoveries')
      .insert({
        character_id: characterId,
        landmark_id: landmarkId,
        discovered_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // Grant landmark bonuses
    await grantLandmarkBonuses(characterId, landmarkId)

    return { data, error: null }
  } catch (err) {
    console.error('Error discovering landmark:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// Zone Connections & Navigation
// ============================================================================

/**
 * Get available connections from a zone
 */
export async function getZoneConnections(
  fromZoneId: string,
  characterId: string
): Promise<{ data: ZoneConnection[] | null; error: Error | null }> {
  try {
    // Get all connections from this zone
    const { data: connections, error } = await supabase
      .from('zone_connections')
      .select('*')
      .eq('from_zone_id', fromZoneId)

    if (error) throw error

    // Filter out hidden connections that haven't been discovered
    // (for now, we'll just return non-hidden ones; secret passages can be added later)
    const visibleConnections = (connections || []).filter(c => !c.is_hidden)

    return { data: visibleConnections, error: null }
  } catch (err) {
    console.error('Error fetching zone connections:', err)
    return { data: null, error: err as Error }
  }
}

// ============================================================================
// World State Management
// ============================================================================

/**
 * Get a world state value by key
 */
export async function getWorldState(
  key: string
): Promise<{ data: any | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('world_state')
      .select('value')
      .eq('key', key)
      .single()

    if (error) throw error
    return { data: data?.value || null, error: null }
  } catch (err) {
    console.error('Error fetching world state:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get current time of day
 */
export async function getTimeOfDay(): Promise<{
  data: 'dawn' | 'day' | 'dusk' | 'night' | null
  error: Error | null
}> {
  const { data, error } = await getWorldState('time_of_day')
  return { data, error }
}

/**
 * Get current weather for a zone
 */
export async function getCurrentWeather(
  zoneId: string
): Promise<{ data: string | null; error: Error | null }> {
  try {
    // Get zone weather patterns
    const { data: zone, error } = await supabase
      .from('world_zones')
      .select('weather_patterns')
      .eq('id', zoneId)
      .single()

    if (error) throw error

    if (!zone?.weather_patterns) {
      return { data: 'clear', error: null }
    }

    // Roll for weather based on probability
    const patterns = zone.weather_patterns as Record<string, number>
    const roll = Math.random() * 100
    let cumulative = 0

    for (const [weather, probability] of Object.entries(patterns)) {
      cumulative += probability
      if (roll <= cumulative) {
        return { data: weather, error: null }
      }
    }

    return { data: 'clear', error: null }
  } catch (err) {
    console.error('Error fetching zone weather:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Update time spent in a zone
 */
export async function updateZoneTimeSpent(
  characterId: string,
  zoneId: string,
  additionalSeconds: number
): Promise<{ data: CharacterZoneDiscovery | null; error: Error | null }> {
  try {
    // Get current discovery record
    const { data: discovery, error: fetchError } = await supabase
      .from('character_zone_discoveries')
      .select('*')
      .eq('character_id', characterId)
      .eq('zone_id', zoneId)
      .maybeSingle()

    if (fetchError) throw fetchError

    if (!discovery) {
      // Create discovery record if it doesn't exist
      return await discoverZone(characterId, zoneId)
    }

    // Update time spent
    const { data, error } = await supabase
      .from('character_zone_discoveries')
      .update({
        total_time_spent: discovery.total_time_spent + additionalSeconds
      })
      .eq('character_id', characterId)
      .eq('zone_id', zoneId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error('Error updating zone time spent:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Initialize character in starting zone (Havenbrook)
 */
export async function initializeCharacterInStartingZone(
  characterId: string
): Promise<{ data: boolean; error: Error | null }> {
  try {
    const HAVENBROOK_ID = '00000000-0000-0000-0000-000000000001'

    // Discover Havenbrook
    await discoverZone(characterId, HAVENBROOK_ID)

    // Set as current zone
    const { error } = await supabase
      .from('characters')
      .update({ current_zone_id: HAVENBROOK_ID })
      .eq('id', characterId)

    if (error) throw error
    return { data: true, error: null }
  } catch (err) {
    console.error('Error initializing character in starting zone:', err)
    return { data: false, error: err as Error }
  }
}
