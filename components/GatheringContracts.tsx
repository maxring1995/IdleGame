'use client'

import { useState, useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import {
  getAvailableContractsAction,
  getActiveContractsAction,
  acceptContractAction,
  claimContractRewardsAction,
  getContractHistoryAction
} from '@/app/actions/contracts'
import {
  type GatheringContract,
  type CharacterContract,
  type ContractHistory,
  calculateContractProgress,
  formatRequirements,
  getTimeUntilReset
} from '@/lib/contracts'

export default function GatheringContracts() {
  const { character } = useGameStore()
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'history'>('daily')
  const [availableContracts, setAvailableContracts] = useState<GatheringContract[]>([])
  const [activeContracts, setActiveContracts] = useState<CharacterContract[]>([])
  const [contractHistory, setContractHistory] = useState<ContractHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshTimer, setRefreshTimer] = useState<any>(null)

  // Load contracts on mount and tab change
  useEffect(() => {
    if (character) {
      loadContracts()
    }
  }, [character, activeTab])

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTimer(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  async function loadContracts() {
    if (!character) return
    setLoading(true)
    setError(null)

    try {
      // Always load active contracts
      const activeResult = await getActiveContractsAction(character.id)
      if (activeResult.success && activeResult.contracts) {
        setActiveContracts(activeResult.contracts)
      }

      // Load based on active tab
      if (activeTab === 'history') {
        const historyResult = await getContractHistoryAction(character.id)
        if (historyResult.success && historyResult.history) {
          setContractHistory(historyResult.history)
        }
      } else {
        const availableResult = await getAvailableContractsAction(character.id, activeTab)
        if (availableResult.success && availableResult.contracts) {
          setAvailableContracts(availableResult.contracts)
        }
      }
    } catch (err) {
      console.error('Error loading contracts:', err)
      setError('Failed to load contracts')
    } finally {
      setLoading(false)
    }
  }

  async function handleAcceptContract(contract: GatheringContract) {
    if (!character) return

    setLoading(true)
    const result = await acceptContractAction(character.id, contract.id, contract.contract_type)

    if (result.success) {
      // Reload contracts
      await loadContracts()
    } else {
      setError(result.error || 'Failed to accept contract')
    }
    setLoading(false)
  }

  async function handleClaimRewards(contractId: string) {
    if (!character) return

    setLoading(true)
    const result = await claimContractRewardsAction(character.id, contractId)

    if (result.success && result.rewards) {
      // Show rewards notification
      const rewardText = result.rewards.map(r => {
        switch (r.type) {
          case 'gold': return `${r.amount} Gold`
          case 'xp': return `${r.amount} XP`
          case 'item': return `${r.amount}x Item`
          default: return ''
        }
      }).join(', ')

      // Reload contracts
      await loadContracts()
    } else {
      setError(result.error || 'Failed to claim rewards')
    }
    setLoading(false)
  }

  const timeUntilDaily = getTimeUntilReset('daily')
  const timeUntilWeekly = getTimeUntilReset('weekly')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">📜 Gathering Contracts</h2>
        <p className="text-sm text-gray-400">
          Complete contracts to earn gold, XP, and rewards!
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            activeTab === 'daily'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
          }`}
        >
          Daily
          <span className="ml-2 text-xs opacity-75">
            ({String(timeUntilDaily.hours).padStart(2, '0')}:
            {String(timeUntilDaily.minutes).padStart(2, '0')}:
            {String(timeUntilDaily.seconds).padStart(2, '0')})
          </span>
        </button>

        <button
          onClick={() => setActiveTab('weekly')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            activeTab === 'weekly'
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
          }`}
        >
          Weekly
          <span className="ml-2 text-xs opacity-75">
            ({Math.floor(timeUntilWeekly.hours / 24)}d {timeUntilWeekly.hours % 24}h)
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            activeTab === 'history'
              ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white'
              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
          }`}
        >
          History
        </button>
      </div>

      {/* Active Contracts */}
      {activeContracts.length > 0 && activeTab !== 'history' && (
        <div className="panel p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">Active Contracts</h3>
          <div className="space-y-3">
            {activeContracts
              .filter(c => c.contract_type === activeTab)
              .map(contract => (
                <ActiveContractCard
                  key={contract.id}
                  contract={contract}
                  onClaim={() => handleClaimRewards(contract.id)}
                  disabled={loading}
                />
              ))}
          </div>
        </div>
      )}

      {/* Content based on tab */}
      {loading ? (
        <div className="panel p-12 text-center">
          <div className="inline-block w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="panel p-6 text-red-400">
          {error}
        </div>
      ) : activeTab === 'history' ? (
        <ContractHistoryList history={contractHistory} />
      ) : (
        <AvailableContractsList
          contracts={availableContracts}
          onAccept={handleAcceptContract}
          disabled={loading}
        />
      )}
    </div>
  )
}

// Active Contract Card Component
interface ActiveContractCardProps {
  contract: CharacterContract
  onClaim: () => void
  disabled: boolean
}

function ActiveContractCard({ contract, onClaim, disabled }: ActiveContractCardProps) {
  if (!contract.contract) return null

  const progress = calculateContractProgress(
    contract.contract.requirements,
    contract.progress || {}
  )

  const timeRemaining = new Date(contract.expires_at).getTime() - Date.now()
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60))
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-white">{contract.contract.name}</h4>
          <p className="text-xs text-gray-400">{contract.contract.description}</p>
        </div>
        {contract.is_completed ? (
          <button
            onClick={onClaim}
            disabled={disabled}
            className="btn btn-success btn-sm"
          >
            Claim Rewards
          </button>
        ) : (
          <span className="text-xs text-gray-500">
            {hoursRemaining}h {minutesRemaining}m left
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-2">
        {contract.contract.requirements.map((req, idx) => {
          const current = contract.progress?.[req.material_id] || 0
          const percent = (current / req.quantity) * 100

          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">
                  {req.material_id.replace(/_/g, ' ')}
                </span>
                <span className={current >= req.quantity ? 'text-green-400' : 'text-white'}>
                  {current} / {req.quantity}
                </span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    current >= req.quantity
                      ? 'bg-gradient-to-r from-green-500 to-green-600'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600'
                  }`}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Overall Progress */}
      <div className="pt-2 border-t border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Overall Progress</span>
          <span className={`font-bold ${contract.is_completed ? 'text-green-400' : 'text-amber-400'}`}>
            {progress}%
          </span>
        </div>
      </div>
    </div>
  )
}

