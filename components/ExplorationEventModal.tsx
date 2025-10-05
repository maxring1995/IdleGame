'use client'

import { useState } from 'react'
import type { ExplorationEvent, ExplorationChoice } from '@/lib/supabase'
import { processEventChoice } from '@/lib/explorationEvents'

interface ExplorationEventModalProps {
  isOpen: boolean
  event: ExplorationEvent | null
  characterId: string
  zoneId: string
  onClose: () => void
  onComplete?: (outcome: any) => void
}

export default function ExplorationEventModal({
  isOpen,
  event,
  characterId,
  zoneId,
  onClose,
  onComplete
}: ExplorationEventModalProps) {
  const [processing, setProcessing] = useState(false)
  const [outcome, setOutcome] = useState<any>(null)
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null)

  if (!isOpen || !event) return null

  async function handleChoice(choice: ExplorationChoice, index: number) {
    if (processing) return

    setProcessing(true)
    setSelectedChoice(index)

    if (!event) return

    const { data, error } = await processEventChoice(
      characterId,
      event.id,
      choice,
      zoneId
    )

    if (error) {
      console.error('Error processing choice:', error)
      setProcessing(false)
      return
    }

    setOutcome(data)
    setProcessing(false)

    // Show outcome for 3 seconds then close
    setTimeout(() => {
      onComplete?.(data)
      onClose()
      setOutcome(null)
      setSelectedChoice(null)
    }, 3000)
  }

  // Get event type icon
  const getEventIcon = () => {
    switch (event.event_type) {
      case 'discovery': return '🔍'
      case 'encounter': return '⚔️'
      case 'puzzle': return '🧩'
      case 'hazard': return '⚠️'
      case 'treasure': return '💎'
      case 'npc': return '🧙'
      case 'mystery': return '❓'
      default: return '🎯'
    }
  }

  // Get event type color
  const getEventColor = () => {
    switch (event.event_type) {
      case 'discovery': return 'from-blue-600 to-cyan-600'
      case 'encounter': return 'from-red-600 to-orange-600'
      case 'puzzle': return 'from-purple-600 to-pink-600'
      case 'hazard': return 'from-yellow-600 to-red-600'
      case 'treasure': return 'from-yellow-500 to-amber-500'
      case 'npc': return 'from-green-600 to-teal-600'
      case 'mystery': return 'from-gray-600 to-purple-600'
      default: return 'from-gray-600 to-gray-700'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-gradient-to-br from-gray-900 to-gray-950 border-2 border-amber-500/50
                      rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className={`p-6 bg-gradient-to-r ${getEventColor()} relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-2">
              <span className="text-5xl animate-float">{getEventIcon()}</span>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white text-shadow-lg">
                  {event.event_name}
                </h2>
                <div className="text-white/80 text-sm mt-1">
                  {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)} Event
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div className="space-y-3">
            <p className="text-gray-300 text-lg leading-relaxed">
              {event.description}
            </p>
            {event.flavor_text && (
              <p className="text-gray-400 italic border-l-4 border-amber-500/30 pl-4">
                {event.flavor_text}
              </p>
            )}
          </div>

          {/* Outcome Display */}
          {outcome && (
            <div className="p-4 bg-gradient-to-r from-green-900/30 to-emerald-900/30
                          border border-green-500/50 rounded-xl animate-pulse">
              <div className="flex items-start gap-3">
                <span className="text-2xl">✨</span>
                <div className="flex-1">
                  <div className="font-semibold text-green-400 mb-1">
                    {outcome.success ? 'Success!' : 'Outcome'}
                  </div>
                  <p className="text-gray-300">{outcome.message}</p>

                  {/* Show rewards */}
                  {outcome.rewards && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {outcome.rewards.xp && (
                        <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30
                                       rounded-lg text-blue-400 text-sm">
                          +{outcome.rewards.xp} XP
                        </span>
                      )}
                      {outcome.rewards.gold && (
                        <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/30
                                       rounded-lg text-yellow-400 text-sm">
                          {outcome.rewards.gold > 0 ? '+' : ''}{outcome.rewards.gold} Gold
                        </span>
                      )}
                      {outcome.rewards.items && outcome.rewards.items.map((item: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 bg-purple-500/20 border border-purple-500/30
                                                  rounded-lg text-purple-400 text-sm">
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Choices */}
          {!outcome && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">What do you do?</h3>
              <div className="space-y-2">
                {event.choices.map((choice: ExplorationChoice, index: number) => (
                  <button
                    key={index}
                    onClick={() => handleChoice(choice, index)}
                    disabled={processing}
                    className={`
                      w-full p-4 text-left rounded-xl border transition-all duration-200
                      ${processing && selectedChoice === index
                        ? 'bg-amber-500/20 border-amber-500 animate-pulse'
                        : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50 hover:border-amber-500/50'
                      }
                      ${processing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-amber-400 mt-1">▸</span>
                      <div className="flex-1">
                        <div className="text-white font-medium">{choice.text}</div>

                        {/* Show requirements */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {choice.skill_check && Object.entries(choice.skill_check).map(([skill, level]) => (
                            <span key={skill} className="text-xs px-2 py-1 bg-blue-500/20
                                                       border border-blue-500/30 rounded text-blue-400">
                              Requires {skill} {level}+
                            </span>
                          ))}
                          {choice.requires_item && (
                            <span className="text-xs px-2 py-1 bg-purple-500/20
                                           border border-purple-500/30 rounded text-purple-400">
                              Requires {choice.requires_item}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Skip button (if no outcome yet) */}
          {!outcome && !processing && (
            <div className="pt-4 border-t border-gray-800">
              <button
                onClick={onClose}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-400
                         rounded-xl transition-colors"
              >
                Ignore and Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}