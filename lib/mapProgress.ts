import { createClient } from '@/utils/supabase/client'
import type { CharacterMapProgress } from './supabase'

// ============================================================================
// MAP PROGRESS & FOG OF WAR SYSTEM
// ============================================================================

export interface MapTile {
  x: number
  y: number
  explored: boolean
  terrain?: string
  landmark?: string
  hazard?: boolean
  treasure?: boolean
}

export interface MapData {
  tiles: MapTile[][]
  width: number
  height: number
  exploredCount: number
  totalTiles: number
  pointsOfInterest: Array<{ x: number; y: number; type: string; name: string }>
}

/**
 * Initialize map progress for a zone
 */
export async function initializeMapProgress(
  characterId: string,
  zoneId: string,
  width: number = 20,
  height: number = 20
): Promise<{ data: CharacterMapProgress | null; error: Error | null }> {
  const supabase = createClient()

  try {
    // Check if already exists
    const { data: existing } = await supabase
      .from('character_map_progress')
      .select('*')
      .eq('character_id', characterId)
      .eq('zone_id', zoneId)
      .single()

    if (existing) {
      return { data: existing as CharacterMapProgress, error: null }
    }

    // Create new map progress
    const totalTiles = width * height
    const { data, error } = await supabase
      .from('character_map_progress')
      .insert({
        character_id: characterId,
        zone_id: zoneId,
        explored_tiles: [],
        total_tiles: totalTiles,
        tiles_explored: 0,
        points_of_interest: [],
        last_position: { x: Math.floor(width / 2), y: Math.floor(height / 2) }
      })
      .select()
      .single()

    if (error) throw error
    return { data: data as CharacterMapProgress, error: null }
  } catch (err) {
    console.error('Error initializing map progress:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get map progress for a zone
 */
export async function getMapProgress(
  characterId: string,
  zoneId: string
): Promise<{ data: CharacterMapProgress | null; error: Error | null }> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('character_map_progress')
      .select('*')
      .eq('character_id', characterId)
      .eq('zone_id', zoneId)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    // Initialize if doesn't exist
    if (!data) {
      return await initializeMapProgress(characterId, zoneId)
    }

    return { data: data as CharacterMapProgress, error: null }
  } catch (err) {
    console.error('Error fetching map progress:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Reveal tiles on the map
 */
export async function revealTiles(
  characterId: string,
  zoneId: string,
  tiles: Array<{ x: number; y: number }>,
  currentPosition?: { x: number; y: number }
): Promise<{ data: any; error: Error | null }> {
  const supabase = createClient()

  try {
    // Get current progress
    const { data: progress, error: fetchError } = await getMapProgress(characterId, zoneId)
    if (fetchError) throw fetchError
    if (!progress) throw new Error('Map progress not found')

    // Merge new tiles with existing
    const existingTiles = progress.explored_tiles || []
    const newTiles = tiles.filter(
      tile => !existingTiles.some(
        existing => existing.x === tile.x && existing.y === tile.y
      )
    )

    const allExploredTiles = [...existingTiles, ...newTiles]
    const tilesExplored = allExploredTiles.length

    // Update progress
    const updateData: any = {
      explored_tiles: allExploredTiles,
      tiles_explored: tilesExplored,
      updated_at: new Date().toISOString()
    }

    if (currentPosition) {
      updateData.last_position = currentPosition
    }

    const { error: updateError } = await supabase
      .from('character_map_progress')
      .update(updateData)
      .eq('character_id', characterId)
      .eq('zone_id', zoneId)

    if (updateError) throw updateError

    return {
      data: {
        newTilesRevealed: newTiles.length,
        totalExplored: tilesExplored,
        percentageExplored: (tilesExplored / progress.total_tiles) * 100
      },
      error: null
    }
  } catch (err) {
    console.error('Error revealing tiles:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Add a point of interest to the map
 */
export async function addPointOfInterest(
  characterId: string,
  zoneId: string,
  poi: { x: number; y: number; type: string; name: string }
): Promise<{ data: any; error: Error | null }> {
  const supabase = createClient()

  try {
    // Get current progress
    const { data: progress, error: fetchError } = await getMapProgress(characterId, zoneId)
    if (fetchError) throw fetchError
    if (!progress) throw new Error('Map progress not found')

    // Add POI if not already exists
    const pois = progress.points_of_interest || []
    if (!pois.some(p => p.x === poi.x && p.y === poi.y && p.type === poi.type)) {
      pois.push(poi)

      const { error: updateError } = await supabase
        .from('character_map_progress')
        .update({
          points_of_interest: pois,
          updated_at: new Date().toISOString()
        })
        .eq('character_id', characterId)
        .eq('zone_id', zoneId)

      if (updateError) throw updateError
    }

    return { data: { success: true, poi }, error: null }
  } catch (err) {
    console.error('Error adding point of interest:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Generate map data from progress
 */
export function generateMapData(
  progress: CharacterMapProgress,
  width: number = 20,
  height: number = 20
): MapData {
  // Create empty map
  const tiles: MapTile[][] = []
  for (let y = 0; y < height; y++) {
    tiles[y] = []
    for (let x = 0; x < width; x++) {
      tiles[y][x] = {
        x,
        y,
        explored: false,
        terrain: getRandomTerrain()
      }
    }
  }

  // Mark explored tiles
  const exploredTiles = progress.explored_tiles || []
  for (const tile of exploredTiles) {
    if (tile.y >= 0 && tile.y < height && tile.x >= 0 && tile.x < width) {
      tiles[tile.y][tile.x].explored = true
    }
  }

  // Add points of interest
  const pois = progress.points_of_interest || []
  for (const poi of pois) {
    if (poi.y >= 0 && poi.y < height && poi.x >= 0 && poi.x < width) {
      tiles[poi.y][poi.x].landmark = poi.name
    }
  }

  return {
    tiles,
    width,
    height,
    exploredCount: progress.tiles_explored,
    totalTiles: progress.total_tiles,
    pointsOfInterest: pois
  }
}

/**
 * Get tiles in radius around a position
 */
export function getTilesInRadius(
  centerX: number,
  centerY: number,
  radius: number,
  maxX: number,
  maxY: number
): Array<{ x: number; y: number }> {
  const tiles: Array<{ x: number; y: number }> = []

  for (let y = Math.max(0, centerY - radius); y <= Math.min(maxY - 1, centerY + radius); y++) {
    for (let x = Math.max(0, centerX - radius); x <= Math.min(maxX - 1, centerX + radius); x++) {
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
      if (distance <= radius) {
        tiles.push({ x, y })
      }
    }
  }

  return tiles
}

/**
 * Get random terrain type for visual variety
 */
function getRandomTerrain(): string {
  const terrains = ['grass', 'forest', 'mountain', 'water', 'desert', 'snow']
  return terrains[Math.floor(Math.random() * terrains.length)]
}

/**
 * Apply cartography skill bonus to reveal radius
 */
export function getRevealRadius(baseRadius: number, cartographyLevel: number): number {
  // +2% per level
  const bonus = 1 + (cartographyLevel * 0.02)
  return Math.ceil(baseRadius * bonus)
}