// Available Contracts List
interface AvailableContractsListProps {
  contracts: GatheringContract[]
  onAccept: (contract: GatheringContract) => void
  disabled: boolean
}

function AvailableContractsList({ contracts, onAccept, disabled }: AvailableContractsListProps) {
  if (contracts.length === 0) {
    return (
      <div className="panel p-12 text-center">
        <div className="text-5xl mb-3">📜</div>
        <p className="text-gray-400">
          No contracts available right now. Check back after the reset!
        </p>
      </div>
    )
  }

  return (
    <div className="panel p-6 space-y-4">
      <h3 className="text-lg font-bold text-white">Available Contracts</h3>
      <div className="grid gap-4">
        {contracts.map(contract => (
          <div key={contract.id} className="card p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-white">{contract.name}</h4>
                <p className="text-xs text-gray-400">{contract.description}</p>
              </div>
              <button
                onClick={() => onAccept(contract)}
                disabled={disabled}
                className="btn btn-primary btn-sm"
              >
                Accept
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500">Requirements:</span>
                <p className="text-sm text-gray-300">{formatRequirements(contract.requirements)}</p>
              </div>

              <div>
                <span className="text-xs text-gray-500">Rewards:</span>
                <div className="flex gap-3 mt-1">
                  {contract.rewards.map((reward, idx) => (
                    <span key={idx} className="text-sm">
                      {reward.type === 'gold' && `💰 ${reward.amount} Gold`}
                      {reward.type === 'xp' && `⭐ ${reward.amount} XP`}
                      {reward.type === 'item' && `📦 ${reward.amount}x Item`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Contract History List
interface ContractHistoryListProps {
  history: ContractHistory[]
}

function ContractHistoryList({ history }: ContractHistoryListProps) {
  if (history.length === 0) {
    return (
      <div className="panel p-12 text-center">
        <div className="text-5xl mb-3">📚</div>
        <p className="text-gray-400">
          No completed contracts yet. Start completing contracts to build your history!
        </p>
      </div>
    )
  }

  return (
    <div className="panel p-6 space-y-4">
      <h3 className="text-lg font-bold text-white">Contract History</h3>
      <div className="space-y-2">
        {history.map(entry => (
          <div key={entry.id} className="card p-3 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white">{entry.contract_name}</h4>
              <p className="text-xs text-gray-400">
                {new Date(entry.completed_at).toLocaleDateString()} •{' '}
                {entry.time_taken_seconds
                  ? `${Math.floor(entry.time_taken_seconds / 3600)}h ${Math.floor(
                      (entry.time_taken_seconds % 3600) / 60
                    )}m`
                  : 'Quick completion'}
              </p>
            </div>
            <div className="text-right">
              <span className={`badge ${
                entry.contract_type === 'weekly' ? 'badge-epic' : 'badge-uncommon'
              }`}>
                {entry.contract_type}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}