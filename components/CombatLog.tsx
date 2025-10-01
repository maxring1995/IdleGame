'use client'

import { useEffect, useRef } from 'react'
import { CombatAction } from '@/lib/supabase'

interface CombatLogProps {
  actions: CombatAction[]
  className?: string
}

export default function CombatLog({ actions, className = '' }: CombatLogProps) {
  const logEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new actions are added
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [actions])

  if (actions.length === 0) {
    return (
      <div className={`bg-gray-900 rounded-lg p-4 ${className}`}>
        <div className="text-gray-500 text-sm text-center">
          Combat will begin soon...
        </div>
      </div>
    )
  }

  const getActionColor = (action: CombatAction) => {
    if (action.action === 'defeat') {
      return action.actor === 'player' ? 'text-red-400' : 'text-green-400'
    }
    if (action.action === 'critical') {
      return 'text-yellow-400'
    }
    if (action.actor === 'player') {
      return 'text-blue-400'
    }
    return 'text-orange-400'
  }

  const getActionIcon = (action: CombatAction) => {
    if (action.action === 'defeat') {
      return action.actor === 'player' ? '💀' : '🎉'
    }
    if (action.action === 'critical') {
      return '⚡'
    }
    if (action.actor === 'player') {
      return '⚔️'
    }
    return '🗡️'
  }

  return (
    <div className={`bg-gray-900 rounded-lg p-4 ${className}`}>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {actions.map((action, index) => (
          <div
            key={index}
            className={`text-sm ${getActionColor(action)} flex items-start gap-2`}
          >
            <span className="flex-shrink-0">{getActionIcon(action)}</span>
            <div className="flex-1">
              <span className="font-semibold">Turn {action.turn}:</span>{' '}
              {action.message}
              {action.damage !== undefined && (
                <span className="ml-1 text-white font-bold">
                  ({action.damage} dmg)
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  )
}
