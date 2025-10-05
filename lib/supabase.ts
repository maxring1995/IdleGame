// Re-export types only from this file
// Use lib/supabase/client.ts for browser client
// Use lib/supabase/server.ts for server client

// Database types
export interface Profile {
  id: string
  username: string
  created_at: string
  updated_at: string
}

export interface Character {
  id: string
  user_id: string
  name: string
  level: number
  experience: number
  health: number
  max_health: number
  mana: number
  max_mana: number
  attack: number
  defense: number
  gold: number
  gems: number
  class_id?: string
  mastery_points: number
  created_at: string
  updated_at: string
  last_active: string
}

export interface InventoryItem {
  id: string
  character_id: string
  item_id: string
  quantity: number
  equipped: boolean
  slot?: number
  enchantment_level: number
  durability: number
  created_at: string
}

export interface Item {
  id: string
  name: string
  description?: string
  type: 'weapon' | 'armor' | 'consumable' | 'material' | 'quest'
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  attack_bonus: number
  defense_bonus: number
  health_bonus: number
  mana_bonus: number
  equipment_slot?: 'weapon' | 'helmet' | 'chest' | 'legs' | 'boots' | 'gloves' | 'ring' | 'amulet'
  required_level: number
  sell_price: number
  stackable: boolean
  max_stack: number
  created_at: string
}

export interface CharacterSkill {
  character_id: string
  skill_type: string
  level: number
  experience: number
  prestige_level: number
  total_experience: number
  specialization_id?: string
  created_at: string
  updated_at: string
}

export interface Quest {
  id: string
  character_id: string
  quest_id: string
  status: 'active' | 'completed' | 'failed'
  progress: Record<string, any>
  started_at: string
  completed_at?: string
}

export interface Achievement {
  id: string
  character_id: string
  achievement_id: string
  unlocked_at: string
}

// Combat System Types
export interface Enemy {
  id: string
  name: string
  description?: string
  level: number
  health: number
  attack: number
  defense: number
  experience_reward: number
  gold_min: number
  gold_max: number
  loot_table: Record<string, number> // item_id -> drop probability
  required_player_level: number
  image_url?: string
  created_at: string
  is_boss?: boolean
  boss_abilities?: string[]
}

export interface CombatLog {
  id: string
  character_id: string
  enemy_id: string
  victory: boolean
  turns_taken: number
  damage_dealt: number
  damage_taken: number
  experience_gained: number
  gold_gained: number
  items_looted: string[] // array of item_ids
  combat_duration_ms?: number
  started_at: string
  ended_at: string
}

export interface ActiveCombat {
  character_id: string
  enemy_id: string
  player_current_health: number
  enemy_current_health: number
  turn_number: number
  combat_log: CombatAction[]
  started_at: string
  updated_at: string
}

export interface CombatAction {
  turn: number
  actor: 'player' | 'enemy'
  action: 'attack' | 'critical' | 'miss' | 'defeat'
  damage?: number
  message: string
}

export interface CombatResult {
  victory: boolean
  experience: number
  gold: number
  loot: string[] // item_ids
  damageDealt: number
  damageTaken: number
  turns: number
  combatXP?: {
    attack?: number
    defense?: number
    constitution?: number
    slayer?: number
    thieving?: number
  }
}

// Gathering System Types
export type MaterialType = 'wood' | 'ore' | 'fish' | 'meat' | 'pelt' | 'herb' | 'essence' | 'rune' | 'gem'
export type GatheringSkillType = 'woodcutting' | 'mining' | 'fishing' | 'hunting' | 'alchemy' | 'magic'
export type CraftingSkillType = 'crafting' | 'alchemy' | 'magic'
export type NodeType = 'tree' | 'ore_vein' | 'fishing_spot' | 'hunting_ground' | 'herb_patch' | 'ley_line'

export interface Material {
  id: string
  name: string
  description?: string
  type: MaterialType
  tier: number
  required_skill_type: GatheringSkillType
  required_skill_level: number
  gathering_time_ms: number
  experience_reward: number
  sell_price: number
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  stackable: boolean
  max_stack: number
  required_zone_level: number
  created_at: string
}

