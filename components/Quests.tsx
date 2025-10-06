'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import {
  getQuestDefinitions,
  getCharacterQuests,
  acceptQuest,
  completeQuest,
  abandonQuest,
  isQuestComplete,
  type QuestDefinition,
  type QuestProgress
} from '@/lib/quests'
import { useNotificationStore, notificationHelpers } from '@/lib/notificationStore'
import { getInventory } from '@/lib/inventory'
import QuestCompletionModal from './QuestCompletionModal'
import type { Item } from '@/lib/supabase'

interface CharacterQuest {
  id: string
  character_id: string
  quest_id: string
  status: 'active' | 'completed' | 'failed'
  progress: QuestProgress
  started_at: string
  completed_at?: string
  quest_definitions: QuestDefinition
}

interface SessionItem {
  inventoryId: string
  item: Item
  quantity: number
}

type QuestFilter = 'available' | 'active' | 'completed'

export default function Quests() {
  const { character } = useGameStore()
  const { addNotification } = useNotificationStore()
  const [filter, setFilter] = useState<QuestFilter>('available')
  const [availableQuests, setAvailableQuests] = useState<QuestDefinition[]>([])
  const [characterQuests, setCharacterQuests] = useState<CharacterQuest[]>([])
  const [selectedQuest, setSelectedQuest] = useState<QuestDefinition | CharacterQuest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [completedQuestData, setCompletedQuestData] = useState<{
    title: string
    icon: string
    gold: number
    xp: number
    items: SessionItem[]
  } | null>(null)

  useEffect(() => {
    if (!character) return
    loadQuests()
  }, [character])

  async function loadQuests() {
    if (!character) return
    setLoading(true)
    setError(null)

    try {
      // Load available quest definitions
      const { data: available, error: availError } = await getQuestDefinitions(character.level, character.id)
      if (availError) throw availError

      // Load character's quests
      const { data: characterQuestsData, error: charError } = await getCharacterQuests(character.id)
      if (charError) throw charError

      setAvailableQuests(available || [])
      setCharacterQuests(characterQuestsData || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAcceptQuest(questId: string) {
    if (!character || actionLoading) return
    setActionLoading(true)
    setError(null)

    try {
      const { error } = await acceptQuest(character.id, questId)
      if (error) throw error

      await loadQuests()
      // Stay on available quests tab after accepting
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCompleteQuest(questId: string) {
    if (!character || actionLoading) return
    setActionLoading(true)
    setError(null)

    try {
      // Get quest definition for title and icon
      const questDef = selectedQuest && 'quest_definitions' in selectedQuest
        ? selectedQuest.quest_definitions
        : selectedQuest as QuestDefinition

      const { data, error } = await completeQuest(character.id, questId)
      if (error) throw error

      // Prepare reward items with details
      const rewardItems: SessionItem[] = []
      if (data?.rewards?.items && Object.keys(data.rewards.items).length > 0) {
        // Get inventory to find newly added items
        const { data: inventory } = await getInventory(character.id)

        if (inventory) {
          // Get item details from Supabase
          const { createClient } = await import('@/utils/supabase/client')
          const supabase = createClient()

          const itemIds = Object.keys(data.rewards.items)
          const { data: itemDetails } = await supabase
            .from('items')
            .select('*')
            .in('id', itemIds)

          // Match inventory items with details
          if (itemDetails) {
            for (const itemDetail of itemDetails) {
              const invItem = inventory.find(inv => inv.item_id === itemDetail.id)
              if (invItem) {
                rewardItems.push({
                  inventoryId: invItem.id,
                  item: Array.isArray(invItem.item) ? invItem.item[0] : invItem.item,
                  quantity: data.rewards.items[itemDetail.id] as number
                })
              }
            }
          }
        }
      }

      // Set modal data
      setCompletedQuestData({
        title: questDef?.title || 'Unknown Quest',
        icon: questDef?.icon || '📜',
        gold: data?.rewards?.gold || 0,
        xp: data?.rewards?.xp || 0,
        items: rewardItems
      })

      // Add notification
      addNotification(
        notificationHelpers.questComplete(
          questDef?.title || 'Quest',
          {
            xp: data?.rewards?.xp || 0,
            gold: data?.rewards?.gold || 0,
            items: rewardItems.map(item => item.item.name)
          }
        )
      )

      // Show completion modal
      setShowCompletionModal(true)

      await loadQuests()
      setSelectedQuest(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  function handleModalClose() {
    setShowCompletionModal(false)
    setCompletedQuestData(null)
  }

  async function handleAbandonQuest(questId: string) {
    if (!character || actionLoading) return

    if (!confirm('Are you sure you want to abandon this quest?')) return

    setActionLoading(true)
    setError(null)

    try {
      const { error } = await abandonQuest(character.id, questId)
      if (error) throw error

      await loadQuests()
      setSelectedQuest(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Filter quests based on active tab
  const activeQuests = characterQuests.filter(q => q.status === 'active')
  const completedQuests = characterQuests.filter(q => q.status === 'completed')
  const acceptedQuestIds = characterQuests
    .filter(q => q.status === 'active' || q.status === 'completed')
    .map(q => q.quest_id)
  const filteredAvailable = availableQuests.filter(q => !acceptedQuestIds.includes(q.id))

  const displayQuests = filter === 'available' ? filteredAvailable :
                        filter === 'active' ? activeQuests : completedQuests

  if (!character) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">No character loaded</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="panel p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              📜 Quest Journal
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Complete quests to earn XP, gold, and rare items
            </p>
          </div>
          <button
            onClick={loadQuests}
            disabled={loading}
            className="btn btn-secondary"
          >
            {loading ? '↻' : '🔄'} Refresh
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 text-red-400 flex items-center gap-3 mb-4">
            <span className="text-2xl">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('available')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'available'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg'
                : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60'
            }`}
          >
            📋 Available ({filteredAvailable.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'active'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60'
            }`}
          >
            ⚡ Active ({activeQuests.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === 'completed'
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60'
            }`}
          >
            ✅ Completed ({completedQuests.length})
          </button>
        </div>
      </div>

      {/* Quest List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quest Cards */}
        <div className="lg:col-span-2 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
            </div>
          )}

          {!loading && displayQuests.length === 0 && (
            <div className="text-center py-32">
              <div className="inline-block p-8 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 mb-6">
                <span className="text-8xl">📜</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {filter === 'available' && 'No Quests Available'}
                {filter === 'active' && 'No Active Quests'}
                {filter === 'completed' && 'No Completed Quests'}
              </h3>
              <p className="text-gray-400">
                {filter === 'available' && 'Level up to unlock more quests!'}
                {filter === 'active' && 'Accept a quest to get started!'}
                {filter === 'completed' && 'Complete quests to fill your journal!'}
              </p>
            </div>
          )}

          {!loading && displayQuests.map((quest) => {
            const isCharQuest = 'progress' in quest
            const questDef = isCharQuest ? quest.quest_definitions : quest
            const progress = isCharQuest ? quest.progress : null
            const isComplete = progress ? isQuestComplete(progress) : false
            const isSelected = selectedQuest?.id === quest.id || (isCharQuest && selectedQuest?.id === quest.quest_id)

            return (
              <button
                key={isCharQuest ? quest.id : quest.id}
                onClick={() => setSelectedQuest(quest)}
                className={`w-full text-left card-hover p-4 transition-all ${
                  isSelected
                    ? 'ring-2 ring-amber-500 bg-gradient-to-br from-amber-500/10 to-amber-600/5'
                    : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{questDef.icon || '📜'}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-bold text-white">{questDef.title}</h3>
                      <span className="badge badge-common">Lv. {questDef.level_requirement}</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{questDef.objective}</p>

                    {/* Progress Bar (Active Quests) */}
                    {progress && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Progress</span>
                          <span className={isComplete ? 'text-green-400 font-bold' : 'text-gray-400'}>
                            {progress.current} / {progress.goal}
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className={`progress-fill ${
                              isComplete ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                            }`}
                            style={{ width: `${Math.min((progress.current / progress.goal) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Rewards */}
                    <div className="flex items-center gap-4 text-xs">
                      {questDef.xp_reward > 0 && (
                        <span className="text-blue-400">⭐ {questDef.xp_reward} XP</span>
                      )}
                      {questDef.gold_reward > 0 && (
                        <span className="text-yellow-400">💰 {questDef.gold_reward} Gold</span>
                      )}
                      {questDef.item_rewards && Object.keys(questDef.item_rewards).length > 0 && (
                        <span className="text-purple-400">🎁 {Object.keys(questDef.item_rewards).length} Item(s)</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Quest Details Panel */}
        <div className="lg:col-span-1">
          {selectedQuest ? (
            <div className="panel p-6 sticky top-24">
              {(() => {
                const isCharQuest = 'progress' in selectedQuest
                const questDef = isCharQuest ? selectedQuest.quest_definitions : selectedQuest
                const progress = isCharQuest ? selectedQuest.progress : null
                const status = isCharQuest ? selectedQuest.status : null
                const isComplete = progress ? isQuestComplete(progress) : false

                return (
                  <>
                    <div className="text-center mb-6">
                      <div className="text-6xl mb-3">{questDef.icon || '📜'}</div>
                      <h3 className="text-xl font-bold text-white mb-2">{questDef.title}</h3>
                      <span className="badge badge-common">Level {questDef.level_requirement}</span>
                    </div>

                    {questDef.description && (
                      <div className="mb-6">
                        <h4 className="text-sm font-bold text-gray-400 uppercase mb-2">Description</h4>
                        <p className="text-gray-300 text-sm leading-relaxed">{questDef.description}</p>
                      </div>
                    )}

                    <div className="mb-6">
                      <h4 className="text-sm font-bold text-gray-400 uppercase mb-2">Objective</h4>
                      <p className="text-white font-semibold">{questDef.objective}</p>
                      {progress && (
                        <div className="mt-3">
                          <div className="progress-bar">
                            <div
                              className={`progress-fill ${
                                isComplete ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                              }`}
                              style={{ width: `${Math.min((progress.current / progress.goal) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <p className="text-center text-sm mt-2">
                            <span className={isComplete ? 'text-green-400 font-bold' : 'text-gray-400'}>
                              {progress.current} / {progress.goal}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mb-6">
                      <h4 className="text-sm font-bold text-gray-400 uppercase mb-3">Rewards</h4>
                      <div className="space-y-2">
                        {questDef.xp_reward > 0 && (
                          <div className="flex items-center justify-between p-2 bg-blue-500/10 rounded border border-blue-500/20">
                            <span className="text-blue-400 font-semibold">⭐ Experience</span>
                            <span className="text-white font-bold">+{questDef.xp_reward}</span>
                          </div>
                        )}
                        {questDef.gold_reward > 0 && (
                          <div className="flex items-center justify-between p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                            <span className="text-yellow-400 font-semibold">💰 Gold</span>
                            <span className="text-white font-bold">+{questDef.gold_reward}</span>
                          </div>
                        )}
                        {questDef.item_rewards && Object.keys(questDef.item_rewards).length > 0 && (
                          <div className="p-2 bg-purple-500/10 rounded border border-purple-500/20">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-purple-400 font-semibold">🎁 Items</span>
                              <span className="text-white font-bold">{Object.keys(questDef.item_rewards).length}</span>
                            </div>
                            <div className="text-xs text-gray-400 space-y-1">
                              {Object.entries(questDef.item_rewards).map(([itemId, quantity]) => (
                                <div key={itemId} className="flex justify-between">
                                  <span>{itemId.replace(/_/g, ' ')}</span>
                                  <span>x{quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      {filter === 'available' && (
                        <button
                          onClick={() => handleAcceptQuest(questDef.id)}
                          disabled={actionLoading}
                          className="btn btn-primary w-full"
                        >
                          {actionLoading ? 'Accepting...' : '✅ Accept Quest'}
                        </button>
                      )}

                      {filter === 'active' && isComplete && (
                        <button
                          onClick={() => handleCompleteQuest(isCharQuest ? selectedQuest.quest_id : '')}
                          disabled={actionLoading}
                          className="btn btn-success w-full"
                        >
                          {actionLoading ? 'Claiming...' : '🎉 Claim Rewards'}
                        </button>
                      )}

                      {filter === 'active' && !isComplete && (
                        <div className="bg-blue-900/20 border border-blue-500/50 rounded-xl p-4 text-center">
                          <p className="text-blue-400 text-sm font-semibold">In Progress</p>
                          <p className="text-gray-400 text-xs mt-1">Complete objectives to claim rewards</p>
                        </div>
                      )}

                      {filter === 'active' && (
                        <button
                          onClick={() => handleAbandonQuest(isCharQuest ? selectedQuest.quest_id : '')}
                          disabled={actionLoading}
                          className="btn btn-danger w-full"
                        >
                          {actionLoading ? 'Abandoning...' : '❌ Abandon Quest'}
                        </button>
                      )}

                      {filter === 'completed' && (
                        <div className="bg-green-900/20 border border-green-500/50 rounded-xl p-4 text-center">
                          <p className="text-green-400 text-sm font-bold">✅ Completed</p>
                          <p className="text-gray-400 text-xs mt-1">
                            {isCharQuest && selectedQuest.completed_at && new Date(selectedQuest.completed_at).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
          ) : (
            <div className="panel p-6 sticky top-24 text-center">
              <div className="text-6xl mb-4 opacity-50">📜</div>
              <p className="text-gray-400">Select a quest to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Quest Completion Modal */}
      {completedQuestData && (
        <QuestCompletionModal
          isOpen={showCompletionModal}
          onClose={handleModalClose}
          questTitle={completedQuestData.title}
          questIcon={completedQuestData.icon}
          totalGold={completedQuestData.gold}
          totalXP={completedQuestData.xp}
          itemsFound={completedQuestData.items}
        />
      )}
    </div>
  )
}
