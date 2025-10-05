'use client'

/**
 * Specialization Selection Modal
 *
 * Appears when a gathering skill reaches level 50 for the first time.
 * Players choose between two specialization paths for that skill.
 * Choice is permanent and provides unique bonuses.
 */

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import type { GatheringSpecialization } from '@/lib/supabase'

interface SpecializationModalProps {
  isOpen: boolean
  onClose: () => void
  skillType: string
  skillLevel: number
  onSelect: (specializationId: string) => Promise<void>
}

export default function SpecializationModal({
  isOpen,
  onClose,
  skillType,
  skillLevel,
  onSelect
}: SpecializationModalProps) {
  const { character } = useGameStore()
  const [specializations, setSpecializations] = useState<GatheringSpecialization[]>([])
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && skillType) {
      loadSpecializations()
    }
  }, [isOpen, skillType])

  async function loadSpecializations() {
    if (!character) return

    setIsLoading(true)
    try {
      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()

      const { data, error } = await supabase
        .from('gathering_specializations')
        .select('*')
        .eq('skill_type', skillType)
        .order('name')

      if (!error && data) {
        setSpecializations(data)
      }
    } catch (err) {
      console.error('Error loading specializations:', err)
    }
    setIsLoading(false)
  }

  async function handleSelect() {
    if (!selectedSpec || isSelecting) return

    setIsSelecting(true)
    try {
      await onSelect(selectedSpec)
      onClose()
    } catch (error) {
      console.error('Error selecting specialization:', error)
    }
    setIsSelecting(false)
  }

  function formatBonuses(bonuses: any): string[] {
    const formatted: string[] = []

    if (bonuses.yield_multiplier) {
      formatted.push(`+${Math.round((bonuses.yield_multiplier - 1) * 100)}% yield`)
    }
    if (bonuses.double_drop_chance) {
      formatted.push(`${Math.round(bonuses.double_drop_chance * 100)}% double drop chance`)
    }
    if (bonuses.gem_find_multiplier) {
      formatted.push(`${bonuses.gem_find_multiplier}x gem find rate`)
    }
    if (bonuses.failure_immunity) {
      formatted.push(`Never fail gathering attempts`)
    }
    if (bonuses.quality_vision) {
      formatted.push(`See node quality before harvesting`)
    }
    if (bonuses.rare_node_vision) {
      formatted.push(`See rare nodes on map`)
    }
    if (bonuses.deep_ocean_access) {
      formatted.push(`Access deep ocean fishing spots`)
    }
    if (bonuses.legendary_fish_chance) {
      formatted.push(`${Math.round(bonuses.legendary_fish_chance * 100)}% legendary fish chance`)
    }
    if (bonuses.tame_chance) {
      formatted.push(`${Math.round(bonuses.tame_chance * 100)}% chance to tame creatures`)
    }
    if (bonuses.migration_vision) {
      formatted.push(`See animal migration patterns`)
    }
    if (bonuses.rare_pelt_multiplier) {
      formatted.push(`${bonuses.rare_pelt_multiplier}x rare pelt chance`)
    }
    if (bonuses.elemental_speed) {
      formatted.push(`${Math.round((bonuses.elemental_speed - 1) * 100)}% faster elemental gathering`)
    }
    if (bonuses.rune_yield_multiplier) {
      formatted.push(`${bonuses.rune_yield_multiplier}x rune yield`)
    }
    if (bonuses.ancient_rune_access) {
      formatted.push(`Unlock ancient rune crafting`)
    }
    if (bonuses.auto_smelt) {
      formatted.push(`Auto-smelt ores into bars`)
    }
    if (bonuses.nature_rune_chance) {
      formatted.push(`${Math.round(bonuses.nature_rune_chance * 100)}% nature rune chance`)
    }
    if (bonuses.sell_price_multiplier) {
      formatted.push(`+${Math.round((bonuses.sell_price_multiplier - 1) * 100)}% gold from sales`)
    }
    if (bonuses.double_catch_chance) {
      formatted.push(`${Math.round(bonuses.double_catch_chance * 100)}% chance to catch 2 fish`)
    }
    if (bonuses.potion_bonus) {
      formatted.push(`${Math.round(bonuses.potion_bonus * 100)}% potion effectiveness`)
    }
    if (bonuses.auto_process_chance) {
      formatted.push(`${Math.round(bonuses.auto_process_chance * 100)}% auto-process herbs`)
    }

    return formatted
  }

  function getSkillDisplayName(skill: string): string {
    const names: Record<string, string> = {
      woodcutting: 'Woodcutting',
      mining: 'Mining',
      fishing: 'Fishing',
      hunting: 'Hunting',
      alchemy: 'Alchemy',
      magic: 'Magic'
    }
    return names[skill] || skill
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-4xl mx-4">
        <div className="panel border-2 border-amber-500 shadow-2xl">
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">
                🎉 Specialization Unlocked!
              </h2>
              <p className="text-lg text-amber-400">
                Your {getSkillDisplayName(skillType)} skill has reached level {skillLevel}
              </p>
              <p className="text-gray-400 mt-2">
                Choose your path wisely - this decision is permanent!
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading specializations...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {specializations.map((spec) => (
                  <button
                    key={spec.id}
                    onClick={() => setSelectedSpec(spec.id)}
                    disabled={isSelecting}
                    className={`
                      relative p-6 rounded-xl border-2 transition-all
                      ${selectedSpec === spec.id
                        ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/50 scale-[1.02]'
                        : 'border-white/20 bg-white/5 hover:border-amber-500/50 hover:bg-amber-500/5'
                      }
                      ${isSelecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {/* Selected indicator */}
                    {selectedSpec === spec.id && (
                      <div className="absolute -top-3 -right-3 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center animate-pulse">
                        <span className="text-black font-bold">✓</span>
                      </div>
                    )}

                    {/* Icon and Title */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-5xl">{spec.icon}</div>
                      <div className="text-left">
                        <h3 className="text-xl font-bold text-white">{spec.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">{spec.description}</p>
                      </div>
                    </div>

                    {/* Bonuses */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                        Specialization Bonuses:
                      </p>
                      <ul className="space-y-1 text-left">
                        {formatBonuses(spec.bonuses).map((bonus, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                            <span className="text-green-400 mt-0.5">•</span>
                            <span>{bonus}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10">
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleSelect}
                disabled={!selectedSpec || isSelecting}
                className={`
                  px-8 py-3 rounded-xl font-bold transition-all
                  ${selectedSpec && !isSelecting
                    ? 'btn btn-primary'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                  }
                `}
              >
                {isSelecting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Selecting...
                  </span>
                ) : selectedSpec ? (
                  'Confirm Selection'
                ) : (
                  'Choose a Specialization'
                )}
              </button>

              <button
                onClick={onClose}
                disabled={isSelecting}
                className="px-8 py-3 rounded-xl font-bold btn btn-secondary"
              >
                Cancel
              </button>
            </div>

            <p className="text-center text-xs text-gray-500 mt-4">
              Note: You can select this later from your Skills panel if you cancel now.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}