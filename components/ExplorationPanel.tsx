'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import type { ActiveExploration, WorldZone, ZoneLandmark } from '@/lib/supabase'
import { getActiveExploration, processExploration, stopExploration } from '@/lib/exploration'

interface ExplorationPanelProps {
  onExplorationComplete?: () => void
}

export default function ExplorationPanel({ onExplorationComplete }: ExplorationPanelProps) {
  const { character } = useGameStore()
  const [exploration, setExploration] = useState<ActiveExploration | null>(null)
  const [zone, setZone] = useState<WorldZone | null>(null)
  const [progress, setProgress] = useState(0)
  const [discoveries, setDiscoveries] = useState<ZoneLandmark[]>([])
  const [timeSpent, setTimeSpent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [stopping, setStopping] = useState(false)

  useEffect(() => {
    if (character) {
      loadExploration()
    }
  }, [character])

  useEffect(() => {
    if (!character || !exploration) return

    const interval = setInterval(updateProgress, 1000)
    return () => clearInterval(interval)
  }, [character, exploration])

  async function loadExploration() {
    if (!character) return

    const { data } = await getActiveExploration(character.id)
    if (data) {
      setExploration(data)
      setProgress(data.exploration_progress)
      await loadZone(data.zone_id)
    }
    setLoading(false)
  }

  async function loadZone(zoneId: string) {
    const { createClient } = await import('@/utils/supabase/client')
    const supabase = createClient()

    const { data } = await supabase
      .from('world_zones')
      .select('*')
      .eq('id', zoneId)
      .single()

    if (data) setZone(data)
  }

  async function updateProgress() {
    if (!character || !exploration) return

    try {
      const { data, error } = await processExploration(character.id)

      if (error) {
        console.error('[Exploration] Error:', error)
        return
      }

      if (data) {
        setProgress(data.progress)
        setTimeSpent(data.timeSpent)

        // Add new discoveries
        if (data.discoveries.length > 0) {
          setDiscoveries(prev => [...prev, ...data.discoveries])
        }

        // Update exploration state with new discovery count
        setExploration(prev => prev ? {
          ...prev,
          exploration_progress: data.progress,
          discoveries_found: prev.discoveries_found + data.discoveries.length
        } : null)

        // Auto-complete if done
        if (data.completed) {
          await handleStop()
        }
      }
    } catch (err) {
      console.error('[Exploration] Exception:', err)
    }
  }

  async function handleStop() {
    if (!character || stopping) return

    setStopping(true)
    await stopExploration(character.id)
    setExploration(null)
    onExplorationComplete?.()
  }

  if (loading) {
    return (
      <div className="panel p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (!exploration) {
    return null
  }

  const minutes = Math.floor(timeSpent / 60)
  const seconds = timeSpent % 60
  const paddedSeconds = seconds.toString().padStart(2, '0')

  return (
    <div className="panel p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-3xl">🔍</span>
          Exploring {zone?.name || 'Zone'}
        </h2>
        <button
          onClick={handleStop}
          disabled={stopping}
          className="btn btn-secondary text-sm"
        >
          {stopping ? 'Stopping...' : 'Stop Exploring'}
        </button>
      </div>

      {/* Progress Circle and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Progress Circle */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-48 h-48">
            {/* Background Circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-700"
              />
              {/* Progress Circle */}
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
                className="text-emerald-500 transition-all duration-1000"
                strokeLinecap="round"
              />
            </svg>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold text-white">{Math.floor(progress)}%</div>
              <div className="text-sm text-gray-400">Complete</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <div className="stat-box">
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-xl">⏱️</span>
              <span>Time Spent</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              {minutes}m {paddedSeconds}s
            </div>
          </div>

          <div className="stat-box">
            <div className="flex items-center gap-2 text-gray-400">
              <span className="text-xl">🎯</span>
              <span>Discoveries</span>
            </div>
            <div className="text-2xl font-bold text-amber-400">
              {exploration.discoveries_found}
            </div>
          </div>

          {exploration.is_auto && exploration.auto_stop_at && (
            <div className="stat-box">
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-xl">🤖</span>
                <span>Auto-Stop At</span>
              </div>
              <div className="text-2xl font-bold text-blue-400">
                {exploration.auto_stop_at}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Discoveries */}
      {discoveries.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>🎉</span>
            Recent Discoveries
          </h3>
          <div className="space-y-2">
            {discoveries.slice(-5).reverse().map((discovery, idx) => (
              <div
                key={`${discovery.id}-${idx}`}
                className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg
                         animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📍</span>
                  <div className="flex-1">
                    <div className="font-semibold text-emerald-400">{discovery.name}</div>
                    <div className="text-sm text-gray-400">{discovery.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Info */}
      <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg space-y-2">
        <div className="text-sm text-gray-400">
          <strong className="text-white">Exploration Rate:</strong> 1% every 30 seconds (50 minutes to 100%)
        </div>
        <div className="text-sm text-gray-400">
          <strong className="text-white">Discovery Chance:</strong> Rolled every 10% progress
        </div>
        {exploration.is_auto && (
          <div className="text-sm text-blue-400 flex items-center gap-2">
            <span>🤖</span>
            <span>Auto-exploration enabled</span>
          </div>
        )}
      </div>

      {/* Flavor Text */}
      <div className="p-3 bg-gray-800/30 border border-gray-700/50 rounded-lg">
        <p className="text-sm text-gray-400 italic text-center">
          {progress < 25
            ? 'You begin your careful exploration of the area...'
            : progress < 50
            ? 'You search through hidden corners and obscure paths...'
            : progress < 75
            ? 'The landscape is gradually revealing its secrets...'
            : 'You\'ve covered most of the area, but there may be more to find...'}
        </p>
      </div>
    </div>
  )
}
