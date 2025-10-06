'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import WorldMap from './WorldMap'
import ZoneDetails from './ZoneDetails'
import TravelPanel from './TravelPanel'
import ExplorationPanel from './ExplorationPanel'
import { initializeCharacterInStartingZone, discoverZone } from '@/lib/worldZones'
import { getActiveTravel } from '@/lib/travel'
import { getActiveExploration } from '@/lib/exploration'

const HAVENBROOK_ID = '00000000-0000-0000-0000-000000000001'

export default function Adventure() {
  const { character } = useGameStore()
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [hasActiveTravel, setHasActiveTravel] = useState(false)
  const [hasActiveExploration, setHasActiveExploration] = useState(false)
  const [showingExplorationPanel, setShowingExplorationPanel] = useState(false)

  useEffect(() => {
    if (character && !initialized) {
      initializeCharacter()
    }
  }, [character])

  useEffect(() => {
    if (character) {
      checkActiveStates()
      // Poll every 10 seconds instead of 3 to reduce server load
      const interval = setInterval(checkActiveStates, 10000)
      return () => clearInterval(interval)
    }
  }, [character?.id]) // Only re-run if character ID changes

  async function initializeCharacter() {
    if (!character) return

    // Ensure character starts in Havenbrook
    await initializeCharacterInStartingZone(character.id)

    // Auto-discover nearby zones (Whispering Woods and Ironpeak Foothills)
    await discoverZone(character.id, '00000000-0000-0000-0000-000000000002') // Whispering Woods
    await discoverZone(character.id, '00000000-0000-0000-0000-000000000003') // Ironpeak Foothills

    // Select Havenbrook by default
    setSelectedZoneId(HAVENBROOK_ID)
    setInitialized(true)
  }

  async function checkActiveStates() {
    if (!character) return

    const [travelData, explorationData] = await Promise.all([
      getActiveTravel(character.id),
      getActiveExploration(character.id)
    ])

    // Only update state if values actually changed
    const newHasActiveTravel = !!travelData.data
    const newHasActiveExploration = !!explorationData.data

    if (newHasActiveTravel !== hasActiveTravel) {
      setHasActiveTravel(newHasActiveTravel)
    }

    // Manage exploration panel visibility - only update if changed
    if (newHasActiveExploration && !hasActiveExploration) {
      // Started exploring
      setHasActiveExploration(true)
      setShowingExplorationPanel(true)
    } else if (!newHasActiveExploration && hasActiveExploration) {
      // Stopped exploring - keep panel mounted for modal
      setHasActiveExploration(false)
      setShowingExplorationPanel(true)
    }
    // If both are false and showingExplorationPanel is true, let handleExplorationComplete clear it
  }

  function handleZoneSelect(zoneId: string) {
    setSelectedZoneId(zoneId)
  }

  function handleExplorationComplete() {
    // When modal closes, allow panel to unmount
    setShowingExplorationPanel(false)
    setHasActiveExploration(false)
    checkActiveStates()
  }

  function handleActivityComplete() {
    checkActiveStates()
  }

  if (!character) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-gray-400">No character loaded</p>
        </div>
      </div>
    )
  }

  if (!initialized) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Preparing your adventure...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <span className="text-5xl">🗺️</span>
            Adventure
          </h1>
          <p className="text-gray-400">
            Explore the vast world of Eternal Realms, discover hidden secrets, and uncover ancient mysteries.
          </p>
        </div>
      </div>

      {/* Active Travel/Exploration */}
      {(hasActiveTravel || showingExplorationPanel) && (
        <div>
          {hasActiveTravel && (
            <TravelPanel onTravelComplete={handleActivityComplete} />
          )}
          {showingExplorationPanel && (
            <ExplorationPanel onExplorationComplete={handleExplorationComplete} />
          )}
        </div>
      )}

      {/* Main Content - 2 Column Layout */}
      {!hasActiveTravel && !showingExplorationPanel && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: World Map / Zone Browser */}
          <div className="lg:col-span-1">
            <div className="panel p-6">
              <WorldMap
                onZoneSelect={handleZoneSelect}
                selectedZoneId={selectedZoneId || undefined}
              />
            </div>
          </div>

          {/* Right: Zone Details or Empty State */}
          <div className="lg:col-span-2">
            {selectedZoneId ? (
              <ZoneDetails
                zoneId={selectedZoneId}
                onTravelTo={handleZoneSelect}
              />
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="panel p-12 text-center">
      <div className="inline-block p-8 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5
                    border border-amber-500/20 mb-6">
        <span className="text-8xl animate-float">🗺️</span>
      </div>
      <h2 className="text-3xl font-bold text-white mb-3">Adventure Awaits!</h2>
      <p className="text-gray-400 max-w-md mx-auto leading-relaxed">
        Select a zone from the world map to view details, discover landmarks, and begin your journey
        through the realms.
      </p>
      <div className="mt-8 space-y-2 text-sm text-gray-500">
        <p>💡 <span className="text-gray-400">Tip: Click "Explore Zone" to discover hidden landmarks</span></p>
        <p>🔍 <span className="text-gray-400">Higher danger zones offer better rewards</span></p>
        <p>🗝️ <span className="text-gray-400">Some zones require quests to unlock</span></p>
      </div>
    </div>
  )
}
