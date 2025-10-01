'use client'

import { useState, useEffect } from 'react'
import { Enemy, ActiveCombat as ActiveCombatType, CombatResult } from '@/lib/supabase'
import { useGameStore } from '@/lib/store'
import { startCombat, executeTurn, endCombat, getActiveCombat, abandonCombat } from '@/lib/combat'
import { getEnemyById } from '@/lib/enemies'
import { getCharacter } from '@/lib/character'
import EnemyList from './EnemyList'
import CombatLog from './CombatLog'
import VictoryModal from './VictoryModal'

export default function Combat() {
  const { character, updateCharacterStats } = useGameStore()
  const [view, setView] = useState<'selection' | 'combat'>('selection')
  const [activeCombat, setActiveCombat] = useState<ActiveCombatType | null>(null)
  const [currentEnemy, setCurrentEnemy] = useState<Enemy | null>(null)
  const [isAttacking, setIsAttacking] = useState(false)
  const [combatResult, setCombatResult] = useState<CombatResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check for existing combat on load
  useEffect(() => {
    checkActiveCombat()
  }, [character])

  async function checkActiveCombat() {
    if (!character) return

    const { data } = await getActiveCombat(character.id)

    if (data) {
      // Resume active combat
      setActiveCombat(data)
      const { data: enemy } = await getEnemyById(data.enemy_id)
      setCurrentEnemy(enemy)
      setView('combat')
    }
  }

  async function handleSelectEnemy(enemy: Enemy) {
    if (!character) return

    setError(null)

    const { data, error: err } = await startCombat(character.id, enemy.id)

    if (err) {
      setError(err.message || 'Failed to start combat')
      return
    }

    if (data) {
      setActiveCombat(data)
      setCurrentEnemy(enemy)
      setView('combat')
    }
  }

  async function handleAttack() {
    if (!character || !activeCombat) return

    setIsAttacking(true)
    setError(null)

    const { data, error: err } = await executeTurn(character.id)

    if (err) {
      setError(err.message || 'Combat error occurred')
      setIsAttacking(false)
      return
    }

    if (data) {
      setActiveCombat(data.combat)

      if (data.isOver) {
        // Combat ended, get results
        const { data: result, error: endErr } = await endCombat(character.id, data.victory!)

        if (endErr) {
          setError(endErr.message || 'Failed to end combat')
        } else if (result) {
          setCombatResult(result)

          // Update character health in global state
          const { data: updatedChar } = await getCharacter(character.user_id)

          if (updatedChar) {
            updateCharacterStats(updatedChar)
          }
        }
      }
    }

    setIsAttacking(false)
  }

  function handleCloseResult() {
    setCombatResult(null)
    setActiveCombat(null)
    setCurrentEnemy(null)
    setView('selection')
  }

  async function handleContinue() {
    if (!currentEnemy) return

    setCombatResult(null)
    await handleSelectEnemy(currentEnemy)
  }

  async function handleAbandon() {
    if (!character) return

    const confirm = window.confirm('Are you sure you want to flee? This counts as a defeat.')

    if (confirm) {
      await abandonCombat(character.id)
      setActiveCombat(null)
      setCurrentEnemy(null)
      setView('selection')
    }
  }

  if (!character) {
    return (
      <div className="text-center text-gray-400 py-12">
        No character found
      </div>
    )
  }

  // Enemy Selection View
  if (view === 'selection') {
    return (
      <div className="space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-400/30 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}
        <EnemyList onSelectEnemy={handleSelectEnemy} />
      </div>
    )
  }

  // Active Combat View
  if (!activeCombat || !currentEnemy) {
    return <div className="text-center text-gray-400">Loading combat...</div>
  }

  const playerHealthPercent = (activeCombat.player_current_health / character.max_health) * 100
  const enemyHealthPercent = (activeCombat.enemy_current_health / currentEnemy.health) * 100

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-400/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Combat Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          ⚔️ Battle: {currentEnemy.name}
        </h2>
        <button
          onClick={handleAbandon}
          className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
        >
          Flee
        </button>
      </div>

      {/* Combatants Display */}
      <div className="grid grid-cols-2 gap-6">
        {/* Player */}
        <div className="bg-gray-800 rounded-lg p-4 border-2 border-blue-500/50">
          <div className="text-center mb-3">
            <div className="text-4xl mb-2">🛡️</div>
            <h3 className="text-lg font-semibold text-white">{character.name}</h3>
            <div className="text-sm text-gray-400">Level {character.level}</div>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Health</span>
                <span className="text-white">
                  {activeCombat.player_current_health} / {character.max_health}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${playerHealthPercent}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mt-3">
              <div className="bg-gray-900 rounded p-2">
                <div className="text-gray-400 text-xs">Attack</div>
                <div className="text-white font-semibold">{character.attack}</div>
              </div>
              <div className="bg-gray-900 rounded p-2">
                <div className="text-gray-400 text-xs">Defense</div>
                <div className="text-white font-semibold">{character.defense}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Enemy */}
        <div className="bg-gray-800 rounded-lg p-4 border-2 border-red-500/50">
          <div className="text-center mb-3">
            <div className="text-4xl mb-2">👹</div>
            <h3 className="text-lg font-semibold text-white">{currentEnemy.name}</h3>
            <div className="text-sm text-gray-400">Level {currentEnemy.level}</div>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Health</span>
                <span className="text-white">
                  {activeCombat.enemy_current_health} / {currentEnemy.health}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-red-500 h-3 rounded-full transition-all"
                  style={{ width: `${enemyHealthPercent}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mt-3">
              <div className="bg-gray-900 rounded p-2">
                <div className="text-gray-400 text-xs">Attack</div>
                <div className="text-white font-semibold">{currentEnemy.attack}</div>
              </div>
              <div className="bg-gray-900 rounded p-2">
                <div className="text-gray-400 text-xs">Defense</div>
                <div className="text-white font-semibold">{currentEnemy.defense}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Combat Log */}
      <CombatLog actions={activeCombat.combat_log || []} />

      {/* Attack Button */}
      <div className="flex justify-center">
        <button
          onClick={handleAttack}
          disabled={isAttacking}
          className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed font-semibold text-lg transition-colors"
        >
          {isAttacking ? 'Attacking...' : '⚔️ Attack'}
        </button>
      </div>

      {/* Victory/Defeat Modal */}
      {combatResult && (
        <VictoryModal
          result={combatResult}
          enemyName={currentEnemy.name}
          onClose={handleCloseResult}
          onContinue={handleContinue}
        />
      )}
    </div>
  )
}