export interface GatheringNode {
  id: string
  node_type: NodeType
  material_id: string
  world_zone: string
  required_zone_level: number
  respawn_time_ms: number
  created_at: string
  // Deep Gathering System fields
  quality_tier: 'poor' | 'standard' | 'rich'
  max_health: number
  current_health: number
  last_harvested_at?: string
  last_harvested_by?: string
  is_active: boolean
  spawn_position: { x: number; y: number }
  respawn_variance: number
}

export interface CraftingRecipe {
  id: string
  name: string
  description?: string
  result_item_id: string
  result_quantity: number
  required_crafting_level: number
  required_skill_type: CraftingSkillType
  ingredients: Record<string, number> // material_id -> quantity
  crafting_time_ms: number
  experience_reward: number
  recipe_category: 'weapon' | 'armor' | 'consumable' | 'tool' | 'general'
  created_at: string
}

export interface ActiveCrafting {
  character_id: string
  recipe_id: string
  started_at: string
  estimated_completion: string
  quantity_goal: number
  quantity_crafted: number
  is_auto: boolean
  updated_at: string
}

export interface ActiveGathering {
  character_id: string
  skill_type: string
  material_id: string
  quantity_goal: number
  quantity_gathered: number
  started_at: string
  last_gathered_at: string
  updated_at: string
}

export interface GatheringSession {
  material: Material
  progress: number // 0-100%
  timeRemaining: number // milliseconds
  quantityGathered: number
  quantityGoal: number
}

export interface MaterialWithDetails extends Material {
  node?: GatheringNode
  playerSkillLevel?: number
  canGather: boolean
  isLocked: boolean
  lockReason?: string
}

// Deep Gathering System Types
export type ToolType = 'axe' | 'pickaxe' | 'fishing_rod' | 'hunting_knife' | 'herbalism_sickle' | 'divination_staff'
export type QualityTier = 'poor' | 'standard' | 'rich'
export type EncounterType = 'treasure' | 'rare_spawn' | 'monster' | 'wanderer' | 'rune_discovery'

export interface GatheringTool {
  id: string
  name: string
  description?: string
  tool_type: ToolType
  tier: number
  gathering_power: number // Speed multiplier
  bonus_yield_chance: number // 0.0 - 1.0
  bonus_yield_amount: number
  durability_max: number
  special_bonuses: Record<string, number> // e.g., {"gem_find": 0.15}
  required_level: number
  required_skill_type: GatheringSkillType
  item_id?: string
  created_at: string
}

export interface CharacterEquippedTools {
  character_id: string
  axe_id?: string
  axe_durability: number
  pickaxe_id?: string
  pickaxe_durability: number
  fishing_rod_id?: string
  fishing_rod_durability: number
  hunting_knife_id?: string
  hunting_knife_durability: number
  herbalism_sickle_id?: string
  herbalism_sickle_durability: number
  divination_staff_id?: string
  divination_staff_durability: number
  updated_at: string
}

export interface GatheringSpecialization {
  id: string
  name: string
  description?: string
  skill_type: GatheringSkillType
  bonuses: Record<string, any> // Flexible bonuses
  required_skill_level: number
  icon?: string
  created_at: string
}

export interface GatheringHotspot {
  id: string
  world_zone: string
  material_id: string
  position: { x: number; y: number }
  yield_multiplier: number
  duration_minutes: number
  max_harvesters: number
  current_harvesters: number
  spawned_at: string
  expires_at: string
  is_active: boolean
  created_at: string
}

export interface GatheringEncounter {
  id: string
  character_id: string
  encounter_type: EncounterType
  encounter_data: Record<string, any>
  triggered_at: string
  material_id?: string
  world_zone?: string
  resolved: boolean
  resolved_at?: string
  resolution_action?: string
  rewards_granted: Record<string, any>
  created_at: string
}

