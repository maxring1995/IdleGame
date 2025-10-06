'use client'

import { useState } from 'react'
import { createCharacterAction } from '@/app/actions'

interface CharacterCreationProps {
  userId: string
}

export default function CharacterCreation({ userId }: CharacterCreationProps) {
  const [characterName, setCharacterName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Validate character name
      if (characterName.length < 2 || characterName.length > 30) {
        throw new Error('Character name must be between 2 and 30 characters')
      }

      if (!/^[a-zA-Z\s]+$/.test(characterName)) {
        throw new Error('Character name can only contain letters and spaces')
      }

      // Use server action - this will redirect on success
      const result = await createCharacterAction(userId, characterName)

      // If we get here, there was an error (redirect would have happened on success)
      if (result?.error) {
        throw new Error(result.error)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create character')
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-bg-panel rounded-lg p-8 shadow-lg backdrop-blur-xl border border-white/10">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-primary mb-2">Create Your Hero</h2>
        <p className="text-gray-400">Choose a name for your character</p>
      </div>

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

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="bg-bg-card rounded-lg p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-primary mb-4">Starting Stats</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Level:</span>
              <span className="float-right text-white font-medium">1</span>
            </div>
            <div>
              <span className="text-gray-400">Health:</span>
              <span className="float-right text-green-400 font-medium">100</span>
            </div>
            <div>
              <span className="text-gray-400">Mana:</span>
              <span className="float-right text-blue-400 font-medium">50</span>
            </div>
            <div>
              <span className="text-gray-400">Attack:</span>
              <span className="float-right text-red-400 font-medium">10</span>
            </div>
            <div>
              <span className="text-gray-400">Defense:</span>
              <span className="float-right text-yellow-400 font-medium">5</span>
            </div>
            <div>
              <span className="text-gray-400">Gold:</span>
              <span className="float-right text-primary font-medium">100</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          data-testid="create-character-button"
          className="w-full py-3 px-4 bg-primary text-bg-dark font-semibold rounded-lg hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating Character...' : 'Begin Adventure'}
        </button>
      </form>
    </div>
  )
}
