'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import { getCharacterMaterials } from '@/lib/materials'

const RARITY_COLORS = {
  common: 'border-gray-500',
  uncommon: 'border-green-500',
  rare: 'border-blue-500',
  epic: 'border-purple-500',
  legendary: 'border-yellow-500'
}

const RARITY_BG = {
  common: 'bg-gray-500/10',
  uncommon: 'bg-green-500/10',
  rare: 'bg-blue-500/10',
  epic: 'bg-purple-500/10',
  legendary: 'bg-yellow-500/10'
}

export default function MaterialInventory() {
  const { character } = useGameStore()
  const [materials, setMaterials] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (character) {
      loadMaterials()
    }
  }, [character])

  async function loadMaterials() {
    if (!character) return

    setIsLoading(true)
    setError(null)

    const { data, error: err } = await getCharacterMaterials(character.id)

    if (err) {
      setError(err.message)
    } else if (data) {
      setMaterials(data)
    }

    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="text-center py-10 text-gray-400">
        <div className="animate-spin text-3xl mb-3">⏳</div>
        <p className="text-sm">Loading materials...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
        {error}
      </div>
    )
  }

  if (materials.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <div className="text-5xl mb-4">📦</div>
        <p className="text-lg font-medium mb-2">No Materials Yet</p>
        <p className="text-sm">Start gathering resources to fill your material storage!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-primary">Material Storage</h3>
        <div className="text-sm text-gray-400">
          {materials.length} {materials.length === 1 ? 'type' : 'types'}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {materials.map((item) => {
          const itemData = item.items as any
          const rarity = itemData?.rarity || 'common'

          return (
            <div
              key={item.id}
              className={`relative p-3 rounded-lg border-2 ${RARITY_COLORS[rarity as keyof typeof RARITY_COLORS]} ${RARITY_BG[rarity as keyof typeof RARITY_BG]} transition hover:scale-105`}
            >
              {/* Quantity Badge */}
              <div className="absolute -top-2 -right-2 bg-primary text-white text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
                {item.quantity}
              </div>

              {/* Item Info */}
              <div className="text-center">
                <div className="text-2xl mb-2">📦</div>
                <div className="font-medium text-sm mb-1 truncate" title={itemData?.name}>
                  {itemData?.name || item.item_id}
                </div>
                <div className="text-xs text-gray-400 capitalize">{rarity}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
        <div className="text-center p-3 bg-bg-dark rounded-lg">
          <div className="text-gray-400 text-xs mb-1">Common</div>
          <div className="text-gray-300 font-bold">
            {materials.filter(m => (m.items as any)?.rarity === 'common').length}
          </div>
        </div>
        <div className="text-center p-3 bg-bg-dark rounded-lg">
          <div className="text-green-400 text-xs mb-1">Uncommon</div>
          <div className="text-green-300 font-bold">
            {materials.filter(m => (m.items as any)?.rarity === 'uncommon').length}
          </div>
        </div>
        <div className="text-center p-3 bg-bg-dark rounded-lg">
          <div className="text-blue-400 text-xs mb-1">Rare</div>
          <div className="text-blue-300 font-bold">
            {materials.filter(m => (m.items as any)?.rarity === 'rare').length}
          </div>
        </div>
        <div className="text-center p-3 bg-bg-dark rounded-lg">
          <div className="text-purple-400 text-xs mb-1">Epic+</div>
          <div className="text-purple-300 font-bold">
            {materials.filter(m => {
              const r = (m.items as any)?.rarity
              return r === 'epic' || r === 'legendary'
            }).length}
          </div>
        </div>
      </div>
    </div>
  )
}
