import { createClient } from '@/utils/supabase/client'
import type {
  ActiveExploration,
  ExplorationUpdate,
  ZoneLandmark
} from './supabase'
import { attemptLandmarkDiscovery, updateZoneTimeSpent } from './worldZones'
import { addTravelLogEntry } from './travel'

// ============================================================================
// Exploration Management
// ============================================================================

/**
 * Start exploring a zone
 */
export async function startExploration(
  characterId: string,
  zoneId: string,
  auto: boolean = false,
  autoStopAt?: number
): Promise<{ data: ActiveExploration | null; error: Error | null }> {
  const supabase = createClient()
  try {
    // Check if already exploring
    const { data: existing } = await supabase
      .from('active_explorations')
      .select('*')
      .eq('character_id', characterId)
      .maybeSingle()

    if (existing) {
      throw new Error('Already exploring a zone')
    }

    // Create exploration session
    const { data, error } = await supabase
      .from('active_explorations')
      .insert({
        character_id: characterId,
        zone_id: zoneId,
        started_at: new Date().toISOString(),
        exploration_progress: 0,
        discoveries_found: 0,
        is_auto: auto,
        auto_stop_at: autoStopAt,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error('Error starting exploration:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get active exploration session
 */
export async function getActiveExploration(
  characterId: string
): Promise<{ data: ActiveExploration | null; error: Error | null }> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('active_explorations')
      .select('*')
      .eq('character_id', characterId)
      .maybeSingle()

    if (error) throw error
    return { data: data || null, error: null }
  } catch (err) {
    console.error('Error fetching active exploration:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Process exploration progress
 */
export async function processExploration(
  characterId: string
): Promise<{ data: ExplorationUpdate | null; error: Error | null }> {
  const supabase = createClient()
  try {
    const { data: exploration, error: expError } = await getActiveExploration(characterId)
    if (expError) throw expError
    if (!exploration) throw new Error('No active exploration')

    const now = new Date()
    const started = new Date(exploration.started_at)
    const timeSpent = Math.floor((now.getTime() - started.getTime()) / 1000) // seconds

    // Calculate progress (1% per 30 seconds, 50 minutes to 100%)
    const progress = Math.min(Math.floor(timeSpent / 30), 100)

    // Roll for discoveries every 10% progress increase
    const discoveries: ZoneLandmark[] = []
    const progressBrackets = Math.floor(progress / 10)
    const previousBrackets = Math.floor(exploration.exploration_progress / 10)

    if (progressBrackets > previousBrackets) {
      // Attempt discovery for each new 10% bracket
      for (let i = previousBrackets; i < progressBrackets; i++) {
        const { data: discovery } = await attemptLandmarkDiscovery(
          characterId,
          exploration.zone_id
        )

        if (discovery) {
          discoveries.push(discovery)
        }
      }
    }

    // Update exploration progress
    await supabase
      .from('active_explorations')
      .update({
        exploration_progress: progress,
        discoveries_found: exploration.discoveries_found + discoveries.length,
        updated_at: now.toISOString()
      })
      .eq('id', exploration.id)

    // Update zone time spent
    await updateZoneTimeSpent(characterId, exploration.zone_id, 10) // Add 10 seconds

    // Log discoveries
    for (const discovery of discoveries) {
      await addTravelLogEntry(
        characterId,
        exploration.zone_id,
        'landmark_found',
        `Discovered ${discovery.name} while exploring`
      )
    }

    // Check if completed or should auto-stop
    const completed = progress >= 100 ||
                     (exploration.is_auto && exploration.auto_stop_at && progress >= exploration.auto_stop_at)

    return {
      data: {
        progress,
        discoveries,
        timeSpent,
        completed
      },
      error: null
    }
  } catch (err) {
    console.error('Error processing exploration:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Stop exploration and get summary
 */
export async function stopExploration(
  characterId: string
): Promise<{ data: any; error: Error | null }> {
  const supabase = createClient()
  try {
    const { data: exploration } = await getActiveExploration(characterId)
    if (!exploration) throw new Error('No active exploration')

    // Final progress update
    const { data: finalUpdate } = await processExploration(characterId)

    // Add log entry
    const { data: zone } = await supabase
      .from('world_zones')
      .select('name')
      .eq('id', exploration.zone_id)
      .maybeSingle()

    await addTravelLogEntry(
      characterId,
      exploration.zone_id,
      'exploration_completed',
      `Finished exploring ${zone?.name || 'zone'} (${exploration.exploration_progress}% complete, ${exploration.discoveries_found} discoveries)`
    )

    // Delete exploration session
    await supabase
      .from('active_explorations')
      .delete()
      .eq('id', exploration.id)

    return {
      data: {
        progress: exploration.exploration_progress,
        discoveries: exploration.discoveries_found,
        timeSpent: finalUpdate?.timeSpent || 0
      },
      error: null
    }
  } catch (err) {
    console.error('Error stopping exploration:', err)
    return { data: null, error: err as Error }
  }
}