export interface GatheringAchievement {
  id: string
  name: string
  description?: string
  category: GatheringSkillType | 'general'
  requirement_type: string
  requirement_data: Record<string, any>
  title?: string
  reward_item_id?: string
  reward_gold: number
  sort_order: number
  created_at: string
}

export interface CharacterGatheringAchievement {
  character_id: string
  achievement_id: string
  unlocked_at: string
  progress: Record<string, any>
}

export interface GatheringStatistics {
  character_id: string
  total_wood_gathered: number
  total_ore_gathered: number
  total_fish_gathered: number
  total_meat_gathered: number
  total_herbs_gathered: number
  total_essence_gathered: number
  total_gems_found: number
  total_rare_spawns_found: number
  total_treasures_found: number
  fastest_gather_time_ms?: number
  total_nodes_depleted: number
  total_hotspots_claimed: number
  total_encounters: number
  total_monsters_fought: number
  total_wanderers_met: number
  updated_at: string
}

export interface GatheringSeasonalEvent {
  id: string
  event_name: string
  event_type: string
  affected_skills: GatheringSkillType[]
  bonus_multipliers: Record<string, number>
  starts_at: string
  ends_at: string
  is_active: boolean
  description?: string
  announcement_text?: string
  created_at: string
}

// Adventure System Types
export interface WorldZone {
  id: string
  name: string
  zone_type: 'safe_haven' | 'wilderness' | 'dungeon' | 'raid' | 'pvp'
  danger_level: number
  required_level: number
  parent_zone_id?: string
  climate?: string
  biome?: string
  is_hidden: boolean
  discovery_method?: string
  discovery_requirement_id?: string
  ambient_sound?: string
  weather_patterns?: Record<string, number>
  time_of_day_effects?: Record<string, any>
  description?: string
  lore_text?: string
  flavor_messages?: string[]
  icon?: string
  created_at: string
}

export interface ZoneLandmark {
  id: string
  zone_id: string
  name: string
  landmark_type: 'shrine' | 'ruins' | 'vendor' | 'dungeon_entrance' | 'vista' | 'quest_giver' | 'teleport' | 'lore' | 'crafting'
  is_hidden: boolean
  discovery_chance?: number
  provides_service?: string
  service_data?: Record<string, any>
  description?: string
  flavor_text?: string
  created_at: string
}

export interface CharacterZoneDiscovery {
  id: string
  character_id: string
  zone_id: string
  discovered_at: string
  total_time_spent: number
}

export interface CharacterLandmarkDiscovery {
  id: string
  character_id: string
  landmark_id: string
  discovered_at: string
}

export interface ZoneConnection {
  id: string
  from_zone_id: string
  to_zone_id: string
  connection_type: 'path' | 'gate' | 'portal' | 'teleport' | 'secret_passage'
  base_travel_time: number
  required_item_id?: string
  required_skill_level?: number
  is_hidden: boolean
  available_conditions?: Record<string, any>
  description?: string
}

export interface WorldState {
  key: string
  value: any
  expires_at?: string
  updated_at: string
}

export interface ActiveExploration {
  id: string
  character_id: string
  zone_id: string
  started_at: string
  exploration_progress: number
  discoveries_found: number
  is_auto: boolean
  auto_stop_at?: number
  last_reward_percent: number
  updated_at: string
}

export interface ExplorationRewardConfig {
  id: string
  zone_id: string
  progress_percent: number
  reward_chance: number
  loot_table: Record<string, number> // item_id -> drop_weight
  gold_min: number
  gold_max: number
  xp_min: number
  xp_max: number
  created_at: string
}

export interface ExplorationReward {
  items: string[] // item_ids
  gold: number
  xp: number
  progress_percent: number
}

export interface ExplorationUpdate {
  progress: number
  discoveries: ZoneLandmark[]
  rewards: ExplorationReward[]
  timeSpent: number
  completed: boolean
}

// Extended types with discovery info
export interface WorldZoneWithDiscovery extends WorldZone {
  isDiscovered: boolean
  discoveredAt?: string
  timeSpent?: number
}

export interface ZoneLandmarkWithDiscovery extends ZoneLandmark {
  isDiscovered: boolean
  discoveredAt?: string
}

