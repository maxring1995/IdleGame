'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import type { ActiveTravel, WorldZone, TravelUpdate } from '@/lib/supabase'
import { getActiveTravel, processTravel, cancelTravel, completeTravel } from '@/lib/travel'

interface TravelPanelProps {
  onTravelComplete?: () => void
}

export default function TravelPanel({ onTravelComplete }: TravelPanelProps) {
  const { character } = useGameStore()
  const [travel, setTravel] = useState<ActiveTravel | null>(null)
  const [fromZone, setFromZone] = useState<WorldZone | null>(null)
  const [toZone, setToZone] = useState<WorldZone | null>(null)
  const [update, setUpdate] = useState<TravelUpdate | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (character) {
      loadTravel()
      const interval = setInterval(updateProgress, 1000)
      return () => clearInterval(interval)
    }
  }, [character])

  async function loadTravel() {
    if (!character) return

    const { data } = await getActiveTravel(character.id)
    if (data) {
      setTravel(data)
      await loadZones(data)
    }
    setLoading(false)
  }

  async function loadZones(travelData: ActiveTravel) {
    const { createClient } = await import('@/utils/supabase/client')
    const supabase = createClient()

    const [fromResult, toResult] = await Promise.all([
      supabase.from('world_zones').select('*').eq('id', travelData.from_zone_id).single(),
      supabase.from('world_zones').select('*').eq('id', travelData.to_zone_id).single()
    ])

    if (fromResult.data) setFromZone(fromResult.data)
    if (toResult.data) setToZone(toResult.data)
  }

  async function updateProgress() {
    if (!character || !travel) return

    const { data } = await processTravel(character.id)
    if (data) {
      setUpdate(data)

      if (data.status === 'completed') {
        await handleComplete()
      }
    }
  }

  async function handleComplete() {
    if (!character) return

    await completeTravel(character.id)
    setTravel(null)
    setUpdate(null)
    onTravelComplete?.()
  }

  async function handleCancel() {
    if (!character || cancelling) return

    setCancelling(true)
    await cancelTravel(character.id)
    setTravel(null)
    setUpdate(null)
    onTravelComplete?.()
  }

  if (loading) {
    return (
      <div className="panel p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (!travel) {
    return null
  }

  const progress = update?.progress || 0
  const timeRemaining = update?.timeRemaining || 0
  const minutes = Math.floor(timeRemaining / 60000)
  const seconds = Math.floor((timeRemaining % 60000) / 1000)

  return (
    <div className="panel p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-3xl">🚶</span>
          Traveling
        </h2>
        {travel.can_cancel && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="btn btn-danger text-sm"
          >
            {cancelling ? 'Cancelling...' : 'Cancel Travel'}
          </button>
        )}
      </div>

      {/* Route Display */}
      <div className="flex items-center gap-4">
        <div className="flex-1 text-center">
          <div className="text-sm text-gray-400 mb-1">From</div>
          <div className="text-lg font-semibold text-white">
            {fromZone?.name || 'Unknown'}
          </div>
        </div>

        <div className="text-3xl text-amber-400 animate-pulse">→</div>

        <div className="flex-1 text-center">
          <div className="text-sm text-gray-400 mb-1">To</div>
          <div className="text-lg font-semibold text-white">
            {toZone?.name || 'Unknown'}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Progress</span>
          <span className="text-amber-400 font-semibold">{Math.floor(progress)}%</span>
        </div>
        <div className="progress-bar h-6">
          <div
            className="progress-fill bg-gradient-to-r from-amber-500 to-amber-600"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Time Remaining */}
      <div className="text-center">
        <div className="text-sm text-gray-400 mb-1">Estimated Arrival</div>
        <div className="text-2xl font-bold text-white font-mono">
          {minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`}
        </div>
      </div>

      {/* Encounter Alert */}
      {update?.status === 'encounter' && update.encounter && (
        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">⚠️</span>
            <h3 className="text-lg font-bold text-purple-400">Encounter!</h3>
          </div>
          <p className="text-gray-300 mb-3">
            {update.encounter.data?.message || 'Something interesting happens on the road...'}
          </p>
          {update.encounter.type === 'loot' && (
            <div className="flex items-center gap-2 text-amber-400">
              <span>💰</span>
              <span className="font-semibold">+{update.encounter.data?.gold || 0} Gold</span>
            </div>
          )}
        </div>
      )}

      {/* Travel Info */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="stat-box">
          <span className="text-gray-400">Connection Type</span>
          <span className="text-white capitalize">
            {travel.connection_id ? 'Path' : 'Unknown'}
          </span>
        </div>
        <div className="stat-box">
          <span className="text-gray-400">Status</span>
          <span className={`font-semibold ${
            travel.status === 'traveling' ? 'text-blue-400' :
            travel.status === 'encounter' ? 'text-purple-400' : 'text-green-400'
          }`}>
            {travel.status === 'traveling' ? 'In Transit' :
             travel.status === 'encounter' ? 'Encounter' : 'Arriving'}
          </span>
        </div>
      </div>

      {/* Flavor Text */}
      <div className="p-3 bg-gray-800/30 border border-gray-700/50 rounded-lg">
        <p className="text-sm text-gray-400 italic text-center">
          {progress < 25
            ? 'You set out on your journey, the destination ahead...'
            : progress < 50
            ? 'The path winds through familiar and unfamiliar terrain...'
            : progress < 75
            ? 'Your destination draws nearer with each step...'
            : 'The end of your journey is within sight...'}
        </p>
      </div>
    </div>
  )
}
