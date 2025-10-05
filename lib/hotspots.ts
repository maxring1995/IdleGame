/**
 * Hotspot Management System
 *
 * Manages temporary high-reward gathering nodes (hotspots)
 * and seasonal events for the gathering system.
 */

import { createClient } from '@/utils/supabase/client'
import type { GatheringNode } from './supabase'

export interface Hotspot {
  id: string
  zone_id: string
  node_id: string
  spawned_at: string
  expires_at: string
  hotspot_type: 'treasure' | 'legendary' | 'event' | 'seasonal'
  multiplier: number
  is_active: boolean
  harvested_count: number
  node?: GatheringNode
}

export interface SeasonalEvent {
  id: string
  name: string
  description?: string
  start_date: string
  end_date: string
  is_active: boolean
  event_bonuses: {
    yield_multiplier?: number
    xp_multiplier?: number
    rare_chance?: number
    hotspot_frequency?: number
  }
  affected_zones?: string[]
  affected_materials?: string[]
}

export interface GatheringEncounter {
  id: string
  character_id: string
  node_id: string
  encounter_type: string
  encounter_data?: any
  resolved: boolean
  resolved_at?: string
  resolution?: string
  rewards?: any
  created_at: string
}

/**
 * Get active hotspots in a zone
 */
export async function getActiveHotspots(zoneId: string): Promise<{
  data: Hotspot[] | null
  error: Error | null
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('hotspot_spawns')
    .select(`
      *,
      node:gathering_nodes(*)
    `)
    .eq('zone_id', zoneId)
    .eq('is_active', true)
    .gte('expires_at', new Date().toISOString())

  if (error) {
    console.error('[hotspots] Error fetching active hotspots:', error)
    return { data: null, error }
  }

  return { data: data as any, error: null }
}

/**
 * Check if a node is currently a hotspot
 */
export async function isNodeHotspot(nodeId: string): Promise<{
  data: { isHotspot: boolean, hotspot: Hotspot | null } | null
  error: Error | null
}> {
  const supabase = createClient()

  const { data: node, error: nodeError } = await supabase
    .from('gathering_nodes')
    .select('is_hotspot, hotspot_expires_at, hotspot_multiplier, hotspot_type')
    .eq('id', nodeId)
    .single()

  if (nodeError) {
    return { data: null, error: nodeError }
  }

  if (!node.is_hotspot || !node.hotspot_expires_at) {
    return { data: { isHotspot: false, hotspot: null }, error: null }
  }

  // Check if expired
  const expiresAt = new Date(node.hotspot_expires_at)
  const now = new Date()

  if (expiresAt <= now) {
    // Hotspot expired, needs cleanup
    await supabase
      .from('gathering_nodes')
      .update({
        is_hotspot: false,
        hotspot_expires_at: null,
        hotspot_multiplier: null,
        hotspot_type: null
      })
      .eq('id', nodeId)

    return { data: { isHotspot: false, hotspot: null }, error: null }
  }

  // Get full hotspot data
  const { data: hotspot, error: hotspotError } = await supabase
    .from('hotspot_spawns')
    .select('*')
    .eq('node_id', nodeId)
    .eq('is_active', true)
    .single()

  if (hotspotError) {
    return { data: null, error: hotspotError }
  }

  return { data: { isHotspot: true, hotspot }, error: null }
}

/**
 * Get active seasonal events
 */
