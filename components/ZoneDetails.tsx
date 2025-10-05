'use client'

import { useState, useEffect } from 'react'
import type { ZoneDetails as ZoneDetailsType, WorldZone, CharacterMapProgress } from '@/lib/supabase'
import { getZoneDetails, getCurrentWeather, attemptLandmarkDiscovery } from '@/lib/worldZones'
import { startExploration } from '@/lib/exploration'
import { startTravel } from '@/lib/travel'
import { getMapProgress } from '@/lib/mapProgress'
import { useGameStore } from '@/lib/store'
import GatheringZone from './GatheringZone'
import ExpeditionPlanner from './ExpeditionPlanner'
import InteractiveMap from './InteractiveMap'

interface ZoneDetailsProps {
  zoneId: string
  onTravelTo?: (toZoneId: string) => void
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

export default function ZoneDetails({ zoneId, onTravelTo }: ZoneDetailsProps) {
  const { character } = useGameStore()
  const [details, setDetails] = useState<ZoneDetailsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weather, setWeather] = useState<string>('clear')
  const [exploring, setExploring] = useState(false)
  const [discoveryMessage, setDiscoveryMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'gathering' | 'map'>('overview')
  const [showExpeditionPlanner, setShowExpeditionPlanner] = useState(false)
  const [mapProgress, setMapProgress] = useState<CharacterMapProgress | null>(null)

  useEffect(() => {
    loadZoneDetails()
    loadWeather()
    if (character) {
      loadMapProgress()
    }
  }, [zoneId, character])

  async function loadZoneDetails() {
    if (!character) return

    setLoading(true)
    setError(null)

    const { data, error: err } = await getZoneDetails(zoneId, character.id)

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setDetails(data)
    setLoading(false)
  }

  async function loadWeather() {
    const { data } = await getCurrentWeather(zoneId)
    if (data) setWeather(data)
  }

  async function loadMapProgress() {
    if (!character) return

    const { data, error } = await getMapProgress(character.id, zoneId)
    if (data && !error) {
      setMapProgress(data)
    }
  }

  async function handleExplore() {
    if (!character || exploring) return

    setExploring(true)
    setDiscoveryMessage(null)

    // Start full exploration session
    const { data, error: err } = await startExploration(character.id, zoneId, false)

    if (err) {
      setDiscoveryMessage('❌ Exploration failed: ' + err.message)
      setExploring(false)
      return
    }

    setDiscoveryMessage('✅ Exploration session started! Check the main view.')
    setExploring(false)

    // Clear message after 3 seconds
    setTimeout(() => setDiscoveryMessage(null), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error || !details) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 text-red-400 flex items-center gap-3">
        <span className="text-2xl">⚠️</span>
        <span>{error || 'Zone not found'}</span>
      </div>
    )
  }

  const { zone, landmarks, connections, discoveryInfo } = details
  const visibleLandmarks = landmarks.filter(l => l.isDiscovered)
  const hiddenLandmarkCount = landmarks.filter(l => !l.isDiscovered).length

  return (
    <div className="space-y-6">
      {/* Zone Header */}
      <div className="panel p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white mb-2">{zone.name}</h2>
            <div className="flex items-center gap-3 text-sm mb-4">
              <span className="badge bg-gray-700/50 text-gray-300 capitalize">
                {zone.zone_type.replace('_', ' ')}
              </span>
              <span className={`badge ${
                zone.danger_level <= 10 ? 'badge-common' :
                zone.danger_level <= 25 ? 'badge-uncommon' :
                zone.danger_level <= 45 ? 'badge-rare' :
                zone.danger_level <= 60 ? 'badge-epic' : 'badge-legendary'
              }`}>
                Danger {zone.danger_level}
              </span>
              {weather && (
                <span className="badge bg-blue-500/20 text-blue-400 border-blue-500/30">
                  {weather === 'clear' && '☀️ Clear'}
                  {weather === 'rain' && '🌧️ Rain'}
                  {weather === 'fog' && '🌫️ Foggy'}
                  {weather === 'snow' && '❄️ Snow'}
                  {weather === 'blizzard' && '🌨️ Blizzard'}
                  {weather === 'cloudy' && '☁️ Cloudy'}
                  {weather === 'windy' && '💨 Windy'}
                  {weather === 'hot' && '🔥 Hot'}
                  {weather === 'ash' && '🌋 Ash'}
                  {weather === 'blood_rain' && '🩸 Blood Rain'}
                </span>
              )}
            </div>
            {zone.description && (
              <p className="text-gray-300 leading-relaxed mb-3">{zone.description}</p>
            )}
            {zone.lore_text && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-200/80 italic leading-relaxed">
                  {zone.lore_text}
                </p>
              </div>
            )}
          </div>

