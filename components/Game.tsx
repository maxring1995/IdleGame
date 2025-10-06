'use client'

import { useEffect, useState } from 'react'
import { useGameStore } from '@/lib/store'
import { signOut } from '@/app/actions'
import Inventory from './Inventory'
import Combat from './Combat'
import CharacterTab from './CharacterTab'
import Adventure from './Adventure'
import CraftingPanel from './CraftingPanel'
import Quests from './Quests'
import Merchant from './Merchant'
import NotificationCenter from './NotificationCenter'
import ActiveTasksPanel from './ActiveTasksPanel'
import ToastNotification from './ToastNotification'
import GatheringContracts from './GatheringContracts'
import DiscoveriesPanel from './DiscoveriesPanel'
import Character3DViewer from './Character3DViewer'
import SettingsModal from './SettingsModal'
import { User } from '@supabase/supabase-js'
import { Profile, Character, CharacterSkill } from '@/lib/supabase'
import { getActiveBuffs, getBuffTimeRemaining, formatTimeRemaining, type ActiveBuff } from '@/lib/consumables'
import { getCharacterSkills } from '@/lib/skills'
import { addExperience, addGold } from '@/lib/character'
import { createClient } from '@/utils/supabase/client'

interface GameProps {
  initialUser: User
  initialProfile: Profile | null
  initialCharacter: Character
}

// New hierarchical tab structure
type MainTab = 'adventure' | 'character' | 'inventory' | 'crafting' | 'market'
type AdventureSubTab = 'exploration' | 'combat' | 'quests' | 'discoveries' | 'gathering_contracts'
type MarketSubTab = 'merchant'