export async function getActiveSeasonalEvents(): Promise<{
  data: SeasonalEvent[] | null
  error: Error | null
}> {
  const supabase = createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('seasonal_events')
    .select('*')
    .eq('is_active', true)
    .lte('start_date', now)
    .gte('end_date', now)

  if (error) {
    console.error('[hotspots] Error fetching seasonal events:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Apply hotspot bonuses to harvest results
 */
export function applyHotspotBonuses(
  baseYield: number,
  baseXP: number,
  hotspot: Hotspot | null
): {
  yield: number
  xp: number
  bonusEffects: string[]
} {
  if (!hotspot) {
    return { yield: baseYield, xp: baseXP, bonusEffects: [] }
  }

  const bonusEffects: string[] = []

  // Apply multiplier to both yield and XP
  const modifiedYield = Math.floor(baseYield * hotspot.multiplier)
  const modifiedXP = Math.floor(baseXP * hotspot.multiplier)

  // Add bonus effect descriptions
  switch (hotspot.hotspot_type) {
    case 'treasure':
      bonusEffects.push(`💎 Treasure Hotspot: ${hotspot.multiplier}x rewards!`)
      break
    case 'legendary':
      bonusEffects.push(`✨ Legendary Hotspot: ${hotspot.multiplier}x rewards!`)
      break
    case 'event':
      bonusEffects.push(`🎉 Event Hotspot: ${hotspot.multiplier}x rewards!`)
      break
    case 'seasonal':
      bonusEffects.push(`🎄 Seasonal Hotspot: ${hotspot.multiplier}x rewards!`)
      break
  }

  return {
    yield: modifiedYield,
    xp: modifiedXP,
    bonusEffects
  }
}

/**
 * Apply seasonal event bonuses
 */
export function applySeasonalEventBonuses(
  baseYield: number,
  baseXP: number,
  events: SeasonalEvent[],
  zoneId: string,
  materialType: string
): {
  yield: number
  xp: number
  bonusEffects: string[]
} {
  let modifiedYield = baseYield
  let modifiedXP = baseXP
  const bonusEffects: string[] = []

  for (const event of events) {
    // Check if event affects this zone or material
    const affectsZone = !event.affected_zones || event.affected_zones.includes(zoneId)
    const affectsMaterial = !event.affected_materials || event.affected_materials.includes(materialType)

    if (!affectsZone || !affectsMaterial) continue

    // Apply bonuses
    if (event.event_bonuses.yield_multiplier) {
      modifiedYield = Math.floor(modifiedYield * event.event_bonuses.yield_multiplier)
      bonusEffects.push(`🎊 ${event.name}: ${event.event_bonuses.yield_multiplier}x yield`)
    }

    if (event.event_bonuses.xp_multiplier) {
      modifiedXP = Math.floor(modifiedXP * event.event_bonuses.xp_multiplier)
      bonusEffects.push(`🎊 ${event.name}: ${event.event_bonuses.xp_multiplier}x XP`)
    }
  }

  return {
    yield: modifiedYield,
    xp: modifiedXP,
    bonusEffects
  }
}

/**
 * Record a gathering encounter
 */
export async function recordEncounter(
  characterId: string,
  nodeId: string,
  encounterType: string,
  encounterData?: any
): Promise<{
  data: GatheringEncounter | null
  error: Error | null
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('gathering_encounters')
    .insert({
      character_id: characterId,
      node_id: nodeId,
      encounter_type: encounterType,
      encounter_data: encounterData
    })
    .select()
    .single()

  if (error) {
    console.error('[hotspots] Error recording encounter:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Resolve an encounter with rewards
 */
export async function resolveEncounter(
  encounterId: string,
  resolution: string,
  rewards?: any
): Promise<{
  data: boolean | null
  error: Error | null
}> {
  const supabase = createClient()

  const { error } = await supabase
    .from('gathering_encounters')
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolution,
      rewards
    })
    .eq('id', encounterId)

  if (error) {
    console.error('[hotspots] Error resolving encounter:', error)
    return { data: null, error }
  }

  return { data: true, error: null }
}

/**
 * Get unresolved encounters for a character
 */
export async function getUnresolvedEncounters(characterId: string): Promise<{
  data: GatheringEncounter[] | null
  error: Error | null
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('gathering_encounters')
    .select('*')
    .eq('character_id', characterId)
    .eq('resolved', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[hotspots] Error fetching unresolved encounters:', error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Get time until hotspot expires
 */
export function getHotspotTimeRemaining(expiresAt: string): {
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
  expired: boolean
} {
  const now = new Date()
  const expires = new Date(expiresAt)
  const diffMs = expires.getTime() - now.getTime()

  if (diffMs <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, expired: true }
  }

  const totalSeconds = Math.floor(diffMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { hours, minutes, seconds, totalSeconds, expired: false }
}

/**
 * Get hotspot icon based on type
 */
export function getHotspotIcon(type: string): string {
  switch (type) {
    case 'treasure':
      return '💎'
    case 'legendary':
      return '✨'
    case 'event':
      return '🎉'
    case 'seasonal':
      return '🎄'
    default:
      return '⭐'
  }
}

/**
 * Get hotspot color classes based on type
 */
export function getHotspotColorClasses(type: string): {
  border: string
  bg: string
  text: string
  glow: string
} {
  switch (type) {
    case 'treasure':
      return {
        border: 'border-yellow-500',
        bg: 'bg-gradient-to-br from-yellow-900/20 to-amber-900/10',
        text: 'text-yellow-400',
        glow: 'shadow-[0_0_20px_rgba(250,204,21,0.4)]'
      }
    case 'legendary':
      return {
        border: 'border-purple-500',
        bg: 'bg-gradient-to-br from-purple-900/20 to-pink-900/10',
        text: 'text-purple-400',
        glow: 'shadow-[0_0_20px_rgba(168,85,247,0.4)]'
      }
    case 'event':
      return {
        border: 'border-blue-500',
        bg: 'bg-gradient-to-br from-blue-900/20 to-cyan-900/10',
        text: 'text-blue-400',
        glow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]'
      }
    case 'seasonal':
      return {
        border: 'border-green-500',
        bg: 'bg-gradient-to-br from-green-900/20 to-emerald-900/10',
        text: 'text-green-400',
        glow: 'shadow-[0_0_20px_rgba(34,197,94,0.4)]'
      }
    default:
      return {
        border: 'border-amber-500',
        bg: 'bg-gradient-to-br from-amber-900/20 to-orange-900/10',
        text: 'text-amber-400',
        glow: 'shadow-[0_0_20px_rgba(245,158,11,0.4)]'
      }
  }
}