'use client'

import { useEffect, useState } from 'react'
import { useGameStore } from '@/lib/store'
import { signOut } from '@/app/actions'
import { addExperience, addGold } from '@/lib/character'
import Inventory from './Inventory'
import Combat from './Combat'
import GatheringSimple from './GatheringSimple'
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
  const [activeTab, setActiveTab] = useState<'adventure' | 'combat' | 'gathering' | 'inventory'>('adventure')

  // Initialize store with server data
  useEffect(() => {
    if (!user) {
      setUser(initialUser)
      setProfile(initialProfile)
      setCharacter(initialCharacter)
    }
  }, [initialUser, initialProfile, initialCharacter, user, setUser, setProfile, setCharacter])

  // Auto-save and idle progress
  useEffect(() => {
    if (!character) return

    const interval = setInterval(async () => {
      // Add idle experience and gold every 5 seconds
      const { data } = await addExperience(character.id, 5)
      if (data) {
        setCharacter(data)
      }

      await addGold(character.id, 10)
    }, 5000)

    return () => clearInterval(interval)
  }, [character])

  async function handleSignOut() {
    setIsLoading(true)
    reset()
    await signOut()
  }

  if (!character) return null

  const experienceForNextLevel = character.level * 100
  const experienceProgress = (character.experience / experienceForNextLevel) * 100

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-bg-panel rounded-lg p-6 mb-6 backdrop-blur-xl border border-white/10">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-primary">{character.name}</h1>
              <p className="text-gray-400">
                {profile?.username} • Level {character.level}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition disabled:opacity-50"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Character Stats */}
          <div className="lg:col-span-1">
            <div className="bg-bg-panel rounded-lg p-6 backdrop-blur-xl border border-white/10">
              <h2 className="text-xl font-bold text-primary mb-4">Character Stats</h2>

              {/* Health Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">❤️ Health</span>
                  <span className="text-green-400">
                    {character.health} / {character.max_health}
                  </span>
                </div>
                <div className="w-full bg-bg-dark rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-green-500 h-full transition-all duration-300"
                    style={{ width: `${(character.health / character.max_health) * 100}%` }}
                  />
                </div>
              </div>

              {/* Mana Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">💧 Mana</span>
                  <span className="text-blue-400">
                    {character.mana} / {character.max_mana}
                  </span>
                </div>
                <div className="w-full bg-bg-dark rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-300"
                    style={{ width: `${(character.mana / character.max_mana) * 100}%` }}
                  />
                </div>
              </div>

              {/* Experience Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">⭐ Experience</span>
                  <span className="text-primary">
                    {character.experience} / {experienceForNextLevel}
                  </span>
                </div>
                <div className="w-full bg-bg-dark rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${experienceProgress}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-bg-card rounded-lg">
                  <span className="text-gray-400">⚔️ Attack</span>
                  <span className="text-red-400 font-bold">{character.attack}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-bg-card rounded-lg">
                  <span className="text-gray-400">🛡️ Defense</span>
                  <span className="text-yellow-400 font-bold">{character.defense}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-bg-card rounded-lg">
                  <span className="text-gray-400">💰 Gold</span>
                  <span className="text-primary font-bold">{character.gold.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-bg-card rounded-lg">
                  <span className="text-gray-400">💎 Gems</span>
                  <span className="text-purple-400 font-bold">{character.gems}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <div className="bg-bg-panel rounded-lg p-6 backdrop-blur-xl border border-white/10 min-h-[600px]">
              {/* Tabs */}
              <div className="flex gap-4 mb-6 border-b border-white/10 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('adventure')}
                  className={`pb-3 px-4 font-medium transition whitespace-nowrap ${
                    activeTab === 'adventure'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🗺️ Adventure
                </button>
                <button
                  onClick={() => setActiveTab('combat')}
                  className={`pb-3 px-4 font-medium transition whitespace-nowrap ${
                    activeTab === 'combat'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  ⚔️ Combat
                </button>
                <button
                  onClick={() => setActiveTab('gathering')}
                  className={`pb-3 px-4 font-medium transition whitespace-nowrap ${
                    activeTab === 'gathering'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🌾 Gathering
                </button>
                <button
                  onClick={() => setActiveTab('inventory')}
                  className={`pb-3 px-4 font-medium transition whitespace-nowrap ${
                    activeTab === 'inventory'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  🎒 Inventory
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'adventure' ? (
                <div className="text-center py-20 text-gray-400">
                  <p className="text-lg mb-2">🎮 Game Features Coming Soon!</p>
                  <p className="text-sm">
                    Your character is earning idle experience and gold.
                    <br />
                    Watch your stats grow automatically!
                  </p>
                </div>
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
