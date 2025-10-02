'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import { getInventory, equipItem, unequipItem, getAllItems } from '@/lib/inventory'

interface InventoryItemWithDetails {
  id: string
  character_id: string
  item_id: string
  quantity: number
  equipped: boolean
  slot?: number
  enchantment_level: number
  durability: number
  item: any
}

export default function Inventory() {
  const { character } = useGameStore()
  const [inventory, setInventory] = useState<InventoryItemWithDetails[]>([])
  const [selectedItem, setSelectedItem] = useState<InventoryItemWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'equipment' | 'consumables' | 'materials'>('equipment')

  useEffect(() => {
    if (character) {
      loadInventory()
    }
  }, [character])

  async function loadInventory() {
    if (!character) return

    setIsLoading(true)
    const { data } = await getInventory(character.id)
    if (data) {
      setInventory(data as InventoryItemWithDetails[])
    }
    setIsLoading(false)
  }

  async function handleEquip(invItem: InventoryItemWithDetails) {
    if (!character) return

    if (invItem.equipped) {
      await unequipItem(invItem.id, character.id)
    } else {
      await equipItem(character.id, invItem.id)
    }

    // Reload inventory
    await loadInventory()
  }

  function getRarityColor(rarity: string) {
    switch (rarity) {
      case 'common': return 'text-gray-400'
      case 'uncommon': return 'text-green-400'
      case 'rare': return 'text-blue-400'
      case 'epic': return 'text-purple-400'
      case 'legendary': return 'text-yellow-400'
      default: return 'text-white'
    }
  }

  function getRarityBorder(rarity: string) {
    switch (rarity) {
      case 'common': return 'border-gray-500'
      case 'uncommon': return 'border-green-500'
      case 'rare': return 'border-blue-500'
      case 'epic': return 'border-purple-500'
      case 'legendary': return 'border-yellow-500'
      default: return 'border-white/10'
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-400">
        Loading inventory...
      </div>
    )
  }

  if (inventory.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-lg">Your inventory is empty</p>
        <p className="text-sm mt-2">Complete quests to earn items!</p>
      </div>
    )
  }

  const equipmentItems = inventory.filter(i => i.item.type === 'weapon' || i.item.type === 'armor')
  const consumableItems = inventory.filter(i => i.item.type === 'consumable')
  const materialItems = inventory.filter(i => i.item.type === 'material')
  const displayItems = activeTab === 'equipment'
    ? equipmentItems
    : activeTab === 'consumables'
      ? consumableItems
      : materialItems

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Inventory Grid */}
      <div className="lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-primary">🎒 Inventory</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('equipment')}
              className={`px-3 py-1 rounded text-sm ${
                activeTab === 'equipment'
                  ? 'bg-primary text-black'
                  : 'bg-bg-card text-gray-400 hover:text-white'
              }`}
            >
              Equipment ({equipmentItems.length})
            </button>
            <button
              onClick={() => setActiveTab('consumables')}
              className={`px-3 py-1 rounded text-sm ${
                activeTab === 'consumables'
                  ? 'bg-primary text-black'
                  : 'bg-bg-card text-gray-400 hover:text-white'
              }`}
            >
              Consumables ({consumableItems.length})
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`px-3 py-1 rounded text-sm ${
                activeTab === 'materials'
                  ? 'bg-primary text-black'
                  : 'bg-bg-card text-gray-400 hover:text-white'
              }`}
            >
              Materials ({materialItems.length})
            </button>
          </div>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {displayItems.map((invItem) => {
            const item = invItem.item
            return (
              <button
                key={invItem.id}
                onClick={() => setSelectedItem(invItem)}
                className={`
                  relative aspect-square bg-bg-card rounded-lg border-2 p-2
                  hover:bg-bg-card-hover transition cursor-pointer
                  ${getRarityBorder(item.rarity)}
                  ${selectedItem?.id === invItem.id ? 'ring-2 ring-primary' : ''}
                  ${invItem.equipped ? 'bg-primary/10' : ''}
                `}
              >
                {/* Item Icon Placeholder */}
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  {item.type === 'weapon' && '⚔️'}
                  {item.type === 'armor' && '🛡️'}
                  {item.type === 'consumable' && '🧪'}
                  {item.type === 'material' && (
                    <>
                      {item.id.includes('_log') && '🪵'}
                      {item.id.includes('_ore') && '⛏️'}
                      {item.id.includes('raw_') && '🐟'}
                      {(item.id.includes('_pelt') || item.id.includes('_hide') || item.id.includes('feather')) && '🦌'}
                      {(item.id.includes('_leaf') || item.id.includes('_weed')) && '🌿'}
                      {(item.id.includes('_essence') || item.id.includes('_rune')) && '✨'}
                      {(item.id.includes('sapphire') || item.id.includes('emerald') || item.id.includes('ruby') || item.id.includes('diamond') || item.id.includes('dragonstone')) && '💎'}
                      {!item.id.includes('_log') && !item.id.includes('_ore') && !item.id.includes('raw_') &&
                       !item.id.includes('_pelt') && !item.id.includes('_hide') && !item.id.includes('feather') &&
                       !item.id.includes('_leaf') && !item.id.includes('_weed') &&
                       !item.id.includes('_essence') && !item.id.includes('_rune') &&
                       !item.id.includes('sapphire') && !item.id.includes('emerald') && !item.id.includes('ruby') &&
                       !item.id.includes('diamond') && !item.id.includes('dragonstone') && '📦'}
                    </>
                  )}
                </div>

                {/* Quantity Badge */}
                {invItem.quantity > 1 && (
                  <div className="absolute bottom-1 right-1 bg-black/70 rounded px-1.5 py-0.5 text-xs">
                    {invItem.quantity}
                  </div>
                )}

                {/* Equipped Badge */}
                {invItem.equipped && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Item Details */}
      <div className="lg:col-span-1">
        {selectedItem ? (
          <div className="bg-bg-panel rounded-lg p-4 border border-white/10">
            <div className="mb-4">
              <h4 className={`text-lg font-bold ${getRarityColor(selectedItem.item.rarity)}`}>
                {selectedItem.item.name}
              </h4>
              <p className="text-xs text-gray-500 uppercase">{selectedItem.item.rarity}</p>
            </div>

            {selectedItem.item.description && (
              <p className="text-sm text-gray-300 mb-4">
                {selectedItem.item.description}
              </p>
            )}

            {/* Stats */}
            {(selectedItem.item.attack_bonus > 0 ||
              selectedItem.item.defense_bonus > 0 ||
              selectedItem.item.health_bonus > 0 ||
              selectedItem.item.mana_bonus > 0) && (
              <div className="mb-4 space-y-2">
                <p className="text-xs text-gray-500 uppercase">Stats</p>
                {selectedItem.item.attack_bonus > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">⚔️ Attack</span>
                    <span className="text-red-400">+{selectedItem.item.attack_bonus}</span>
                  </div>
                )}
                {selectedItem.item.defense_bonus > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">🛡️ Defense</span>
                    <span className="text-yellow-400">+{selectedItem.item.defense_bonus}</span>
                  </div>
                )}
                {selectedItem.item.health_bonus > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">❤️ Health</span>
                    <span className="text-green-400">+{selectedItem.item.health_bonus}</span>
                  </div>
                )}
                {selectedItem.item.mana_bonus > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">💧 Mana</span>
                    <span className="text-blue-400">+{selectedItem.item.mana_bonus}</span>
                  </div>
                )}
              </div>
            )}

            {/* Details */}
            <div className="space-y-1 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Type</span>
                <span className="capitalize">{selectedItem.item.type}</span>
              </div>
              {selectedItem.item.equipment_slot && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Slot</span>
                  <span className="capitalize">{selectedItem.item.equipment_slot}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Required Level</span>
                <span>{selectedItem.item.required_level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">💰 Sell Price</span>
                <span className="text-primary">{selectedItem.item.sell_price}</span>
              </div>
            </div>

            {/* Actions */}
            {selectedItem.item.equipment_slot && (
              <button
                onClick={() => handleEquip(selectedItem)}
                className={`
                  w-full py-2 px-4 rounded-lg font-medium transition
                  ${
                    selectedItem.equipped
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-primary/20 text-primary hover:bg-primary/30'
                  }
                `}
              >
                {selectedItem.equipped ? 'Unequip' : 'Equip'}
              </button>
            )}
          </div>
        ) : (
          <div className="bg-bg-panel rounded-lg p-4 border border-white/10 text-center text-gray-400">
            <p>Select an item to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}
