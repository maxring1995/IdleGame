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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Available Enemies</h2>
        <div className="text-sm text-gray-400">
          Your Level: {character?.level || 1}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {enemies.map((enemy) => (
          <div
            key={enemy.id}
            className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
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

            <p className="text-sm text-gray-400 mb-4 line-clamp-2">
              {enemy.description || 'A mysterious foe awaits...'}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
              <div className="bg-gray-900 rounded p-2">
                <div className="text-gray-400">Health</div>
                <div className="text-white font-semibold">{enemy.health}</div>
              </div>
              <div className="bg-gray-900 rounded p-2">
                <div className="text-gray-400">Attack</div>
                <div className="text-white font-semibold">{enemy.attack}</div>
              </div>
              <div className="bg-gray-900 rounded p-2">
                <div className="text-gray-400">Defense</div>
                <div className="text-white font-semibold">{enemy.defense}</div>
              </div>
              <div className="bg-gray-900 rounded p-2">
                <div className="text-gray-400">XP</div>
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
  )
}
