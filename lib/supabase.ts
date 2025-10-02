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
