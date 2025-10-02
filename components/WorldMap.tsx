'use client'

import { useState, useEffect } from 'react'
import type { WorldZoneWithDiscovery } from '@/lib/supabase'
import { getDiscoveredZones } from '@/lib/worldZones'
import { useGameStore } from '@/lib/store'

interface WorldMapProps {
  onZoneSelect: (zoneId: string) => void
  selectedZoneId?: string
}

// Zone type icons and colors
const ZONE_TYPE_CONFIG = {
  safe_haven: { icon: '🏘️', color: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30' },
  wilderness: { icon: '🌲', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
  dungeon: { icon: '⚔️', color: 'from-red-500/20 to-red-600/10', border: 'border-red-500/30' },
  raid: { icon: '👑', color: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30' },
  pvp: { icon: '⚡', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' }
} as const

// Danger level color coding
function getDangerColor(level: number): string {
  if (level <= 10) return 'text-green-400'
  if (level <= 25) return 'text-yellow-400'
  if (level <= 45) return 'text-orange-400'
  if (level <= 60) return 'text-red-400'
  return 'text-purple-400'
}

export default function WorldMap({ onZoneSelect, selectedZoneId }: WorldMapProps) {
  const { character } = useGameStore()
  const [zones, setZones] = useState<WorldZoneWithDiscovery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    loadZones()
  }, [character])

  async function loadZones() {
    if (!character) return

    setLoading(true)
    setError(null)

    const { data, error: err } = await getDiscoveredZones(character.id)

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setZones(data || [])
    setLoading(false)
  }

  // Filter zones
  const filteredZones = zones.filter(zone => {
    const matchesSearch = zone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         zone.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || zone.zone_type === filterType
    return matchesSearch && matchesType
  })

  // Separate discovered and undiscovered
  const discoveredZones = filteredZones.filter(z => z.isDiscovered)
  const undiscoveredZones = filteredZones.filter(z => !z.isDiscovered && !z.is_hidden)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 text-red-400 flex items-center gap-3">
        <span className="text-2xl">⚠️</span>
        <span>{error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-3xl">🗺️</span>
          World Map
        </h2>
        <div className="text-sm text-gray-400">
          {discoveredZones.length} / {zones.filter(z => !z.is_hidden).length} zones discovered
        </div>
      </div>

      {/* Search & Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Search zones..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg
                   text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg
                   text-white focus:outline-none focus:border-amber-500/50"
        >
          <option value="all">All Zone Types</option>
          <option value="safe_haven">Safe Havens</option>
          <option value="wilderness">Wilderness</option>
          <option value="dungeon">Dungeons</option>
          <option value="raid">Raids</option>
          <option value="pvp">PvP Zones</option>
        </select>
      </div>

      {/* Discovered Zones */}
      {discoveredZones.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
            <span className="text-xl">✓</span>
            Discovered Zones
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {discoveredZones.map(zone => (
              <ZoneCard
                key={zone.id}
                zone={zone}
                isSelected={selectedZoneId === zone.id}
                onSelect={() => onZoneSelect(zone.id)}
                characterLevel={character?.level || 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Undiscovered Zones (visible but locked) */}
      {undiscoveredZones.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
            <span className="text-xl">🔍</span>
            Unexplored Zones
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {undiscoveredZones.map(zone => (
              <ZoneCard
                key={zone.id}
                zone={zone}
                isSelected={false}
                onSelect={() => {}}
                characterLevel={character?.level || 1}
                locked
              />
            ))}
          </div>
        </div>
      )}

      {filteredZones.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-400">No zones found matching your filters.</p>
        </div>
      )}
    </div>
  )
}

interface ZoneCardProps {
  zone: WorldZoneWithDiscovery
  isSelected: boolean
  onSelect: () => void
  characterLevel: number
  locked?: boolean
}

function ZoneCard({ zone, isSelected, onSelect, characterLevel, locked = false }: ZoneCardProps) {
  const config = ZONE_TYPE_CONFIG[zone.zone_type]
  const canAccess = characterLevel >= zone.required_level
  const isLocked = locked || !canAccess

  return (
    <button
      onClick={isLocked ? undefined : onSelect}
      disabled={isLocked}
      className={`
        w-full p-4 rounded-xl border transition-all duration-200 text-left
        ${isSelected
          ? 'ring-2 ring-amber-500 scale-[1.02] bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/50'
          : `bg-gradient-to-br ${config.color} ${config.border} hover:scale-[1.01]`
        }
        ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Zone Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{config.icon}</span>
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-bold text-white truncate flex items-center gap-2">
                {zone.name}
                {isLocked && <span className="text-sm">🔒</span>}
              </h4>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400 capitalize">{zone.zone_type.replace('_', ' ')}</span>
                <span className="text-gray-600">•</span>
                <span className={`font-semibold ${getDangerColor(zone.danger_level)}`}>
                  Danger {zone.danger_level}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {zone.description && !locked && (
            <p className="text-sm text-gray-400 line-clamp-2 mb-2">
              {zone.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs">
            {!locked && zone.isDiscovered && zone.timeSpent !== undefined && (
              <div className="flex items-center gap-1 text-gray-400">
                <span>⏱️</span>
                <span>{Math.floor(zone.timeSpent / 60)}m explored</span>
              </div>
            )}
            {zone.biome && !locked && (
              <div className="flex items-center gap-1 text-gray-400">
                <span>🌍</span>
                <span className="capitalize">{zone.biome}</span>
              </div>
            )}
            {zone.climate && !locked && (
              <div className="flex items-center gap-1 text-gray-400">
                <span>🌡️</span>
                <span className="capitalize">{zone.climate}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Requirements */}
        <div className="flex flex-col items-end gap-2 text-sm">
          <div className={`
            px-3 py-1 rounded-full font-semibold
            ${canAccess
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }
          `}>
            Lvl {zone.required_level}
          </div>
          {!canAccess && (
            <div className="text-xs text-gray-500">
              Need {zone.required_level - characterLevel} more levels
            </div>
          )}
          {locked && canAccess && (
            <div className="text-xs text-amber-400">
              Undiscovered
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
