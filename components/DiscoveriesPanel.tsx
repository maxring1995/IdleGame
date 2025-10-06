'use client'

/**
 * Discoveries Panel
 *
 * Shows all landmarks discovered across all zones
 */

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import type { ZoneLandmark, WorldZone } from '@/lib/supabase'

interface DiscoveryWithZone extends ZoneLandmark {
  zone: Pick<WorldZone, 'id' | 'name' | 'zone_type'>
  attack_bonus?: number
  defense_bonus?: number
  health_bonus?: number
  mana_bonus?: number
  discovery_bonus?: number
  gold_find_bonus?: number
  xp_bonus?: number
}

// Landmark type icons
const LANDMARK_ICONS: Record<string, string> = {
  shrine: '⛩️',
  ruins: '🏛️',
  vendor: '🏪',
  dungeon_entrance: '🚪',
  vista: '🌄',
  quest_giver: '❗',
  teleport: '🌀',
  lore: '📜',
  crafting: '⚒️'
}

export default function DiscoveriesPanel() {
  const { character } = useGameStore()
  const [discoveries, setDiscoveries] = useState<DiscoveryWithZone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (character) {
      loadDiscoveries()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id])

  async function loadDiscoveries() {
    if (!character) return
    setIsLoading(true)

    try {
      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()

      // First get the landmark IDs
      const { data: discoveries, error: discError } = await supabase
        .from('character_landmark_discoveries')
        .select('landmark_id')
        .eq('character_id', character.id)

      if (discError) throw discError

      if (!discoveries || discoveries.length === 0) {
        setDiscoveries([])
        setIsLoading(false)
        return
      }

      const landmarkIds = discoveries.map(d => d.landmark_id)

      // Then get the landmark details with zone info
      const { data, error } = await supabase
        .from('zone_landmarks')
        .select(`
          *,
          zone:world_zones(id, name, zone_type)
        `)
        .in('id', landmarkIds)
        .order('created_at', { ascending: false })

      if (error) throw error

      setDiscoveries(data as DiscoveryWithZone[] || [])
    } catch (err) {
      console.error('Error loading discoveries:', err)
    }

    setIsLoading(false)
  }

  // Get unique landmark types for filtering
  const landmarkTypes = Array.from(new Set(discoveries.map(d => d.landmark_type)))

  // Filter discoveries
  const filteredDiscoveries = discoveries.filter(discovery => {
    const matchesFilter = filter === 'all' || discovery.landmark_type === filter
    const matchesSearch = searchQuery === '' ||
      discovery.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      discovery.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // Group by zone
  const groupedByZone = filteredDiscoveries.reduce((acc, discovery) => {
    const zoneName = discovery.zone.name
    if (!acc[zoneName]) {
      acc[zoneName] = []
    }
    acc[zoneName].push(discovery)
    return acc
  }, {} as Record<string, DiscoveryWithZone[]>)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="panel p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <span className="text-4xl">📍</span>
              Discoveries
            </h2>
            <p className="text-gray-400">
              All landmarks you've discovered during your adventures
            </p>
          </div>
          <div className="stat-box">
            <span className="text-gray-400">Total Discoveries</span>
            <span className="text-2xl font-bold text-amber-400">{discoveries.length}</span>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-3 flex-wrap">
          <input
            id="discoveries-search"
            name="discoveries-search"
            type="text"
            placeholder="Search discoveries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="discoveries-search"
            className="flex-1 min-w-[200px] px-4 py-2 bg-gray-800/50 border border-gray-700/50
                     rounded-lg text-white placeholder-gray-500 focus:outline-none
                     focus:border-amber-500/50"
          />
          <select
            id="discoveries-filter"
            name="discoveries-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            data-testid="discoveries-filter"
            className="px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white
                     focus:outline-none focus:border-amber-500/50"
          >
            <option value="all">All Types</option>
            {landmarkTypes.map(type => (
              <option key={type} value={type}>
                {LANDMARK_ICONS[type] || '📍'} {type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Discoveries List */}
      {filteredDiscoveries.length === 0 ? (
        <div className="panel p-12 text-center">
          <div className="inline-block p-8 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5
                        border border-amber-500/20 mb-6">
            <span className="text-8xl">🗺️</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">
            {searchQuery || filter !== 'all' ? 'No Discoveries Found' : 'No Discoveries Yet'}
          </h3>
          <p className="text-gray-400 mb-6">
            {searchQuery || filter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Explore zones to discover hidden landmarks, ruins, and points of interest!'}
          </p>
          {(searchQuery || filter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setFilter('all')
              }}
              className="btn btn-secondary"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByZone).map(([zoneName, zoneDiscoveries]) => (
            <div key={zoneName} className="panel p-6 space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2 border-b border-gray-700/50 pb-3">
                <span>🗺️</span>
                {zoneName}
                <span className="text-sm text-gray-400 font-normal">({zoneDiscoveries.length})</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {zoneDiscoveries.map(discovery => (
                  <div
                    key={discovery.id}
                    className="card-hover p-4 space-y-2 group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl flex-shrink-0 group-hover:scale-110 transition-transform">
                        {LANDMARK_ICONS[discovery.landmark_type] || '📍'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white mb-1">{discovery.name}</h4>
                        <p className="text-xs text-gray-400 capitalize mb-2">
                          {discovery.landmark_type.replace('_', ' ')}
                        </p>
                        {discovery.description && (
                          <p className="text-sm text-gray-300 leading-relaxed">
                            {discovery.description}
                          </p>
                        )}
                        {discovery.provides_service && (
                          <div className="mt-2">
                            <span className="badge badge-uncommon text-xs">
                              {discovery.provides_service}
                            </span>
                          </div>
                        )}
                        {discovery.flavor_text && (
                          <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded">
                            <p className="text-xs text-amber-200/80 italic">
                              {discovery.flavor_text}
                            </p>
                          </div>
                        )}

                        {/* Bonuses */}
                        {(discovery.attack_bonus || discovery.defense_bonus || discovery.health_bonus ||
                          discovery.mana_bonus || discovery.discovery_bonus || discovery.gold_find_bonus ||
                          discovery.xp_bonus) && (
                          <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded space-y-1">
                            <div className="text-xs font-semibold text-green-400 mb-1">Permanent Bonuses:</div>
                            {discovery.attack_bonus && discovery.attack_bonus > 0 && (
                              <div className="text-xs text-gray-300">⚔️ +{discovery.attack_bonus} Attack</div>
                            )}
                            {discovery.defense_bonus && discovery.defense_bonus > 0 && (
                              <div className="text-xs text-gray-300">🛡️ +{discovery.defense_bonus} Defense</div>
                            )}
                            {discovery.health_bonus && discovery.health_bonus > 0 && (
                              <div className="text-xs text-gray-300">❤️ +{discovery.health_bonus} Health</div>
                            )}
                            {discovery.mana_bonus && discovery.mana_bonus > 0 && (
                              <div className="text-xs text-gray-300">💧 +{discovery.mana_bonus} Mana</div>
                            )}
                            {discovery.discovery_bonus && discovery.discovery_bonus > 0 && (
                              <div className="text-xs text-gray-300">🔍 +{(discovery.discovery_bonus * 100).toFixed(0)}% Discovery Rate</div>
                            )}
                            {discovery.gold_find_bonus && discovery.gold_find_bonus > 0 && (
                              <div className="text-xs text-gray-300">💰 +{(discovery.gold_find_bonus * 100).toFixed(0)}% Gold Find</div>
                            )}
                            {discovery.xp_bonus && discovery.xp_bonus > 0 && (
                              <div className="text-xs text-gray-300">⭐ +{(discovery.xp_bonus * 100).toFixed(0)}% XP Gain</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Summary */}
      {discoveries.length > 0 && (
        <div className="panel p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Discovery Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {landmarkTypes.map(type => {
              const count = discoveries.filter(d => d.landmark_type === type).length
              return (
                <div key={type} className="stat-box">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <span className="text-xl">{LANDMARK_ICONS[type] || '📍'}</span>
                    <span className="capitalize">{type.replace('_', ' ')}</span>
                  </div>
                  <div className="text-xl font-bold text-amber-400">{count}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
