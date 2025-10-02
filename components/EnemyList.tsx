'use client'

import { useEffect, useState } from 'react'
import { Enemy } from '@/lib/supabase'
import { getAvailableEnemies } from '@/lib/enemies'
import { useGameStore } from '@/lib/store'

interface EnemyListProps {
  onSelectEnemy: (enemy: Enemy) => void
}

export default function EnemyList({ onSelectEnemy }: EnemyListProps) {
  const { character } = useGameStore()
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEnemies()
  }, [character])

  async function loadEnemies() {
    if (!character) return

    setLoading(true)
    setError(null)

    const { data, error: err } = await getAvailableEnemies(character.level)

    if (err) {
      setError('Failed to load enemies')
      console.error(err)
    } else {
      setEnemies(data || [])
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading enemies...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-red-400 mb-4">{error}</div>
        <button
          onClick={loadEnemies}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (enemies.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">No enemies available at your level</div>
      </div>
    )
  }

  const getDifficultyColor = (enemyLevel: number) => {
    if (!character) return 'text-gray-400'
    const diff = enemyLevel - character.level

    if (diff <= -2) return 'text-green-400' // Easy
    if (diff === -1) return 'text-green-300' // Slightly easy
    if (diff === 0) return 'text-yellow-400' // Fair
    if (diff === 1) return 'text-orange-400' // Challenging
    return 'text-red-400' // Hard
  }

  const getDifficultyLabel = (enemyLevel: number) => {
    if (!character) return 'Unknown'
    const diff = enemyLevel - character.level

    if (diff <= -2) return 'Easy'
    if (diff === -1) return 'Moderate'
    if (diff === 0) return 'Fair Fight'
    if (diff === 1) return 'Challenging'
    return 'Hard'
  }

  const getEnemyIcon = (enemyId: string) => {
    // Map enemy IDs to emoji icons
    const iconMap: Record<string, string> = {
      slime: '🟢',
      goblin_scout: '👹',
      wild_wolf: '🐺',
      skeleton_warrior: '💀',
      forest_bear: '🐻',
      goblin_king: '👑',
      ancient_dragon: '🐉',
    }
    return iconMap[enemyId] || '👾' // Default monster icon
  }

  // Separate bosses from regular enemies
  const regularEnemies = enemies.filter(e => !e.is_boss)
  const bossEnemies = enemies.filter(e => e.is_boss)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Available Enemies</h2>
        <div className="text-sm text-gray-400">
          Your Level: {character?.level || 1}
        </div>
      </div>

      {/* Regular Enemies */}
      {regularEnemies.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-300">Regular Enemies</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularEnemies.map((enemy) => (
              <div
                key={enemy.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{getEnemyIcon(enemy.id)}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{enemy.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-400">Level {enemy.level}</span>
                          <span className={`text-sm font-medium ${getDifficultyColor(enemy.level)}`}>
                            {getDifficultyLabel(enemy.level)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                  {enemy.description || 'A mysterious foe awaits...'}
                </p>

                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                  <div className="bg-gray-900 rounded p-2">
                    <div className="text-gray-400">❤️ Health</div>
                    <div className="text-white font-semibold">{enemy.health}</div>
                  </div>
                  <div className="bg-gray-900 rounded p-2">
                    <div className="text-gray-400">⚔️ Attack</div>
                    <div className="text-white font-semibold">{enemy.attack}</div>
                  </div>
                  <div className="bg-gray-900 rounded p-2">
                    <div className="text-gray-400">🛡️ Defense</div>
                    <div className="text-white font-semibold">{enemy.defense}</div>
                  </div>
                  <div className="bg-gray-900 rounded p-2">
                    <div className="text-gray-400">⭐ XP</div>
                    <div className="text-white font-semibold">{enemy.experience_reward}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm mb-3">
                  <div className="text-yellow-400">
                    💰 {enemy.gold_min}-{enemy.gold_max} gold
                  </div>
                </div>

                <button
                  onClick={() => onSelectEnemy(enemy)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-semibold"
                >
                  ⚔️ Challenge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Boss Enemies */}
      {bossEnemies.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-purple-400">👑 Boss Encounters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bossEnemies.map((enemy) => (
              <div
                key={enemy.id}
                className="bg-gradient-to-br from-purple-900/40 to-gray-800 border-2 border-purple-500/50 rounded-lg p-4 hover:border-purple-400/70 transition-colors shadow-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">👑</span>
                      <h3 className="text-xl font-bold text-purple-300">{enemy.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-400">Level {enemy.level}</span>
                      <span className={`text-sm font-medium ${getDifficultyColor(enemy.level)}`}>
                        {getDifficultyLabel(enemy.level)}
                      </span>
                      <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">BOSS</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                  {enemy.description || 'A mysterious foe awaits...'}
                </p>

                {/* Boss Abilities */}
                {enemy.boss_abilities && enemy.boss_abilities.length > 0 && (
                  <div className="bg-purple-950/30 border border-purple-500/30 rounded p-2 mb-3">
                    <div className="text-xs font-semibold text-purple-300 mb-1">Special Abilities:</div>
                    <ul className="text-xs text-gray-300 space-y-0.5">
                      {enemy.boss_abilities.map((ability, idx) => (
                        <li key={idx}>• {ability}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                  <div className="bg-gray-900/50 rounded p-2 border border-purple-500/20">
                    <div className="text-gray-400">❤️ Health</div>
                    <div className="text-purple-300 font-bold">{enemy.health}</div>
                  </div>
                  <div className="bg-gray-900/50 rounded p-2 border border-purple-500/20">
                    <div className="text-gray-400">⚔️ Attack</div>
                    <div className="text-purple-300 font-bold">{enemy.attack}</div>
                  </div>
                  <div className="bg-gray-900/50 rounded p-2 border border-purple-500/20">
                    <div className="text-gray-400">🛡️ Defense</div>
                    <div className="text-purple-300 font-bold">{enemy.defense}</div>
                  </div>
                  <div className="bg-gray-900/50 rounded p-2 border border-purple-500/20">
                    <div className="text-gray-400">⭐ XP</div>
                    <div className="text-purple-300 font-bold">{enemy.experience_reward}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm mb-3">
                  <div className="text-yellow-300 font-semibold">
                    💰 {enemy.gold_min}-{enemy.gold_max} gold
                  </div>
                </div>

                <button
                  onClick={() => onSelectEnemy(enemy)}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded hover:from-purple-500 hover:to-purple-600 transition-colors font-bold shadow-lg"
                >
                  👑 Challenge Boss
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
