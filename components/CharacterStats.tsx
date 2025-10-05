'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import { Character, InventoryItem, Item, CharacterSkillWithDefinition } from '@/lib/supabase'
import { getEquippedItems } from '@/lib/inventory'
import { getActiveBuffs, getBuffTimeRemaining, formatTimeRemaining, type ActiveBuff } from '@/lib/consumables'
import { getCharacterSkills } from '@/lib/skills'
import { getExplorationSkills } from '@/lib/explorationSkills'
import { createClient } from '@/utils/supabase/client'
import {
  calculateStatBreakdown,
  formatStatWithSources,
  getEquipmentContribution,
  getTotalEquipmentStats,
  formatDuration,
  type CharacterStatsBreakdown,
  type EquipmentContribution,
} from '@/lib/characterStats'

interface CharacterStatsProps {
  character: Character
}

export default function CharacterStats({ character }: CharacterStatsProps) {
  const [equippedItems, setEquippedItems] = useState<Array<InventoryItem & { item: Item }>>([])
  const [activeBuffs, setActiveBuffs] = useState<ActiveBuff[]>([])
  const [skills, setSkills] = useState<CharacterSkillWithDefinition[]>([])
  const [explorationSkills, setExplorationSkills] = useState<any[]>([])
  const [landmarkBonuses, setLandmarkBonuses] = useState<any[]>([])
  const [discoveriesCount, setDiscoveriesCount] = useState(0)
  const [statsBreakdown, setStatsBreakdown] = useState<CharacterStatsBreakdown | null>(null)
  const [equipmentContribution, setEquipmentContribution] = useState<EquipmentContribution[]>([])
  const [showEquipmentDetails, setShowEquipmentDetails] = useState(false)
  const [showLandmarkDetails, setShowLandmarkDetails] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [character.id])

  // Poll for buffs and recalculate stats
  useEffect(() => {
    const interval = setInterval(() => {
      loadBuffs()
    }, 2000)

    return () => clearInterval(interval)
  }, [character.id])

  async function loadData() {
    setLoading(true)
    await Promise.all([
      loadEquippedItems(),
      loadBuffs(),
      loadSkills(),
      loadExplorationSkills(),
      loadLandmarkBonuses(),
      loadDiscoveriesCount()
    ])
    setLoading(false)
  }

  async function loadEquippedItems() {
    const { data } = await getEquippedItems(character.id)
    if (data) {
      setEquippedItems(data as Array<InventoryItem & { item: Item }>)
      const contribution = getEquipmentContribution(data as Array<InventoryItem & { item: Item }>)
      setEquipmentContribution(contribution)
    }
  }

  async function loadBuffs() {
    const buffs = await getActiveBuffs(character.id)
    setActiveBuffs(buffs)
  }

  async function loadSkills() {
    const { data } = await getCharacterSkills(character.id)
    if (data) {
      setSkills(data)
    }
  }

  async function loadExplorationSkills() {
    const { data } = await getExplorationSkills(character.id)
    if (data) {
      setExplorationSkills(data)
    }
  }

  async function loadLandmarkBonuses() {
    const supabase = createClient()
    const { data } = await supabase
      .from('character_landmark_bonuses')
      .select(`
        *,
        landmark:zone_landmarks(name, landmark_type)
      `)
      .eq('character_id', character.id)

    if (data) {
      setLandmarkBonuses(data)
    }
  }

  async function loadDiscoveriesCount() {
    const supabase = createClient()
    const { count } = await supabase
      .from('character_landmark_discoveries')
      .select('*', { count: 'exact', head: true })
      .eq('character_id', character.id)

    if (count !== null) {
      setDiscoveriesCount(count)
    }
  }

  // Recalculate stats whenever character, equipment, or buffs change
  useEffect(() => {
    if (character && equippedItems) {
      const breakdown = calculateStatBreakdown(character, equippedItems, activeBuffs)
      setStatsBreakdown(breakdown)
    }
  }, [character, equippedItems, activeBuffs])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!statsBreakdown) return null

  const totalLevel = skills.reduce((sum, s) => sum + s.level, 0)
  const combatLevel = skills
    .filter((s) => s.definition?.category === 'combat')
    .reduce((sum, s) => sum + s.level, 0)
  const experienceForNextLevel = character.level * 100
  const experienceProgress = (character.experience / experienceForNextLevel) * 100
  const healthPercent = (character.health / character.max_health) * 100
  const manaPercent = (character.mana / character.max_mana) * 100
  const totalEquipmentStats = getTotalEquipmentStats(equippedItems)

  // Calculate total landmark bonuses
  const totalLandmarkStats = landmarkBonuses.reduce(
    (acc, bonus) => ({
      attack: acc.attack + (bonus.attack_bonus || 0),
      defense: acc.defense + (bonus.defense_bonus || 0),
      health: acc.health + (bonus.health_bonus || 0),
      mana: acc.mana + (bonus.mana_bonus || 0),
      speed: acc.speed + (bonus.speed_bonus || 0),
      discovery: acc.discovery + (bonus.discovery_bonus || 0),
      goldFind: acc.goldFind + (bonus.gold_find_bonus || 0),
      xp: acc.xp + (bonus.xp_bonus || 0),
    }),
    { attack: 0, defense: 0, health: 0, mana: 0, speed: 0, discovery: 0, goldFind: 0, xp: 0 }
  )

  // Rarity color mapping
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'text-gray-400'
      case 'uncommon':
        return 'text-green-400'
      case 'rare':
        return 'text-blue-400'
      case 'epic':
        return 'text-purple-400'
      case 'legendary':
        return 'text-yellow-400'
      default:
        return 'text-white'
    }
  }

  // Buff icon mapping
  const buffIconMap: Record<string, string> = {
    buff_attack: '⚔️',
    buff_defense: '🛡️',
    buff_experience: '⭐',
    buff_gold_find: '💰',
    buff_luck: '🎲',
    buff_speed: '💨',
  }

  return (
    <div className="space-y-6">
      {/* Character Overview Header */}
      <div className="panel p-6 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center text-5xl shadow-xl">
              {character.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1 text-shadow">{character.name}</h2>
              <div className="flex items-center gap-3">
                <span className="badge badge-uncommon">Level {character.level}</span>
                {character.class_id && (
                  <span className="badge badge-rare capitalize">{character.class_id}</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Member since {new Date(character.created_at).toLocaleDateString()} ({formatDuration(character.created_at)})
              </p>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="hidden lg:flex items-center gap-6">
            <div className="text-center">
              <div className="text-sm text-gray-400">Total Level</div>
              <div className="text-3xl font-bold text-amber-500">{totalLevel}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400">Combat Level</div>
              <div className="text-3xl font-bold text-red-500">{combatLevel}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400">Equipped Items</div>
              <div className="text-3xl font-bold text-purple-500">{equippedItems.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Core Stats (60%) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Core Combat Stats */}
          <div className="panel p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">⚔️</span>
              Core Combat Stats
            </h3>
            <div className="space-y-4">
              {/* Attack */}
              <div className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⚔️</span>
                    <span className="text-sm font-semibold text-gray-300">Attack</span>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-red-400">{statsBreakdown.attack.total}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                  {formatStatWithSources('Attack', statsBreakdown.attack)}
                </div>
              </div>

              {/* Defense */}
              <div className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🛡️</span>
                    <span className="text-sm font-semibold text-gray-300">Defense</span>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-blue-400">{statsBreakdown.defense.total}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                  {formatStatWithSources('Defense', statsBreakdown.defense)}
                </div>
              </div>

              {/* Health */}
              <div className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">❤️</span>
                    <span className="text-sm font-semibold text-gray-300">Health</span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-3xl font-bold ${
                        healthPercent <= 25
                          ? 'text-red-400 animate-pulse'
                          : healthPercent < 100
                            ? 'text-yellow-400'
                            : 'text-green-400'
                      }`}
                    >
                      {character.health}
                    </span>
                    <span className="text-xl text-gray-500"> / {statsBreakdown.max_health.total}</span>
                  </div>
                </div>
                <div className="progress-bar h-3 mb-1">
                  <div
                    className={`progress-fill bg-gradient-to-r ${
                      healthPercent <= 25 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600'
                    }`}
                    style={{ width: `${healthPercent}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                  Max HP: {formatStatWithSources('Max Health', statsBreakdown.max_health)}
                </div>
              </div>

              {/* Mana */}
              <div className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💧</span>
                    <span className="text-sm font-semibold text-gray-300">Mana</span>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-cyan-400">{character.mana}</span>
                    <span className="text-xl text-gray-500"> / {statsBreakdown.max_mana.total}</span>
                  </div>
                </div>
                <div className="progress-bar h-3 mb-1">
                  <div
                    className="progress-fill bg-gradient-to-r from-blue-500 to-blue-600"
                    style={{ width: `${manaPercent}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                  Max MP: {formatStatWithSources('Max Mana', statsBreakdown.max_mana)}
                </div>
              </div>
            </div>
          </div>

          {/* Equipment Bonuses Breakdown */}
          <div className="panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">⚔️</span>
                Equipment Bonuses
              </h3>
              <button
                onClick={() => setShowEquipmentDetails(!showEquipmentDetails)}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                {showEquipmentDetails ? 'Hide Details' : 'Show Details'}
                <span className={`transition-transform ${showEquipmentDetails ? 'rotate-180' : ''}`}>▼</span>
              </button>
            </div>

            {/* Equipment Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="stat-box">
                <span className="text-xs text-gray-400">⚔️ Attack</span>
                <span className="text-xl font-bold text-red-400">+{totalEquipmentStats.attack}</span>
              </div>
              <div className="stat-box">
                <span className="text-xs text-gray-400">🛡️ Defense</span>
                <span className="text-xl font-bold text-blue-400">+{totalEquipmentStats.defense}</span>
              </div>
              <div className="stat-box">
                <span className="text-xs text-gray-400">❤️ Health</span>
                <span className="text-xl font-bold text-green-400">+{totalEquipmentStats.health}</span>
              </div>
              <div className="stat-box">
                <span className="text-xs text-gray-400">💧 Mana</span>
                <span className="text-xl font-bold text-cyan-400">+{totalEquipmentStats.mana}</span>
              </div>
            </div>

            {/* Equipment Details (Expandable) */}
            {showEquipmentDetails && (
              <div className="space-y-2 animate-slide-down">
                {equipmentContribution.length > 0 ? (
                  equipmentContribution.map((contrib, index) => (
                    <div key={index} className="card p-3 border border-gray-700/50 hover:bg-gray-800/40 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold capitalize text-gray-400">{contrib.slot}</span>
                          <span className={`text-sm font-bold ${getRarityColor(contrib.rarity)}`}>
                            {contrib.itemName}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        {contrib.stats.attack > 0 && (
                          <span className="text-red-400">⚔️ +{contrib.stats.attack}</span>
                        )}
                        {contrib.stats.defense > 0 && (
                          <span className="text-blue-400">🛡️ +{contrib.stats.defense}</span>
                        )}
                        {contrib.stats.health > 0 && (
                          <span className="text-green-400">❤️ +{contrib.stats.health}</span>
                        )}
                        {contrib.stats.mana > 0 && (
                          <span className="text-cyan-400">💧 +{contrib.stats.mana}</span>
                        )}
                        {contrib.stats.attack === 0 &&
                          contrib.stats.defense === 0 &&
                          contrib.stats.health === 0 &&
                          contrib.stats.mana === 0 && <span className="text-gray-500">No stat bonuses</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No equipment equipped</p>
                    <p className="text-xs mt-1">Equip items to gain stat bonuses</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Landmark Bonuses Breakdown */}
          <div className="panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">🗺️</span>
                Landmark Bonuses
                {discoveriesCount > 0 && (
                  <span className="text-sm text-purple-400">({discoveriesCount} discovered)</span>
                )}
              </h3>
              <button
                onClick={() => setShowLandmarkDetails(!showLandmarkDetails)}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                {showLandmarkDetails ? 'Hide Details' : 'Show Details'}
                <span className={`transition-transform ${showLandmarkDetails ? 'rotate-180' : ''}`}>▼</span>
              </button>
            </div>

            {/* Landmark Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="stat-box">
                <span className="text-xs text-gray-400">⚔️ Attack</span>
                <span className="text-xl font-bold text-purple-400">+{totalLandmarkStats.attack}</span>
              </div>
              <div className="stat-box">
                <span className="text-xs text-gray-400">🛡️ Defense</span>
                <span className="text-xl font-bold text-purple-400">+{totalLandmarkStats.defense}</span>
              </div>
              <div className="stat-box">
                <span className="text-xs text-gray-400">❤️ Health</span>
                <span className="text-xl font-bold text-purple-400">+{totalLandmarkStats.health}</span>
              </div>
              <div className="stat-box">
                <span className="text-xs text-gray-400">💧 Mana</span>
                <span className="text-xl font-bold text-purple-400">+{totalLandmarkStats.mana}</span>
              </div>
            </div>

            {/* Landmark Details (Expandable) */}
            {showLandmarkDetails && (
              <div className="space-y-2 animate-slide-down">
                {landmarkBonuses.length > 0 ? (
                  landmarkBonuses.map((bonus, index) => {
                    const landmarkIcons: Record<string, string> = {
                      shrine: '⛩️',
                      ruins: '🏛️',
                      vendor: '🏪',
                      dungeon_entrance: '🚪',
                      vista: '🌄',
                      quest_giver: '❗',
                      teleport: '🌀',
                      lore: '📜',
                      crafting: '⚒️'
                    }

                    return (
                      <div key={index} className="card p-3 border border-purple-500/30 hover:bg-purple-500/5 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{landmarkIcons[bonus.landmark?.landmark_type] || '📍'}</span>
                          <span className="text-sm font-bold text-purple-300">
                            {bonus.landmark?.name || 'Unknown Landmark'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs flex-wrap">
                          {bonus.attack_bonus > 0 && (
                            <span className="text-red-400">⚔️ +{bonus.attack_bonus}</span>
                          )}
                          {bonus.defense_bonus > 0 && (
                            <span className="text-blue-400">🛡️ +{bonus.defense_bonus}</span>
                          )}
                          {bonus.health_bonus > 0 && (
                            <span className="text-green-400">❤️ +{bonus.health_bonus}</span>
                          )}
                          {bonus.mana_bonus > 0 && (
                            <span className="text-cyan-400">💧 +{bonus.mana_bonus}</span>
                          )}
                          {bonus.discovery_bonus > 0 && (
                            <span className="text-yellow-400">🔍 +{(bonus.discovery_bonus * 100).toFixed(0)}%</span>
                          )}
                          {bonus.gold_find_bonus > 0 && (
                            <span className="text-amber-400">💰 +{(bonus.gold_find_bonus * 100).toFixed(0)}%</span>
                          )}
                          {bonus.xp_bonus > 0 && (
                            <span className="text-purple-400">⭐ +{(bonus.xp_bonus * 100).toFixed(0)}%</span>
                          )}
                          {bonus.speed_bonus > 0 && (
                            <span className="text-emerald-400">💨 +{(bonus.speed_bonus * 100).toFixed(0)}%</span>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No landmarks discovered</p>
                    <p className="text-xs mt-1">Explore world zones to discover landmarks and gain bonuses</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Exploration Statistics */}
          {(totalLandmarkStats.discovery > 0 || totalLandmarkStats.goldFind > 0 || totalLandmarkStats.xp > 0 || totalLandmarkStats.speed > 0) && (
            <div className="panel p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">🧭</span>
                Exploration Statistics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {totalLandmarkStats.discovery > 0 && (
                  <div className="stat-box">
                    <span className="text-xs text-gray-400">🔍 Discovery Rate</span>
                    <span className="text-xl font-bold text-yellow-400">+{(totalLandmarkStats.discovery * 100).toFixed(0)}%</span>
                  </div>
                )}
                {totalLandmarkStats.goldFind > 0 && (
                  <div className="stat-box">
                    <span className="text-xs text-gray-400">💰 Gold Find</span>
                    <span className="text-xl font-bold text-amber-400">+{(totalLandmarkStats.goldFind * 100).toFixed(0)}%</span>
                  </div>
                )}
                {totalLandmarkStats.xp > 0 && (
                  <div className="stat-box">
                    <span className="text-xs text-gray-400">⭐ XP Gain</span>
                    <span className="text-xl font-bold text-purple-400">+{(totalLandmarkStats.xp * 100).toFixed(0)}%</span>
                  </div>
                )}
                {totalLandmarkStats.speed > 0 && (
                  <div className="stat-box">
                    <span className="text-xs text-gray-400">💨 Speed</span>
                    <span className="text-xl font-bold text-emerald-400">+{(totalLandmarkStats.speed * 100).toFixed(0)}%</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Exploration Skills */}
          {explorationSkills.length > 0 && (
            <div className="panel p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">🗺️</span>
                Exploration Skills
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {explorationSkills.map((skill) => {
                  const xpForNextLevel = skill.level * 100
                  const progress = (skill.experience / xpForNextLevel) * 100

                  const skillIcons: Record<string, string> = {
                    archaeology: '🔍',
                    navigation: '🧭',
                    cartography: '🗺️',
                    survival: '🏕️',
                    tracking: '👣',
                  }

                  return (
                    <div key={skill.skill_type} className="stat-box group hover:bg-gray-800/40 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg transition-transform duration-300 group-hover:scale-110">
                            {skillIcons[skill.skill_type] || '📊'}
                          </span>
                          <span className="text-xs text-gray-400 capitalize">{skill.skill_type}</span>
                        </div>
                        <span className="text-xl font-bold text-amber-400 transition-all duration-300 group-hover:text-amber-300">
                          {skill.level}
                        </span>
                      </div>
                      <div className="progress-bar h-2 mb-1">
                        <div
                          className="progress-fill bg-gradient-to-r from-amber-500 to-amber-600"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {skill.experience.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Character Progression */}
          <div className="panel p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📈</span>
              Character Progression
            </h3>
            <div className="space-y-4">
              {/* Experience Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-300">Experience to Level {character.level + 1}</span>
                  <span className="text-sm text-gray-400">
                    {character.experience.toLocaleString()} / {experienceForNextLevel.toLocaleString()} XP
                  </span>
                </div>
                <div className="progress-bar h-4">
                  <div
                    className="progress-fill bg-gradient-to-r from-amber-500 to-amber-600"
                    style={{ width: `${experienceProgress}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">{Math.floor(experienceProgress)}% complete</div>
              </div>

              {/* Skill Levels */}
              <div className="grid grid-cols-2 gap-3">
                <div className="stat-box">
                  <span className="text-sm text-gray-400">Total Skill Level</span>
                  <span className="text-2xl font-bold text-amber-500">{totalLevel}</span>
                </div>
                <div className="stat-box">
                  <span className="text-sm text-gray-400">Combat Skill Level</span>
                  <span className="text-2xl font-bold text-red-500">{combatLevel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Combat Skills Breakdown */}
          <div className="panel p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              Combat Skills
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {skills
                .filter((s) => s.definition?.category === 'combat')
                .map((skill) => {
                  const xpForNextLevel = skill.level * 100
                  const progress = (skill.experience / xpForNextLevel) * 100

                  const skillIcons: Record<string, string> = {
                    attack: '⚔️',
                    strength: '💪',
                    defense: '🛡️',
                    constitution: '❤️',
                    magic: '✨',
                    ranged: '🏹',
                  }

                  return (
                    <div key={skill.skill_type} className="stat-box group hover:bg-gray-800/40 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg transition-transform duration-300 group-hover:scale-110">
                            {skillIcons[skill.skill_type] || '📊'}
                          </span>
                          <span className="text-xs text-gray-400 capitalize">{skill.skill_type}</span>
                        </div>
                        <span className="text-xl font-bold text-emerald-400 transition-all duration-300 group-hover:text-emerald-300">
                          {skill.level}
                        </span>
                      </div>
                      <div className="progress-bar h-2 mb-1">
                        <div
                          className="progress-fill bg-gradient-to-r from-emerald-500 to-emerald-600"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {skill.experience.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>

        {/* Right Panel: Active Effects & Resources (40%) */}
        <div className="space-y-6">
          {/* Resources */}
          <div className="panel p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">💰</span>
              Resources
            </h3>
            <div className="space-y-3">
              <div className="stat-box group hover:bg-amber-500/10 transition-all cursor-default">
                <div className="flex items-center gap-2">
                  <span className="text-2xl transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12">
                    💰
                  </span>
                  <span className="text-sm text-gray-400">Gold</span>
                </div>
                <span className="text-2xl font-bold text-amber-400 transition-all duration-300 group-hover:text-amber-300 group-hover:scale-110">
                  {character.gold.toLocaleString()}
                </span>
              </div>

              <div className="stat-box group hover:bg-purple-500/10 transition-all cursor-default">
                <div className="flex items-center gap-2">
                  <span className="text-2xl transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12">
                    💎
                  </span>
                  <span className="text-sm text-gray-400">Gems</span>
                </div>
                <span className="text-2xl font-bold text-purple-400 transition-all duration-300 group-hover:text-purple-300 group-hover:scale-110">
                  {character.gems}
                </span>
              </div>

              <div className="stat-box group hover:bg-cyan-500/10 transition-all cursor-default">
                <div className="flex items-center gap-2">
                  <span className="text-2xl transition-transform duration-300 group-hover:scale-125">⭐</span>
                  <span className="text-sm text-gray-400">Mastery Points</span>
                </div>
                <span className="text-2xl font-bold text-cyan-400 transition-all duration-300 group-hover:text-cyan-300 group-hover:scale-110">
                  {character.mastery_points}
                </span>
              </div>
            </div>
          </div>

          {/* Active Effects */}
          <div className="panel p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">✨</span>
              Active Effects
            </h3>
            <div className="space-y-3">
              {activeBuffs.length > 0 ? (
                activeBuffs.map((buff) => {
                  const timeRemaining = getBuffTimeRemaining(buff)
                  const buffIcon = buffIconMap[buff.effect_type] || '✨'

                  return (
                    <div
                      key={buff.id}
                      className="card p-4 border-2 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-3xl group-hover:scale-110 transition-transform">{buffIcon}</span>
                        <div className="flex-1">
                          <div className="font-bold text-blue-300 mb-1">{buff.item_name}</div>
                          <div className="text-xs text-gray-400 mb-2">
                            +{buff.effect_value}% {buff.effect_type.replace('buff_', '').replace('_', ' ')}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 progress-bar h-2">
                              <div
                                className="progress-fill bg-gradient-to-r from-blue-500 to-blue-600"
                                style={{
                                  width: `${Math.max(
                                    0,
                                    Math.min(100, (timeRemaining / (buff.effect_value * 60 * 1000)) * 100)
                                  )}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-mono text-blue-400 min-w-[50px] text-right">
                              {formatTimeRemaining(timeRemaining)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🚫</div>
                  <p className="text-sm">No active buffs</p>
                  <p className="text-xs mt-1">Use consumables to gain temporary bonuses</p>
                </div>
              )}
            </div>
          </div>

          {/* Character Info */}
          <div className="panel p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📋</span>
              Character Info
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Character ID</span>
                <span className="text-gray-300 font-mono text-xs">{character.id.slice(0, 8)}...</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Created</span>
                <span className="text-gray-300">{new Date(character.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Playtime</span>
                <span className="text-gray-300">{formatDuration(character.created_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Last Active</span>
                <span className="text-gray-300">
                  {new Date(character.last_active).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
