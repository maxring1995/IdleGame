import { supabase } from './supabase'
import type { HiddenLocation, Landmark } from './supabase'

export type LocationType = 'dungeon' | 'cave' | 'ruins' | 'shrine' | 'treasure_room' | 'boss_lair'
export type DiscoveryMethod = 'exploration' | 'puzzle' | 'hidden_clue' | 'companion_ability' | 'special_event'

/**
 * Discover a hidden location
 */
export async function discoverHiddenLocation(
  characterId: string,
  zoneId: string,
  x: number,
  y: number
): Promise<{ data: HiddenLocation | null; error: Error | null }> {
  try {
    // Check if location exists at coordinates
    const { data: location, error: locationError } = await supabase
      .from('hidden_locations')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('entrance_x', x)
      .eq('entrance_y', y)
      .single()

    if (locationError) {
      if (locationError.code === 'PGRST116') {
        // No location here
        return { data: null, error: null }
      }
      throw locationError
    }

    // Check if character meets requirements
    const { data: character } = await supabase
      .from('characters')
      .select('level')
      .eq('id', characterId)
      .single()

    if (character && character.level < location.min_level) {
      throw new Error(`Requires level ${location.min_level} to enter`)
    }

    // Check required skills
    if (location.required_skills && Object.keys(location.required_skills).length > 0) {
      const requiredSkills = location.required_skills as Record<string, number>

      for (const [skillType, requiredLevel] of Object.entries(requiredSkills)) {
        const { data: skill } = await supabase
          .from('exploration_skills')
          .select('level')
          .eq('character_id', characterId)
          .eq('skill_type', skillType)
          .single()

        if (!skill || skill.level < requiredLevel) {
          throw new Error(`Requires ${skillType} level ${requiredLevel}`)
        }
      }
    }

    // Mark as discovered
    const { data: discovery, error: discoveryError } = await supabase
      .from('character_discoveries')
      .insert({
        character_id: characterId,
        location_id: location.id,
        discovered_at: new Date().toISOString()
      })
      .select()
      .single()

    if (discoveryError && discoveryError.code !== '23505') { // Ignore duplicate key
      throw discoveryError
    }

    // Award discovery rewards
    if (location.discovery_rewards) {
      const rewards = location.discovery_rewards as Record<string, number>

      if (rewards.gold) {
        await supabase
          .from('characters')
          .update({ gold: supabase.raw(`gold + ${rewards.gold}`) })
          .eq('id', characterId)
      }

      if (rewards.experience) {
        await supabase
          .from('characters')
          .update({ experience: supabase.raw(`experience + ${rewards.experience}`) })
          .eq('id', characterId)
      }
    }

    return { data: location, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Enter a hidden location (start dungeon run)
 */
export async function enterHiddenLocation(
  characterId: string,
  locationId: string
): Promise<{
  data: {
    location: HiddenLocation
    dungeon_run_id: string
    current_floor: number
  } | null
  error: Error | null
}> {
  try {
    const { data: location, error: locationError } = await supabase
      .from('hidden_locations')
      .select('*')
      .eq('id', locationId)
      .single()

    if (locationError) throw locationError

    // Create dungeon run
    const { data: dungeonRun, error: runError } = await supabase
      .from('dungeon_runs')
      .insert({
        character_id: characterId,
        location_id: locationId,
        current_floor: 1,
        max_floor_reached: 1,
        is_active: true,
        start_time: new Date().toISOString()
      })
      .select()
      .single()

    if (runError) throw runError

    return {
      data: {
        location,
        dungeon_run_id: dungeonRun.id,
        current_floor: 1
      },
      error: null
    }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Progress to next floor in dungeon
 */
export async function progressDungeonFloor(
  dungeonRunId: string,
  defeated_boss: boolean = false
): Promise<{
  data: {
    current_floor: number
    completed: boolean
    rewards: Record<string, any>
  } | null
  error: Error | null
}> {
  try {
    const { data: run, error: runError } = await supabase
      .from('dungeon_runs')
      .select('*, hidden_locations(*)')
      .eq('id', dungeonRunId)
      .single()

    if (runError) throw runError

    const location = run.hidden_locations as HiddenLocation
    const maxFloors = location.floors || 1
    const nextFloor = run.current_floor + 1

    let completed = false
    let rewards: Record<string, any> = {}

    if (nextFloor > maxFloors || defeated_boss) {
      // Dungeon completed!
      completed = true
      rewards = location.completion_rewards as Record<string, any> || {}

      await supabase
        .from('dungeon_runs')
        .update({
          is_active: false,
          completed: true,
          completion_time: new Date().toISOString()
        })
        .eq('id', dungeonRunId)

      // Award rewards
      if (rewards.gold) {
        await supabase
          .from('characters')
          .update({ gold: supabase.raw(`gold + ${rewards.gold}`) })
          .eq('id', run.character_id)
      }

      if (rewards.experience) {
        await supabase
          .from('characters')
          .update({ experience: supabase.raw(`experience + ${rewards.experience}`) })
          .eq('id', run.character_id)
      }
    } else {
      // Progress to next floor
      await supabase
        .from('dungeon_runs')
        .update({
          current_floor: nextFloor,
          max_floor_reached: Math.max(run.max_floor_reached, nextFloor)
        })
        .eq('id', dungeonRunId)
    }

    return {
      data: {
        current_floor: completed ? maxFloors : nextFloor,
        completed,
        rewards
      },
      error: null
    }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get discovered locations for character
 */
export async function getDiscoveredLocations(
  characterId: string
): Promise<{ data: HiddenLocation[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('character_discoveries')
      .select('hidden_locations(*)')
      .eq('character_id', characterId)
      .order('discovered_at', { ascending: false })

    if (error) throw error

    const locations = data?.map(d => d.hidden_locations) as HiddenLocation[]
    return { data: locations, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Discover a landmark
 */
export async function discoverLandmark(
  characterId: string,
  zoneId: string,
  x: number,
  y: number
): Promise<{ data: Landmark | null; error: Error | null }> {
  try {
    // Check if landmark exists at coordinates
    const { data: landmark, error: landmarkError } = await supabase
      .from('landmarks')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('coordinate_x', x)
      .eq('coordinate_y', y)
      .single()

    if (landmarkError) {
      if (landmarkError.code === 'PGRST116') {
        return { data: null, error: null }
      }
      throw landmarkError
    }

    // Check archaeology skill requirement
    const archaeologyRequired = landmark.archaeology_level_required || 1
    const { data: skill } = await supabase
      .from('exploration_skills')
      .select('level')
      .eq('character_id', characterId)
      .eq('skill_type', 'archaeology')
      .single()

    if (!skill || skill.level < archaeologyRequired) {
      return { data: null, error: new Error(`Requires Archaeology level ${archaeologyRequired}`) }
    }

    // Mark as discovered
    await supabase
      .from('character_landmarks')
      .insert({
        character_id: characterId,
        landmark_id: landmark.id,
        discovered_at: new Date().toISOString()
      })

    // Award rewards
    if (landmark.discovery_rewards) {
      const rewards = landmark.discovery_rewards as Record<string, number>

      if (rewards.gold) {
        await supabase
          .from('characters')
          .update({ gold: supabase.raw(`gold + ${rewards.gold}`) })
          .eq('id', characterId)
      }

      if (rewards.archaeology_xp) {
        await supabase
          .from('exploration_skills')
          .update({ experience: supabase.raw(`experience + ${rewards.archaeology_xp}`) })
          .eq('character_id', characterId)
          .eq('skill_type', 'archaeology')
      }
    }

    return { data: landmark, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get discovered landmarks for character
 */
export async function getDiscoveredLandmarks(
  characterId: string
): Promise<{ data: Landmark[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('character_landmarks')
      .select('landmarks(*)')
      .eq('character_id', characterId)
      .order('discovered_at', { ascending: false })

    if (error) throw error

    const landmarks = data?.map(d => d.landmarks) as Landmark[]
    return { data: landmarks, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Seed hidden locations for a zone
 */
export async function seedHiddenLocations(zoneId: string, zoneName: string): Promise<void> {
  const locations = [
    {
      location_name: `Lost Cavern of ${zoneName}`,
      location_type: 'cave',
      description: 'An ancient cave hidden behind a waterfall, filled with mysterious crystals',
      entrance_x: Math.floor(Math.random() * 20),
      entrance_y: Math.floor(Math.random() * 20),
      min_level: 5,
      required_skills: { archaeology: 10 },
      floors: 3,
      discovery_method: 'exploration',
      discovery_rewards: { gold: 200, experience: 100 },
      completion_rewards: { gold: 500, experience: 300, unique_item: 'crystal_shard' }
    },
    {
      location_name: `Ancient Ruins of ${zoneName}`,
      location_type: 'ruins',
      description: 'Crumbling structures from a forgotten civilization',
      entrance_x: Math.floor(Math.random() * 20),
      entrance_y: Math.floor(Math.random() * 20),
      min_level: 10,
      required_skills: { archaeology: 15, survival: 10 },
      floors: 5,
      discovery_method: 'puzzle',
      discovery_rewards: { gold: 300, experience: 150 },
      completion_rewards: { gold: 800, experience: 500, unique_item: 'ancient_artifact' }
    },
    {
      location_name: `${zoneName} Boss Lair`,
      location_type: 'boss_lair',
      description: 'The den of a powerful creature that rules this region',
      entrance_x: Math.floor(Math.random() * 20),
      entrance_y: Math.floor(Math.random() * 20),
      min_level: 15,
      required_skills: { survival: 20, tracking: 15 },
      floors: 1,
      boss_id: 'zone_boss_' + zoneId,
      discovery_method: 'tracking',
      discovery_rewards: { gold: 500, experience: 250 },
      completion_rewards: { gold: 1500, experience: 1000, unique_item: 'legendary_weapon', boss_trophy: true }
    },
    {
      location_name: `Hidden Shrine`,
      location_type: 'shrine',
      description: 'A sacred place of power, long forgotten',
      entrance_x: Math.floor(Math.random() * 20),
      entrance_y: Math.floor(Math.random() * 20),
      min_level: 8,
      required_skills: { cartography: 12 },
      floors: 1,
      discovery_method: 'hidden_clue',
      discovery_rewards: { gold: 250, experience: 125 },
      completion_rewards: { gold: 600, experience: 400, blessing: 'shrine_blessing' }
    }
  ]

  for (const location of locations) {
    await supabase.from('hidden_locations').insert({
      zone_id: zoneId,
      ...location
    })
  }
}

/**
 * Seed landmarks for a zone
 */
export async function seedLandmarks(zoneId: string, zoneName: string): Promise<void> {
  const landmarks = [
    {
      landmark_name: `The Great Oak of ${zoneName}`,
      landmark_type: 'natural',
      description: 'An enormous ancient tree that has stood for millennia',
      coordinate_x: 5,
      coordinate_y: 5,
      lore_text: 'Legend speaks of druids who once gathered beneath its branches to commune with nature spirits.',
      archaeology_level_required: 5,
      discovery_rewards: { gold: 100, archaeology_xp: 50 }
    },
    {
      landmark_name: `${zoneName} Stone Circle`,
      landmark_type: 'mystical',
      description: 'A perfect circle of standing stones radiating ancient power',
      coordinate_x: 15,
      coordinate_y: 10,
      lore_text: 'The stones align with celestial bodies during solstices, suggesting advanced astronomical knowledge.',
      archaeology_level_required: 10,
      discovery_rewards: { gold: 200, archaeology_xp: 100, mystical_essence: 1 }
    },
    {
      landmark_name: `${zoneName} Waterfall`,
      landmark_type: 'natural',
      description: 'A majestic cascade that creates a permanent rainbow',
      coordinate_x: 8,
      coordinate_y: 15,
      lore_text: 'Local tales claim the waterfall is the tears of an ancient water spirit.',
      archaeology_level_required: 3,
      discovery_rewards: { gold: 75, archaeology_xp: 30 }
    },
    {
      landmark_name: `Forgotten Monument`,
      landmark_type: 'historical',
      description: 'A weathered statue depicting an unknown hero',
      coordinate_x: 12,
      coordinate_y: 7,
      lore_text: 'The inscription is worn away, but the craftsmanship suggests royal patronage.',
      archaeology_level_required: 15,
      discovery_rewards: { gold: 300, archaeology_xp: 150, historical_relic: 1 }
    }
  ]

  for (const landmark of landmarks) {
    await supabase.from('landmarks').insert({
      zone_id: zoneId,
      ...landmark
    })
  }
}

/**
 * Check for secret discovery during exploration
 */
export async function checkSecretDiscovery(
  characterId: string,
  zoneId: string,
  x: number,
  y: number
): Promise<{
  data: {
    type: 'hidden_location' | 'landmark' | null
    discovery: HiddenLocation | Landmark | null
  } | null
  error: Error | null
}> {
  try {
    // Check for hidden location
    const { data: location } = await discoverHiddenLocation(characterId, zoneId, x, y)
    if (location) {
      return {
        data: { type: 'hidden_location', discovery: location },
        error: null
      }
    }

    // Check for landmark
    const { data: landmark } = await discoverLandmark(characterId, zoneId, x, y)
    if (landmark) {
      return {
        data: { type: 'landmark', discovery: landmark },
        error: null
      }
    }

    return { data: { type: null, discovery: null }, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}
