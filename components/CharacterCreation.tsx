'use client'

import { useState, useEffect } from 'react'
import { createCharacterAction } from '@/app/actions'
import { getRaces, getClasses, getAppearancePresets } from '@/lib/classSystem'
import type { Race, Class, AppearancePreset } from '@/lib/supabase'

interface CharacterCreationProps {
  userId: string
}

type Step = 'race' | 'gender' | 'appearance' | 'class' | 'name'

export default function CharacterCreation({ userId }: CharacterCreationProps) {
  const [step, setStep] = useState<Step>('race')
  const [characterName, setCharacterName] = useState('')
  const [selectedRace, setSelectedRace] = useState<Race | null>(null)
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null)
  const [selectedAppearance, setSelectedAppearance] = useState<AppearancePreset | null>(null)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Data loading
  const [races, setRaces] = useState<Race[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [appearancePresets, setAppearancePresets] = useState<AppearancePreset[]>([])

  // Load races and classes on mount
  useEffect(() => {
    async function loadData() {
      const { data: racesData } = await getRaces()
      const { data: classesData } = await getClasses()
      if (racesData) setRaces(racesData)
      if (classesData) setClasses(classesData)
    }
    loadData()
  }, [])

  // Load appearance presets when race and gender are selected
  useEffect(() => {
    async function loadPresets() {
      if (selectedRace && selectedGender) {
        const { data } = await getAppearancePresets(selectedRace.id, selectedGender)
        if (data) setAppearancePresets(data)
      }
    }
    loadPresets()
  }, [selectedRace, selectedGender])

  // Calculate stats with bonuses
  function calculateStats() {
    let health = 100
    let mana = 50
    let attack = 10
    let defense = 5

    if (selectedRace) {
      health += selectedRace.health_bonus
      mana += selectedRace.mana_bonus
      attack += selectedRace.attack_bonus
      defense += selectedRace.defense_bonus
    }

    if (selectedClass) {
      health = Math.floor(health * selectedClass.health_modifier)
      mana = Math.floor(mana * selectedClass.mana_modifier)
      attack = Math.floor(attack * selectedClass.attack_modifier)
      defense = Math.floor(defense * selectedClass.defense_modifier)
    }

    return { health, mana, attack, defense }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Validate all selections
      if (!selectedRace || !selectedGender || !selectedAppearance || !selectedClass) {
        throw new Error('Please complete all character creation steps')
      }

      // Validate character name
      if (characterName.length < 2 || characterName.length > 30) {
        throw new Error('Character name must be between 2 and 30 characters')
      }

      if (!/^[a-zA-Z\s]+$/.test(characterName)) {
        throw new Error('Character name can only contain letters and spaces')
      }

      // Use server action - this will redirect on success
      const result = await createCharacterAction(
        userId,
        characterName,
        selectedRace.id,
        selectedGender,
        selectedAppearance.preset_data,
        selectedClass.id
      )

      // If we get here, there was an error (redirect would have happened on success)
      if (result?.error) {
        throw new Error(result.error)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create character')
      setIsLoading(false)
    }
  }

  const stats = calculateStats()

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-bg-panel rounded-lg p-8 shadow-lg backdrop-blur-xl border border-white/10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-primary mb-2">Create Your Hero</h2>
          <p className="text-gray-400">
            {step === 'race' && 'Choose your race'}
            {step === 'gender' && 'Choose your gender'}
            {step === 'appearance' && 'Customize your appearance'}
            {step === 'class' && 'Choose your class'}
            {step === 'name' && 'Name your character'}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {['race', 'gender', 'appearance', 'class', 'name'].map((s, i) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-colors ${
                step === s
                  ? 'bg-primary'
                  : ['race', 'gender', 'appearance', 'class', 'name'].indexOf(step) > i
                  ? 'bg-primary/50'
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* STEP 1: Race Selection */}
        {step === 'race' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {races.map((race) => (
                <button
                  key={race.id}
                  onClick={() => setSelectedRace(race)}
                  className={`card p-6 text-left transition-all hover:scale-105 ${
                    selectedRace?.id === race.id
                      ? 'ring-2 ring-primary bg-primary/10'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="text-4xl mb-3">{race.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{race.name}</h3>
                  <p className="text-sm text-gray-400 mb-4">{race.description}</p>
                  <div className="space-y-1 text-xs">
                    {race.health_bonus !== 0 && (
                      <div className="text-green-400">❤️ Health: +{race.health_bonus}</div>
                    )}
                    {race.mana_bonus !== 0 && (
                      <div className="text-blue-400">💧 Mana: +{race.mana_bonus}</div>
                    )}
                    {race.attack_bonus !== 0 && (
                      <div className="text-red-400">⚔️ Attack: +{race.attack_bonus}</div>
                    )}
                    {race.defense_bonus !== 0 && (
                      <div className="text-yellow-400">🛡️ Defense: +{race.defense_bonus}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setStep('gender')}
                disabled={!selectedRace}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Gender →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Gender Selection */}
        {step === 'gender' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
              <button
                onClick={() => setSelectedGender('male')}
                className={`card p-12 text-center transition-all hover:scale-105 ${
                  selectedGender === 'male'
                    ? 'ring-2 ring-primary bg-primary/10'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="text-6xl mb-4">♂️</div>
                <h3 className="text-2xl font-bold text-white">Male</h3>
              </button>
              <button
                onClick={() => setSelectedGender('female')}
                className={`card p-12 text-center transition-all hover:scale-105 ${
                  selectedGender === 'female'
                    ? 'ring-2 ring-primary bg-primary/10'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="text-6xl mb-4">♀️</div>
                <h3 className="text-2xl font-bold text-white">Female</h3>
              </button>
            </div>
            <div className="flex justify-between max-w-2xl mx-auto">
              <button onClick={() => setStep('race')} className="btn btn-secondary">
                ← Back
              </button>
              <button
                onClick={() => setStep('appearance')}
                disabled={!selectedGender}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Appearance →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Appearance Selection */}
        {step === 'appearance' && (
          <div className="space-y-6">
            {appearancePresets.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <div className="text-6xl mb-4">⏳</div>
                <p>Loading appearance options...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {appearancePresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedAppearance(preset)}
                    className={`card p-4 text-center transition-all hover:scale-105 ${
                      selectedAppearance?.id === preset.id
                        ? 'ring-2 ring-primary bg-primary/10'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="text-5xl mb-3">{preset.icon || '👤'}</div>
                    <h4 className="text-sm font-semibold text-white">{preset.name}</h4>
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-between">
              <button onClick={() => setStep('gender')} className="btn btn-secondary">
                ← Back
              </button>
              <button
                onClick={() => setStep('class')}
                disabled={!selectedAppearance}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Class →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Class Selection */}
        {step === 'class' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClass(cls)}
                  className={`card p-6 text-left transition-all hover:scale-105 ${
                    selectedClass?.id === cls.id
                      ? 'ring-2 ring-primary bg-primary/10'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="text-4xl mb-3">{cls.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{cls.name}</h3>
                  <p className="text-sm text-gray-400 mb-4">{cls.description}</p>
                  <div className="space-y-1 text-xs">
                    <div className="text-gray-400">Primary: {cls.primary_stat}</div>
                    <div className="text-gray-400">Armor: {cls.armor_type}</div>
                    <div className="text-blue-400">Resource: {cls.resource_type}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep('appearance')} className="btn btn-secondary">
                ← Back
              </button>
              <button
                onClick={() => setStep('name')}
                disabled={!selectedClass}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Name →
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Name and Review */}
        {step === 'name' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="characterName" className="block text-sm font-medium text-gray-300 mb-2">
                Character Name
              </label>
              <input
                id="characterName"
                name="characterName"
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="Enter character name"
                data-testid="character-name-input"
                className="w-full px-4 py-3 bg-bg-card border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition"
                required
                minLength={2}
                maxLength={30}
                pattern="[a-zA-Z\s]+"
                disabled={isLoading}
              />
              <p className="mt-2 text-xs text-gray-500">
                2-30 characters, letters and spaces only
              </p>
            </div>

            {/* Character Summary */}
            <div className="bg-bg-card rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-primary mb-4">Character Summary</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="text-gray-400 text-sm">Race:</span>
                  <p className="text-white font-medium">{selectedRace?.name}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Gender:</span>
                  <p className="text-white font-medium capitalize">{selectedGender}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Class:</span>
                  <p className="text-white font-medium">{selectedClass?.name}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Appearance:</span>
                  <p className="text-white font-medium">{selectedAppearance?.name}</p>
                </div>
              </div>

              <h4 className="text-sm font-semibold text-primary mb-3">Starting Stats</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Level:</span>
                  <span className="text-white font-medium">1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Health:</span>
                  <span className="text-green-400 font-medium">{stats.health}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Mana:</span>
                  <span className="text-blue-400 font-medium">{stats.mana}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Attack:</span>
                  <span className="text-red-400 font-medium">{stats.attack}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Defense:</span>
                  <span className="text-yellow-400 font-medium">{stats.defense}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Gold:</span>
                  <span className="text-primary font-medium">100</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep('class')}
                disabled={isLoading}
                className="btn btn-secondary disabled:opacity-50"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                data-testid="create-character-button"
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating Character...' : 'Begin Adventure'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
