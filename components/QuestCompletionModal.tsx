'use client'

import { useState, useEffect } from 'react'
import type { Item } from '@/lib/supabase'

interface QuestCompletionModalProps {
  isOpen: boolean
  onClose: () => void
  questTitle: string
  questIcon: string
  totalGold: number
  totalXP: number
  itemsFound: Array<{
    inventoryId: string
    item: Item
    quantity: number
  }>
}

export default function QuestCompletionModal({
  isOpen,
  onClose,
  questTitle,
  questIcon,
  totalGold,
  totalXP,
  itemsFound
}: QuestCompletionModalProps) {
  const [items, setItems] = useState(itemsFound)

  useEffect(() => {
    setItems(itemsFound)
  }, [itemsFound])

  if (!isOpen) return null

  function getRarityColor(rarity: string) {
    switch (rarity) {
      case 'legendary': return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10'
      case 'epic': return 'text-purple-400 border-purple-500/50 bg-purple-500/10'
      case 'rare': return 'text-blue-400 border-blue-500/50 bg-blue-500/10'
      case 'uncommon': return 'text-green-400 border-green-500/50 bg-green-500/10'
      default: return 'text-gray-400 border-gray-500/50 bg-gray-500/10'
    }
  }

  function getRarityBadgeColor(rarity: string) {
    switch (rarity) {
      case 'legendary': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      case 'epic': return 'bg-purple-500/20 text-purple-400 border-purple-500/50'
      case 'rare': return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      case 'uncommon': return 'bg-green-500/20 text-green-400 border-green-500/50'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  function getItemTypeIcon(type: string) {
    switch (type) {
      case 'weapon': return '⚔️'
      case 'armor': return '🛡️'
      case 'consumable': return '🧪'
      case 'material': return '📦'
      case 'quest': return '📜'
      default: return '❓'
    }
  }

  const totalValue = items.reduce((sum, { item, quantity }) => sum + (item.sell_price * quantity), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border-2 border-green-500/50 shadow-2xl shadow-green-500/20 animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="relative p-6 border-b border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <span className="text-4xl">{questIcon}</span>
                Quest Complete!
              </h2>
              <p className="text-gray-400 mt-1">You have completed "{questTitle}"</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-700/50 hover:bg-gray-600/50 text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="p-6 border-b border-gray-700/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-box">
              <div className="text-gray-400 text-sm">Gold Earned</div>
              <div className="text-2xl font-bold text-yellow-400">💰 {totalGold.toLocaleString()}</div>
            </div>
            <div className="stat-box">
              <div className="text-gray-400 text-sm">XP Gained</div>
              <div className="text-2xl font-bold text-purple-400">⭐ {totalXP.toLocaleString()}</div>
            </div>
            <div className="stat-box">
              <div className="text-gray-400 text-sm">Items Received</div>
              <div className="text-2xl font-bold text-blue-400">🎁 {items.length}</div>
            </div>
          </div>
        </div>

        {/* Items Found */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🎁</span>
              Rewards Received
            </h3>
            {items.length > 0 && (
              <div className="text-sm text-gray-400">
                Total Value: <span className="text-yellow-400 font-semibold">{totalValue.toLocaleString()} gold</span>
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">💰</div>
              <p>You received gold and experience!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {items.map(({ inventoryId, item, quantity }) => (
                <div
                  key={inventoryId}
                  className={`p-4 rounded-lg border-2 transition-all ${getRarityColor(item.rarity)}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Item Icon */}
                    <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center text-4xl bg-gray-800/50 rounded-lg border border-gray-700/50">
                      {getItemTypeIcon(item.type)}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-lg font-bold text-white">{item.name}</h4>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded border uppercase ${getRarityBadgeColor(item.rarity)}`}>
                              {item.rarity}
                            </span>
                            {quantity > 1 && (
                              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-700/50 text-gray-300">
                                x{quantity}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-400 mb-2">{item.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Item Stats */}
                      <div className="flex flex-wrap gap-2">
                        {item.type !== 'consumable' && item.type !== 'material' && item.equipment_slot && (
                          <span className="text-xs px-2 py-1 bg-gray-700/50 rounded text-gray-300 border border-gray-600/50">
                            📍 {item.equipment_slot}
                          </span>
                        )}
                        {item.required_level > 1 && (
                          <span className="text-xs px-2 py-1 bg-blue-500/20 rounded text-blue-400 border border-blue-500/50">
                            🎯 Lv {item.required_level}
                          </span>
                        )}
                        {item.attack_bonus > 0 && (
                          <span className="text-xs px-2 py-1 bg-red-500/20 rounded text-red-400 border border-red-500/50">
                            ⚔️ +{item.attack_bonus}
                          </span>
                        )}
                        {item.defense_bonus > 0 && (
                          <span className="text-xs px-2 py-1 bg-blue-500/20 rounded text-blue-400 border border-blue-500/50">
                            🛡️ +{item.defense_bonus}
                          </span>
                        )}
                        {item.health_bonus > 0 && (
                          <span className="text-xs px-2 py-1 bg-green-500/20 rounded text-green-400 border border-green-500/50">
                            ❤️ +{item.health_bonus}
                          </span>
                        )}
                        {item.mana_bonus > 0 && (
                          <span className="text-xs px-2 py-1 bg-cyan-500/20 rounded text-cyan-400 border border-cyan-500/50">
                            💧 +{item.mana_bonus}
                          </span>
                        )}
                        <span className="text-xs px-2 py-1 bg-yellow-500/20 rounded text-yellow-400 border border-yellow-500/50">
                          💰 {(item.sell_price * quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700/50 bg-gray-800/30">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              💡 <span className="text-gray-300">Tip:</span> Items and rewards have been automatically added to your inventory
            </div>
            <button
              onClick={onClose}
              className="btn btn-primary"
            >
              Continue Adventuring
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(107, 114, 128, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.7);
        }
      `}</style>
    </div>
  )
}
