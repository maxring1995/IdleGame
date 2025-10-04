// Test script to debug quest tracking
import { createClient } from '@/utils/supabase/client'
import { completeGathering } from '@/lib/gathering'
import { trackQuestProgress } from '@/lib/quests'

async function testQuestTracking() {
  const characterId = '01173979-0c33-4a0a-a90c-c2817e5e1ede'

  console.log('=== Testing Quest Tracking ===')

  // Check current quest status
  const supabase = createClient()
  const { data: quest } = await supabase
    .from('quests')
    .select('*')
    .eq('character_id', characterId)
    .eq('quest_id', 'gather_wood')
    .single()

  console.log('Quest before:', quest)

  // Test completeGathering
  console.log('\nCalling completeGathering...')
  const result = await completeGathering(characterId)
  console.log('Result:', result)

  // Check quest after
  const { data: questAfter } = await supabase
    .from('quests')
    .select('*')
    .eq('character_id', characterId)
    .eq('quest_id', 'gather_wood')
    .single()

  console.log('\nQuest after:', questAfter)
}

testQuestTracking().catch(console.error)
