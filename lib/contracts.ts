/**
 * Gathering Contracts System
 *
 * Daily and weekly contracts for players to complete
 * by gathering specific materials for rewards.
 */

import { createClient } from '@/utils/supabase/client'

export interface ContractRequirement {
  material_id: string
  quantity: number
  current?: number // For tracking progress
}

export interface ContractReward {
  type: 'gold' | 'xp' | 'item'
  id?: string // For items
  amount: number
}

export interface GatheringContract {
  id: string
  contract_type: 'daily' | 'weekly' | 'special'
  name: string
  description?: string
  requirements: ContractRequirement[]
  rewards: ContractReward[]
  min_level: number
  max_level: number
  weight: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CharacterContract {
  id: string
  character_id: string
  contract_id: string
  contract_type: string
  progress: Record<string, number> // material_id -> quantity gathered
  started_at: string
  expires_at: string
  completed_at?: string
  claimed_at?: string
  is_completed: boolean
  is_claimed: boolean
  created_at: string
  contract?: GatheringContract // Join data
}

export interface ContractHistory {
  id: string
  character_id: string
  contract_id?: string
  contract_name: string
  contract_type: string
  completed_at: string
  time_taken_seconds?: number
  rewards_claimed?: ContractReward[]
  created_at: string
}

/**
 * Get available contracts for a character
 */
export async function getAvailableContracts(
  characterId: string,
  contractType: 'daily' | 'weekly' | 'special'
): Promise<{ data: GatheringContract[] | null; error: Error | null }> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .rpc('get_available_contracts', {
        p_character_id: characterId,
        p_contract_type: contractType
      })

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error('[contracts] Error fetching available contracts:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get active contracts for a character
 */
export async function getActiveContracts(
  characterId: string
): Promise<{ data: CharacterContract[] | null; error: Error | null }> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('character_contracts')
      .select(`
        *,
        contract:gathering_contracts(*)
      `)
      .eq('character_id', characterId)
      .eq('is_claimed', false)
      .gte('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true })

    if (error) throw error
    return { data: data as any, error: null }
  } catch (err) {
    console.error('[contracts] Error fetching active contracts:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Accept a contract
 */
export async function acceptContract(
  characterId: string,
  contractId: string,
  contractType: 'daily' | 'weekly' | 'special'
): Promise<{ data: CharacterContract | null; error: Error | null }> {
  const supabase = createClient()

  try {
    // Calculate expiration based on type
    const now = new Date()
    let expiresAt: Date

    if (contractType === 'daily') {
      // Expires at next daily reset (5 AM UTC)
      expiresAt = new Date(now)
      expiresAt.setUTCHours(5, 0, 0, 0)
      if (expiresAt <= now) {
        expiresAt.setDate(expiresAt.getDate() + 1)
      }
    } else if (contractType === 'weekly') {
      // Expires at next weekly reset (Monday 5 AM UTC)
      expiresAt = new Date(now)
      expiresAt.setUTCHours(5, 0, 0, 0)
      const daysUntilMonday = (8 - expiresAt.getUTCDay()) % 7 || 7
      expiresAt.setDate(expiresAt.getDate() + daysUntilMonday)
    } else {
      // Special contracts expire in 7 days
      expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    }

    const { data, error } = await supabase
      .from('character_contracts')
      .insert({
        character_id: characterId,
        contract_id: contractId,
        contract_type: contractType,
        expires_at: expiresAt.toISOString(),
        progress: {}
      })
      .select(`
        *,
        contract:gathering_contracts(*)
      `)
      .single()

    if (error) throw error
    return { data: data as any, error: null }
  } catch (err) {
    console.error('[contracts] Error accepting contract:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Update contract progress when materials are gathered
 */
export async function updateContractProgress(
  characterId: string,
  materialId: string,
  quantity: number
): Promise<{ data: { updated: number; completed: string[] } | null; error: Error | null }> {
  const supabase = createClient()

  try {
    // Get active contracts that need this material
    const { data: contracts, error: contractsError } = await supabase
      .from('character_contracts')
      .select(`
        *,
        contract:gathering_contracts(*)
      `)
      .eq('character_id', characterId)
      .eq('is_completed', false)
      .gte('expires_at', new Date().toISOString())

    if (contractsError) throw contractsError
    if (!contracts || contracts.length === 0) {
      return { data: { updated: 0, completed: [] }, error: null }
    }

    let updatedCount = 0
    const completedContracts: string[] = []

    // Update progress for each relevant contract
    for (const characterContract of contracts) {
      const contract = characterContract.contract as GatheringContract
      if (!contract) continue

      // Check if this material is required
      const requirement = contract.requirements.find(
        (req: ContractRequirement) => req.material_id === materialId
      )
      if (!requirement) continue

      // Update progress
      const currentProgress = characterContract.progress || {}
      const currentAmount = currentProgress[materialId] || 0
      const newAmount = Math.min(currentAmount + quantity, requirement.quantity)

      currentProgress[materialId] = newAmount

      // Check if contract is now complete
      let isComplete = true
      for (const req of contract.requirements) {
        const progress = currentProgress[req.material_id] || 0
        if (progress < req.quantity) {
          isComplete = false
          break
        }
      }

      // Update in database
      const updateData: any = {
        progress: currentProgress
      }

      if (isComplete && !characterContract.is_completed) {
        updateData.is_completed = true
        updateData.completed_at = new Date().toISOString()
        completedContracts.push(contract.name)
      }

      const { error: updateError } = await supabase
        .from('character_contracts')
        .update(updateData)
        .eq('id', characterContract.id)

      if (updateError) throw updateError
      updatedCount++
    }

    return {
      data: {
        updated: updatedCount,
        completed: completedContracts
      },
      error: null
    }
  } catch (err) {
    console.error('[contracts] Error updating contract progress:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Claim rewards for a completed contract
 */
export async function claimContractRewards(
  characterId: string,
  contractId: string
): Promise<{ data: { success: boolean; rewards?: ContractReward[] } | null; error: Error | null }> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .rpc('claim_contract_rewards', {
        p_character_id: characterId,
        p_contract_id: contractId
      })

    if (error) throw error

    if (data && data.success) {
      return {
        data: {
          success: true,
          rewards: data.rewards
        },
        error: null
      }
    }

    return {
      data: {
        success: false
      },
      error: null
    }
  } catch (err) {
    console.error('[contracts] Error claiming rewards:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get contract history for a character
 */
export async function getContractHistory(
  characterId: string,
  limit: number = 20
): Promise<{ data: ContractHistory[] | null; error: Error | null }> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('contract_history')
      .select('*')
      .eq('character_id', characterId)
      .order('completed_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error('[contracts] Error fetching contract history:', err)
    return { data: null, error: err as Error }
  }
}

/**
 * Get time until next reset
 */
export function getTimeUntilReset(type: 'daily' | 'weekly'): {
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
} {
  const now = new Date()
  let resetTime: Date

  if (type === 'daily') {
    // Next 5 AM UTC
    resetTime = new Date(now)
    resetTime.setUTCHours(5, 0, 0, 0)
    if (resetTime <= now) {
      resetTime.setDate(resetTime.getDate() + 1)
    }
  } else {
    // Next Monday 5 AM UTC
    resetTime = new Date(now)
    resetTime.setUTCHours(5, 0, 0, 0)
    const daysUntilMonday = (8 - resetTime.getUTCDay()) % 7 || 7
    resetTime.setDate(resetTime.getDate() + daysUntilMonday)
  }

  const diffMs = resetTime.getTime() - now.getTime()
  const totalSeconds = Math.floor(diffMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { hours, minutes, seconds, totalSeconds }
}

/**
 * Format contract requirements for display
 */
export function formatRequirements(requirements: ContractRequirement[]): string {
  return requirements
    .map(req => `${req.quantity}x ${formatMaterialName(req.material_id)}`)
    .join(', ')
}

/**
 * Format material ID to readable name
 */
function formatMaterialName(materialId: string): string {
  return materialId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Calculate contract completion percentage
 */
export function calculateContractProgress(
  requirements: ContractRequirement[],
  progress: Record<string, number>
): number {
  if (!requirements || requirements.length === 0) return 0

  let totalRequired = 0
  let totalGathered = 0

  for (const req of requirements) {
    totalRequired += req.quantity
    totalGathered += Math.min(progress[req.material_id] || 0, req.quantity)
  }

  return totalRequired > 0 ? Math.floor((totalGathered / totalRequired) * 100) : 0
}