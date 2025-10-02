'use client'

import { useEffect, useState } from 'react'
import { useGameStore } from '@/lib/store'
import { signOut } from '@/app/actions'
import Inventory from './Inventory'
import Combat from './Combat'
import GatheringSimple from './GatheringSimple'
import CharacterTab from './CharacterTab'
import Adventure from './Adventure'
import { User } from '@supabase/supabase-js'
import { Profile, Character } from '@/lib/supabase'

interface GameProps {
  initialUser: User
  initialProfile: Profile | null
  initialCharacter: Character
}

export default function Game({ initialUser, initialProfile, initialCharacter }: GameProps) {
  const { user, profile, character, setUser, setProfile, setCharacter, reset } = useGameStore()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'adventure' | 'character' | 'combat' | 'gathering' | 'inventory'>('adventure')

  useEffect(() => {
    if (!user) {
      setUser(initialUser)
      setProfile(initialProfile)
      setCharacter(initialCharacter)
    }
  }, [initialUser, initialProfile, initialCharacter, user, setUser, setProfile, setCharacter])

  async function handleSignOut() {
    setIsLoading(true)
    reset()
    await signOut()
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
                    <span className="text-sm text-gray-400">Max HP</span>
                  </div>
                  <span className="text-lg font-bold text-green-400">{character.max_health}</span>
                </div>

                <div className="stat-box">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💧</span>
                    <span className="text-sm text-gray-400">Max MP</span>
                  </div>
                  <span className="text-lg font-bold text-cyan-400">{character.max_mana}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="panel p-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full btn btn-secondary text-sm py-2.5 justify-start">
                  <span className="mr-2">🏪</span>
                  <span>Shop</span>
                  <span className="ml-auto badge badge-common text-xs">Soon</span>
                </button>
                <button className="w-full btn btn-secondary text-sm py-2.5 justify-start">
                  <span className="mr-2">📜</span>
                  <span>Quests</span>
                  <span className="ml-auto badge badge-common text-xs">Soon</span>
                </button>
                <button className="w-full btn btn-secondary text-sm py-2.5 justify-start">
                  <span className="mr-2">🏆</span>
                  <span>Achievements</span>
                  <span className="ml-auto badge badge-common text-xs">Soon</span>
                </button>
              </div>
            </div>
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
                  onClick={() => setActiveTab('gathering')}
                  className={`flex-1 min-w-[120px] py-3 px-4 rounded-lg font-semibold transition-all ${
                    activeTab === 'gathering'
                      ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-lg'
                      : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl">🌾</span>
                    <span className="text-sm">Gathering</span>
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
              ) : activeTab === 'gathering' ? (
                <GatheringSimple />
              ) : (
                <Inventory />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
