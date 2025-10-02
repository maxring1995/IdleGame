import { createClient } from '@/utils/supabase/client'
import { Enemy } from './supabase'

/**
 * Get all available enemies for a player based on their level
 */
export async function getAvailableEnemies(playerLevel: number): Promise<{ data: Enemy[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('enemies')
      .select('*')
      .lte('required_player_level', playerLevel)
      .order('level', { ascending: true })

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('Get available enemies error:', error)
    return { data: null, error }
  }
}

/**
 * Get a specific enemy by ID
 */
export async function getEnemyById(enemyId: string): Promise<{ data: Enemy | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('enemies')
      .select('*')
      .eq('id', enemyId)
      .single()

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('Get enemy by ID error:', error)
    return { data: null, error }
  }
}

/**
 * Get enemies within a specific level range
 */
export async function getEnemiesByLevel(
  minLevel: number,
  maxLevel: number
): Promise<{ data: Enemy[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('enemies')
      .select('*')
      .gte('level', minLevel)
      .lte('level', maxLevel)
      .order('level', { ascending: true })

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('Get enemies by level error:', error)
    return { data: null, error }
  }
}

/**
 * Get all enemies (for admin or testing purposes)
 */
export async function getAllEnemies(): Promise<{ data: Enemy[] | null; error: any }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('enemies')
      .select('*')
      .order('level', { ascending: true })

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('Get all enemies error:', error)
    return { data: null, error }
  }
}

/**
 * Get recommended enemies for player (at or slightly below player level)
 */
export async function getRecommendedEnemies(playerLevel: number): Promise<{ data: Enemy[] | null; error: any }> {
  try {
    const supabase = createClient()
    const minLevel = Math.max(1, playerLevel - 2)
    const maxLevel = playerLevel + 1

    const { data, error } = await supabase
      .from('enemies')
      .select('*')
      .gte('level', minLevel)
      .lte('level', maxLevel)
      .lte('required_player_level', playerLevel)
      .order('level', { ascending: true })

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('Get recommended enemies error:', error)
    return { data: null, error }
  }
}
