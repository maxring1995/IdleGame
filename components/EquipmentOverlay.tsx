'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import { getInventory, equipItem, unequipItem } from '@/lib/inventory'

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

interface EquipmentOverlayProps {
  isOpen: boolean
  onClose: () => void
}

const EQUIPMENT_SLOTS = {
  weapon: { label: 'Main Hand', icon: '⚔️', category: 'offense', description: 'Primary weapon' },
  helmet: { label: 'Helmet', icon: '🪖', category: 'defense', description: 'Head protection' },
  amulet: { label: 'Amulet', icon: '📿', category: 'accessories', description: 'Neck accessory' },
  cape: { label: 'Cape', icon: '🧥', category: 'accessories', description: 'Back equipment' },
  chest: { label: 'Chest Armor', icon: '🛡️', category: 'defense', description: 'Body protection' },
  offhand: { label: 'Off-hand', icon: '🗡️', category: 'offense', description: 'Secondary weapon' },
  shield: { label: 'Shield', icon: '🛡️', category: 'defense', description: 'Off-hand shield' },
  ring: { label: 'Ring', icon: '💍', category: 'accessories', description: 'Finger slot 1' },
  ring2: { label: 'Ring', icon: '💍', category: 'accessories', description: 'Finger slot 2' },
  legs: { label: 'Leg Armor', icon: '👖', category: 'defense', description: 'Leg protection' },
  boots: { label: 'Boots', icon: '👢', category: 'defense', description: 'Foot protection' },
  gloves: { label: 'Gloves', icon: '🧤', category: 'defense', description: 'Hand protection' }
}

