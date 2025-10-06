'use client'

import { useState, useEffect } from 'react'
import { getTalentTrees, getTalentNodes, spendTalentPoint, getCharacterTalents, resetTalents } from '@/lib/classSystem'
import type { TalentTree, TalentNode, CharacterTalent, Character } from '@/lib/supabase'

interface TalentTreeProps {
  character: Character
  onTalentSpent: () => void
}

export default function TalentTree({ character, onTalentSpent }: TalentTreeProps) {
  const [trees, setTrees] = useState<TalentTree[]>([])
  const [selectedTree, setSelectedTree] = useState<TalentTree | null>(null)
  const [nodes, setNodes] = useState<TalentNode[]>([])
  const [characterTalents, setCharacterTalents] = useState<CharacterTalent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<TalentNode | null>(null)

  // Load talent trees
  useEffect(() => {
    async function loadTrees() {
      if (!character.class_id) {
        setError('No class selected')
        setIsLoading(false)
        return
      }

      const { data: treesData } = await getTalentTrees(character.class_id)
      const { data: talentsData } = await getCharacterTalents(character.id)

      if (treesData && treesData.length > 0) {
        setTrees(treesData)
        setSelectedTree(treesData[0])
      }
      if (talentsData) {
        setCharacterTalents(talentsData)
      }

      setIsLoading(false)
    }

    loadTrees()
  }, [character])

  // Load nodes when tree changes
  useEffect(() => {
    async function loadNodes() {
      if (!selectedTree) return

      const { data } = await getTalentNodes(selectedTree.id)
      if (data) {
        setNodes(data)
      }
    }

    loadNodes()
  }, [selectedTree])

  // Get points spent in specific talent
  function getPointsSpent(talentId: string): number {
    const talent = characterTalents.find(t => t.talent_id === talentId)
    return talent?.points_spent || 0
  }

  // Get total points spent in tree
  function getTotalPointsInTree(treeId: string): number {
    const treeNodes = nodes.filter(n => n.tree_id === treeId)
    return treeNodes.reduce((sum, node) => {
      return sum + getPointsSpent(node.id)
    }, 0)
  }

  // Check if node can be learned
  function canLearnNode(node: TalentNode): boolean {
    const currentPoints = getPointsSpent(node.id)

    // Already maxed out
    if (currentPoints >= node.max_points) return false

    // No talent points available
    if (!character.talent_points || character.talent_points < 1) return false

    // Check required points in tree
    const totalInTree = getTotalPointsInTree(node.tree_id)
    if (totalInTree < node.required_points_in_tree) return false

    // Check prerequisite talent
    if (node.requires_talent_id) {
      const prereqPoints = getPointsSpent(node.requires_talent_id)
      const prereqNode = nodes.find(n => n.id === node.requires_talent_id)
      if (!prereqNode || prereqPoints < prereqNode.max_points) return false
    }

    return true
  }

  // Spend talent point
  async function handleSpendPoint(node: TalentNode) {
    if (!canLearnNode(node)) return

    setError(null)
    const { success, error: spendError } = await spendTalentPoint(character.id, node.id)

    if (success) {
      // Reload talents
      const { data: talentsData } = await getCharacterTalents(character.id)
      if (talentsData) {
        setCharacterTalents(talentsData)
      }
      onTalentSpent()
    } else {
      setError(spendError?.message || 'Failed to spend talent point')
    }
  }

  // Reset all talents
  async function handleReset() {
    if (!confirm('Reset all talents? This will cost gold.')) return

    setError(null)
    const { success, error: resetError } = await resetTalents(character.id)

    if (success) {
      // Reload talents
      const { data: talentsData } = await getCharacterTalents(character.id)
      if (talentsData) {
        setCharacterTalents(talentsData)
      }
      onTalentSpent()
    } else {
      setError(resetError?.message || 'Failed to reset talents')
    }
  }

  if (isLoading) {
    return (
      <div className="panel p-8 text-center">
        <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading talents...</p>
      </div>
    )
  }

  if (!character.class_id) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-red-400">No class selected. Please create a new character.</p>
      </div>
    )
  }

  if (trees.length === 0) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-gray-400">No talent trees available for your class.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="panel p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Talent Specialization</h2>
            <p className="text-gray-400 text-sm">Shape your character's playstyle</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary" data-testid="talent-points-available">
              {character.talent_points || 0}
            </div>
            <div className="text-xs text-gray-400">Points Available</div>
          </div>
        </div>

        {/* Tree Selector */}
        <div className="flex gap-2">
          {trees.map((tree) => {
            const pointsInTree = getTotalPointsInTree(tree.id)
            return (
              <button
                key={tree.id}
                onClick={() => setSelectedTree(tree)}
                data-testid={`talent-tree-tab-${tree.specialization_type.toLowerCase()}`}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  selectedTree?.id === tree.id
                    ? 'border-primary bg-primary/20'
                    : 'border-white/10 bg-bg-card hover:bg-white/5'
                }`}
              >
                <div className="text-2xl mb-2">{tree.icon}</div>
                <h3 className="font-bold text-white mb-1">{tree.name}</h3>
                <p className="text-xs text-gray-400 mb-2">{tree.description}</p>
                <div className="text-primary font-bold">{pointsInTree} Points</div>
              </button>
            )
          })}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Talent Grid */}
      {selectedTree && (
        <div className="panel p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">{selectedTree.name} Talents</h3>
            <button
              onClick={handleReset}
              data-testid="reset-talents-button"
              className="btn btn-secondary text-sm"
            >
              Reset Talents ({Math.floor((character.total_talent_points || 0) * 100)} 💰)
            </button>
          </div>

          {/* Organize nodes by tier and column */}
          <div className="space-y-8">
            {[1, 2, 3, 4, 5, 6, 7].map((tier) => {
              const tierNodes = nodes.filter(n => n.tier === tier)
              if (tierNodes.length === 0) return null

              return (
                <div key={tier} className="relative">
                  {/* Tier label */}
                  <div className="absolute -left-12 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">
                    Tier {tier}
                  </div>

                  {/* Nodes grid */}
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((col) => {
                      const node = tierNodes.find(n => n.column_position === col)
                      if (!node) {
                        return <div key={col} className="aspect-square"></div>
                      }

                      const pointsSpent = getPointsSpent(node.id)
                      const canLearn = canLearnNode(node)
                      const isMaxed = pointsSpent >= node.max_points

                      return (
                        <button
                          key={node.id}
                          onClick={() => handleSpendPoint(node)}
                          onMouseEnter={() => setHoveredNode(node)}
                          onMouseLeave={() => setHoveredNode(null)}
                          disabled={!canLearn}
                          data-testid={`talent-node-${node.id}`}
                          className={`card p-4 aspect-square flex flex-col items-center justify-center transition-all relative ${
                            isMaxed
                              ? 'bg-gradient-to-br from-amber-500/30 to-amber-600/20 border-amber-500'
                              : pointsSpent > 0
                              ? 'bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/50'
                              : canLearn
                              ? 'hover:bg-white/10 border-white/20 hover:border-primary/50'
                              : 'opacity-50 cursor-not-allowed border-white/10'
                          }`}
                        >
                          <div className="text-3xl mb-2">{node.icon || '⭐'}</div>
                          <h4 className="text-xs font-bold text-white text-center mb-1">
                            {node.name}
                          </h4>
                          <div className="text-xs font-bold text-primary">
                            {pointsSpent}/{node.max_points}
                          </div>

                          {/* Requirement indicator */}
                          {node.required_points_in_tree > 0 && pointsSpent === 0 && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                              {node.required_points_in_tree}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Hover tooltip */}
      {hoveredNode && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 max-w-md z-50 pointer-events-none">
          <div className="panel p-4 border-primary/50">
            <h3 className="text-lg font-bold text-white mb-2">{hoveredNode.name}</h3>
            <p className="text-sm text-gray-300 mb-3">{hoveredNode.description}</p>

            {/* Effects */}
            {hoveredNode.effects && Object.keys(hoveredNode.effects).length > 0 && (
              <div className="space-y-1 mb-3">
                {Object.entries(hoveredNode.effects).map(([key, value]) => (
                  <div key={key} className="text-xs text-green-400">
                    • {key}: {JSON.stringify(value)}
                  </div>
                ))}
              </div>
            )}

            {/* Requirements */}
            {hoveredNode.required_points_in_tree > 0 && (
              <div className="text-xs text-blue-400">
                Requires {hoveredNode.required_points_in_tree} points in tree
              </div>
            )}
            {hoveredNode.requires_talent_id && (
              <div className="text-xs text-blue-400">
                Requires prerequisite talent
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
