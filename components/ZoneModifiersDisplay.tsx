'use client'

import { useEffect, useState } from 'react'
import {
  getCharacterZoneModifiers,
  describeAllModifiers,
  hasActiveModifiers,
  type ZoneModifiers
} from '@/lib/zone-modifiers'

interface ZoneModifiersDisplayProps {
  characterId: string
  compact?: boolean
}

export default function ZoneModifiersDisplay({
  characterId,
  compact = false
}: ZoneModifiersDisplayProps) {
  const [modifiers, setModifiers] = useState<ZoneModifiers | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(!compact)

  useEffect(() => {
    loadModifiers()
  }, [characterId])

  async function loadModifiers() {
    setLoading(true)
    const { data } = await getCharacterZoneModifiers(characterId)
    setModifiers(data)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="panel p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
          <span className="text-sm">Loading zone bonuses...</span>
        </div>
      </div>
    )
  }

  if (!modifiers || !hasActiveModifiers(modifiers)) {
    if (compact) return null
    return (
      <div className="panel p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <span className="text-2xl">🗺️</span>
          <div>
            <p className="text-sm font-medium">No Zone Bonuses</p>
            <p className="text-xs text-gray-600">Travel to different zones for bonuses</p>
          </div>
        </div>
      </div>
    )
  }

  const descriptions = describeAllModifiers(modifiers)
  const hasAnyBonuses =
    descriptions.combat.length > 0 ||
    descriptions.gathering.length > 0 ||
    descriptions.crafting.length > 0 ||
    descriptions.merchants.length > 0

  if (!hasAnyBonuses) return null

  if (compact) {
    return (
      <div className="panel p-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-left hover:bg-white/5 rounded-lg transition-colors p-1"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🗺️</span>
            <span className="text-sm font-medium text-white">Zone Bonuses</span>
          </div>
          <span className="text-xs text-gray-400">
            {expanded ? '▼' : '▶'}
          </span>
        </button>

        {expanded && (
          <div className="mt-3 space-y-2">
            {descriptions.combat.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-red-400 flex items-center gap-1">
                  <span>⚔️</span> Combat
                </p>
                {descriptions.combat.map((desc, i) => (
                  <p key={i} className="text-xs text-gray-300 pl-5">{desc}</p>
                ))}
              </div>
            )}

            {descriptions.gathering.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-green-400 flex items-center gap-1">
                  <span>🌿</span> Gathering
                </p>
                {descriptions.gathering.map((desc, i) => (
                  <p key={i} className="text-xs text-gray-300 pl-5">{desc}</p>
                ))}
              </div>
            )}

            {descriptions.crafting.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-blue-400 flex items-center gap-1">
                  <span>🔨</span> Crafting
                </p>
                {descriptions.crafting.map((desc, i) => (
                  <p key={i} className="text-xs text-gray-300 pl-5">{desc}</p>
                ))}
              </div>
            )}

            {descriptions.merchants.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-yellow-400 flex items-center gap-1">
                  <span>💰</span> Merchants
                </p>
                {descriptions.merchants.map((desc, i) => (
                  <p key={i} className="text-xs text-gray-300 pl-5">{desc}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Full expanded view
  return (
    <div className="panel p-4 space-y-4">
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <span className="text-2xl">🗺️</span>
        <div>
          <h3 className="text-lg font-bold text-white">Active Zone Bonuses</h3>
          <p className="text-xs text-gray-400">Modifiers from your current zone</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {descriptions.combat.length > 0 && (
          <div className="card p-3 space-y-2">
            <div className="flex items-center gap-2 text-red-400">
              <span className="text-xl">⚔️</span>
              <h4 className="font-semibold">Combat</h4>
            </div>
            <div className="space-y-1">
              {descriptions.combat.map((desc, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-red-500">•</span>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {descriptions.gathering.length > 0 && (
          <div className="card p-3 space-y-2">
            <div className="flex items-center gap-2 text-green-400">
              <span className="text-xl">🌿</span>
              <h4 className="font-semibold">Gathering</h4>
            </div>
            <div className="space-y-1">
              {descriptions.gathering.map((desc, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-green-500">•</span>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {descriptions.crafting.length > 0 && (
          <div className="card p-3 space-y-2">
            <div className="flex items-center gap-2 text-blue-400">
              <span className="text-xl">🔨</span>
              <h4 className="font-semibold">Crafting</h4>
            </div>
            <div className="space-y-1">
              {descriptions.crafting.map((desc, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-blue-500">•</span>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {descriptions.merchants.length > 0 && (
          <div className="card p-3 space-y-2">
            <div className="flex items-center gap-2 text-yellow-400">
              <span className="text-xl">💰</span>
              <h4 className="font-semibold">Merchants</h4>
            </div>
            <div className="space-y-1">
              {descriptions.merchants.map((desc, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-yellow-500">•</span>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 text-center pt-2 border-t border-white/10">
        Zone bonuses automatically apply to all actions in this zone
      </div>
    </div>
  )
}
