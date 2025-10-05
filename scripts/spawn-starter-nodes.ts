/**
 * Script to spawn gathering nodes in starter zones
 * Run with: npx tsx scripts/spawn-starter-nodes.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function spawnStarterNodes() {
  console.log('🌳 Spawning gathering nodes in starter zones...\n')

  // Define zones and their materials (using actual zone IDs from database)
  const nodeSpawns = [
    // Havenbrook Village (00000000-0000-0000-0000-000000000001)
    { zone: '00000000-0000-0000-0000-000000000001', material: 'oak_log', count: 10, nodeType: 'tree' },
    { zone: '00000000-0000-0000-0000-000000000001', material: 'copper_ore', count: 8, nodeType: 'ore_vein' },
    { zone: '00000000-0000-0000-0000-000000000001', material: 'tin_ore', count: 8, nodeType: 'ore_vein' },
    { zone: '00000000-0000-0000-0000-000000000001', material: 'rabbit_meat', count: 6, nodeType: 'hunting_ground' },
    { zone: '00000000-0000-0000-0000-000000000001', material: 'guam_leaf', count: 10, nodeType: 'herb_patch' },
    { zone: '00000000-0000-0000-0000-000000000001', material: 'raw_shrimp', count: 12, nodeType: 'fishing_spot' },
    { zone: '00000000-0000-0000-0000-000000000001', material: 'air_essence', count: 8, nodeType: 'ley_line' },

    // Whispering Woods (00000000-0000-0000-0000-000000000002)
    { zone: '00000000-0000-0000-0000-000000000002', material: 'oak_log', count: 15, nodeType: 'tree' },
    { zone: '00000000-0000-0000-0000-000000000002', material: 'willow_log', count: 8, nodeType: 'tree' },
    { zone: '00000000-0000-0000-0000-000000000002', material: 'wolf_pelt', count: 10, nodeType: 'hunting_ground' },
    { zone: '00000000-0000-0000-0000-000000000002', material: 'marrentill', count: 12, nodeType: 'herb_patch' },
    { zone: '00000000-0000-0000-0000-000000000002', material: 'tarromin', count: 8, nodeType: 'herb_patch' },
    { zone: '00000000-0000-0000-0000-000000000002', material: 'raw_sardine', count: 10, nodeType: 'fishing_spot' },

    // Ironpeak Foothills (00000000-0000-0000-0000-000000000003)
    { zone: '00000000-0000-0000-0000-000000000003', material: 'iron_ore', count: 15, nodeType: 'ore_vein' },
    { zone: '00000000-0000-0000-0000-000000000003', material: 'coal', count: 12, nodeType: 'ore_vein' },
    { zone: '00000000-0000-0000-0000-000000000003', material: 'copper_ore', count: 10, nodeType: 'ore_vein' },
    { zone: '00000000-0000-0000-0000-000000000003', material: 'sapphire', count: 5, nodeType: 'ore_vein' },
    { zone: '00000000-0000-0000-0000-000000000003', material: 'earth_essence', count: 10, nodeType: 'ley_line' }
  ]

  let totalSpawned = 0

  for (const spawn of nodeSpawns) {
    console.log(`📍 Spawning ${spawn.count}x ${spawn.material} in ${spawn.zone}...`)

    // Generate nodes with random positions and qualities
    const nodes = Array.from({ length: spawn.count }, (_, i) => ({
      node_type: spawn.nodeType,
      material_id: spawn.material,
      world_zone: spawn.zone,
      quality_tier: rollQuality(),
      max_health: rollHealth(),
      current_health: 0, // Will be set via trigger
      is_active: true,
      spawn_position: {
        x: Math.floor(Math.random() * 1000),
        y: Math.floor(Math.random() * 1000)
      },
      respawn_variance: 0.2,
      required_zone_level: 1,
      respawn_time_ms: 60000 + Math.floor(Math.random() * 30000) // 60-90s
    }))

    const { data, error } = await supabase
      .from('gathering_nodes')
      .insert(nodes)
      .select()

    if (error) {
      console.error(`❌ Error spawning ${spawn.material}:`, error.message)
      continue
    }

    // Set current_health = max_health
    if (data) {
      const nodeIds = data.map((n: any) => n.id)
      await supabase
        .from('gathering_nodes')
        .update({ current_health: supabase.raw('max_health') } as any)
        .in('id', nodeIds)

      console.log(`✅ Spawned ${data.length}x ${spawn.material}`)
      totalSpawned += data.length
    }
  }

  console.log(`\n🎉 Total nodes spawned: ${totalSpawned}`)
  console.log('\n✅ Starter gathering nodes are ready!')
  console.log('Players can now visit zones and harvest resources.')
}

function rollQuality(): 'poor' | 'standard' | 'rich' {
  const roll = Math.random()
  if (roll < 0.10) return 'rich'    // 10%
  if (roll < 0.30) return 'poor'    // 20%
  return 'standard'                  // 70%
}

function rollHealth(): number {
  const roll = Math.random()
  if (roll < 0.05) return 5  // 5%
  if (roll < 0.20) return 4  // 15%
  return 3                    // 80%
}

// Run the script
spawnStarterNodes().catch(console.error)
