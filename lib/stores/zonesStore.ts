/**
 * Zones Store - Centralized caching for world zones data
 *
 * PROBLEM: Multiple components independently fetching world_zones causes:
 * - Excessive API calls (5-10+ calls on page load)
 * - Visible reloads/re-renders
 * - Poor user experience
 *
 * SOLUTION: Single source of truth with intelligent caching
 * - Fetch zones once on app load
 * - All components read from cache
 * - Refresh only when data changes (zone discovery, travel)
 */

import { create } from 'zustand'
import { createClient } from '@/utils/supabase/client'
import type { WorldZone, WorldZoneWithDiscovery } from '@/lib/supabase'

interface ZonesStore {
  // Cached data
  allZones: WorldZone[]
  discoveredZones: WorldZoneWithDiscovery[]

  // Loading states
  isLoadingAll: boolean
  isLoadingDiscovered: boolean

  // Error states
  error: string | null

  // Last fetch timestamps (for cache invalidation)
  lastFetchAll: number | null
  lastFetchDiscovered: number | null

  // Actions
  fetchAllZones: () => Promise<void>
  fetchDiscoveredZones: (characterId: string) => Promise<void>
  getZoneById: (zoneId: string) => WorldZone | WorldZoneWithDiscovery | null
  invalidateCache: () => void
  reset: () => void
}

// Cache duration: 5 minutes (zones rarely change)
const CACHE_DURATION_MS = 5 * 60 * 1000

export const useZonesStore = create<ZonesStore>((set, get) => ({
  // Initial state
  allZones: [],
  discoveredZones: [],
  isLoadingAll: false,
  isLoadingDiscovered: false,
  error: null,
  lastFetchAll: null,
  lastFetchDiscovered: null,

  // Fetch all zones (for zone selection, enemy lists, etc.)
  fetchAllZones: async () => {
    const { lastFetchAll, isLoadingAll, allZones } = get()

    // Skip if already loading
    if (isLoadingAll) return

    // Skip if cache is fresh
    if (
      lastFetchAll &&
      Date.now() - lastFetchAll < CACHE_DURATION_MS &&
      allZones.length > 0
    ) {
      return
    }

    set({ isLoadingAll: true, error: null })

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('world_zones')
        .select('*')
        .order('required_level', { ascending: true })

      if (error) throw error

      set({
        allZones: data || [],
        lastFetchAll: Date.now(),
        isLoadingAll: false
      })
    } catch (error: any) {
      set({
        error: error.message,
        isLoadingAll: false
      })
    }
  },

  // Fetch discovered zones for a character (for world map)
  fetchDiscoveredZones: async (characterId: string) => {
    const { lastFetchDiscovered, isLoadingDiscovered, discoveredZones } = get()

    // Skip if already loading
    if (isLoadingDiscovered) return

    // Skip if cache is fresh (shorter duration since discoveries can happen frequently)
    if (
      lastFetchDiscovered &&
      Date.now() - lastFetchDiscovered < 30 * 1000 && // 30 seconds
      discoveredZones.length > 0
    ) {
      return
    }

    set({ isLoadingDiscovered: true, error: null })

    try {
      const supabase = createClient()

      // Fetch all zones
      const { data: zones, error: zonesError } = await supabase
        .from('world_zones')
        .select('*')
        .order('required_level', { ascending: true })

      if (zonesError) throw zonesError

      // Fetch character discoveries
      const { data: discoveries, error: discoveriesError } = await supabase
        .from('character_zone_discoveries')
        .select('zone_id, discovered_at')
        .eq('character_id', characterId)

      if (discoveriesError) throw discoveriesError

      const discoveredZoneIds = new Set(discoveries?.map(d => d.zone_id) || [])

      // Combine zones with discovery status
      const zonesWithDiscovery: WorldZoneWithDiscovery[] = (zones || []).map(zone => ({
        ...zone,
        isDiscovered: discoveredZoneIds.has(zone.id),
        timeSpent: 0 // TODO: Add time tracking if needed
      }))

      set({
        discoveredZones: zonesWithDiscovery,
        allZones: zones || [], // Also update allZones cache
        lastFetchDiscovered: Date.now(),
        lastFetchAll: Date.now(),
        isLoadingDiscovered: false
      })
    } catch (error: any) {
      set({
        error: error.message,
        isLoadingDiscovered: false
      })
    }
  },

  // Get zone by ID from cache (no API call)
  getZoneById: (zoneId: string) => {
    const { discoveredZones, allZones } = get()

    // Check discovered zones first (has more info)
    const discoveredZone = discoveredZones.find(z => z.id === zoneId)
    if (discoveredZone) return discoveredZone

    // Fallback to all zones
    return allZones.find(z => z.id === zoneId) || null
  },

  // Force refresh on next fetch (call after zone discovery, etc.)
  invalidateCache: () => {
    set({
      lastFetchAll: null,
      lastFetchDiscovered: null
    })
  },

  // Clear all data (call on logout)
  reset: () => {
    set({
      allZones: [],
      discoveredZones: [],
      isLoadingAll: false,
      isLoadingDiscovered: false,
      error: null,
      lastFetchAll: null,
      lastFetchDiscovered: null
    })
  }
}))