// Component for displaying combat skills in sidebar
function CombatSkillDisplay({ skill, icon, label }: { skill: CharacterSkill | null; icon: string; label: string }) {
  if (!skill) return null

  const xpForNextLevel = skill.level * 100
  const progress = (skill.experience / xpForNextLevel) * 100

  return (
    <div className="stat-box group hover:bg-gray-800/40 transition-all duration-300 cursor-default p-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm transition-transform duration-300 group-hover:scale-110">{icon}</span>
          <span className="text-xs text-gray-400">{label}</span>
        </div>
        <span className="text-sm font-bold text-emerald-400 transition-all duration-300 group-hover:text-emerald-300">
          {skill.level}
        </span>
      </div>
      <div className="progress-bar h-1">
        <div
          className="progress-fill bg-gradient-to-r from-emerald-500 to-emerald-600"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default function Game({ initialUser, initialProfile, initialCharacter }: GameProps) {
  const { user, profile, character, setUser, setProfile, setCharacter, reset } = useGameStore()
  const [isLoading, setIsLoading] = useState(false)
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('adventure')
  const [adventureSubTab, setAdventureSubTab] = useState<AdventureSubTab>('exploration')
  const [marketSubTab, setMarketSubTab] = useState<MarketSubTab>('merchant')
  const [activeBuffs, setActiveBuffs] = useState<ActiveBuff[]>([])
  const [characterSkills, setCharacterSkills] = useState<CharacterSkill[]>([])
  const [isTabTransitioning, setIsTabTransitioning] = useState(false)
  const [showQuickMenu, setShowQuickMenu] = useState(false)
  const [showQuickActionsSettings, setShowQuickActionsSettings] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [customQuickActions, setCustomQuickActions] = useState<Array<{tab: MainTab, subTab?: string, label: string, icon: string}>>([
    { tab: 'market', subTab: 'merchant', label: 'Merchant', icon: '🏪' },
    { tab: 'adventure', subTab: 'gathering_contracts', label: 'Gathering Contracts', icon: '📋' },
    { tab: 'adventure', subTab: 'quests', label: 'Quests', icon: '📜' },
  ])

  useEffect(() => {
    if (!user) {
      setUser(initialUser)
      setProfile(initialProfile)
      setCharacter(initialCharacter)
    }
  }, [initialUser, initialProfile, initialCharacter, user, setUser, setProfile, setCharacter])

  // Load character skills once on mount
  useEffect(() => {
    if (!character?.id) return

    async function loadSkills() {
      const { data } = await getCharacterSkills(character!.id)
      if (data) setCharacterSkills(data)
    }
    loadSkills()
  }, [character?.id])

  // Event-based active buffs loading with Realtime subscription
  useEffect(() => {
    if (!character?.id) return

    const supabase = createClient()

    async function loadBuffs() {
      if (!character?.id) return
      const buffs = await getActiveBuffs(character.id)
      setActiveBuffs(buffs)
    }

    // Initial load
    loadBuffs()

    // Subscribe to realtime changes on active_buffs table
    const channel = supabase
      .channel(`active_buffs_${character.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'active_buffs',
          filter: `character_id=eq.${character.id}`
        },
        () => {
          // Reload buffs when any change occurs
          loadBuffs()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [character?.id])

  // Level-scaled idle generation with AFK penalty
  useEffect(() => {
    if (!character?.id) return

    const supabase = createClient()

    const interval = setInterval(async () => {
      try {
        // Get current character data for AFK calculation
        const { data: char } = await supabase
          .from('characters')
          .select('last_active, level')
          .eq('id', character.id)
          .single()

        if (!char) return

        // Calculate AFK penalty (diminishing returns after 8 hours)
        const lastActive = char.last_active ? new Date(char.last_active) : new Date()
        const afkSeconds = Math.floor((Date.now() - lastActive.getTime()) / 1000)
        let penalty = 1.0

        if (afkSeconds > 28800) { // 8 hours
          penalty = 0.5 + (0.5 / (1 + (afkSeconds - 28800) / 14400))
        }

        // Apply level-scaled idle gains with AFK penalty
        // Level 1: 10 XP, 20 gold per 5 seconds
        // Level 50: 500 XP, 1000 gold per 5 seconds
        // Level 99: 990 XP, 1980 gold per 5 seconds
        const idleXP = Math.floor(character.level * 10 * penalty)
        const idleGold = Math.floor(character.level * 20 * penalty)

        await addExperience(character.id, idleXP)
        await addGold(character.id, idleGold)

        // Update character in store - silently without triggering full re-render
        const { data: updatedChar } = await supabase
          .from('characters')
          .select('*')
          .eq('id', character.id)
          .single()

        if (updatedChar) {
          // Only update if meaningful changes occurred (prevent re-render from timestamp changes)
          const hasSignificantChange =
            updatedChar.experience !== character.experience ||
            updatedChar.gold !== character.gold ||
            updatedChar.level !== character.level ||
            updatedChar.health !== character.health ||
            updatedChar.mana !== character.mana

          if (hasSignificantChange) {
            setCharacter(updatedChar)
          }
        }
      } catch (error) {
        console.error('Idle generation error:', error)
      }
    }, 5000) // Every 5 seconds

    return () => clearInterval(interval)
  }, [character?.id, character?.level, setCharacter])

  // Load custom quick actions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('quickActions')
    if (saved) {
      try {
        setCustomQuickActions(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load quick actions:', e)
      }
    }
  }, [])

  async function handleSignOut() {
    setIsLoading(true)
    const result = await signOut()
    if (result?.success) {
      reset()
      window.location.href = '/login'
    } else {
      setIsLoading(false)
      console.error('Failed to sign out:', result?.error)
    }
  }

  const handleMainTabChange = (tab: MainTab) => {
    if (tab === activeMainTab) return
    setIsTabTransitioning(true)
    setTimeout(() => {
      setActiveMainTab(tab)
      setIsTabTransitioning(false)
    }, 150)
  }

  const handleQuickActionClick = (action: typeof customQuickActions[0]) => {
    setActiveMainTab(action.tab)
    if (action.subTab) {
      if (action.tab === 'adventure') setAdventureSubTab(action.subTab as AdventureSubTab)
      else if (action.tab === 'market') setMarketSubTab(action.subTab as MarketSubTab)
    }
  }

  if (!character) return null

  // Calculate XP for next level using exponential formula (level^2.5 * 100)
  const calculateXPForLevel = (level: number) => {
    if (level <= 1) return 0
    return Math.floor(Math.pow(level, 2.5) * 100)
  }

  const experienceForNextLevel = calculateXPForLevel(character.level + 1)
  const experienceForCurrentLevel = calculateXPForLevel(character.level)
  const experienceInCurrentLevel = character.experience - experienceForCurrentLevel
  const experienceNeededForLevel = experienceForNextLevel - experienceForCurrentLevel
  const experienceProgress = (experienceInCurrentLevel / experienceNeededForLevel) * 100

  const healthPercent = (character.health / character.max_health) * 100
  const manaPercent = (character.mana / character.max_mana) * 100

  // Main tab configuration
  const mainTabConfig = [
    { id: 'adventure' as MainTab, label: 'Adventure', icon: '🗺️', color: 'emerald', hasSubTabs: true },
    { id: 'character' as MainTab, label: 'Character', icon: '👤', color: 'blue', hasSubTabs: false },
    { id: 'inventory' as MainTab, label: 'Inventory', icon: '🎒', color: 'purple', hasSubTabs: false },
    { id: 'crafting' as MainTab, label: 'Crafting', icon: '🔨', color: 'amber', hasSubTabs: false },
    { id: 'market' as MainTab, label: 'Market', icon: '🏪', color: 'yellow', hasSubTabs: false },
  ]

  // Sub-tab configurations
  const adventureSubTabs = [
    { id: 'exploration' as AdventureSubTab, label: 'Exploration', icon: '🗺️' },
    { id: 'combat' as AdventureSubTab, label: 'Combat', icon: '⚔️' },
    { id: 'quests' as AdventureSubTab, label: 'Quests', icon: '📜' },
    { id: 'discoveries' as AdventureSubTab, label: 'Discoveries', icon: '📍' },
    { id: 'gathering_contracts' as AdventureSubTab, label: 'Gathering Contracts', icon: '📋' },
  ]

  const marketSubTabs = [
    { id: 'merchant' as MarketSubTab, label: 'Merchant', icon: '🏪' },
  ]

  return (
    <div className="min-h-screen bg-mesh-gradient">
      {/* Top Navigation Bar - Always visible */}
      <div className="sticky top-0 z-40 panel-glass border-b">
        <div className="max-w-[1920px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Character Identity */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                {character.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white text-shadow">{character.name}</h1>
                  <span className="badge badge-uncommon">Lv. {character.level}</span>
                </div>
                <p className="text-xs text-gray-400">{profile?.username}</p>
              </div>
            </div>

            {/* Center: Quick Stats */}
            <div className="hidden lg:flex items-center gap-6">
              {/* HP */}
              <div className="flex items-center gap-2 min-w-[180px] group">
                <span className="text-xs font-semibold text-red-400 transition-all duration-300 group-hover:text-red-300 group-hover:scale-110">HP</span>
                <div className="flex-1 progress-bar h-4 relative overflow-hidden">
                  <div
                    className={`progress-fill bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500 ${
                      healthPercent <= 25 ? 'animate-pulse' : ''
                    }`}
                    style={{ width: `${healthPercent}%` }}
                  />
                  {/* Animated overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer opacity-0 group-hover:opacity-100" style={{ backgroundSize: '200% 100%' }} />
                </div>
                <span className="text-xs font-mono text-gray-300 min-w-[60px] text-right transition-colors group-hover:text-white">
                  {character.health}/{character.max_health}
                </span>
              </div>

              {/* MP */}
              <div className="flex items-center gap-2 min-w-[180px] group">
                <span className="text-xs font-semibold text-blue-400 transition-all duration-300 group-hover:text-blue-300 group-hover:scale-110">MP</span>
                <div className="flex-1 progress-bar h-4 relative overflow-hidden">
                  <div
                    className="progress-fill bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                    style={{ width: `${manaPercent}%` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer opacity-0 group-hover:opacity-100" style={{ backgroundSize: '200% 100%' }} />
                </div>
                <span className="text-xs font-mono text-gray-300 min-w-[60px] text-right transition-colors group-hover:text-white">
                  {character.mana}/{character.max_mana}
                </span>
              </div>

              {/* XP */}
              <div className="flex items-center gap-2 min-w-[180px] group">
                <span className="text-xs font-semibold text-amber-400 transition-all duration-300 group-hover:text-amber-300 group-hover:scale-110">XP</span>
                <div className="flex-1 progress-bar h-4 relative overflow-hidden">
                  <div
                    className="progress-fill bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500"
                    style={{ width: `${experienceProgress}%` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer opacity-0 group-hover:opacity-100" style={{ backgroundSize: '200% 100%' }} />
                </div>
                <span className="text-xs font-mono text-gray-300 min-w-[70px] text-right transition-colors group-hover:text-white">
                  {Math.floor(experienceProgress)}%
                </span>
              </div>
            </div>

            {/* Right: Resources & Actions */}
            <div className="flex items-center gap-4">
              {/* Active Buffs */}
              {activeBuffs.length > 0 && (
                <div className="flex items-center gap-2">
                  {activeBuffs.slice(0, 3).map((buff) => {
                    const timeRemaining = getBuffTimeRemaining(buff)
                    const buffIconMap: Record<string, string> = {
                      'buff_attack': '⚔️',
                      'buff_defense': '🛡️',
                      'buff_experience': '⭐',
                      'buff_gold_find': '💰',
                      'buff_luck': '🎲',
                      'buff_speed': '💨'
                    }
                    const buffIcon = buffIconMap[buff.effect_type] || '✨'

                    return (
                      <div
                        key={buff.id}
                        className="relative group cursor-help px-2 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30"
                        title={`${buff.item_name}: +${buff.effect_value}% ${buff.effect_type.replace('buff_', '')}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{buffIcon}</span>
                          <span className="text-xs font-mono text-blue-400">
                            {formatTimeRemaining(timeRemaining)}
                          </span>
                        </div>

                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 rounded-lg border border-blue-500/50 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                          <p className="text-xs font-semibold text-blue-300">{buff.item_name}</p>
                          <p className="text-xs text-gray-300">+{buff.effect_value}% {buff.effect_type.replace('buff_', '').replace('_', ' ')}</p>
                        </div>
                      </div>
                    )
                  })}
                  {activeBuffs.length > 3 && (
                    <div className="px-2 py-1.5 text-xs text-gray-400">
                      +{activeBuffs.length - 3} more
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 group hover:bg-amber-500/20 hover:border-amber-500/50 transition-all duration-300 cursor-default">
                  <span className="text-lg transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12">💰</span>
                  <span className="text-sm font-bold text-amber-400 transition-all duration-300 group-hover:text-amber-300 group-hover:scale-110">{character.gold.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 group hover:bg-purple-500/20 hover:border-purple-500/50 transition-all duration-300 cursor-default">
                  <span className="text-lg transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12">💎</span>
                  <span className="text-sm font-bold text-purple-400 transition-all duration-300 group-hover:text-purple-300 group-hover:scale-110">{character.gems}</span>
                </div>
              </div>

              {/* Notification Bell */}
              <NotificationCenter />

              {/* Settings Icon */}
              <button
                onClick={() => setShowSettingsModal(true)}
                className="relative p-2 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:bg-gray-700/50 hover:border-gray-600/50 transition-all duration-200 group"
                title="Settings"
              >
                <span className="text-xl transition-transform duration-200 group-hover:rotate-90">⚙️</span>
              </button>

              <button
                onClick={handleSignOut}
                disabled={isLoading}
                className="btn btn-secondary text-xs px-3 py-1.5"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Game Layout */}
      <div className="max-w-[1920px] mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Character Stats */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            {/* Character Portrait */}
            <div className="panel p-6 text-center animate-fade-in-up">
              <div className="relative inline-block mb-4 group">
                <Character3DViewer
                  characterId={character.id}
                  size={128}
                  interactive={false}
                  autoRotate={true}
                />
                {/* Animated glow ring */}
                <div className="absolute -inset-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-xl opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-300 -z-10" />
                {/* Level badge overlay */}
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg border-2 border-gray-900 animate-bounce-in">
                  {character.level}
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1 text-shadow animate-slide-down">{character.name}</h2>
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="badge badge-uncommon animate-scale-in">Level {character.level}</span>
              </div>

              {/* Mobile Stats (XP, HP, MP) */}
              <div className="lg:hidden space-y-3 mt-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-red-400 font-semibold">Health</span>
                    <span className="text-gray-300">{character.health} / {character.max_health}</span>
                  </div>
                  <div className="progress-bar h-4">
                    <div
                      className="progress-fill bg-gradient-to-r from-red-500 to-red-600"
                      style={{ width: `${healthPercent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-blue-400 font-semibold">Mana</span>
                    <span className="text-gray-300">{character.mana} / {character.max_mana}</span>
                  </div>
                  <div className="progress-bar h-4">
                    <div
                      className="progress-fill bg-gradient-to-r from-blue-500 to-blue-600"
                      style={{ width: `${manaPercent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-amber-400 font-semibold">Experience</span>
                    <span className="text-gray-300">{character.experience} / {experienceForNextLevel}</span>
                  </div>
                  <div className="progress-bar h-4">
                    <div
                      className="progress-fill bg-gradient-to-r from-amber-500 to-amber-600"
                      style={{ width: `${experienceProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Combat Stats */}
            <div className="panel p-5 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="text-amber-400">⚡</span>
                Combat Stats
              </h3>
              <div className="space-y-3">
                <div className="stat-box group hover:bg-gray-800/40 transition-all duration-300 cursor-default">
                  <div className="flex items-center gap-2">
                    <span className="text-xl transition-transform duration-300 group-hover:scale-110">⚔️</span>
                    <span className="text-sm text-gray-400">Attack</span>
                  </div>
                  <span className="text-lg font-bold text-red-400 transition-all duration-300 group-hover:text-red-300 group-hover:scale-110">
                    {character.attack}
                  </span>
                </div>

                <div className="stat-box group hover:bg-gray-800/40 transition-all duration-300 cursor-default">
                  <div className="flex items-center gap-2">
                    <span className="text-xl transition-transform duration-300 group-hover:scale-110">🛡️</span>
                    <span className="text-sm text-gray-400">Defense</span>
                  </div>
                  <span className="text-lg font-bold text-blue-400 transition-all duration-300 group-hover:text-blue-300 group-hover:scale-110">
                    {character.defense}
                  </span>
                </div>

                <div className="stat-box group hover:bg-gray-800/40 transition-all duration-300 cursor-default">
                  <div className="flex items-center gap-2">
                    <span className="text-xl transition-transform duration-300 group-hover:scale-110">❤️</span>
                    <span className="text-sm text-gray-400">Health</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold transition-all duration-300 group-hover:scale-110 ${
                      character.health <= character.max_health * 0.25
                        ? 'text-red-400 animate-pulse'
                        : character.health < character.max_health
                          ? 'text-yellow-400'
                          : 'text-green-400'
                    }`}>
                      {character.health}
                    </span>
                    <span className="text-sm text-gray-500">/ {character.max_health}</span>
                  </div>
                </div>

                <div className="stat-box group hover:bg-gray-800/40 transition-all duration-300 cursor-default">
                  <div className="flex items-center gap-2">
                    <span className="text-xl transition-transform duration-300 group-hover:scale-110">💧</span>
                    <span className="text-sm text-gray-400">Mana</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold transition-all duration-300 group-hover:scale-110 ${
                      character.mana <= character.max_mana * 0.25
                        ? 'text-blue-300'
                        : 'text-cyan-400'
                    }`}>
                      {character.mana}
                    </span>
                    <span className="text-sm text-gray-500">/ {character.max_mana}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Combat Skills */}
            <div className="panel p-5 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="text-emerald-400">🎯</span>
                Combat Skills
              </h3>
              <div className="space-y-2">
                <CombatSkillDisplay skill={characterSkills.find(s => s.skill_type === 'attack') || null} icon="⚔️" label="Attack" />
                <CombatSkillDisplay skill={characterSkills.find(s => s.skill_type === 'strength') || null} icon="💪" label="Strength" />
                <CombatSkillDisplay skill={characterSkills.find(s => s.skill_type === 'defense') || null} icon="🛡️" label="Defense" />
                <CombatSkillDisplay skill={characterSkills.find(s => s.skill_type === 'constitution') || null} icon="❤️" label="Constitution" />
                <CombatSkillDisplay skill={characterSkills.find(s => s.skill_type === 'magic') || null} icon="✨" label="Magic" />
                <CombatSkillDisplay skill={characterSkills.find(s => s.skill_type === 'ranged') || null} icon="🏹" label="Ranged" />
              </div>
            </div>

            {/* Customizable Quick Actions */}
            <div className="panel p-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="text-purple-400">🎯</span>
                  Quick Actions
                </h3>
                <button
                  onClick={() => setShowQuickActionsSettings(true)}
                  className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-gray-700/50 rounded-lg"
                  title="Customize Quick Actions"
                >
                  <span className="text-sm">⚙️</span>
                </button>
              </div>
              <div className="space-y-2">
                {customQuickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickActionClick(action)}
                    className="w-full btn btn-secondary text-sm py-2.5 justify-start group hover:bg-purple-900/20 hover:border-purple-500/30 transition-all duration-300"
                  >
                    <span className="mr-2 transition-transform duration-300 group-hover:scale-125">{action.icon}</span>
                    <span>{action.label}</span>
                    <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </button>
                ))}
                {customQuickActions.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    <p>No quick actions set</p>
                    <p className="text-xs mt-1">Click ⚙️ to customize</p>
                  </div>
                )}
              </div>
            </div>

            {/* Active Tasks Panel */}
            <ActiveTasksPanel />
          </div>

          {/* Main Content Area */}
          <div className="col-span-12 lg:col-span-9">
            {/* Hierarchical Tab Navigation */}
            <div className="panel mb-4 p-2 relative animate-fade-in-up">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide relative">
                {mainTabConfig.map((tab) => {
                  const isActive = activeMainTab === tab.id
                  const colorMap = {
                    amber: { from: 'from-amber-500', to: 'to-amber-600', text: 'text-gray-900', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]' },
                    blue: { from: 'from-blue-500', to: 'to-blue-600', text: 'text-white', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.3)]' },
                    emerald: { from: 'from-emerald-500', to: 'to-emerald-600', text: 'text-white', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]' },
                    yellow: { from: 'from-yellow-500', to: 'to-yellow-600', text: 'text-gray-900', glow: 'shadow-[0_0_20px_rgba(234,179,8,0.3)]' },
                    purple: { from: 'from-purple-500', to: 'to-purple-600', text: 'text-white', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.3)]' },
                  }
                  const colors = colorMap[tab.color as keyof typeof colorMap]

                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleMainTabChange(tab.id)}
                      className={`flex-1 min-w-[110px] py-3 px-4 rounded-lg font-semibold transition-all duration-300 transform relative overflow-hidden group ${
                        isActive
                          ? `bg-gradient-to-b ${colors.from} ${colors.to} ${colors.text} shadow-lg ${colors.glow} scale-105`
                          : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-white hover:scale-102'
                      }`}
                    >
                      {/* Animated background shimmer */}
                      <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-700 ${isActive ? 'group-hover:translate-x-full' : ''}`} />

                      <div className="flex flex-col items-center gap-1 relative z-10">
                        <span className={`text-xl transition-transform duration-300 ${isActive ? 'animate-bounce-in' : 'group-hover:scale-110'}`}>
                          {tab.icon}
                        </span>
                        <span className="text-xs sm:text-sm whitespace-nowrap">{tab.label}</span>
                        {tab.hasSubTabs && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse opacity-60" title="Has sub-tabs" />
                        )}
                      </div>

                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse-slow" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Sub-Tab Navigation (conditional) */}
            {activeMainTab === 'adventure' && (
              <div className="panel mb-6 p-2 animate-slide-down">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {adventureSubTabs.map((subTab) => (
                    <button
                      key={subTab.id}
                      onClick={() => setAdventureSubTab(subTab.id)}
                      className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        adventureSubTab === subTab.id
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-gray-800/30 text-gray-400 hover:bg-gray-700/50 hover:text-white border border-transparent'
                      }`}
                    >
                      <span>{subTab.icon}</span>
                      <span>{subTab.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}


            {activeMainTab === 'market' && (
              <div className="panel mb-6 p-2 animate-slide-down">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {marketSubTabs.map((subTab) => (
                    <button
                      key={subTab.id}
                      onClick={() => setMarketSubTab(subTab.id)}
                      className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        marketSubTab === subTab.id
                          ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                          : 'bg-gray-800/30 text-gray-400 hover:bg-gray-700/50 hover:text-white border border-transparent'
                      }`}
                    >
                      <span>{subTab.icon}</span>
                      <span>{subTab.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Content Panel with smooth transitions */}
            <div
              className={`panel p-6 min-h-[700px] transition-all duration-300 ${
                isTabTransitioning ? 'opacity-0 scale-98' : 'opacity-100 scale-100 animate-fade-in-up'
              }`}
            >
              {/* Adventure Tab Content */}
              {activeMainTab === 'adventure' && (
                <>
                  {adventureSubTab === 'exploration' && <Adventure />}
                  {adventureSubTab === 'combat' && <Combat />}
                  {adventureSubTab === 'quests' && <Quests />}
                  {adventureSubTab === 'discoveries' && <DiscoveriesPanel />}
                  {adventureSubTab === 'gathering_contracts' && <GatheringContracts />}
                </>
              )}

              {/* Character Tab Content */}
              {activeMainTab === 'character' && <CharacterTab />}

              {/* Inventory Tab Content */}
              {activeMainTab === 'inventory' && <Inventory />}

              {/* Crafting Tab Content */}
              {activeMainTab === 'crafting' && <CraftingPanel />}

              {/* Market Tab Content */}
              {activeMainTab === 'market' && <Merchant />}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Settings Modal */}
      {showQuickActionsSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in-up" onClick={() => setShowQuickActionsSettings(false)}>
          <div className="panel p-6 max-w-2xl w-full mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">⚙️</span>
                Customize Quick Actions
              </h2>
              <button
                onClick={() => setShowQuickActionsSettings(false)}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ✕
              </button>
            </div>

            <p className="text-gray-400 mb-6">
              Choose up to 4 shortcuts that will appear in your Quick Actions panel for fast navigation.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Available Shortcuts</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { tab: 'adventure' as MainTab, subTab: 'exploration', label: 'Exploration', icon: '🗺️' },
                    { tab: 'adventure' as MainTab, subTab: 'combat', label: 'Combat', icon: '⚔️' },
                    { tab: 'adventure' as MainTab, subTab: 'quests', label: 'Quests', icon: '📜' },
                    { tab: 'adventure' as MainTab, subTab: 'gathering_contracts', label: 'Gathering Contracts', icon: '📋' },
                    { tab: 'character' as MainTab, subTab: 'overview', label: 'Character', icon: '👤' },
                    { tab: 'inventory' as MainTab, label: 'Inventory', icon: '🎒' },
                    { tab: 'crafting' as MainTab, label: 'Crafting', icon: '🔨' },
                    { tab: 'market' as MainTab, subTab: 'merchant', label: 'Merchant', icon: '🏪' },
                  ].map((action, index) => {
                    const isSelected = customQuickActions.some(a => a.tab === action.tab && a.subTab === action.subTab)
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          if (isSelected) {
                            setCustomQuickActions(customQuickActions.filter(a => !(a.tab === action.tab && a.subTab === action.subTab)))
                          } else if (customQuickActions.length < 4) {
                            setCustomQuickActions([...customQuickActions, action])
                          }
                        }}
                        disabled={!isSelected && customQuickActions.length >= 4}
                        className={`p-3 rounded-lg border-2 transition-all duration-300 flex items-center gap-3 ${
                          isSelected
                            ? 'bg-purple-500/20 border-purple-500/50 text-white'
                            : customQuickActions.length >= 4
                              ? 'bg-gray-800/30 border-gray-700/30 text-gray-600 cursor-not-allowed'
                              : 'bg-gray-800/30 border-gray-700/50 text-gray-300 hover:bg-gray-700/40 hover:border-gray-600/60'
                        }`}
                      >
                        <span className="text-2xl">{action.icon}</span>
                        <span className="text-sm font-medium">{action.label}</span>
                        {isSelected && <span className="ml-auto text-green-400">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  <strong>Tip:</strong> Quick Actions provide instant access to your most-used features without navigating through tabs.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {customQuickActions.length} / 4 shortcuts selected
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    localStorage.setItem('quickActions', JSON.stringify(customQuickActions))
                    setShowQuickActionsSettings(false)
                  }}
                  className="btn btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        {/* Quick Menu FAB */}
        <button
          onClick={() => setShowQuickMenu(!showQuickMenu)}
          className="fab fab-primary group relative"
          title="Quick Menu"
        >
          <span className="text-2xl transition-transform duration-300 group-hover:rotate-90">
            {showQuickMenu ? '✕' : '☰'}
          </span>
          {showQuickMenu && (
            <div className="absolute bottom-full right-0 mb-3 flex flex-col gap-2 animate-slide-in-right">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleMainTabChange('inventory')
                  setShowQuickMenu(false)
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg shadow-lg hover:from-purple-400 hover:to-purple-500 transition-all duration-300 hover:scale-105 whitespace-nowrap text-sm font-semibold flex items-center gap-2"
              >
                <span>🎒</span>
                <span>Inventory</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleMainTabChange('character')
                  setShowQuickMenu(false)
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg hover:from-blue-400 hover:to-blue-500 transition-all duration-300 hover:scale-105 whitespace-nowrap text-sm font-semibold flex items-center gap-2"
              >
                <span>👤</span>
                <span>Character</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleMainTabChange('adventure')
                  setAdventureSubTab('combat')
                  setShowQuickMenu(false)
                }}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow-lg hover:from-red-400 hover:to-red-500 transition-all duration-300 hover:scale-105 whitespace-nowrap text-sm font-semibold flex items-center gap-2"
              >
                <span>⚔️</span>
                <span>Combat</span>
              </button>
            </div>
          )}
        </button>
      </div>

      {/* Toast Notifications */}
      <ToastNotification />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onCharacterDeleted={() => {
          // Character was deleted, redirect to character creation
          window.location.href = '/'
        }}
      />
    </div>
  )
}