          {/* Zone Stats */}
          <div className="flex flex-col gap-2 text-right">
            <div className="stat-box">
              <span className="text-gray-400">Required Level</span>
              <span className="text-amber-400 font-bold">{zone.required_level}</span>
            </div>
            {discoveryInfo && (
              <div className="stat-box">
                <span className="text-gray-400">Time Explored</span>
                <span className="text-blue-400 font-bold">
                  {Math.floor(discoveryInfo.total_time_spent / 60)}m
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Exploration Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExplore}
            disabled={exploring}
            className="btn btn-secondary flex-1"
          >
            {exploring ? (
              <>
                <span className="animate-spin">🔍</span>
                <span>Exploring...</span>
              </>
            ) : (
              <>
                <span>🔍</span>
                <span>Explore Zone</span>
                {hiddenLandmarkCount > 0 && (
                  <span className="text-xs text-gray-400">
                    ({hiddenLandmarkCount} hidden)
                  </span>
                )}
              </>
            )}
          </button>
        </div>

        {/* Discovery Message */}
        {discoveryMessage && (
          <div className={`p-3 rounded-lg border ${
            discoveryMessage.startsWith('🎉')
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-gray-700/30 border-gray-600/30 text-gray-300'
          }`}>
            {discoveryMessage}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="panel p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-gray-900 shadow-lg'
                : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-white'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-xl">📜</span>
              <span className="text-sm">Overview</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
              activeTab === 'map'
                ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg'
                : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-white'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-xl">🗺️</span>
              <span className="text-sm">Map</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('gathering')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
              activeTab === 'gathering'
                ? 'bg-gradient-to-b from-green-500 to-green-600 text-white shadow-lg'
                : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-white'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-xl">⛏️</span>
              <span className="text-sm">Gathering</span>
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'gathering' ? (
        <GatheringZone worldZone={zone.id} zoneName={zone.name} />
      ) : activeTab === 'map' ? (
        <>
          {/* Map Actions */}
          <div className="panel p-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Zone Map</h3>
              <p className="text-sm text-gray-400">Explore to reveal more of the area</p>
            </div>
            <button
              onClick={() => setShowExpeditionPlanner(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <span>🎒</span>
              <span>Plan Expedition</span>
            </button>
          </div>

          {/* Interactive Map */}
          {character && mapProgress && (
            <InteractiveMap
              characterId={character.id}
              zoneId={zoneId}
              mapProgress={mapProgress}
              showControls={true}
            />
          )}

          {/* Expedition Planner Modal */}
          {showExpeditionPlanner && (
            <ExpeditionPlanner
              zone={zone}
              onStart={() => {
                setShowExpeditionPlanner(false)
                // Trigger exploration or other actions
              }}
              onClose={() => setShowExpeditionPlanner(false)}
            />
          )}
        </>
      ) : (
        <>
          {/* Landmarks */}
      {visibleLandmarks.length > 0 && (
        <div className="panel p-6 space-y-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📍</span>
            Landmarks ({visibleLandmarks.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleLandmarks.map(landmark => (
              <div
                key={landmark.id}
                className="card p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-2xl flex-shrink-0">
                      {LANDMARK_ICONS[landmark.landmark_type] || '📍'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white truncate">{landmark.name}</h4>
                      <p className="text-xs text-gray-400 capitalize">
                        {landmark.landmark_type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  {landmark.provides_service && (
                    <span className="badge badge-uncommon text-xs">
                      {landmark.provides_service}
                    </span>
                  )}
                </div>
                {landmark.description && (
                  <p className="text-sm text-gray-400 line-clamp-2">{landmark.description}</p>
                )}
                {landmark.flavor_text && (
                  <p className="text-xs text-gray-500 italic">"{landmark.flavor_text}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connections / Travel */}
      {connections.length > 0 && onTravelTo && character && (
        <div className="panel p-6 space-y-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🚶</span>
            Travel Routes ({connections.length})
          </h3>
          <div className="space-y-2">
            {connections.map(connection => (
              <ConnectionButton
                key={connection.id}
                connection={connection}
                characterId={character.id}
                fromZoneId={zoneId}
                characterLevel={character.level}
                onTravelStarted={() => onTravelTo(connection.to_zone_id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Flavor Messages */}
      {zone.flavor_messages && zone.flavor_messages.length > 0 && (
        <div className="panel p-6 space-y-3">
          <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
            <span>💭</span>
            Atmosphere
          </h3>
          <div className="space-y-2">
            {zone.flavor_messages.map((message, idx) => (
              <p key={idx} className="text-sm text-gray-400 italic pl-4 border-l-2 border-gray-700">
                {message}
              </p>
            ))}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  )
}

interface ConnectionButtonProps {
  connection: any
  characterId: string
  fromZoneId: string
  characterLevel: number
  onTravelStarted: () => void
}

function ConnectionButton({ connection, characterId, fromZoneId, characterLevel, onTravelStarted }: ConnectionButtonProps) {
  const [toZone, setToZone] = useState<WorldZone | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadToZone()
  }, [connection.to_zone_id])

  async function loadToZone() {
    const { createClient } = await import('@/utils/supabase/client')
    const supabase = createClient()
    const { data } = await supabase
      .from('world_zones')
      .select('*')
      .eq('id', connection.to_zone_id)
      .single()

    if (data) setToZone(data)
  }

  async function handleTravel() {
    if (loading) return

    setLoading(true)
    setError(null)

    const { data, error: err } = await startTravel(
      characterId,
      fromZoneId,
      connection.to_zone_id,
      characterLevel
    )

    if (err) {
      setError(err.message)
      setLoading(false)
      setTimeout(() => setError(null), 3000)
      return
    }

    // Success - notify parent to refresh and show travel panel
    onTravelStarted()
  }

  if (!toZone) return null

  const typeIcons: Record<string, string> = {
    path: '🥾',
    gate: '🚪',
    portal: '🌀',
    teleport: '✨',
    secret_passage: '🗝️'
  }

  const travelTime = Math.ceil(connection.base_travel_time / 60)

  return (
    <div>
      <button
        onClick={handleTravel}
        disabled={loading}
        className="w-full p-4 bg-gradient-to-r from-gray-800/50 to-gray-700/30
                 border border-gray-700/50 rounded-lg hover:border-amber-500/50
                 transition-all duration-200 hover:scale-[1.01] text-left
                 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-2xl">{loading ? '⏳' : (typeIcons[connection.connection_type] || '🚶')}</span>
            <div>
              <p className="font-semibold text-white">{toZone.name}</p>
              <p className="text-xs text-gray-400 capitalize">
                {connection.connection_type.replace('_', ' ')} • {travelTime}min travel
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Danger</div>
            <div className={`font-bold ${
              toZone.danger_level <= 10 ? 'text-green-400' :
              toZone.danger_level <= 25 ? 'text-yellow-400' :
              toZone.danger_level <= 45 ? 'text-orange-400' :
              toZone.danger_level <= 60 ? 'text-red-400' : 'text-purple-400'
            }`}>
              {toZone.danger_level}
            </div>
          </div>
        </div>
        {connection.description && (
          <p className="text-sm text-gray-500 mt-2 pl-11">{connection.description}</p>
        )}
      </button>

      {error && (
        <div className="mt-2 p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
