import { supabase } from './supabase'
import type { ExplorationGuild, GuildMember } from './supabase'

export type GuildRole = 'leader' | 'officer' | 'member'
export type ShareType = 'map' | 'discovery' | 'achievement' | 'challenge'

/**
 * Create exploration guild
 */
export async function createGuild(
  characterId: string,
  guildName: string,
  guildDescription: string,
  guildTag: string,
  cost: number = 1000
): Promise<{ data: ExplorationGuild | null; error: Error | null }> {
  try {
    // Check if character has enough gold
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('gold')
      .eq('id', characterId)
      .single()

    if (charError) throw charError

    if (character.gold < cost) {
      throw new Error('Insufficient gold')
    }

    // Deduct gold
    await supabase
      .from('characters')
      .update({ gold: character.gold - cost })
      .eq('id', characterId)

    // Create guild
    const { data, error } = await supabase
      .from('exploration_guilds')
      .insert({
        guild_name: guildName,
        guild_description: guildDescription,
        guild_tag: guildTag,
        leader_id: characterId,
        member_count: 1,
        total_exploration_xp: 0,
        guild_level: 1
      })
      .select()
      .single()

    if (error) throw error

    // Add creator as leader
    await supabase.from('guild_members').insert({
      guild_id: data.id,
      character_id: characterId,
      role: 'leader',
      contribution_points: 0,
      joined_at: new Date().toISOString()
    })

    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Join guild
 */
export async function joinGuild(
  characterId: string,
  guildId: string
): Promise<{ data: GuildMember | null; error: Error | null }> {
  try {
    // Check if already in a guild
    const { data: existing } = await supabase
      .from('guild_members')
      .select('*')
      .eq('character_id', characterId)
      .single()

    if (existing) {
      throw new Error('Already in a guild')
    }

    // Add to guild
    const { data, error } = await supabase
      .from('guild_members')
      .insert({
        guild_id: guildId,
        character_id: characterId,
        role: 'member',
        contribution_points: 0,
        joined_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // Increment guild member count
    await supabase
      .from('exploration_guilds')
      .update({ member_count: supabase.raw('member_count + 1') })
      .eq('id', guildId)

    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Leave guild
 */
export async function leaveGuild(
  characterId: string,
  guildId: string
): Promise<{ data: boolean; error: Error | null }> {
  try {
    // Check if leader
    const { data: member } = await supabase
      .from('guild_members')
      .select('role')
      .eq('character_id', characterId)
      .eq('guild_id', guildId)
      .single()

    if (member?.role === 'leader') {
      throw new Error('Leader must transfer leadership before leaving')
    }

    // Remove from guild
    await supabase
      .from('guild_members')
      .delete()
      .eq('character_id', characterId)
      .eq('guild_id', guildId)

    // Decrement member count
    await supabase
      .from('exploration_guilds')
      .update({ member_count: supabase.raw('member_count - 1') })
      .eq('id', guildId)

    return { data: true, error: null }
  } catch (error) {
    return { data: false, error: error as Error }
  }
}

/**
 * Get guild details
 */
export async function getGuild(
  guildId: string
): Promise<{ data: ExplorationGuild | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('exploration_guilds')
      .select('*, guild_members(*, characters(character_name, level))')
      .eq('id', guildId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get character's guild
 */
export async function getCharacterGuild(
  characterId: string
): Promise<{ data: ExplorationGuild | null; error: Error | null }> {
  try {
    const { data: membership, error: memberError } = await supabase
      .from('guild_members')
      .select('guild_id')
      .eq('character_id', characterId)
      .single()

    if (memberError) {
      if (memberError.code === 'PGRST116') {
        return { data: null, error: null }
      }
      throw memberError
    }

    return await getGuild(membership.guild_id)
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Contribute to guild
 */
export async function contributeToGuild(
  characterId: string,
  guildId: string,
  contributionPoints: number
): Promise<{ data: number | null; error: Error | null }> {
  try {
    // Update member contribution
    const { data, error } = await supabase
      .from('guild_members')
      .update({
        contribution_points: supabase.raw(`contribution_points + ${contributionPoints}`)
      })
      .eq('character_id', characterId)
      .eq('guild_id', guildId)
      .select('contribution_points')
      .single()

    if (error) throw error

    // Update guild XP
    await supabase
      .from('exploration_guilds')
      .update({
        total_exploration_xp: supabase.raw(`total_exploration_xp + ${contributionPoints}`)
      })
      .eq('id', guildId)

    // Check for level up
    await checkGuildLevelUp(guildId)

    return { data: data.contribution_points, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Check guild level up
 */
async function checkGuildLevelUp(guildId: string): Promise<void> {
  const { data: guild } = await supabase
    .from('exploration_guilds')
    .select('guild_level, total_exploration_xp')
    .eq('id', guildId)
    .single()

  if (!guild) return

  const xpForNextLevel = guild.guild_level * 10000
  if (guild.total_exploration_xp >= xpForNextLevel) {
    await supabase
      .from('exploration_guilds')
      .update({ guild_level: guild.guild_level + 1 })
      .eq('id', guildId)
  }
}

/**
 * Share discovery with guild
 */
export async function shareWithGuild(
  characterId: string,
  shareType: ShareType,
  shareData: Record<string, any>
): Promise<{ data: any | null; error: Error | null }> {
  try {
    // Get character's guild
    const { data: guild } = await getCharacterGuild(characterId)

    if (!guild) {
      throw new Error('Not in a guild')
    }

    // Create share entry
    const { data, error } = await supabase
      .from('guild_shares')
      .insert({
        guild_id: guild.id,
        character_id: characterId,
        share_type: shareType,
        share_data: shareData,
        shared_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // Award contribution points
    await contributeToGuild(characterId, guild.id, 50)

    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get guild shares (feed)
 */
export async function getGuildShares(
  guildId: string,
  limit: number = 50
): Promise<{ data: any[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('guild_shares')
      .select('*, characters(character_name)')
      .eq('guild_id', guildId)
      .order('shared_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Create guild challenge
 */
export async function createGuildChallenge(
  guildId: string,
  challengeName: string,
  challengeDescription: string,
  goal: Record<string, number>,
  rewards: Record<string, any>,
  durationDays: number = 7
): Promise<{ data: any | null; error: Error | null }> {
  try {
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + durationDays)

    const { data, error } = await supabase
      .from('guild_challenges')
      .insert({
        guild_id: guildId,
        challenge_name: challengeName,
        challenge_description: challengeDescription,
        challenge_goal: goal,
        current_progress: {},
        rewards,
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
        is_active: true,
        completed: false
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Update guild challenge progress
 */
export async function updateChallengeProgress(
  challengeId: string,
  progressKey: string,
  incrementBy: number
): Promise<{ data: any | null; error: Error | null }> {
  try {
    const { data: challenge } = await supabase
      .from('guild_challenges')
      .select('current_progress, challenge_goal')
      .eq('id', challengeId)
      .single()

    if (!challenge) throw new Error('Challenge not found')

    const currentProgress = challenge.current_progress as Record<string, number> || {}
    currentProgress[progressKey] = (currentProgress[progressKey] || 0) + incrementBy

    // Check if goal reached
    const goal = challenge.challenge_goal as Record<string, number>
    const completed = Object.entries(goal).every(
      ([key, value]) => currentProgress[key] >= value
    )

    const { data, error } = await supabase
      .from('guild_challenges')
      .update({
        current_progress: currentProgress,
        completed,
        completion_date: completed ? new Date().toISOString() : null
      })
      .eq('id', challengeId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get active guild challenges
 */
export async function getGuildChallenges(
  guildId: string
): Promise<{ data: any[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('guild_challenges')
      .select('*')
      .eq('guild_id', guildId)
      .eq('is_active', true)
      .order('start_date', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Search for guilds
 */
export async function searchGuilds(
  searchTerm?: string,
  minLevel?: number,
  limit: number = 20
): Promise<{ data: ExplorationGuild[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('exploration_guilds')
      .select('*')
      .order('guild_level', { ascending: false })
      .limit(limit)

    if (searchTerm) {
      query = query.or(`guild_name.ilike.%${searchTerm}%,guild_tag.ilike.%${searchTerm}%`)
    }

    if (minLevel) {
      query = query.gte('guild_level', minLevel)
    }

    const { data, error } = await query

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get guild leaderboard
 */
export async function getGuildLeaderboard(
  limit: number = 10
): Promise<{ data: ExplorationGuild[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('exploration_guilds')
      .select('*')
      .order('total_exploration_xp', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Promote/demote guild member
 */
export async function setMemberRole(
  leaderId: string,
  guildId: string,
  targetCharacterId: string,
  newRole: GuildRole
): Promise<{ data: boolean; error: Error | null }> {
  try {
    // Verify leader permissions
    const { data: leader } = await supabase
      .from('guild_members')
      .select('role')
      .eq('character_id', leaderId)
      .eq('guild_id', guildId)
      .single()

    if (leader?.role !== 'leader') {
      throw new Error('Only guild leader can change roles')
    }

    // Update role
    const { error } = await supabase
      .from('guild_members')
      .update({ role: newRole })
      .eq('character_id', targetCharacterId)
      .eq('guild_id', guildId)

    if (error) throw error
    return { data: true, error: null }
  } catch (error) {
    return { data: false, error: error as Error }
  }
}

/**
 * Transfer guild leadership
 */
export async function transferLeadership(
  currentLeaderId: string,
  guildId: string,
  newLeaderId: string
): Promise<{ data: boolean; error: Error | null }> {
  try {
    // Verify current leader
    const { data: currentLeader } = await supabase
      .from('guild_members')
      .select('role')
      .eq('character_id', currentLeaderId)
      .eq('guild_id', guildId)
      .single()

    if (currentLeader?.role !== 'leader') {
      throw new Error('Only current leader can transfer leadership')
    }

    // Demote current leader to officer
    await supabase
      .from('guild_members')
      .update({ role: 'officer' })
      .eq('character_id', currentLeaderId)
      .eq('guild_id', guildId)

    // Promote new leader
    await supabase
      .from('guild_members')
      .update({ role: 'leader' })
      .eq('character_id', newLeaderId)
      .eq('guild_id', guildId)

    // Update guild leader_id
    await supabase
      .from('exploration_guilds')
      .update({ leader_id: newLeaderId })
      .eq('id', guildId)

    return { data: true, error: null }
  } catch (error) {
    return { data: false, error: error as Error }
  }
}

/**
 * Get member contribution rankings
 */
export async function getMemberRankings(
  guildId: string
): Promise<{ data: any[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('guild_members')
      .select('*, characters(character_name, level)')
      .eq('guild_id', guildId)
      .order('contribution_points', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}
