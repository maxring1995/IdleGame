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