export default function EquipmentOverlay({ isOpen, onClose }: EquipmentOverlayProps) {
  const { character } = useGameStore()
  const [inventory, setInventory] = useState<InventoryItemWithDetails[]>([])
  const [equippedItems, setEquippedItems] = useState<Record<string, InventoryItemWithDetails>>({})
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [compareItem, setCompareItem] = useState<InventoryItemWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRarity, setFilterRarity] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'rarity' | 'level' | 'attack' | 'defense'>('rarity')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [stats, setStats] = useState({
    attack: 0,
    defense: 0,
    health: 0,
    mana: 0
  })

  useEffect(() => {
    if (character && isOpen && inventory.length === 0) {
      loadInventory()
    }

    if (!isOpen) {
      setInventory([])
      setEquippedItems({})
      setSelectedSlot(null)
      setCompareItem(null)
      setSearchQuery('')
      setFilterRarity('all')
      setErrorMessage(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id, isOpen])

  async function loadInventory() {
    if (!character || isLoading) return

    setIsLoading(true)
    try {
      const { data } = await getInventory(character.id)
      if (data) {
        setInventory(data as InventoryItemWithDetails[])

        const equipped: Record<string, InventoryItemWithDetails> = {}
        data.forEach((item: InventoryItemWithDetails) => {
          if (item.equipped && item.item.equipment_slot) {
            equipped[item.item.equipment_slot] = item
          }
        })
        setEquippedItems(equipped)
        calculateStats(data as InventoryItemWithDetails[])
      }
    } finally {
      setIsLoading(false)
    }
  }

  function calculateStats(items: InventoryItemWithDetails[]) {
    const equipped = items.filter(i => i.equipped)
    const baseStats = {
      attack: character?.attack || 0,
      defense: character?.defense || 0,
      health: character?.max_health || 0,
      mana: character?.max_mana || 0
    }

    let totalAttack = baseStats.attack
    let totalDefense = baseStats.defense
    let totalHealth = baseStats.health
    let totalMana = baseStats.mana

    equipped.forEach(item => {
      totalAttack += item.item.attack_bonus || 0
      totalDefense += item.item.defense_bonus || 0
      totalHealth += item.item.health_bonus || 0
      totalMana += item.item.mana_bonus || 0
    })

    setStats({
      attack: totalAttack,
      defense: totalDefense,
      health: totalHealth,
      mana: totalMana
    })
  }

  async function handleEquipToggle(item: InventoryItemWithDetails) {
    if (!character) return

    setErrorMessage(null)

    if (item.equipped) {
      await unequipItem(item.id, character.id)
    } else {
      const { error } = await equipItem(character.id, item.id)
      if (error) {
        setErrorMessage((error as Error).message || 'Failed to equip item')
        setTimeout(() => setErrorMessage(null), 5000)
        return
      }
    }

    await loadInventory()
    setCompareItem(null)
  }

  async function handleSlotClick(slot: string, equippedItem?: InventoryItemWithDetails) {
    if (equippedItem) {
      setCompareItem(equippedItem)
      setSelectedSlot(slot)
    } else {
      setSelectedSlot(selectedSlot === slot ? null : slot)
      setCompareItem(null)
    }
  }

  function getItemIcon(item: any) {
    const slot = item.equipment_slot
    return EQUIPMENT_SLOTS[slot as keyof typeof EQUIPMENT_SLOTS]?.icon || '📦'
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
      case 'common': return 'border-gray-500/50'
      case 'uncommon': return 'border-green-500/50'
      case 'rare': return 'border-blue-500/50'
      case 'epic': return 'border-purple-500/50'
      case 'legendary': return 'border-yellow-500/50'
      default: return 'border-white/10'
    }
  }

  function getRarityValue(rarity: string): number {
    switch (rarity) {
      case 'legendary': return 5
      case 'epic': return 4
      case 'rare': return 3
      case 'uncommon': return 2
      case 'common': return 1
      default: return 0
    }
  }

  function sortItems(items: InventoryItemWithDetails[]) {
    return [...items].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.item.name.localeCompare(b.item.name)
        case 'rarity':
          return getRarityValue(b.item.rarity) - getRarityValue(a.item.rarity)
        case 'level':
          return b.item.required_level - a.item.required_level
        case 'attack':
          return (b.item.attack_bonus || 0) - (a.item.attack_bonus || 0)
        case 'defense':
          return (b.item.defense_bonus || 0) - (a.item.defense_bonus || 0)
        default:
          return 0
      }
    })
  }

  if (!isOpen) return null

  const equipmentItems = inventory.filter(i => i.item.type === 'weapon' || i.item.type === 'armor')

  let filteredItems = equipmentItems.filter(item => {
    const matchesSearch = item.item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRarity = filterRarity === 'all' || item.item.rarity === filterRarity
    return matchesSearch && matchesRarity
  })

  if (selectedSlot) {
    filteredItems = filteredItems.filter(item =>
      item.item.equipment_slot === selectedSlot && !item.equipped
    )
  }

  const sortedItems = sortItems(filteredItems)

  const slotsByCategory = {
    offense: ['weapon', 'offhand'],
    defense: ['helmet', 'chest', 'legs', 'boots', 'gloves', 'shield'],
    accessories: ['amulet', 'cape', 'ring', 'ring2']
  }

  const totalSlots = Object.keys(EQUIPMENT_SLOTS).length
  const filledSlots = Object.keys(equippedItems).length
  const completionPercent = Math.round((filledSlots / totalSlots) * 100)

  // Modal mode: render with overlay wrapper (embedded mode removed for simplicity)
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex flex-col" onClick={onClose}>
      <div className="flex-1 flex flex-col max-w-[1800px] w-full mx-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="panel-glass border-b p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 text-shadow">Equipment Manager</h1>
              <p className="text-sm text-gray-400">Equip items to enhance your character's abilities</p>
            </div>
            <button
              onClick={onClose}
              className="btn btn-secondary w-10 h-10 p-0 text-xl"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Equipment Progress */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-400">Equipment Slots</span>
                <span className="text-amber-400 font-semibold">{filledSlots} / {totalSlots} ({completionPercent}%)</span>
              </div>
              <div className="progress-bar h-3">
                <div
                  className="progress-fill bg-gradient-to-r from-amber-500 to-amber-600"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg animate-pulse">
              <div className="flex items-center gap-2 text-red-400">
                <span className="text-xl">⚠️</span>
                <span className="text-sm font-medium">{errorMessage}</span>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-12 gap-6 h-full p-6">
            {/* Left: Equipment Slots */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 overflow-y-auto">
              {/* Offense */}
              <div className="panel p-4">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="text-red-400">⚔️</span>
                  <span>Offense</span>
                </h2>
                <div className="space-y-2">
                  {slotsByCategory.offense.map(slot => {
                    const config = EQUIPMENT_SLOTS[slot as keyof typeof EQUIPMENT_SLOTS]
                    const item = equippedItems[slot]
                    const isSelected = selectedSlot === slot
                    const isComparing = compareItem?.item.equipment_slot === slot

                    return (
                      <button
                        key={slot}
                        onClick={() => handleSlotClick(slot, item)}
                        className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                          isSelected || isComparing
                            ? 'border-amber-500 bg-amber-500/10 shadow-lg'
                            : item
                              ? `${getRarityBorder(item.item.rarity)} card card-hover`
                              : 'border-dashed border-gray-700 bg-gray-800/20 hover:border-gray-600 hover:bg-gray-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl flex-shrink-0">{config.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-500 mb-0.5">{config.label}</div>
                            {item ? (
                              <>
                                <div className={`font-semibold text-sm truncate ${getRarityColor(item.item.rarity)}`}>
                                  {item.item.name}
                                </div>
                                <div className="flex gap-2 mt-1 text-xs">
                                  {item.item.attack_bonus > 0 && (
                                    <span className="text-red-400">+{item.item.attack_bonus} ATK</span>
                                  )}
                                  {item.item.defense_bonus > 0 && (
                                    <span className="text-blue-400">+{item.item.defense_bonus} DEF</span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-gray-600">Empty</div>
                            )}
                          </div>
                          {isSelected && (
                            <div className="text-xs text-amber-400 animate-pulse">●</div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Defense */}
              <div className="panel p-4">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="text-blue-400">🛡️</span>
                  <span>Defense</span>
                </h2>
                <div className="space-y-2">
                  {slotsByCategory.defense.map(slot => {
                    const config = EQUIPMENT_SLOTS[slot as keyof typeof EQUIPMENT_SLOTS]
                    const item = equippedItems[slot]
                    const isSelected = selectedSlot === slot
                    const isComparing = compareItem?.item.equipment_slot === slot

                    return (
                      <button
                        key={slot}
                        onClick={() => handleSlotClick(slot, item)}
                        className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                          isSelected || isComparing
                            ? 'border-amber-500 bg-amber-500/10 shadow-lg'
                            : item
                              ? `${getRarityBorder(item.item.rarity)} card card-hover`
                              : 'border-dashed border-gray-700 bg-gray-800/20 hover:border-gray-600 hover:bg-gray-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl flex-shrink-0">{config.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-500 mb-0.5">{config.label}</div>
                            {item ? (
                              <>
                                <div className={`font-semibold text-sm truncate ${getRarityColor(item.item.rarity)}`}>
                                  {item.item.name}
                                </div>
                                <div className="flex gap-2 mt-1 text-xs">
                                  {item.item.defense_bonus > 0 && (
                                    <span className="text-blue-400">+{item.item.defense_bonus} DEF</span>
                                  )}
                                  {item.item.health_bonus > 0 && (
                                    <span className="text-green-400">+{item.item.health_bonus} HP</span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-gray-600">Empty</div>
                            )}
                          </div>
                          {isSelected && (
                            <div className="text-xs text-amber-400 animate-pulse">●</div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Accessories */}
              <div className="panel p-4">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="text-purple-400">💎</span>
                  <span>Accessories</span>
                </h2>
                <div className="space-y-2">
                  {slotsByCategory.accessories.map(slot => {
                    const config = EQUIPMENT_SLOTS[slot as keyof typeof EQUIPMENT_SLOTS]
                    const item = equippedItems[slot]
                    const isSelected = selectedSlot === slot
                    const isComparing = compareItem?.item.equipment_slot === slot

                    return (
                      <button
                        key={slot}
                        onClick={() => handleSlotClick(slot, item)}
                        className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                          isSelected || isComparing
                            ? 'border-amber-500 bg-amber-500/10 shadow-lg'
                            : item
                              ? `${getRarityBorder(item.item.rarity)} card card-hover`
                              : 'border-dashed border-gray-700 bg-gray-800/20 hover:border-gray-600 hover:bg-gray-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl flex-shrink-0">{config.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-500 mb-0.5">{config.label}</div>
                            {item ? (
                              <>
                                <div className={`font-semibold text-sm truncate ${getRarityColor(item.item.rarity)}`}>
                                  {item.item.name}
                                </div>
                                <div className="flex gap-2 mt-1 text-xs flex-wrap">
                                  {item.item.attack_bonus > 0 && (
                                    <span className="text-red-400">+{item.item.attack_bonus} ATK</span>
                                  )}
                                  {item.item.defense_bonus > 0 && (
                                    <span className="text-blue-400">+{item.item.defense_bonus} DEF</span>
                                  )}
                                  {item.item.health_bonus > 0 && (
                                    <span className="text-green-400">+{item.item.health_bonus} HP</span>
                                  )}
                                  {item.item.mana_bonus > 0 && (
                                    <span className="text-cyan-400">+{item.item.mana_bonus} MP</span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-gray-600">Empty</div>
                            )}
                          </div>
                          {isSelected && (
                            <div className="text-xs text-amber-400 animate-pulse">●</div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Middle: Available Items */}
            <div className="col-span-12 lg:col-span-5 flex flex-col panel p-6">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-white">
                    {selectedSlot
                      ? `${EQUIPMENT_SLOTS[selectedSlot as keyof typeof EQUIPMENT_SLOTS]?.label || selectedSlot} Options`
                      : 'Available Equipment'}
                  </h2>
                  {selectedSlot && (
                    <button
                      onClick={() => {
                        setSelectedSlot(null)
                        setCompareItem(null)
                      }}
                      className="text-sm text-amber-400 hover:text-amber-300"
                    >
                      View All
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="grid grid-cols-12 gap-2 mb-3">
                  <input
                    id="equipment-search"
                    name="equipment-search"
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="equipment-search"
                    className="col-span-12 sm:col-span-6 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500"
                  />
                  <select
                    id="equipment-rarity-filter"
                    name="equipment-rarity-filter"
                    value={filterRarity}
                    onChange={(e) => setFilterRarity(e.target.value)}
                    data-testid="equipment-rarity-filter"
                    className="col-span-6 sm:col-span-3 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">All Rarity</option>
                    <option value="common">Common</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epic</option>
                    <option value="legendary">Legendary</option>
                  </select>
                  <select
                    id="equipment-sort"
                    name="equipment-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    data-testid="equipment-sort"
                    className="col-span-6 sm:col-span-3 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="rarity">Sort: Rarity</option>
                    <option value="name">Sort: Name</option>
                    <option value="level">Sort: Level</option>
                    <option value="attack">Sort: Attack</option>
                    <option value="defense">Sort: Defense</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {sortedItems.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <div className="text-6xl mb-4 opacity-20">📭</div>
                    <p className="text-lg mb-1">No items found</p>
                    <p className="text-sm">{selectedSlot ? 'No available items for this slot' : 'Try adjusting your filters'}</p>
                  </div>
                ) : (
                  sortedItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleEquipToggle(item)}
                      onMouseEnter={() => setCompareItem(item)}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        item.equipped
                          ? 'border-green-500/40 bg-green-500/5 opacity-50'
                          : `${getRarityBorder(item.item.rarity)} card card-hover`
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-4xl flex-shrink-0">{getItemIcon(item.item)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`font-bold text-base truncate ${getRarityColor(item.item.rarity)}`}>
                              {item.item.name}
                            </div>
                            <span className={`badge badge-${item.item.rarity} text-xs`}>
                              {item.item.rarity}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mb-2">
                            {EQUIPMENT_SLOTS[item.item.equipment_slot as keyof typeof EQUIPMENT_SLOTS]?.label}
                            {item.item.required_level > 1 && ` • Level ${item.item.required_level}`}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.item.attack_bonus > 0 && (
                              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                                ⚔️ +{item.item.attack_bonus}
                              </span>
                            )}
                            {item.item.defense_bonus > 0 && (
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                                🛡️ +{item.item.defense_bonus}
                              </span>
                            )}
                            {item.item.health_bonus > 0 && (
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                                ❤️ +{item.item.health_bonus}
                              </span>
                            )}
                            {item.item.mana_bonus > 0 && (
                              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs">
                                💧 +{item.item.mana_bonus}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {item.equipped ? (
                            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-semibold">
                              Equipped
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-semibold hover:bg-amber-500/30">
                              Equip
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right: Stats & Comparison */}
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
              {/* Total Stats */}
              <div className="panel p-5">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Total Stats</h3>
                <div className="space-y-3">
                  <div className="stat-box">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚔️</span>
                      <span className="text-sm text-gray-400">Attack</span>
                    </div>
                    <span className="text-xl font-bold text-red-400">{stats.attack}</span>
                  </div>

                  <div className="stat-box">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🛡️</span>
                      <span className="text-sm text-gray-400">Defense</span>
                    </div>
                    <span className="text-xl font-bold text-blue-400">{stats.defense}</span>
                  </div>

                  <div className="stat-box">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">❤️</span>
                      <span className="text-sm text-gray-400">Health</span>
                    </div>
                    <span className="text-xl font-bold text-green-400">{stats.health}</span>
                  </div>

                  <div className="stat-box">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">💧</span>
                      <span className="text-sm text-gray-400">Mana</span>
                    </div>
                    <span className="text-xl font-bold text-cyan-400">{stats.mana}</span>
                  </div>
                </div>
              </div>

              {/* Item Comparison */}
              {compareItem && (
                <div className="panel p-4">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Item Preview</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 pb-3 border-b border-white/5">
                      <div className="text-3xl">{getItemIcon(compareItem.item)}</div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-sm ${getRarityColor(compareItem.item.rarity)}`}>
                          {compareItem.item.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {EQUIPMENT_SLOTS[compareItem.item.equipment_slot as keyof typeof EQUIPMENT_SLOTS]?.label}
                        </div>
                      </div>
                    </div>

                    {compareItem.item.description && (
                      <p className="text-xs text-gray-400 italic">"{compareItem.item.description}"</p>
                    )}

                    <div className="space-y-2 text-xs">
                      {compareItem.item.attack_bonus > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Attack Bonus</span>
                          <span className="text-red-400 font-semibold">+{compareItem.item.attack_bonus}</span>
                        </div>
                      )}
                      {compareItem.item.defense_bonus > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Defense Bonus</span>
                          <span className="text-blue-400 font-semibold">+{compareItem.item.defense_bonus}</span>
                        </div>
                      )}
                      {compareItem.item.health_bonus > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Health Bonus</span>
                          <span className="text-green-400 font-semibold">+{compareItem.item.health_bonus}</span>
                        </div>
                      )}
                      {compareItem.item.mana_bonus > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Mana Bonus</span>
                          <span className="text-cyan-400 font-semibold">+{compareItem.item.mana_bonus}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-white/5">
                        <span className="text-gray-500">Required Level</span>
                        <span className="text-white font-semibold">{compareItem.item.required_level}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Sell Value</span>
                        <span className="text-amber-400 font-semibold">{compareItem.item.sell_price}g</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Equipment Summary */}
              <div className="panel p-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Equipment</span>
                    <span className="text-white font-semibold">{equipmentItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Equipped</span>
                    <span className="text-green-400 font-semibold">{filledSlots} / {totalSlots}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Completion</span>
                    <span className="text-amber-400 font-semibold">{completionPercent}%</span>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="panel p-4 bg-gradient-to-br from-amber-500/5 to-amber-600/5 border-amber-500/20">
                <div className="flex items-start gap-2">
                  <span className="text-xl flex-shrink-0">💡</span>
                  <div className="text-xs text-gray-300">
                    <p className="font-semibold text-amber-400 mb-1">Quick Tip</p>
                    <p>Click equipment slots to filter items. Hover over items to preview their stats.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
