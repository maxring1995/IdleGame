'use client'

import { useEffect, useState } from 'react'
import { getAllCharacterBonuses } from '@/lib/bonuses'
import type { AllCharacterBonuses, SynergyBonusDetails } from '@/lib/supabase'

interface BonusDisplayProps {
  characterId: string
  compact?: boolean
}

export default function BonusDisplay({ characterId, compact = false }: BonusDisplayProps) {
  const [bonuses, setBonuses] = useState<AllCharacterBonuses | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(!compact)

  useEffect(() => {
    if (!characterId) return

    const fetchBonuses = async () => {
      const { data } = await getAllCharacterBonuses(characterId)
      if (data) {
        setBonuses(data)
      }
      setLoading(false)
    }

    fetchBonuses()
  }, [characterId])

  if (loading) {
    return (
      <div className="panel p-4">
        <div className="flex items-center justify-center py-4">
          <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (!bonuses) return null

  const hasActiveBonuses =
    bonuses.synergy_bonuses.length > 0 ||
    bonuses.permanent_bonuses.length > 0 ||
    bonuses.landmark_bonuses.crafting_quality > 0 ||
    bonuses.merchant_discount > 0

  if (!hasActiveBonuses && compact) return null

  const formatBonus = (value: number) => `+${(value * 100).toFixed(0)}%`

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          ✨ Active Bonuses
          {hasActiveBonuses && (
            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
              {bonuses.synergy_bonuses.length + bonuses.permanent_bonuses.length} active
            </span>
          )}
        </h3>
        {compact && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-amber-400 hover:text-amber-300"
          >
            {showDetails ? 'Hide' : 'Show'}
          </button>
        )}
      </div>

      {!hasActiveBonuses ? (
        <div className="text-center py-6 text-gray-400">
          <p className="text-2xl mb-2">🎯</p>
          <p>No active bonuses yet</p>
          <p className="text-sm mt-2">Level up combat skills, discover landmarks, and complete quests!</p>
        </div>
      ) : showDetails ? (
        <div className="space-y-4">
          {/* Synergy Bonuses (Combat → Gathering/Crafting) */}
          {bonuses.synergy_bonuses.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                Combat Synergies
              </h4>
              <div className="space-y-1">
                {bonuses.synergy_bonuses.map((synergy: SynergyBonusDetails, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 bg-black/20 rounded border border-white/5 hover:border-amber-500/30 transition-colors"
                  >
                    <span className="text-xl">{synergy.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{synergy.display_name}</span>
                        <span className="text-sm font-bold text-green-400">{formatBonus(synergy.bonus_value)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{synergy.description}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                          {synergy.target_category}
                        </span>
                        {synergy.target_skill && (
                          <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                            {synergy.target_skill}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Landmark Bonuses (Exploration → Crafting) */}
          {bonuses.landmark_bonuses.crafting_quality > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wide">
                Exploration Bonuses
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {bonuses.landmark_bonuses.crafting_quality > 0 && (
                  <div className="p-2 bg-black/20 rounded border border-white/5">
                    <div className="text-xs text-gray-400">Crafting Quality</div>
                    <div className="text-lg font-bold text-blue-400">
                      {formatBonus(bonuses.landmark_bonuses.crafting_quality)}
                    </div>
                  </div>
                )}
                {bonuses.landmark_bonuses.crafting_speed > 0 && (
                  <div className="p-2 bg-black/20 rounded border border-white/5">
                    <div className="text-xs text-gray-400">Crafting Speed</div>
                    <div className="text-lg font-bold text-green-400">
                      {formatBonus(bonuses.landmark_bonuses.crafting_speed)}
                    </div>
                  </div>
                )}
                {bonuses.landmark_bonuses.crafting_cost_reduction > 0 && (
                  <div className="p-2 bg-black/20 rounded border border-white/5">
                    <div className="text-xs text-gray-400">Material Savings</div>
                    <div className="text-lg font-bold text-emerald-400">
                      {formatBonus(bonuses.landmark_bonuses.crafting_cost_reduction)}
                    </div>
                  </div>
                )}
                {bonuses.landmark_bonuses.gold_find_bonus > 0 && (
                  <div className="p-2 bg-black/20 rounded border border-white/5">
                    <div className="text-xs text-gray-400">Gold Find</div>
                    <div className="text-lg font-bold text-yellow-400">
                      {formatBonus(bonuses.landmark_bonuses.gold_find_bonus)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Permanent Bonuses (Quest Rewards, etc.) */}
          {bonuses.permanent_bonuses.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wide">
                Permanent Rewards
              </h4>
              <div className="space-y-1">
                {bonuses.permanent_bonuses.map((bonus, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-black/20 rounded border border-white/5"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{bonus.display_name}</div>
                      {bonus.description && (
                        <div className="text-xs text-gray-400 mt-0.5">{bonus.description}</div>
                      )}
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded capitalize">
                          {bonus.source_type}
                        </span>
                        {bonus.expires_at && (
                          <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded">
                            Expires: {new Date(bonus.expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-lg font-bold text-emerald-400">{formatBonus(bonus.bonus_value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Merchant Discount */}
          {bonuses.merchant_discount > 0 && (
            <div className="p-3 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded border border-emerald-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-emerald-400">💰 Merchant Discount</div>
                  <div className="text-xs text-gray-400 mt-0.5">All purchases are cheaper!</div>
                </div>
                <div className="text-2xl font-bold text-emerald-400">{formatBonus(bonuses.merchant_discount)}</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-400">
          {bonuses.synergy_bonuses.length} synergies, {bonuses.permanent_bonuses.length} rewards active
        </div>
      )}
    </div>
  )
}
