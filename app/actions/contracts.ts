'use server'

import { createClient } from '@/utils/supabase/server'
import {
  getAvailableContracts as getAvailableContractsLib,
  getActiveContracts as getActiveContractsLib,
  acceptContract as acceptContractLib,
  updateContractProgress as updateContractProgressLib,
  claimContractRewards as claimContractRewardsLib,
  getContractHistory as getContractHistoryLib
} from '@/lib/contracts'
import { revalidatePath } from 'next/cache'

/**
 * Get available contracts for a character
 */
export async function getAvailableContractsAction(
  characterId: string,
  contractType: 'daily' | 'weekly' | 'special'
) {
  try {
    const result = await getAvailableContractsLib(characterId, contractType)

    if (result.error) {
      return { success: false, error: result.error.message, contracts: null }
    }

    return { success: true, contracts: result.data, error: null }
  } catch (err: any) {
    console.error('[contracts] Error in getAvailableContracts action:', err)
    return { success: false, error: err.message, contracts: null }
  }
}

/**
 * Get active contracts for a character
 */
export async function getActiveContractsAction(characterId: string) {
  try {
    const result = await getActiveContractsLib(characterId)

    if (result.error) {
      return { success: false, error: result.error.message, contracts: null }
    }

    return { success: true, contracts: result.data, error: null }
  } catch (err: any) {
    console.error('[contracts] Error in getActiveContracts action:', err)
    return { success: false, error: err.message, contracts: null }
  }
}

/**
 * Accept a new contract
 */
export async function acceptContractAction(
  characterId: string,
  contractId: string,
  contractType: 'daily' | 'weekly' | 'special'
) {
  try {
    const result = await acceptContractLib(characterId, contractId, contractType)

    if (result.error) {
      return { success: false, error: result.error.message, contract: null }
    }

    // Revalidate to update UI
    revalidatePath('/')

    return { success: true, contract: result.data, error: null }
  } catch (err: any) {
    console.error('[contracts] Error in acceptContract action:', err)
    return { success: false, error: err.message, contract: null }
  }
}

/**
 * Update contract progress when materials are gathered
 */
export async function updateContractProgressAction(
  characterId: string,
  materialId: string,
  quantity: number
) {
  try {
    const result = await updateContractProgressLib(characterId, materialId, quantity)

    if (result.error) {
      return { success: false, error: result.error.message, result: null }
    }

    // Revalidate to update UI
    revalidatePath('/')

    return { success: true, result: result.data, error: null }
  } catch (err: any) {
    console.error('[contracts] Error in updateContractProgress action:', err)
    return { success: false, error: err.message, result: null }
  }
}

/**
 * Claim rewards for a completed contract
 */
export async function claimContractRewardsAction(
  characterId: string,
  contractId: string
) {
  try {
    const result = await claimContractRewardsLib(characterId, contractId)

    if (result.error) {
      return { success: false, error: result.error.message, rewards: null }
    }

    // Revalidate to update UI
    revalidatePath('/')

    return {
      success: result.data?.success || false,
      rewards: result.data?.rewards || null,
      error: null
    }
  } catch (err: any) {
    console.error('[contracts] Error in claimContractRewards action:', err)
    return { success: false, error: err.message, rewards: null }
  }
}

/**
 * Get contract history
 */
export async function getContractHistoryAction(
  characterId: string,
  limit: number = 20
) {
  try {
    const result = await getContractHistoryLib(characterId, limit)

    if (result.error) {
      return { success: false, error: result.error.message, history: null }
    }

    return { success: true, history: result.data, error: null }
  } catch (err: any) {
    console.error('[contracts] Error in getContractHistory action:', err)
    return { success: false, error: err.message, history: null }
  }
}