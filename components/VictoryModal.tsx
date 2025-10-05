'use client'

import { CombatResult } from '@/lib/supabase'

interface VictoryModalProps {
  result: CombatResult
  enemyName: string
  onClose: () => void
  onContinue: () => void
}

export default function VictoryModal({ result, enemyName, onClose, onContinue }: VictoryModalProps) {
  const { victory, experience, gold, loot, damageDealt, damageTaken, turns, combatXP } = result

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border-2 border-gray-700">
        {/* Header */}
        <div className="text-center mb-6">
          {victory ? (
            <>
              <div className="text-6xl mb-2">🎉</div>
              <h2 className="text-2xl font-bold text-green-400 mb-1">Victory!</h2>
              <p className="text-gray-300">You defeated {enemyName}</p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-2">💀</div>
              <h2 className="text-2xl font-bold text-red-400 mb-1">Defeated</h2>
              <p className="text-gray-300">You were defeated by {enemyName}</p>
            </>
          )}
        </div>

        {/* Combat Stats */}
        <div className="bg-gray-900 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Combat Summary</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-400">Turns Taken</div>
              <div className="text-white font-semibold">{turns}</div>
            </div>
            <div>
              <div className="text-gray-400">Damage Dealt</div>
              <div className="text-green-400 font-semibold">{damageDealt}</div>
            </div>
            <div>
              <div className="text-gray-400">Damage Taken</div>
              <div className="text-red-400 font-semibold">{damageTaken}</div>
            </div>
            <div>
              <div className="text-gray-400">Avg. Dmg/Turn</div>
              <div className="text-white font-semibold">
                {turns > 0 ? Math.round(damageDealt / turns) : 0}
              </div>
            </div>
          </div>
        </div>

        {/* Rewards (Victory Only) */}
        {victory && (
          <>
            <div className="bg-gray-900 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">🎁 Rewards</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">⭐ Experience</span>
                  <span className="text-blue-400 font-semibold">+{experience} XP</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">💰 Gold</span>
                  <span className="text-yellow-400 font-semibold">+{gold}</span>
                </div>

                {loot.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <div className="text-gray-400 text-xs mb-2">📦 Items Looted:</div>
                    <div className="flex flex-wrap gap-2">
                      {loot.map((itemId, index) => (
                        <div
                          key={index}
                          className="bg-gray-800 px-3 py-1 rounded text-xs text-green-400 border border-green-400/30"
                        >
                          ✨ {itemId.replace(/_/g, ' ')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Combat XP Gains */}
            {combatXP && Object.keys(combatXP).length > 0 && (
              <div className="bg-gray-900 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">⚔️ Combat Skills XP</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {combatXP.attack && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">🗡️ Attack</span>
                      <span className="text-red-400 font-semibold">+{combatXP.attack} XP</span>
                    </div>
                  )}
                  {combatXP.defense && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">🛡️ Defense</span>
                      <span className="text-blue-400 font-semibold">+{combatXP.defense} XP</span>
                    </div>
                  )}
                  {combatXP.constitution && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">💪 Constitution</span>
                      <span className="text-green-400 font-semibold">+{combatXP.constitution} XP</span>
                    </div>
                  )}
                  {combatXP.slayer && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">⚔️ Slayer</span>
                      <span className="text-purple-400 font-semibold">+{combatXP.slayer} XP</span>
                    </div>
                  )}
                  {combatXP.thieving && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">🗝️ Thieving</span>
                      <span className="text-yellow-400 font-semibold">+{combatXP.thieving} XP</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Penalty (Defeat Only) */}
        {!victory && (
          <div className="bg-red-900/20 border border-red-400/30 rounded-lg p-4 mb-4">
            <div className="text-sm text-red-400">
              <div className="font-semibold mb-1">⚠️ Defeat Penalty</div>
              <div className="text-red-300">
                Your health has been restored to 50% of maximum
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {victory ? (
            <>
              <button
                onClick={onContinue}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-semibold"
              >
                Fight Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Return
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onContinue}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors font-semibold"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Retreat
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
