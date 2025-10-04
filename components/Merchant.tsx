'use client'

import { useEffect, useState } from 'react'
import { useGameStore } from '@/lib/store'
import {
  getMerchantInventory,
  buyItem,
  sellItem,
  getTransactionHistory,
  getMerchantStats,
  getZoneMerchantsByZone,
  getZoneMerchantInventory
} from '@/lib/merchant'
import { getInventory } from '@/lib/inventory'
import { createClient } from '@/utils/supabase/client'
import { useNotificationStore } from '@/lib/notificationStore'
import type {
  MerchantInventoryWithItem,
  MerchantTransactionWithItem,
  CharacterMerchantData,
  Item,
  InventoryItem,
  WorldZoneWithDiscovery,
  ZoneMerchantWithZone
} from '@/lib/supabase'

type TabType = 'buy' | 'sell' | 'history'

export default function Merchant() {
  const { character, updateCharacterStats } = useGameStore()
  const { addNotification } = useNotificationStore()
  const [activeTab, setActiveTab] = useState<TabType>('buy')
  const [isLoading, setIsLoading] = useState(true)
  const [merchantInventory, setMerchantInventory] = useState<MerchantInventoryWithItem[]>([])
  const [playerInventory, setPlayerInventory] = useState<(InventoryItem & { item: Item })[]>([])
  const [transactions, setTransactions] = useState<MerchantTransactionWithItem[]>([])
  const [merchantStats, setMerchantStats] = useState<CharacterMerchantData | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'weapon' | 'armor' | 'consumable' | 'material'>('all')
  const [selectedItem, setSelectedItem] = useState<MerchantInventoryWithItem | (InventoryItem & { item: Item }) | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isBuying, setIsBuying] = useState(false)

  // Zone expansion state
  const [zones, setZones] = useState<WorldZoneWithDiscovery[]>([])
  const [selectedZone, setSelectedZone] = useState<WorldZoneWithDiscovery | null>(null)
  const [zoneMerchants, setZoneMerchants] = useState<ZoneMerchantWithZone[]>([])
  const [selectedMerchant, setSelectedMerchant] = useState<ZoneMerchantWithZone | null>(null)

  useEffect(() => {
    if (character) {
      loadData()
    }
  }, [character])

  async function loadData() {
    if (!character) return
    setIsLoading(true)

    const [merchantRes, inventoryRes, historyRes, statsRes] = await Promise.all([
      getMerchantInventory(character.id),
      getInventory(character.id),
      getTransactionHistory(character.id, 50),
      getMerchantStats(character.id)
    ])

    if (merchantRes.data) {
      setMerchantInventory(merchantRes.data.inventory)
      setMerchantStats(merchantRes.data.merchantData)
    }

    if (inventoryRes.data) {
      setPlayerInventory(inventoryRes.data)
    }

    if (historyRes.data) {
      setTransactions(historyRes.data)
    }

    if (statsRes.data) {
      setMerchantStats(statsRes.data)
    }

    // Load zones directly from database based on character level
    try {
      const supabase = createClient()
      const { data: zonesData, error: zonesError } = await supabase
        .from('world_zones')
        .select('*')
        .lte('required_level', character.level)
        .order('required_level', { ascending: true })

      if (zonesError) {
        console.error('Error loading zones:', zonesError)
      } else if (zonesData) {
        const zonesWithDiscovery = zonesData.map(zone => ({
          ...zone,
          isDiscovered: true,
          discoveredAt: undefined,
          timeSpent: 0
        }))
        setZones(zonesWithDiscovery as WorldZoneWithDiscovery[])

        // Auto-select first zone if none selected
        if (!selectedZone && zonesWithDiscovery.length > 0) {
          const firstZone = zonesWithDiscovery[0]
          setSelectedZone(firstZone)
          loadZoneMerchants(firstZone.id)
        }
      }
    } catch (err) {
      console.error('Error in loadZones:', err)
    }

    setIsLoading(false)
  }

  async function loadZoneMerchants(zoneId: string) {
    if (!character) return

    const { data, error } = await getZoneMerchantsByZone(zoneId)
    if (data && !error) {
      setZoneMerchants(data as ZoneMerchantWithZone[])
      // Auto-select first merchant
      if (data.length > 0) {
        const firstMerchant = data[0] as ZoneMerchantWithZone
        setSelectedMerchant(firstMerchant)
        loadMerchantInventory(zoneId, firstMerchant.merchant_name)
      }
    }
  }

  async function loadMerchantInventory(zoneId: string, merchantName: string) {
    if (!character) return

    const { data, error } = await getZoneMerchantInventory(zoneId, merchantName, character.level)
    if (data && !error) {
      setMerchantInventory(data as MerchantInventoryWithItem[])
    }
  }

  async function handleZoneChange(zone: WorldZoneWithDiscovery) {
    setSelectedZone(zone)
    setSelectedMerchant(null)
    setMerchantInventory([])
    await loadZoneMerchants(zone.id)
  }

  async function handleMerchantChange(merchant: ZoneMerchantWithZone) {
    if (!selectedZone) return
    setSelectedMerchant(merchant)
    setSelectedItem(null)
    await loadMerchantInventory(selectedZone.id, merchant.merchant_name)
  }

  async function handleBuyItem() {
    if (!character || !selectedItem || isBuying) return
    if (!('buy_price' in selectedItem)) return // Type guard

    setIsBuying(true)

    const result = await buyItem(character.id, selectedItem.id, quantity)

    if (result.success) {
      addNotification({
        type: 'success',
        category: 'system',
        title: '🛒 Purchase Complete!',
        message: `Bought ${quantity}x ${selectedItem.item.name} for ${selectedItem.buy_price * quantity} gold`,
        icon: '🛒'
      })

      // Update character gold
      if (result.newGold !== undefined) {
        updateCharacterStats({ gold: result.newGold })
      }

      // Reload data
      await loadData()
      setSelectedItem(null)
      setQuantity(1)
    } else {
      addNotification({
        type: 'error',
        category: 'system',
        title: '❌ Purchase Failed',
        message: result.error || 'Could not complete purchase',
        icon: '❌'
      })
    }

    setIsBuying(false)
  }

  async function handleSellItem() {
    if (!character || !selectedItem || isBuying) return
    if (!('equipped' in selectedItem)) return // Type guard

    setIsBuying(true)

    const sellPrice = Math.floor(selectedItem.item.sell_price * 0.6) * quantity
    const result = await sellItem(character.id, selectedItem.id, quantity)

    if (result.success) {
      addNotification({
        type: 'success',
        category: 'system',
        title: '💰 Item Sold!',
        message: `Sold ${quantity}x ${selectedItem.item.name} for ${sellPrice} gold`,
        icon: '💰'
      })

      // Update character gold
      if (result.newGold !== undefined) {
        updateCharacterStats({ gold: result.newGold })
      }

      // Reload data
      await loadData()
      setSelectedItem(null)
      setQuantity(1)
    } else {
      addNotification({
        type: 'error',
        category: 'system',
        title: '❌ Sale Failed',
        message: result.error || 'Could not complete sale',
        icon: '❌'
      })
    }

    setIsBuying(false)
  }

  function filterItems<T extends { item: Item }>(items: T[]) {
    return items.filter(item => {
      const matchesSearch = item.item.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter = filterType === 'all' || item.item.type === filterType
      return matchesSearch && matchesFilter
    })
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

  function getItemIcon(itemName: string, itemType: string): string {
    const name = itemName.toLowerCase()

    // Weapons - Swords & Blades
    if (name.includes('sword') || name.includes('blade') || name.includes('rapier')) return '⚔️'
    if (name.includes('scimitar') || name.includes('cutlass')) return '🗡️'
    if (name.includes('dagger') || name.includes('fang')) return '🔪'
    if (name.includes('scythe')) return '⚰️'

    // Weapons - Axes & Hammers
    if (name.includes('axe') || name.includes('cleaver')) return '🪓'
    if (name.includes('hammer') || name.includes('mace') || name.includes('crusher')) return '🔨'

    // Weapons - Ranged
    if (name.includes('bow') || name.includes('greatbow')) return '🏹'
    if (name.includes('crossbow')) return '🎯'

    // Weapons - Magic
    if (name.includes('staff') || name.includes('scepter')) return '🔮'
    if (name.includes('wand')) return '🪄'
    if (name.includes('orb')) return '🔮'

    // Weapons - Polearms
    if (name.includes('spear') || name.includes('trident') || name.includes('pike')) return '🔱'
    if (name.includes('whip') || name.includes('lash')) return '💥'

    // Weapons - Club
    if (name.includes('club')) return '🏏'

    // Armor - Head
    if (name.includes('helm') || name.includes('cap') || name.includes('hat')) return '⛑️'
    if (name.includes('crown') || name.includes('tiara') || name.includes('circlet')) return '👑'
    if (name.includes('mask') || name.includes('hood')) return '🎭'

    // Armor - Body
    if (name.includes('plate') || name.includes('armor') || name.includes('chestplate')) return '🛡️'
    if (name.includes('platebody') || name.includes('chainmail') || name.includes('vest')) return '🦺'
    if (name.includes('robe')) return '👘'

    // Armor - Legs
    if (name.includes('legs') || name.includes('greaves') || name.includes('leggings') || name.includes('platelegs')) return '🦵'

    // Armor - Feet
    if (name.includes('boots') || name.includes('sabatons')) return '👢'

    // Armor - Hands
    if (name.includes('gauntlets') || name.includes('gloves')) return '🧤'

    // Armor - Accessories
    if (name.includes('ring')) return '💍'
    if (name.includes('amulet') || name.includes('necklace')) return '📿'

    // Consumables - Health Potions
    if (name.includes('health potion')) return '❤️'
    if (name.includes('healing') || name.includes('vitality')) return '💚'
    if (name.includes('rejuvenation') || name.includes('phoenix tear')) return '💖'

    // Consumables - Mana Potions
    if (name.includes('mana potion')) return '💙'

    // Consumables - Special Potions
    if (name.includes('ambrosia') || name.includes('immortality') || name.includes('supreme')) return '🌟'
    if (name.includes('elixir')) return '🧪'
    if (name.includes('strength') || name.includes('titan')) return '💪'
    if (name.includes('defense') || name.includes('resistance')) return '🛡️'
    if (name.includes('speed')) return '⚡'
    if (name.includes('luck') || name.includes('fortune')) return '🍀'
    if (name.includes('experience') || name.includes('exp')) return '⭐'
    if (name.includes('fire') || name.includes('flame') || name.includes('lava') || name.includes('molten')) return '🔥'
    if (name.includes('frost') || name.includes('ice') || name.includes('glacier') || name.includes('winter')) return '❄️'
    if (name.includes('chaos') || name.includes('void')) return '🌀'
    if (name.includes('plague') || name.includes('poison') || name.includes('antidote')) return '☠️'
    if (name.includes('witch')) return '🧙'

    // Consumables - Food & Drink
    if (name.includes('berry') || name.includes('fruit')) return '🍓'
    if (name.includes('mushroom')) return '🍄'
    if (name.includes('honey')) return '🍯'
    if (name.includes('bread')) return '🍞'
    if (name.includes('stew') || name.includes('feast')) return '🍲'
    if (name.includes('tea')) return '🍵'
    if (name.includes('water')) return '💧'
    if (name.includes('brew') || name.includes('ale')) return '🍺'
    if (name.includes('jerky') || name.includes('meat')) return '🥩'
    if (name.includes('herb')) return '🌿'
    if (name.includes('root')) return '🥕'

    // Materials - Ores & Bars
    if (name.includes('ore')) return '⛏️'
    if (name.includes('bar') && !name.includes('barb')) return '🔩'
    if (name.includes('coal')) return '⬛'

    // Materials - Logs
    if (name.includes('log')) return '🪵'

    // Materials - Fish
    if (name.includes('shrimp')) return '🦐'
    if (name.includes('lobster')) return '🦞'
    if (name.includes('shark')) return '🦈'
    if (name.includes('manta ray')) return '🐟'
    if (name.includes('salmon') || name.includes('trout') || name.includes('sardine')) return '🐟'
    if (name.includes('swordfish')) return '🐠'
    if (name.includes('raw') && itemType === 'material') return '🐟'

    // Materials - Animal Parts
    if (name.includes('hide') || name.includes('pelt') || name.includes('fur')) return '🦌'
    if (name.includes('scales')) return '🐉'
    if (name.includes('feather')) return '🪶'
    if (name.includes('antlers')) return '🦌'
    if (name.includes('rabbit')) return '🐰'

    // Materials - Herbs & Plants
    if (name.includes('guam') || name.includes('marrentill') || name.includes('tarromin')) return '🌿'
    if (name.includes('harralander') || name.includes('ranarr') || name.includes('irit')) return '🌿'
    if (name.includes('avantoe') || name.includes('kwuarm') || name.includes('snapdragon') || name.includes('torstol')) return '🌿'

    // Materials - Essences & Runes
    if (name.includes('essence')) return '✨'
    if (name.includes('rune')) return '🔮'

    // Materials - Gems & Precious
    if (name.includes('diamond')) return '💎'
    if (name.includes('ruby')) return '♦️'
    if (name.includes('emerald')) return '💚'
    if (name.includes('sapphire')) return '💙'
    if (name.includes('dragonstone')) return '🟣'
    if (name.includes('coin') || name.includes('gold')) return '🪙'
    if (name.includes('crystal') || name.includes('shard')) return '🔷'

    // Default fallbacks by type
    if (itemType === 'weapon') return '⚔️'
    if (itemType === 'armor') return '🛡️'
    if (itemType === 'consumable') return '🧪'
    if (itemType === 'material') return '📦'

    return '❓'
  }

  if (!character) return null

  const filteredMerchantItems = filterItems(merchantInventory)
  const filteredPlayerItems = filterItems(playerInventory.filter(item => !item.equipped))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="panel p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white text-shadow mb-2">🏪 Merchant</h2>
            <p className="text-gray-400">Buy and sell items across different zones</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Your Gold</div>
            <div className="text-3xl font-bold text-yellow-400 text-shadow">
              💰 {character.gold.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Zone & Merchant Selection */}
        {zones.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Zone Selection */}
            <div>
              <label className="text-sm text-gray-400 block mb-2">Current Zone:</label>
              <select
                value={selectedZone?.id || ''}
                onChange={(e) => {
                  const zone = zones.find(z => z.id === e.target.value)
                  if (zone) handleZoneChange(zone)
                }}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
              >
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.icon} {zone.name} (Lv. {zone.required_level})
                  </option>
                ))}
              </select>
            </div>

            {/* Merchant Selection */}
            {zoneMerchants.length > 0 && (
              <div>
                <label className="text-sm text-gray-400 block mb-2">Merchant:</label>
                <select
                  value={selectedMerchant?.id || ''}
                  onChange={(e) => {
                    const merchant = zoneMerchants.find(m => m.id === e.target.value)
                    if (merchant) handleMerchantChange(merchant)
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                >
                  {zoneMerchants.map((merchant) => (
                    <option key={merchant.id} value={merchant.id}>
                      {merchant.icon} {merchant.merchant_name} ({merchant.merchant_type})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Merchant Greeting */}
        {selectedMerchant && (
          <div className="mt-4 bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{selectedMerchant.icon}</div>
              <div className="flex-1">
                <div className="font-semibold text-white">{selectedMerchant.merchant_name}</div>
                <div className="text-sm text-gray-400 italic">
                  "{selectedMerchant.greeting_message}"
                </div>
                {selectedMerchant.description && (
                  <div className="text-xs text-gray-500 mt-1">{selectedMerchant.description}</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Personality</div>
                <div className="text-sm text-amber-400 capitalize">{selectedMerchant.personality}</div>
              </div>
            </div>
          </div>
        )}

        {/* Merchant Stats */}
        {merchantStats && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-box">
              <span className="text-gray-400">Tier</span>
              <span className="text-amber-400 font-bold">{merchantStats.unlocked_tier}</span>
            </div>
            <div className="stat-box">
              <span className="text-gray-400">Purchases</span>
              <span className="text-blue-400 font-bold">{merchantStats.total_purchases}</span>
            </div>
            <div className="stat-box">
              <span className="text-gray-400">Sales</span>
              <span className="text-green-400 font-bold">{merchantStats.total_sales}</span>
            </div>
            <div className="stat-box">
              <span className="text-gray-400">Net Gold</span>
              <span className={`font-bold ${
                merchantStats.lifetime_gold_earned - merchantStats.lifetime_gold_spent >= 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>
                {(merchantStats.lifetime_gold_earned - merchantStats.lifetime_gold_spent).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="panel p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('buy')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
              activeTab === 'buy'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            🛒 Buy Items
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
              activeTab === 'sell'
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            💰 Sell Items
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            📜 History
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      {(activeTab === 'buy' || activeTab === 'sell') && (
        <div className="panel p-4">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">All Types</option>
              <option value="weapon">Weapons</option>
              <option value="armor">Armor</option>
              <option value="consumable">Consumables</option>
              <option value="material">Materials</option>
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="panel p-12 text-center">
          <div className="inline-block w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400">Loading merchant...</p>
        </div>
      ) : (
        <>
          {/* Buy Tab */}
          {activeTab === 'buy' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Item Grid */}
              <div className="lg:col-span-2 panel p-6">
                <h3 className="text-xl font-bold text-white mb-4">
                  Available Items ({filteredMerchantItems.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredMerchantItems.map((merchantItem) => (
                    <button
                      key={merchantItem.id}
                      onClick={() => {
                        setSelectedItem(merchantItem)
                        setQuantity(1)
                      }}
                      className={`card-hover p-3 text-left border-2 ${
                        getRarityBorder(merchantItem.item.rarity)
                      } ${
                        selectedItem?.id === merchantItem.id
                          ? 'ring-2 ring-amber-500 scale-105'
                          : ''
                      }`}
                    >
                      <div className="text-3xl mb-2 text-center">
                        {getItemIcon(merchantItem.item.name, merchantItem.item.type)}
                      </div>
                      <div className={`text-sm font-bold mb-1 ${getRarityColor(merchantItem.item.rarity)}`}>
                        {merchantItem.item.name}
                      </div>
                      <div className="text-xs text-gray-400 mb-2">
                        Lv. {merchantItem.required_character_level}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-yellow-400 font-bold text-sm">
                          💰 {merchantItem.buy_price}
                        </span>
                        {merchantItem.stock_quantity !== -1 && (
                          <span className="text-xs text-gray-500">
                            x{merchantItem.stock_quantity}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                {filteredMerchantItems.length === 0 && (
                  <div className="text-center py-12">
                    <span className="text-6xl">🔍</span>
                    <p className="text-gray-400 mt-4">No items found</p>
                  </div>
                )}
              </div>

              {/* Details Panel */}
              <div className="panel p-6">
                {selectedItem && 'buy_price' in selectedItem ? (
                  <>
                    <h3 className="text-xl font-bold text-white mb-4">Purchase Details</h3>
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <div className="text-6xl mb-3">
                          {getItemIcon(selectedItem.item.name, selectedItem.item.type)}
                        </div>
                        <h4 className={`text-xl font-bold ${getRarityColor(selectedItem.item.rarity)}`}>
                          {selectedItem.item.name}
                        </h4>
                        <p className="text-sm text-gray-400 mt-2">
                          {selectedItem.item.description || 'No description'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Type:</span>
                          <span className="text-white capitalize">{selectedItem.item.type}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Rarity:</span>
                          <span className={getRarityColor(selectedItem.item.rarity)}>
                            {selectedItem.item.rarity}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Required Level:</span>
                          <span className="text-white">{selectedItem.required_character_level}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Price Each:</span>
                          <span className="text-yellow-400">💰 {selectedItem.buy_price}</span>
                        </div>
                      </div>

                      {/* Stats */}
                      {(selectedItem.item.attack_bonus > 0 ||
                        selectedItem.item.defense_bonus > 0 ||
                        selectedItem.item.health_bonus > 0 ||
                        selectedItem.item.mana_bonus > 0) && (
                        <div className="border-t border-white/10 pt-4 space-y-2">
                          <div className="text-sm font-semibold text-gray-300 mb-2">Stats:</div>
                          {selectedItem.item.attack_bonus > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-red-400">⚔️ Attack:</span>
                              <span className="text-white">+{selectedItem.item.attack_bonus}</span>
                            </div>
                          )}
                          {selectedItem.item.defense_bonus > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-blue-400">🛡️ Defense:</span>
                              <span className="text-white">+{selectedItem.item.defense_bonus}</span>
                            </div>
                          )}
                          {selectedItem.item.health_bonus > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-green-400">❤️ Health:</span>
                              <span className="text-white">+{selectedItem.item.health_bonus}</span>
                            </div>
                          )}
                          {selectedItem.item.mana_bonus > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-cyan-400">💧 Mana:</span>
                              <span className="text-white">+{selectedItem.item.mana_bonus}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quantity */}
                      <div className="border-t border-white/10 pt-4">
                        <label className="text-sm text-gray-400 block mb-2">Quantity:</label>
                        <input
                          type="number"
                          min="1"
                          max={selectedItem.stock_quantity === -1 ? 999 : selectedItem.stock_quantity}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                        />
                      </div>

                      {/* Total */}
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300 font-semibold">Total Cost:</span>
                          <span className="text-2xl font-bold text-yellow-400">
                            💰 {(selectedItem.buy_price * quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Buy Button */}
                      <button
                        onClick={handleBuyItem}
                        disabled={isBuying || character.gold < selectedItem.buy_price * quantity}
                        className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isBuying ? 'Processing...' : 'Purchase Item'}
                      </button>

                      {character.gold < selectedItem.buy_price * quantity && (
                        <p className="text-center text-red-400 text-sm">
                          Not enough gold (need {(selectedItem.buy_price * quantity - character.gold).toLocaleString()} more)
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <span className="text-6xl">🛒</span>
                    <p className="text-gray-400 mt-4">Select an item to view details</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sell Tab */}
          {activeTab === 'sell' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Item Grid */}
              <div className="lg:col-span-2 panel p-6">
                <h3 className="text-xl font-bold text-white mb-4">
                  Your Items ({filteredPlayerItems.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredPlayerItems.map((invItem) => {
                    const sellPrice = Math.floor(invItem.item.sell_price * 0.6)
                    return (
                      <button
                        key={invItem.id}
                        onClick={() => {
                          setSelectedItem(invItem)
                          setQuantity(1)
                        }}
                        className={`card-hover p-3 text-left border-2 ${
                          getRarityBorder(invItem.item.rarity)
                        } ${
                          selectedItem?.id === invItem.id
                            ? 'ring-2 ring-green-500 scale-105'
                            : ''
                        }`}
                      >
                        <div className="text-3xl mb-2 text-center">
                          {getItemIcon(invItem.item.name, invItem.item.type)}
                        </div>
                        <div className={`text-sm font-bold mb-1 ${getRarityColor(invItem.item.rarity)}`}>
                          {invItem.item.name}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-green-400 font-bold text-sm">
                            💰 {sellPrice}
                          </span>
                          <span className="text-xs text-gray-500">
                            x{invItem.quantity}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
                {filteredPlayerItems.length === 0 && (
                  <div className="text-center py-12">
                    <span className="text-6xl">📦</span>
                    <p className="text-gray-400 mt-4">No items to sell</p>
                  </div>
                )}
              </div>

              {/* Details Panel */}
              <div className="panel p-6">
                {selectedItem && 'equipped' in selectedItem ? (
                  <>
                    <h3 className="text-xl font-bold text-white mb-4">Sale Details</h3>
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <div className="text-6xl mb-3">
                          {getItemIcon(selectedItem.item.name, selectedItem.item.type)}
                        </div>
                        <h4 className={`text-xl font-bold ${getRarityColor(selectedItem.item.rarity)}`}>
                          {selectedItem.item.name}
                        </h4>
                        <p className="text-sm text-gray-400 mt-2">
                          {selectedItem.item.description || 'No description'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">You Have:</span>
                          <span className="text-white">x{selectedItem.quantity}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Base Value:</span>
                          <span className="text-gray-400">💰 {selectedItem.item.sell_price}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Sell Price (60%):</span>
                          <span className="text-green-400">💰 {Math.floor(selectedItem.item.sell_price * 0.6)}</span>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="border-t border-white/10 pt-4">
                        <label className="text-sm text-gray-400 block mb-2">Quantity:</label>
                        <input
                          type="number"
                          min="1"
                          max={selectedItem.quantity}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, Math.min(selectedItem.quantity, parseInt(e.target.value) || 1)))}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-green-500/50"
                        />
                      </div>

                      {/* Total */}
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300 font-semibold">You Receive:</span>
                          <span className="text-2xl font-bold text-green-400">
                            💰 {(Math.floor(selectedItem.item.sell_price * 0.6) * quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Sell Button */}
                      <button
                        onClick={handleSellItem}
                        disabled={isBuying || selectedItem.equipped}
                        className="btn btn-success w-full disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isBuying ? 'Processing...' : 'Sell Item'}
                      </button>

                      {selectedItem.equipped && (
                        <p className="text-center text-red-400 text-sm">
                          Cannot sell equipped items
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <span className="text-6xl">💰</span>
                    <p className="text-gray-400 mt-4">Select an item to sell</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="panel p-6">
              <h3 className="text-xl font-bold text-white mb-4">
                Transaction History ({transactions.length})
              </h3>
              <div className="space-y-2">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">
                        {transaction.transaction_type === 'buy' ? '🛒' : '💰'}
                      </div>
                      <div>
                        <div className="font-semibold text-white">
                          {transaction.transaction_type === 'buy' ? 'Bought' : 'Sold'} {transaction.quantity}x {transaction.item.name}
                        </div>
                        <div className="text-sm text-gray-400">
                          {new Date(transaction.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        transaction.transaction_type === 'buy' ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {transaction.transaction_type === 'buy' ? '-' : '+'}💰 {transaction.total_price.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {transaction.price_per_unit} each
                      </div>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <div className="text-center py-12">
                    <span className="text-6xl">📜</span>
                    <p className="text-gray-400 mt-4">No transactions yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
