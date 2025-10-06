'use client'

import { useState, useEffect } from 'react'
import { Enemy, ActiveCombat as ActiveCombatType, CombatResult } from '@/lib/supabase'
import { useGameStore } from '@/lib/store'
import { startCombat, executeTurn, endCombat, getActiveCombat, abandonCombat } from '@/lib/combat'
import { getEnemyById } from '@/lib/enemies'
import { getCharacter } from '@/lib/character'
import { getInventory } from '@/lib/inventory'
import { useConsumable } from '@/lib/consumables'
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
  const [autoAttack, setAutoAttack] = useState(false)
  const [autoAttackInterval, setAutoAttackInterval] = useState<NodeJS.Timeout | null>(null)
  const [combatStyle, setCombatStyle] = useState<'melee' | 'magic' | 'ranged'>('melee')
  const [healthPotions, setHealthPotions] = useState<any[]>([])
  const [isHealing, setIsHealing] = useState(false)
  const [healMessage, setHealMessage] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Only check active combat on initial load, not on every character update
    if (!isInitialized && character) {
      checkActiveCombat()
      loadHealthPotions()
      setIsInitialized(true)
    }
  }, [character, isInitialized])

  // Separate effect for reloading potions when character changes
  useEffect(() => {
    if (character) {
      loadHealthPotions()
    }
  }, [character?.id])

  useEffect(() => {
    if (autoAttack && activeCombat && !combatResult && !isAttacking) {
      const interval = setInterval(() => {
        handleAttack()
      }, 2000)

      setAutoAttackInterval(interval)

      return () => {
        clearInterval(interval)
      }
    } else if (autoAttackInterval) {
      clearInterval(autoAttackInterval)
      setAutoAttackInterval(null)
    }
  }, [autoAttack, activeCombat, combatResult, isAttacking])

  useEffect(() => {
    return () => {
      if (autoAttackInterval) {
        clearInterval(autoAttackInterval)
      }
    }
  }, [])

  async function checkActiveCombat() {
    if (!character) return

    const { data } = await getActiveCombat(character.id)

    if (data) {
      setActiveCombat(data)
      const { data: enemy } = await getEnemyById(data.enemy_id)
      setCurrentEnemy(enemy)
      setView('combat')
    }
  }

  async function loadHealthPotions() {
    if (!character) return

    const { data: inventory } = await getInventory(character.id)
    if (inventory) {
      const potions = inventory.filter((item: any) =>
        item.item.type === 'consumable' &&
        (item.item.name?.toLowerCase().includes('health') ||
         item.item.description?.toLowerCase().includes('hp'))
      )
      setHealthPotions(potions)
    }
  }

  async function handleHeal() {
    if (!character || healthPotions.length === 0) return

    setIsHealing(true)
    setHealMessage(null)

    const potion = healthPotions[0] // Use first available potion
    const { success, effects, updatedCharacter } = await useConsumable(character.id, potion.id)

    if (success && updatedCharacter) {
      // Immediately update the global store with new health/mana values
      const updatedChar = {
        ...character,
        health: updatedCharacter.health,
        mana: updatedCharacter.mana
      }
      updateCharacterStats(updatedChar)

      // Update active combat health if in combat
      if (activeCombat) {
        // Update the database record for active combat
        const { createClient } = await import('@/utils/supabase/client')
        const supabase = createClient()

        const { error: updateError } = await supabase
          .from('active_combat')
          .update({
            player_current_health: updatedCharacter.health,
            updated_at: new Date().toISOString()
          })
          .eq('character_id', character.id)

        if (!updateError) {
          // Update local state only if database update succeeded
          setActiveCombat({
            ...activeCombat,
            player_current_health: updatedCharacter.health
          })
        } else {
          console.error('Failed to update combat health:', updateError)
        }
      }

      // Show success message
      const healAmount = effects?.find((e: any) => e.type === 'restore_health')?.value || 0
      setHealMessage(`Healed ${healAmount} HP!`)

      // Reload potions
      await loadHealthPotions()

      // Clear message after 3 seconds
      setTimeout(() => setHealMessage(null), 3000)
    }

    setIsHealing(false)
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

    const { data, error: err } = await executeTurn(character.id, combatStyle)

    if (err) {
      setError(err.message || 'Combat error occurred')
      setIsAttacking(false)
      return
    }

    if (data) {
      setActiveCombat(data.combat)

      if (data.isOver) {
        const { data: result, error: endErr } = await endCombat(character.id, data.victory!)

        if (endErr) {
          setError(endErr.message || 'Failed to end combat')
        } else if (result) {
          setCombatResult(result)

          // If defeated, character is deleted - don't try to fetch it
          if (data.victory) {
            const { data: updatedChar } = await getCharacter(character.user_id)

            if (updatedChar) {
              updateCharacterStats(updatedChar)
            }
          } else {
            // Character was deleted, clear the store
            updateCharacterStats(null as any)
          }
        }
      }
    }

    setIsAttacking(false)
  }

  function handleCloseResult() {
    // If this was a defeat, character is deleted - reload the page to show character creation
    if (combatResult && !combatResult.victory) {
      window.location.reload()
      return
    }

    setCombatResult(null)
    setActiveCombat(null)
    setCurrentEnemy(null)
    setAutoAttack(false)
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
      setAutoAttack(false)
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
      <div className="space-y-6">
        {/* Quick Status Bar */}
        {character && (
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* HP Display */}
                <div className="flex items-center gap-3">
                  <span className="text-red-400 font-semibold flex items-center gap-1">
                    <span className="text-lg">❤️</span> Health
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="progress-bar h-5 w-48">
                      <div
                        className={`progress-fill ${
                          (character.health / character.max_health) <= 0.25
                            ? 'bg-gradient-to-r from-red-600 to-red-700'
                            : 'bg-gradient-to-r from-green-500 to-green-600'
                        }`}
                        style={{ width: `${(character.health / character.max_health) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono text-gray-300">
                      {character.health}/{character.max_health}
                    </span>
                  </div>
                </div>

                {/* Potion Quick Use */}
                {healthPotions.length > 0 && character.health < character.max_health && (
                  <button
                    onClick={handleHeal}
                    disabled={isHealing}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all flex items-center gap-2"
                  >
                    <span>❤️</span>
                    <span>{isHealing ? 'Healing...' : 'Use Potion'}</span>
                    <span className="badge badge-uncommon">{healthPotions.reduce((sum, p) => sum + p.quantity, 0)}</span>
                  </button>
                )}

                {healMessage && (
                  <div className="animate-pulse text-emerald-400 font-semibold">
                    {healMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 text-red-400 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <span>{error}</span>
          </div>
        )}
        <EnemyList onSelectEnemy={handleSelectEnemy} />
      </div>
    )
  }

  // Active Combat View
  if (!activeCombat || !currentEnemy) {
    return (
      <div className="text-center text-gray-400 py-12">
        <div className="animate-pulse">Loading combat...</div>
      </div>
    )
  }

  const playerHealthPercent = (activeCombat.player_current_health / character.max_health) * 100
  const enemyHealthPercent = (activeCombat.enemy_current_health / currentEnemy.health) * 100

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 text-red-400 flex items-center gap-3 animate-pulse">
          <span className="text-2xl">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Battle Arena Header */}
      <div className="relative overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-br from-red-950/40 via-gray-900 to-gray-950 p-6">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentEnemy.is_boss && (
              <div className="animate-pulse">
                <span className="text-4xl">👑</span>
              </div>
            )}
            <div>
              <h2 className={`text-3xl font-bold mb-1 text-shadow-lg ${
                currentEnemy.is_boss ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400' : 'text-white'
              }`}>
                {currentEnemy.name}
              </h2>
              <div className="flex items-center gap-2">
                <span className="badge badge-rare">Level {currentEnemy.level}</span>
                {currentEnemy.is_boss && (
                  <span className="badge badge-epic animate-pulse-slow">BOSS ENCOUNTER</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-Attack Toggle */}
            <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900/60 border border-gray-700/50 cursor-pointer hover:bg-gray-800/80 transition-all">
              <input
                id="auto-attack-toggle"
                name="auto-attack-toggle"
                type="checkbox"
                checked={autoAttack}
                onChange={(e) => setAutoAttack(e.target.checked)}
                data-testid="auto-attack-toggle"
                className="w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500 focus:ring-offset-gray-900"
              />
              <span className="text-sm font-medium text-gray-300">Auto Battle</span>
              {autoAttack && <span className="animate-pulse text-amber-400">⚡</span>}
            </label>

            <button
              onClick={handleAbandon}
              className="btn btn-secondary text-sm"
            >
              <span className="mr-1">🏃</span>
              Flee
            </button>
          </div>
        </div>
      </div>

      {/* Battle Arena - Combatants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Player Card */}
        <div className="relative">
          <div className={`card-hover p-6 border-2 ${
            playerHealthPercent <= 25 ? 'border-red-500/70 animate-pulse' : 'border-blue-500/50'
          }`}>
            {/* Character Badge */}
            <div className="absolute -top-3 left-6 px-3 py-1 bg-blue-600 rounded-lg text-xs font-bold text-white shadow-lg">
              YOU
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-xl">
                <span className="text-4xl">🛡️</span>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-1 text-shadow">{character.name}</h3>
                <span className="badge badge-uncommon">Level {character.level}</span>
              </div>
            </div>

            {/* Health Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-red-400">Health</span>
                <span className="text-sm font-mono text-gray-300">
                  {activeCombat.player_current_health.toLocaleString()} / {character.max_health.toLocaleString()}
                </span>
              </div>
              <div className="progress-bar h-6">
                <div
                  className={`progress-fill ${
                    playerHealthPercent <= 25
                      ? 'bg-gradient-to-r from-red-600 to-red-700'
                      : 'bg-gradient-to-r from-green-500 to-green-600'
                  }`}
                  style={{ width: `${playerHealthPercent}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-500 text-right">
                {Math.floor(playerHealthPercent)}%
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-box">
                <div>
                  <div className="text-xs text-gray-500">Attack</div>
                  <div className="text-xl font-bold text-red-400">{character.attack}</div>
                </div>
                <span className="text-2xl">⚔️</span>
              </div>
              <div className="stat-box">
                <div>
                  <div className="text-xs text-gray-500">Defense</div>
                  <div className="text-xl font-bold text-blue-400">{character.defense}</div>
                </div>
                <span className="text-2xl">🛡️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enemy Card */}
        <div className="relative">
          <div className={`card-hover p-6 border-2 ${
            currentEnemy.is_boss
              ? 'border-purple-500/70 bg-gradient-to-br from-purple-950/40 to-gray-900'
              : enemyHealthPercent <= 25
                ? 'border-red-500/70 animate-pulse'
                : 'border-red-500/50'
          }`}>
            {/* Enemy Badge */}
            <div className={`absolute -top-3 right-6 px-3 py-1 rounded-lg text-xs font-bold text-white shadow-lg ${
              currentEnemy.is_boss ? 'bg-purple-600' : 'bg-red-600'
            }`}>
              ENEMY
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className={`w-20 h-20 rounded-xl flex items-center justify-center shadow-xl ${
                currentEnemy.is_boss
                  ? 'bg-gradient-to-br from-purple-600 to-purple-800'
                  : 'bg-gradient-to-br from-red-600 to-red-800'
              }`}>
                <span className="text-4xl">{currentEnemy.is_boss ? '👑' : '👹'}</span>
              </div>
              <div className="flex-1">
                <h3 className={`text-2xl font-bold mb-1 text-shadow ${
                  currentEnemy.is_boss ? 'text-purple-300' : 'text-white'
                }`}>
                  {currentEnemy.name}
                </h3>
                <span className={currentEnemy.is_boss ? 'badge badge-epic' : 'badge badge-rare'}>
                  Level {currentEnemy.level}
                </span>
              </div>
            </div>

            {/* Health Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-red-400">Health</span>
                <span className="text-sm font-mono text-gray-300">
                  {activeCombat.enemy_current_health.toLocaleString()} / {currentEnemy.health.toLocaleString()}
                </span>
              </div>
              <div className="progress-bar h-6">
                <div
                  className={`progress-fill ${
                    currentEnemy.is_boss
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600'
                      : 'bg-gradient-to-r from-red-500 to-red-600'
                  }`}
                  style={{ width: `${enemyHealthPercent}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-500 text-right">
                {Math.floor(enemyHealthPercent)}%
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-box">
                <div>
                  <div className="text-xs text-gray-500">Attack</div>
                  <div className="text-xl font-bold text-red-400">{currentEnemy.attack}</div>
                </div>
                <span className="text-2xl">⚔️</span>
              </div>
              <div className="stat-box">
                <div>
                  <div className="text-xs text-gray-500">Defense</div>
                  <div className="text-xl font-bold text-blue-400">{currentEnemy.defense}</div>
                </div>
                <span className="text-2xl">🛡️</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Combat Log */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>⚔️</span>
          <span>Battle Log</span>
        </h3>
        <CombatLog actions={activeCombat.combat_log || []} />
      </div>

      {/* Combat Style Selection */}
      <div className="card p-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>⚡</span>
          <span>Combat Style</span>
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setCombatStyle('melee')}
            disabled={autoAttack}
            className={`relative p-4 rounded-lg border-2 transition-all ${
              combatStyle === 'melee'
                ? 'border-red-500 bg-red-500/20 shadow-lg shadow-red-500/50'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <div className="text-3xl mb-2">⚔️</div>
            <div className="font-bold text-white">Melee</div>
            <div className="text-xs text-gray-400 mt-1">Attack + Strength</div>
          </button>
          <button
            onClick={() => setCombatStyle('magic')}
            disabled={autoAttack}
            className={`relative p-4 rounded-lg border-2 transition-all ${
              combatStyle === 'magic'
                ? 'border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/50'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <div className="text-3xl mb-2">✨</div>
            <div className="font-bold text-white">Magic</div>
            <div className="text-xs text-gray-400 mt-1">Magic XP</div>
          </button>
          <button
            onClick={() => setCombatStyle('ranged')}
            disabled={autoAttack}
            className={`relative p-4 rounded-lg border-2 transition-all ${
              combatStyle === 'ranged'
                ? 'border-green-500 bg-green-500/20 shadow-lg shadow-green-500/50'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <div className="text-3xl mb-2">🏹</div>
            <div className="font-bold text-white">Ranged</div>
            <div className="text-xs text-gray-400 mt-1">Ranged XP</div>
          </button>
        </div>
      </div>

      {/* Attack Controls & Quick Actions */}
      <div className="flex flex-col items-center gap-4">
        {/* Heal Button and Potion Count */}
        {healthPotions.length > 0 && (
          <div className="flex items-center gap-4">
            <button
              onClick={handleHeal}
              disabled={isHealing || character.health >= character.max_health}
              className={`relative px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                character.health >= character.max_health
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                  : isHealing
                    ? 'bg-emerald-600/50 text-white cursor-wait'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 transform hover:scale-105 active:scale-95'
              }`}
            >
              <span className="text-xl">❤️</span>
              <span>{isHealing ? 'Healing...' : 'Use Potion'}</span>
              <span className="badge badge-uncommon">{healthPotions.reduce((sum, p) => sum + p.quantity, 0)}</span>
            </button>

            {healMessage && (
              <div className="animate-pulse bg-emerald-500/20 border border-emerald-500/50 rounded-lg px-4 py-2 text-emerald-400 font-semibold">
                {healMessage}
              </div>
            )}
          </div>
        )}

        {/* Attack Button */}
        <button
          onClick={handleAttack}
          disabled={isAttacking || autoAttack}
          className={`relative overflow-hidden group ${
            autoAttack
              ? 'btn btn-secondary text-lg px-12 py-4 cursor-not-allowed opacity-60'
              : 'btn btn-danger text-lg px-12 py-4 transform hover:scale-105 active:scale-95'
          }`}
        >
          {autoAttack ? (
            <>
              <span className="mr-2 animate-pulse">⚡</span>
              <span>Auto Battle Active</span>
            </>
          ) : isAttacking ? (
            <>
              <span className="mr-2 animate-spin inline-block">⚔️</span>
              <span>Attacking...</span>
            </>
          ) : (
            <>
              <span className="mr-2">⚔️</span>
              <span>Attack</span>
            </>
          )}

          {/* Button glow effect on hover */}
          {!autoAttack && !isAttacking && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          )}
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