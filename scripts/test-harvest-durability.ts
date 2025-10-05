import { createClient } from '@/utils/supabase/server'

async function testHarvestDurability() {
  console.log('Testing harvest durability system...\n')

  const supabase = await createClient()

  // Get a test node
  const { data: node, error: nodeError } = await supabase
    .from('gathering_nodes')
    .select('*')
    .eq('world_zone', '00000000-0000-0000-0000-000000000001')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (nodeError || !node) {
    console.error('Failed to get test node:', nodeError)
    return
  }

  console.log('Test node:', {
    id: node.id,
    type: node.node_type,
    current_health: node.current_health,
    max_health: node.max_health
  })

  // Try to update the node's health directly
  const newHealth = node.current_health - 1

  console.log(`\nAttempting to reduce health from ${node.current_health} to ${newHealth}...`)

  const { error: updateError } = await supabase
    .from('gathering_nodes')
    .update({
      current_health: newHealth,
      last_harvested_at: new Date().toISOString()
    })
    .eq('id', node.id)

  if (updateError) {
    console.error('Failed to update node health:', updateError)
    return
  }

  // Verify the update
  const { data: updatedNode, error: verifyError } = await supabase
    .from('gathering_nodes')
    .select('current_health, last_harvested_at')
    .eq('id', node.id)
    .single()

  if (verifyError || !updatedNode) {
    console.error('Failed to verify update:', verifyError)
    return
  }

  console.log('\nUpdate successful!')
  console.log('New health:', updatedNode.current_health)
  console.log('Last harvested:', updatedNode.last_harvested_at)

  // Reset the node for future tests
  console.log('\nResetting node to original state...')
  await supabase
    .from('gathering_nodes')
    .update({
      current_health: node.current_health,
      last_harvested_at: null
    })
    .eq('id', node.id)

  console.log('Test complete!')
}

testHarvestDurability().catch(console.error)