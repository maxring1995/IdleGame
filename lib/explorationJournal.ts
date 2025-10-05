import { supabase } from './supabase'
import type { ExplorationJournal, ExplorationAchievement } from './supabase'

export type JournalEntryType = 'lore' | 'discovery' | 'encounter' | 'achievement' | 'story'
export type CollectionType = 'bestiary' | 'flora' | 'artifacts' | 'locations' | 'lore'

/**
 * Create journal entry
 */
export async function createJournalEntry(
  characterId: string,
  entryType: JournalEntryType,
  title: string,
  content: string,
  metadata?: Record<string, any>
): Promise<{ data: ExplorationJournal | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('exploration_journal')
      .insert({
        character_id: characterId,
        entry_type: entryType,
        title,
        content,
        metadata,
        is_favorite: false
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
 * Get journal entries for character
 */
export async function getJournalEntries(
  characterId: string,
  entryType?: JournalEntryType,
  limit: number = 50
): Promise<{ data: ExplorationJournal[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('exploration_journal')
      .select('*')
      .eq('character_id', characterId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (entryType) {
      query = query.eq('entry_type', entryType)
    }

    const { data, error } = await query

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(
  entryId: string,
  isFavorite: boolean
): Promise<{ data: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('exploration_journal')
      .update({ is_favorite: isFavorite })
      .eq('id', entryId)

    if (error) throw error
    return { data: true, error: null }
  } catch (error) {
    return { data: false, error: error as Error }
  }
}

/**
 * Add to collection (bestiary, flora, etc.)
 */
export async function addToCollection(
  characterId: string,
  collectionType: CollectionType,
  itemName: string,
  itemData: Record<string, any>
): Promise<{ data: any | null; error: Error | null }> {
  try {
    // Check if already collected
    const { data: existing } = await supabase
      .from('character_collections')
      .select('*')
      .eq('character_id', characterId)
      .eq('collection_type', collectionType)
      .eq('item_name', itemName)
      .single()

    if (existing) {
      // Increment encounter count
      await supabase
        .from('character_collections')
        .update({
          encounter_count: existing.encounter_count + 1,
          last_encountered: new Date().toISOString()
        })
        .eq('id', existing.id)

      return { data: existing, error: null }
    }

    // Add new collection item
    const { data, error } = await supabase
      .from('character_collections')
      .insert({
        character_id: characterId,
        collection_type: collectionType,
        item_name: itemName,
        item_data: itemData,
        encounter_count: 1,
        discovered_at: new Date().toISOString(),
        last_encountered: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // Create journal entry for new discovery
    await createJournalEntry(
      characterId,
      'discovery',
      `New ${collectionType} entry: ${itemName}`,
      `Discovered ${itemName} during exploration. ${itemData.description || ''}`
    ,
      { collection_type: collectionType, item_name: itemName }
    )

    // Check for collection achievements
    await checkCollectionAchievements(characterId, collectionType)

    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get collection for character
 */
export async function getCollection(
  characterId: string,
  collectionType?: CollectionType
): Promise<{ data: any[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('character_collections')
      .select('*')
      .eq('character_id', characterId)
      .order('discovered_at', { ascending: false })

    if (collectionType) {
      query = query.eq('collection_type', collectionType)
    }

    const { data, error } = await query

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get collection statistics
 */
export async function getCollectionStats(
  characterId: string
): Promise<{
  data: {
    bestiary: number
    flora: number
    artifacts: number
    locations: number
    lore: number
    total: number
  } | null
  error: Error | null
}> {
  try {
    const { data, error } = await supabase
      .from('character_collections')
      .select('collection_type')
      .eq('character_id', characterId)

    if (error) throw error

    const stats = {
      bestiary: 0,
      flora: 0,
      artifacts: 0,
      locations: 0,
      lore: 0,
      total: 0
    }

    data?.forEach(item => {
      stats[item.collection_type as CollectionType]++
      stats.total++
    })

    return { data: stats, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Check and award achievements
 */
export async function checkCollectionAchievements(
  characterId: string,
  collectionType: CollectionType
): Promise<void> {
  const { data: count } = await supabase
    .from('character_collections')
    .select('id', { count: 'exact' })
    .eq('character_id', characterId)
    .eq('collection_type', collectionType)

  const achievementThresholds = [
    { count: 10, name: 'Novice Collector', tier: 'bronze' },
    { count: 25, name: 'Adept Collector', tier: 'silver' },
    { count: 50, name: 'Expert Collector', tier: 'gold' },
    { count: 100, name: 'Master Collector', tier: 'platinum' }
  ]

  for (const threshold of achievementThresholds) {
    if (count && count >= threshold.count) {
      await unlockAchievement(
        characterId,
        `${threshold.name} - ${collectionType}`,
        `Collected ${threshold.count} ${collectionType} entries`,
        {
          collection_type: collectionType,
          count: threshold.count,
          tier: threshold.tier
        }
      )
    }
  }
}

/**
 * Unlock achievement
 */
export async function unlockAchievement(
  characterId: string,
  achievementName: string,
  description: string,
  metadata?: Record<string, any>
): Promise<{ data: ExplorationAchievement | null; error: Error | null }> {
  try {
    // Check if already unlocked
    const { data: existing } = await supabase
      .from('exploration_achievements')
      .select('*')
      .eq('character_id', characterId)
      .eq('achievement_name', achievementName)
      .single()

    if (existing) {
      return { data: existing, error: null }
    }

    // Unlock achievement
    const { data, error } = await supabase
      .from('exploration_achievements')
      .insert({
        character_id: characterId,
        achievement_name: achievementName,
        achievement_description: description,
        unlocked_at: new Date().toISOString(),
        metadata
      })
      .select()
      .single()

    if (error) throw error

    // Create journal entry
    await createJournalEntry(
      characterId,
      'achievement',
      `Achievement Unlocked: ${achievementName}`,
      description,
      metadata
    )

    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get all achievements for character
 */
export async function getAchievements(
  characterId: string
): Promise<{ data: ExplorationAchievement[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('exploration_achievements')
      .select('*')
      .eq('character_id', characterId)
      .order('unlocked_at', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Bestiary entry template
 */
export function createBestiaryEntry(
  creatureName: string,
  level: number,
  habitat: string,
  behavior: string,
  weaknesses: string[],
  drops: string[]
): Record<string, any> {
  return {
    description: `A level ${level} creature found in ${habitat}`,
    level,
    habitat,
    behavior,
    weaknesses,
    common_drops: drops,
    danger_rating: Math.ceil(level / 5)
  }
}

/**
 * Flora entry template
 */
export function createFloraEntry(
  plantName: string,
  location: string,
  rarity: string,
  uses: string[],
  harvestSeason: string
): Record<string, any> {
  return {
    description: `A ${rarity} plant found in ${location}`,
    location,
    rarity,
    medicinal_uses: uses.filter(u => u.includes('healing') || u.includes('cure')),
    alchemical_uses: uses.filter(u => u.includes('potion') || u.includes('brew')),
    harvest_season: harvestSeason,
    growth_conditions: location
  }
}

/**
 * Artifact entry template
 */
export function createArtifactEntry(
  artifactName: string,
  age: string,
  origin: string,
  power: string,
  lore: string
): Record<string, any> {
  return {
    description: `An ancient artifact from ${origin}`,
    estimated_age: age,
    origin_civilization: origin,
    magical_properties: power,
    historical_significance: lore,
    condition: 'Preserved'
  }
}

/**
 * Location entry template
 */
export function createLocationEntry(
  locationName: string,
  type: string,
  coordinates: { x: number; y: number },
  significance: string,
  inhabitants: string[]
): Record<string, any> {
  return {
    description: significance,
    location_type: type,
    coordinates,
    historical_significance: significance,
    known_inhabitants: inhabitants,
    accessibility: 'Discovered'
  }
}

/**
 * Lore entry template
 */
export function createLoreEntry(
  title: string,
  category: string,
  content: string,
  relatedEntities: string[]
): Record<string, any> {
  return {
    description: content.substring(0, 200),
    category,
    full_text: content,
    related_entities: relatedEntities,
    verified: false,
    source: 'Exploration Discovery'
  }
}

/**
 * Search journal entries
 */
export async function searchJournal(
  characterId: string,
  searchTerm: string
): Promise<{ data: ExplorationJournal[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('exploration_journal')
      .select('*')
      .eq('character_id', characterId)
      .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Export journal as text
 */
export async function exportJournal(
  characterId: string
): Promise<{ data: string | null; error: Error | null }> {
  try {
    const { data: entries, error } = await getJournalEntries(characterId, undefined, 1000)

    if (error) throw error

    let exportText = '=== EXPLORATION JOURNAL ===\n\n'

    entries?.forEach(entry => {
      exportText += `[${entry.entry_type.toUpperCase()}] ${entry.title}\n`
      exportText += `Date: ${new Date(entry.created_at).toLocaleDateString()}\n`
      exportText += `${entry.content}\n`
      exportText += '---\n\n'
    })

    return { data: exportText, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}