export interface ZoneDetails {
  zone: WorldZone
  landmarks: ZoneLandmarkWithDiscovery[]
  connections: ZoneConnection[]
  discoveryInfo?: CharacterZoneDiscovery
}

// Travel & Exploration System Types
export interface ActiveTravel {
  id: string
  character_id: string
  from_zone_id: string
  to_zone_id: string
  connection_id: string
  started_at: string
  estimated_arrival: string
  actual_travel_time: number
  status: 'traveling' | 'encounter' | 'completed'
  can_cancel: boolean
  encounter_rolled: boolean
  encounter_type?: 'combat' | 'loot' | 'merchant' | 'lore'
  encounter_data?: any
  updated_at: string
}

export interface ActiveExploration {
  id: string
  character_id: string
  zone_id: string
  started_at: string
  exploration_progress: number // 0-100
  discoveries_found: number
  is_auto: boolean
  auto_stop_at?: number
  updated_at: string
}

export interface TravelLogEntry {
  id: string
  character_id: string
  zone_id?: string
  entry_type: 'zone_discovered' | 'landmark_found' | 'encounter' | 'travel_completed' | 'exploration_completed'
  entry_text: string
  entry_data?: any
  created_at: string
}

export interface TravelEncounter {
  type: 'combat' | 'loot' | 'merchant' | 'lore' | 'none'
  data?: any
}

export interface TravelUpdate {
  status: 'in_progress' | 'encounter' | 'completed'
  progress: number // 0-100
  timeRemaining: number // milliseconds
  encounter?: TravelEncounter
}

export interface ExplorationUpdate {
  progress: number // 0-100
  discoveries: ZoneLandmark[]
  timeSpent: number // seconds
  completed: boolean
}

// Merchant System Types
export interface MerchantInventoryItem {
  id: string
  item_id: string
  stock_quantity: number // -1 = unlimited
  buy_price: number // Price player pays to buy
  price_multiplier: number
  available_from: string
  available_until?: string
  merchant_tier: number
  required_character_level: number
  zone_id?: string // Zone-specific merchant (NULL = global)
  merchant_name?: string // Name of the merchant
  merchant_description?: string
  created_at: string
  updated_at: string
}

export interface MerchantInventoryWithItem extends MerchantInventoryItem {
  item: Item // Joined item details
}

export interface ZoneMerchant {
  id: string
  zone_id: string
  merchant_name: string
  merchant_type: 'general' | 'weapons' | 'armor' | 'potions' | 'materials' | 'specialty'
  description?: string
  greeting_message?: string
  personality?: 'friendly' | 'gruff' | 'mysterious' | 'cheerful' | 'suspicious'
  icon: string
  discount_multiplier: number
  unlocked_at_reputation: number
  created_at: string
}

export interface ZoneMerchantWithZone extends ZoneMerchant {
  zone: WorldZone
}

export interface ZoneMerchantWithInventory extends ZoneMerchant {
  zone: WorldZone
  inventory: MerchantInventoryWithItem[]
}

export interface MerchantTransaction {
  id: string
  character_id: string
  transaction_type: 'buy' | 'sell'
  item_id: string
  quantity: number
  price_per_unit: number
  total_price: number
  created_at: string
}

export interface MerchantTransactionWithItem extends MerchantTransaction {
  item: Item // Joined item details
}

export interface CharacterMerchantData {
  character_id: string
  unlocked_tier: number
  last_inventory_refresh: string
  total_purchases: number
  total_sales: number
  lifetime_gold_spent: number
  lifetime_gold_earned: number
  created_at: string
  updated_at: string
}

export interface BuyItemResult {
  success: boolean
  error?: string
  transaction?: MerchantTransaction
  newGold?: number
}

export interface SellItemResult {
  success: boolean
  error?: string
  transaction?: MerchantTransaction
  newGold?: number
}

// =====================================================
// COMPREHENSIVE SKILL & CLASS SYSTEM TYPES
// =====================================================

