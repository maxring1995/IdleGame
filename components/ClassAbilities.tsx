'use client'

import { useState, useEffect } from 'react'
import { getClassAbilities, getCharacterAbilities, learnAbility } from '@/lib/classSystem'
import type { ClassAbility, Character } from '@/lib/supabase'

interface ClassAbilitiesProps {
  character: Character
  onAbilityLearned: () => void
}

export default function ClassAbilities({ character, onAbilityLearned }: ClassAbilitiesProps) {
  const [availableAbilities, setAvailableAbilities] = useState<ClassAbility[]>([])
  const [learnedAbilities, setLearnedAbilities] = useState<ClassAbility[]>([])
  const [selectedAbility, setSelectedAbility] = useState<ClassAbility | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadAbilities() {
      if (!character.class_id) {
        setError('No class selected')
        setIsLoading(false)
        return
      }

      const { data: available } = await getClassAbilities(character.class_id)
      const { data: learned } = await getCharacterAbilities(character.id)

      if (available) setAvailableAbilities(available)
      if (learned) setLearnedAbilities(learned)

      setIsLoading(false)
    }

    loadAbilities()
  }, [character])

  // Check if ability is learned
  function isAbilityLearned(abilityId: string): boolean {
    return learnedAbilities.some(a => a.id === abilityId)
  }

  // Check if ability can be learned
  function canLearnAbility(ability: ClassAbility): boolean {
    // Already learned
    if (isAbilityLearned(ability.id)) return false

    // Level requirement
    if (character.level < ability.required_level) return false

    return true
  }

  // Learn an ability
  async function handleLearnAbility(ability: ClassAbility) {
    if (!canLearnAbility(ability)) return

    setError(null)
    const { success, error: learnError } = await learnAbility(character.id, ability.id)

    if (success) {
      // Reload learned abilities
      const { data: learned } = await getCharacterAbilities(character.id)
      if (learned) setLearnedAbilities(learned)
      onAbilityLearned()
    } else {
      setError(learnError?.message || 'Failed to learn ability')
    }
  }

  // Get ability type color
  function getAbilityTypeColor(type: string): string {
    switch (type) {
      case 'damage':
        return 'text-red-400 bg-red-500/20 border-red-500/50'
      case 'heal':
        return 'text-green-400 bg-green-500/20 border-green-500/50'
      case 'buff':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/50'
      case 'debuff':
        return 'text-purple-400 bg-purple-500/20 border-purple-500/50'
      case 'utility':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50'
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/50'
    }
  }

  // Get damage type color
  function getDamageTypeColor(type?: string): string {
    if (!type) return 'text-gray-400'
    switch (type) {
      case 'physical':
        return 'text-orange-400'
      case 'fire':
        return 'text-red-400'
      case 'frost':
        return 'text-cyan-400'
      case 'arcane':
        return 'text-purple-400'
      case 'nature':
        return 'text-green-400'
      case 'shadow':
        return 'text-violet-400'
      case 'holy':
        return 'text-yellow-400'
      default:
        return 'text-gray-400'
    }
  }

  if (isLoading) {
    return (
      <div className="panel p-8 text-center">
        <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading abilities...</p>
      </div>
    )
  }

  if (!character.class_id) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-red-400">No class selected. Please create a new character.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Class Abilities</h2>
            <p className="text-gray-400 text-sm">Master your class's unique powers</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary" data-testid="abilities-learned-count">
              {learnedAbilities.length}/{availableAbilities.length}
            </div>
            <div className="text-xs text-gray-400">Abilities Learned</div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Ability Bar (Learned Abilities) */}
      <div className="panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">Ability Bar</h3>
        <div className="flex gap-3 flex-wrap">
          {learnedAbilities.length === 0 ? (
            <div className="text-center py-8 w-full">
              <p className="text-gray-500 text-sm">No abilities learned yet</p>
              <p className="text-gray-600 text-xs mt-1">Learn abilities below to add them to your bar</p>
            </div>
          ) : (
            learnedAbilities.map((ability, index) => (
              <button
                key={ability.id}
                onClick={() => setSelectedAbility(ability)}
                data-testid={`ability-slot-${index + 1}`}
                className={`w-20 h-20 rounded-lg border-2 flex flex-col items-center justify-center transition-all hover:scale-105 ${getAbilityTypeColor(
                  ability.ability_type || 'utility'
                )}`}
              >
                <div className="text-3xl mb-1">{ability.icon || '✨'}</div>
                <div className="text-xs font-bold text-white text-center leading-tight">
                  {ability.name.split(' ')[0]}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Spellbook/Ability List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ability List */}
        <div className="lg:col-span-2 panel p-6">
          <h3 className="text-lg font-bold text-white mb-4">Available Abilities</h3>
          <div className="space-y-3">
            {availableAbilities.map((ability) => {
              const isLearned = isAbilityLearned(ability.id)
              const canLearn = canLearnAbility(ability)

              return (
                <button
                  key={ability.id}
                  onClick={() => setSelectedAbility(ability)}
                  data-testid={`ability-${ability.id}`}
                  className={`card w-full p-4 text-left transition-all hover:scale-[1.02] ${
                    isLearned
                      ? 'bg-green-500/10 border-green-500/50'
                      : canLearn
                      ? 'hover:bg-white/5'
                      : 'opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={`w-16 h-16 rounded-lg border-2 flex items-center justify-center text-3xl ${getAbilityTypeColor(
                        ability.ability_type || 'utility'
                      )}`}
                    >
                      {ability.icon || '✨'}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="text-white font-bold">{ability.name}</h4>
                        {isLearned && (
                          <span className="badge badge-uncommon text-xs">Learned</span>
                        )}
                      </div>

                      <p className="text-sm text-gray-400 mb-2">{ability.description}</p>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Type:</span>
                          <span className={getAbilityTypeColor(ability.ability_type || 'utility')}>
                            {ability.ability_type}
                          </span>
                        </div>

                        {ability.damage_type && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Damage:</span>
                            <span className={getDamageTypeColor(ability.damage_type)}>
                              {ability.damage_type}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Required Level:</span>
                          <span
                            className={
                              character.level >= ability.required_level
                                ? 'text-green-400'
                                : 'text-red-400'
                            }
                          >
                            {ability.required_level}
                          </span>
                        </div>

                        {ability.resource_cost > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Mana:</span>
                            <span className="text-blue-400">{ability.resource_cost}</span>
                          </div>
                        )}

                        {ability.cooldown_seconds > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Cooldown:</span>
                            <span className="text-yellow-400">{ability.cooldown_seconds}s</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Learn button */}
                    {!isLearned && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleLearnAbility(ability)
                        }}
                        disabled={!canLearn}
                        data-testid={`learn-ability-${ability.id}`}
                        className="btn btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Learn
                      </button>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Ability Details Sidebar */}
        <div className="panel p-6 h-fit sticky top-6">
          <h3 className="text-lg font-bold text-white mb-4">Ability Details</h3>
          {selectedAbility ? (
            <div className="space-y-4">
              {/* Icon and name */}
              <div className="text-center">
                <div
                  className={`w-24 h-24 rounded-lg border-2 flex items-center justify-center text-5xl mx-auto mb-3 ${getAbilityTypeColor(
                    selectedAbility.ability_type || 'utility'
                  )}`}
                >
                  {selectedAbility.icon || '✨'}
                </div>
                <h4 className="text-xl font-bold text-white">{selectedAbility.name}</h4>
                <p className={`text-sm ${getAbilityTypeColor(selectedAbility.ability_type || 'utility')}`}>
                  {selectedAbility.ability_type}
                </p>
              </div>

              {/* Description */}
              <div>
                <h5 className="text-sm font-bold text-gray-300 mb-1">Description</h5>
                <p className="text-sm text-gray-400">{selectedAbility.description}</p>
              </div>

              {/* Stats */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Required Level:</span>
                  <span className="text-white font-bold">{selectedAbility.required_level}</span>
                </div>

                {selectedAbility.resource_cost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mana Cost:</span>
                    <span className="text-blue-400 font-bold">{selectedAbility.resource_cost}</span>
                  </div>
                )}

                {selectedAbility.cooldown_seconds > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cooldown:</span>
                    <span className="text-yellow-400 font-bold">{selectedAbility.cooldown_seconds}s</span>
                  </div>
                )}

                {selectedAbility.damage_type && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Damage Type:</span>
                    <span className={`font-bold ${getDamageTypeColor(selectedAbility.damage_type)}`}>
                      {selectedAbility.damage_type}
                    </span>
                  </div>
                )}
              </div>

              {/* Effects */}
              {selectedAbility.effects && Object.keys(selectedAbility.effects).length > 0 && (
                <div>
                  <h5 className="text-sm font-bold text-gray-300 mb-2">Effects</h5>
                  <div className="space-y-1">
                    {Object.entries(selectedAbility.effects).map(([key, value]) => (
                      <div key={key} className="text-xs text-green-400">
                        • {key}: {JSON.stringify(value)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="pt-4 border-t border-white/10">
                {isAbilityLearned(selectedAbility.id) ? (
                  <div className="text-center p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                    <span className="text-green-400 font-bold">✓ Ability Learned</span>
                  </div>
                ) : canLearnAbility(selectedAbility) ? (
                  <button
                    onClick={() => handleLearnAbility(selectedAbility)}
                    data-testid="learn-ability-sidebar"
                    className="btn btn-primary w-full"
                  >
                    Learn Ability
                  </button>
                ) : (
                  <div className="text-center p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <span className="text-red-400 text-sm">
                      Requires Level {selectedAbility.required_level}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-3 opacity-50">✨</div>
              <p className="text-gray-500 text-sm">Select an ability to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
