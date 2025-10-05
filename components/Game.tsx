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
  const [isTabTransitioning, setIsTabTransitioning] = useState(false)
  const [showQuickMenu, setShowQuickMenu] = useState(false)

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

  const handleTabChange = (tab: typeof activeTab) => {
    if (tab === activeTab) return
    setIsTabTransitioning(true)
    setTimeout(() => {
      setActiveTab(tab)
      setIsTabTransitioning(false)
    }, 150)
  }

  if (!character) return null

  const experienceForNextLevel = character.level * 100
  const experienceProgress = (character.experience / experienceForNextLevel) * 100
  const healthPercent = (character.health / character.max_health) * 100
  const manaPercent = (character.mana / character.max_mana) * 100

  const tabConfig = [
    { id: 'adventure', label: 'Adventure', icon: '🗺️', color: 'amber' },
    { id: 'character', label: 'Character', icon: '👤', color: 'blue' },
    { id: 'combat', label: 'Combat', icon: '⚔️', color: 'red' },
    { id: 'crafting', label: 'Crafting', icon: '🔨', color: 'amber' },
    { id: 'quests', label: 'Quests', icon: '📜', color: 'cyan' },
    { id: 'merchant', label: 'Merchant', icon: '🏪', color: 'yellow' },
    { id: 'contracts', label: 'Contracts', icon: '📋', color: 'emerald' },
    { id: 'inventory', label: 'Inventory', icon: '🎒', color: 'purple' },
  ] as const

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
                <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center text-6xl font-bold text-white shadow-xl transform transition-all duration-300 group-hover:scale-105 group-hover:rotate-3">
                  {character.name.charAt(0).toUpperCase()}
                </div>
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

            {/* Quick Actions */}
            <div className="panel p-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="text-purple-400">🎯</span>
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleTabChange('merchant')}
                  className="w-full btn btn-secondary text-sm py-2.5 justify-start group hover:bg-yellow-900/20 hover:border-yellow-500/30 transition-all duration-300"
                >
                  <span className="mr-2 transition-transform duration-300 group-hover:scale-125">🏪</span>
                  <span>Merchant</span>
                  <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </button>
                <button
                  onClick={() => handleTabChange('contracts')}
                  className="w-full btn btn-secondary text-sm py-2.5 justify-start group hover:bg-emerald-900/20 hover:border-emerald-500/30 transition-all duration-300"
                >
                  <span className="mr-2 transition-transform duration-300 group-hover:scale-125">📋</span>
                  <span>Contracts</span>
                  <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </button>
                <button
                  onClick={() => handleTabChange('quests')}
                  className="w-full btn btn-secondary text-sm py-2.5 justify-start group hover:bg-cyan-900/20 hover:border-cyan-500/30 transition-all duration-300"
                >
                  <span className="mr-2 transition-transform duration-300 group-hover:scale-125">📜</span>
                  <span>Quests</span>
                  <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </button>
                <button className="w-full btn btn-secondary text-sm py-2.5 justify-start group cursor-not-allowed opacity-60">
                  <span className="mr-2">🏆</span>
                  <span>Achievements</span>
                  <span className="ml-auto badge badge-common text-xs animate-pulse">Soon</span>
                </button>
              </div>
            </div>

            {/* Active Tasks Panel */}
            <ActiveTasksPanel />
          </div>

          {/* Main Content Area */}
          <div className="col-span-12 lg:col-span-9">
            {/* Modern Animated Tab Navigation */}
            <div className="panel mb-6 p-2 relative animate-fade-in-up">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide relative">
                {tabConfig.map((tab) => {
                  const isActive = activeTab === tab.id
                  const colorMap = {
                    amber: { from: 'from-amber-500', to: 'to-amber-600', text: 'text-gray-900', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]' },
                    blue: { from: 'from-blue-500', to: 'to-blue-600', text: 'text-white', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.3)]' },
                    red: { from: 'from-red-500', to: 'to-red-600', text: 'text-white', glow: 'shadow-[0_0_20px_rgba(220,38,38,0.3)]' },
                    cyan: { from: 'from-cyan-500', to: 'to-cyan-600', text: 'text-white', glow: 'shadow-[0_0_20px_rgba(6,182,212,0.3)]' },
                    yellow: { from: 'from-yellow-500', to: 'to-yellow-600', text: 'text-gray-900', glow: 'shadow-[0_0_20px_rgba(234,179,8,0.3)]' },
                    emerald: { from: 'from-emerald-500', to: 'to-emerald-600', text: 'text-white', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]' },
                    purple: { from: 'from-purple-500', to: 'to-purple-600', text: 'text-white', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.3)]' },
                  }
                  const colors = colorMap[tab.color as keyof typeof colorMap]

                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id as typeof activeTab)}
                      className={`flex-1 min-w-[100px] py-3 px-3 rounded-lg font-semibold transition-all duration-300 transform relative overflow-hidden group ${
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

            {/* Content Panel with smooth transitions */}
            <div
              className={`panel p-6 min-h-[700px] transition-all duration-300 ${
                isTabTransitioning ? 'opacity-0 scale-98' : 'opacity-100 scale-100 animate-fade-in-up'
              }`}
            >
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

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
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
                  handleTabChange('inventory')
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
                  handleTabChange('character')
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
                  handleTabChange('combat')
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
    </div>
  )
}
