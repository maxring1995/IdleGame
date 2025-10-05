/**
 * Test script to verify node fetching
 * Run with: npx tsx scripts/test-nodes.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testNodeFetching() {
  console.log('Testing node fetching...\n')

  // Test zones
  const zones = [
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003'
  ]

  for (const zone of zones) {
    console.log(`\nQuerying zone: ${zone}`)

    const { data, error } = await supabase
      .from('gathering_nodes')
      .select('*')
      .eq('world_zone', zone)
      .eq('is_active', true)
      .order('spawn_position->x')
      .limit(5)

    if (error) {
      console.error('❌ Error:', error)
    } else {
      console.log(`✅ Found ${data?.length || 0} nodes`)
      if (data && data.length > 0) {
        console.log('Sample node:', {
          id: data[0].id,
          node_type: data[0].node_type,
          material_id: data[0].material_id,
          quality_tier: data[0].quality_tier
        })
      }
    }
  }
}

// Run the test
testNodeFetching().catch(console.error)