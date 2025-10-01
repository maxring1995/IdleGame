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
