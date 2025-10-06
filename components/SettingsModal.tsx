'use client'

import { useState } from 'react'
import { useGameStore } from '@/lib/store'
import { deleteCharacter } from '@/lib/character'
import { deleteAccount } from '@/app/actions'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onCharacterDeleted: () => void
}

export default function SettingsModal({ isOpen, onClose, onCharacterDeleted }: SettingsModalProps) {
  const { character, reset } = useGameStore()
  const [confirmingCharacterDelete, setConfirmingCharacterDelete] = useState(false)
  const [confirmingAccountDelete, setConfirmingAccountDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!isOpen) return null

  async function handleDeleteCharacter() {
    if (!character) return

    setIsDeleting(true)
    try {
      const result = await deleteCharacter(character.id)

      if (result.success) {
        // Clear store and go back to character creation
        reset()
        onCharacterDeleted()
        onClose()
      } else {
        alert('Failed to delete character: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting character:', error)
      alert('Failed to delete character')
    } finally {
      setIsDeleting(false)
      setConfirmingCharacterDelete(false)
    }
  }

  async function handleDeleteAccount() {
    setIsDeleting(true)
    try {
      const result = await deleteAccount()

      if (result.success) {
        // Clear store and redirect to login
        reset()
        window.location.href = '/login'
      } else {
        alert('Failed to delete account: ' + result.error)
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Failed to delete account')
    } finally {
      setIsDeleting(false)
      setConfirmingAccountDelete(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="panel max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>⚙️</span>
            Settings
          </h2>
          <button
            onClick={onClose}
            data-testid="close-settings-modal"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        {/* Settings Content */}
        <div className="space-y-4">
          {/* Delete Character Section */}
          <div className="card p-4 border-l-4 border-yellow-500">
            <h3 className="text-lg font-semibold text-yellow-400 mb-2 flex items-center gap-2">
              <span>⚠️</span>
              Delete Character
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              This will permanently delete your character "{character?.name}" and all progress.
              Your account will remain active and you can create a new character.
            </p>

            {!confirmingCharacterDelete ? (
              <button
                onClick={() => setConfirmingCharacterDelete(true)}
                disabled={isDeleting}
                data-testid="delete-character-button"
                className="btn btn-secondary w-full"
              >
                Delete Character
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-yellow-300 text-sm font-semibold">
                  Are you sure? This cannot be undone!
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteCharacter}
                    disabled={isDeleting}
                    data-testid="confirm-delete-character"
                    className="btn btn-danger flex-1"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete Character'}
                  </button>
                  <button
                    onClick={() => setConfirmingCharacterDelete(false)}
                    disabled={isDeleting}
                    data-testid="cancel-delete-character"
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Delete Account Section */}
          <div className="card p-4 border-l-4 border-red-500">
            <h3 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
              <span>🚨</span>
              Delete Account
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              This will permanently delete your entire account, including all characters,
              progress, and data. This action cannot be undone!
            </p>

            {!confirmingAccountDelete ? (
              <button
                onClick={() => setConfirmingAccountDelete(true)}
                disabled={isDeleting}
                data-testid="delete-account-button"
                className="btn btn-danger w-full"
              >
                Delete Account
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-red-300 text-sm font-semibold">
                  ⚠️ FINAL WARNING: This will permanently delete everything!
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    data-testid="confirm-delete-account"
                    className="btn btn-danger flex-1 animate-pulse"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete Everything'}
                  </button>
                  <button
                    onClick={() => setConfirmingAccountDelete(false)}
                    disabled={isDeleting}
                    data-testid="cancel-delete-account"
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6">
          <button
            onClick={onClose}
            className="btn btn-secondary w-full"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  )
}
