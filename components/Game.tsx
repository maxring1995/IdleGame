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
import { User } from '@supabase/supabase-js'
import { Profile, Character } from '@/lib/supabase'
import { getActiveBuffs, getBuffTimeRemaining, formatTimeRemaining, type ActiveBuff } from '@/lib/consumables'

interface GameProps {
  initialUser: User
  initialProfile: Profile | null
  initialCharacter: Character
}

export default function Game({ initialUser, initialProfile, initialCharacter }: GameProps) {
  const { user, profile, character, setUser, setProfile, setCharacter, reset } = useGameStore()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'adventure' | 'character' | 'combat' | 'crafting' | 'quests' | 'merchant' | 'inventory' | 'contracts'>('adventure')
  const [activeBuffs, setActiveBuffs] = useState<ActiveBuff[]>([])

  useEffect(() => {
    if (!user) {
      setUser(initialUser)
      setProfile(initialProfile)
      setCharacter(initialCharacter)
    }
  }, [initialUser, initialProfile, initialCharacter, user, setUser, setProfile, setCharacter])

  // Poll for active buffs every 2 seconds
  useEffect(() => {
    if (!character?.id) return

    async function loadBuffs() {
      if (!character?.id) return
      const buffs = await getActiveBuffs(character.id)
      setActiveBuffs(buffs)
    }

    loadBuffs()
    const interval = setInterval(loadBuffs, 2000)

    return () => clearInterval(interval)
  }, [character?.id])

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

  if (!character) return null

  const experienceForNextLevel = character.level * 100
  const experienceProgress = (character.experience / experienceForNextLevel) * 100
  const healthPercent = (character.health / character.max_health) * 100
  const manaPercent = (character.mana / character.max_mana) * 100

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
              <div className="flex items-center gap-2 min-w-[180px]">
                <span className="text-xs font-semibold text-red-400">HP</span>
                <div className="flex-1 progress-bar h-4">
                  <div
                    className="progress-fill bg-gradient-to-r from-red-500 to-red-600"
                    style={{ width: `${healthPercent}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-gray-300 min-w-[60px] text-right">
                  {character.health}/{character.max_health}
                </span>
              </div>

              {/* MP */}
              <div className="flex items-center gap-2 min-w-[180px]">
                <span className="text-xs font-semibold text-blue-400">MP</span>
                <div className="flex-1 progress-bar h-4">
                  <div
                    className="progress-fill bg-gradient-to-r from-blue-500 to-blue-600"
                    style={{ width: `${manaPercent}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-gray-300 min-w-[60px] text-right">
                  {character.mana}/{character.max_mana}
                </span>
              </div>

              {/* XP */}
              <div className="flex items-center gap-2 min-w-[180px]">
                <span className="text-xs font-semibold text-amber-400">XP</span>
                <div className="flex-1 progress-bar h-4">
                  <div
                    className="progress-fill bg-gradient-to-r from-amber-500 to-amber-600"
                    style={{ width: `${experienceProgress}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-gray-300 min-w-[70px] text-right">
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
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <span className="text-lg">💰</span>
                  <span className="text-sm font-bold text-amber-400">{character.gold.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <span className="text-lg">💎</span>
                  <span className="text-sm font-bold text-purple-400">{character.gems}</span>
                </div>
              </div>

              {/* Notification Bell */}
              <NotificationCenter />

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
            <div className="panel p-6 text-center">
              <div className="w-32 h-32 mx-auto mb-4 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center text-6xl font-bold text-white shadow-xl">
                {character.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-2xl font-bold text-white mb-1 text-shadow">{character.name}</h2>
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="badge badge-uncommon">Level {character.level}</span>
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
            <div className="panel p-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Combat Stats</h3>
              <div className="space-y-3">
                <div className="stat-box">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚔️</span>
                    <span className="text-sm text-gray-400">Attack</span>
                  </div>
                  <span className="text-lg font-bold text-red-400">{character.attack}</span>
                </div>

                <div className="stat-box">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🛡️</span>
                    <span className="text-sm text-gray-400">Defense</span>
                  </div>
                  <span className="text-lg font-bold text-blue-400">{character.defense}</span>
                </div>

                <div className="stat-box">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">❤️</span>
                    <span className="text-sm text-gray-400">Health</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${
                      character.health <= character.max_health * 0.25
                        ? 'text-red-400'
                        : character.health < character.max_health
                          ? 'text-yellow-400'
                          : 'text-green-400'
                    }`}>
                      {character.health}
                    </span>
                    <span className="text-sm text-gray-500">/ {character.max_health}</span>
                  </div>
                </div>

                <div className="stat-box">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💧</span>
                    <span className="text-sm text-gray-400">Mana</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${
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

            {/* Quick Actions */}
            <div className="panel p-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab('merchant')}
                  className="w-full btn btn-secondary text-sm py-2.5 justify-start"
                >
                  <span className="mr-2">🏪</span>
                  <span>Merchant</span>
                </button>
                <button
                  onClick={() => setActiveTab('contracts')}
                  className="w-full btn btn-secondary text-sm py-2.5 justify-start"
                >
                  <span className="mr-2">📋</span>
                  <span>Contracts</span>
                </button>
                <button
                  onClick={() => setActiveTab('quests')}
                  className="w-full btn btn-secondary text-sm py-2.5 justify-start"
                >
                  <span className="mr-2">📜</span>
                  <span>Quests</span>
                </button>
                <button className="w-full btn btn-secondary text-sm py-2.5 justify-start">
                  <span className="mr-2">🏆</span>
                  <span>Achievements</span>
                  <span className="ml-auto badge badge-common text-xs">Soon</span>
                </button>
              </div>
            </div>

            {/* Active Tasks Panel */}
            <ActiveTasksPanel />
          </div>

          {/* Main Content Area */}
          <div className="col-span-12 lg:col-span-9">
            {/* Tab Navigation */}
            <div className="panel mb-6 p-2">
              <div className="flex gap-2 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('adventure')}
                  className={`flex-1 min-w-[120px] py-3 px-4 rounded-lg font-semibold transition-all ${
                    activeTab === 'adventure'
                      ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-gray-900 shadow-lg'
                      : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl">🗺️</span>
                    <span className="text-sm">Adventure</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('character')}
                  className={`flex-1 min-w-[120px] py-3 px-4 rounded-lg font-semibold transition-all ${
                    activeTab === 'character'
                      ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl">👤</span>
                    <span className="text-sm">Character</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('combat')}
                  className={`flex-1 min-w-[120px] py-3 px-4 rounded-lg font-semibold transition-all ${
                    activeTab === 'combat'
                      ? 'bg-gradient-to-b from-red-500 to-red-600 text-white shadow-lg'
                      : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl">⚔️</span>
                    <span className="text-sm">Combat</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('crafting')}
                  className={`flex-1 min-w-[120px] py-3 px-4 rounded-lg font-semibold transition-all ${
                    activeTab === 'crafting'
                      ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-lg'
                      : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl">🔨</span>
                    <span className="text-sm">Crafting</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('quests')}
                  className={`flex-1 min-w-[120px] py-3 px-4 rounded-lg font-semibold transition-all ${
                    activeTab === 'quests'
                      ? 'bg-gradient-to-b from-cyan-500 to-cyan-600 text-white shadow-lg'
                      : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl">📜</span>
                    <span className="text-sm">Quests</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('merchant')}
                  className={`flex-1 min-w-[120px] py-3 px-4 rounded-lg font-semibold transition-all ${
                    activeTab === 'merchant'
                      ? 'bg-gradient-to-b from-yellow-500 to-yellow-600 text-gray-900 shadow-lg'
                      : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl">🏪</span>
                    <span className="text-sm">Merchant</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('contracts')}
                  className={`flex-1 min-w-[120px] py-3 px-4 rounded-lg font-semibold transition-all ${
                    activeTab === 'contracts'
                      ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-lg'
                      : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl">📋</span>
                    <span className="text-sm">Contracts</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('inventory')}
                  className={`flex-1 min-w-[120px] py-3 px-4 rounded-lg font-semibold transition-all ${
                    activeTab === 'inventory'
                      ? 'bg-gradient-to-b from-purple-500 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl">🎒</span>
                    <span className="text-sm">Inventory</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Content Panel */}
            <div className="panel p-6 min-h-[700px]">
              {activeTab === 'adventure' ? (
                <Adventure />
              ) : activeTab === 'character' ? (
                <CharacterTab />
              ) : activeTab === 'combat' ? (
                <Combat />
              ) : activeTab === 'crafting' ? (
                <CraftingPanel />
              ) : activeTab === 'quests' ? (
                <Quests />
              ) : activeTab === 'merchant' ? (
                <Merchant />
              ) : activeTab === 'contracts' ? (
                <GatheringContracts />
              ) : (
                <Inventory />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastNotification />
    </div>
  )
}