// Skill System Types
export type SkillCategory = 'combat' | 'gathering' | 'artisan' | 'support'

export interface SkillDefinition {
  skill_type: string
  display_name: string
  category: SkillCategory
  description?: string
  icon: string
  base_stat_affected?: string
  created_at: string
}

export interface CharacterSkillWithDefinition extends CharacterSkill {
  definition: SkillDefinition
}

// Class System Types
export interface ClassDefinition {
  class_id: string
  display_name: string
  description?: string
  icon: string
  primary_stats: Record<string, number> // {stat_name: bonus_value}
  skill_bonuses: Record<string, number> // {skill_type: xp_multiplier}
  special_ability_id?: string
  created_at: string
}

export interface SpecialAbility {
  ability_id: string
  display_name: string
  description?: string
  cooldown_seconds: number
  duration_seconds: number
  effect_type?: string
  effect_data: Record<string, any>
  icon: string
  created_at: string
}

export interface ActiveClassAbility {
  character_id: string
  ability_id: string
  last_used_at?: string
  active_until?: string
  is_active: boolean
  uses_count: number
}

export interface ActiveClassAbilityWithDetails extends ActiveClassAbility {
  ability: SpecialAbility
}

// Milestone System Types
export type MilestoneRewardType = 'gold' | 'item' | 'ability' | 'stat_boost' | 'mastery_point'

export interface SkillMilestone {
  id: string
  skill_type: string
  milestone_level: number
  reward_type: MilestoneRewardType
  reward_data: Record<string, any>
  description?: string
  created_at: string
}

// Specialization System Types
export interface SkillSpecialization {
  specialization_id: string
  skill_type: string
  display_name: string
  description?: string
  unlock_level: number
  bonuses: Record<string, any>
  special_effect?: string
  icon: string
  created_at: string
}

// Synergy System Types
export interface SkillSynergy {
  synergy_id: string
  display_name: string
  description?: string
  required_skills: Record<string, number> // {skill_type: min_level}
  bonus_type: string
  bonus_data: Record<string, any>
  icon: string
  created_at: string
}

export interface CharacterSkillSynergy {
  character_id: string
  synergy_id: string
  unlocked_at: string
}

export interface CharacterSkillSynergyWithDetails extends CharacterSkillSynergy {
  synergy: SkillSynergy
}

// Mastery Tree Types
export type MasteryCategory = 'combat' | 'gathering' | 'artisan' | 'support' | 'universal'

export interface MasteryTreeNode {
  node_id: string
  display_name: string
  description?: string
  category: MasteryCategory
  cost: number
  requirements: Record<string, any> // Prerequisites (other node_ids or conditions)
  bonuses: Record<string, any>
  icon: string
  created_at: string
}

export interface CharacterMasteryNode {
  character_id: string
  node_id: string
  purchased_at: string
}

export interface CharacterMasteryNodeWithDetails extends CharacterMasteryNode {
  node: MasteryTreeNode
}

// Character with full class info
export interface CharacterWithClass extends Character {
  class_definition?: ClassDefinition
  active_ability?: ActiveClassAbilityWithDetails
}

// XP Calculation Types
export interface XPRequirement {
  level: number
  xp_required: number
  cumulative_xp: number
}

export interface SkillProgress {
  current_level: number
  current_xp: number
  xp_for_next_level: number
  xp_for_current_level: number
  progress_percent: number
  prestige_level: number
  total_xp: number
}

// Prestige Types
export interface PrestigeReward {
  efficiency_bonus: number // 5% per prestige level
  cosmetic_title?: string
  special_icon?: string
}

// Skill Challenge Types
export interface SkillChallenge {
  id: string
  skill_type: string
  challenge_type: 'daily' | 'weekly'
  description: string
  requirements: Record<string, any>
  xp_reward: number
  bonus_rewards?: Record<string, any>
  expires_at: string
  created_at: string
}

export interface CharacterSkillChallenge {
  character_id: string
  challenge_id: string
  progress: Record<string, any>
  completed: boolean
  completed_at?: string
  claimed: boolean
}
