/**
 * Test script to verify quest tracking for gathering
 * Run with: npx ts-node --project tsconfig.json scripts/test-gather-quest.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function testGatherQuest() {
  console.log('=== Testing Gather Quest Tracking ===\n')

  // Get a test character (you'll need to replace with your character ID)
  const { data: characters } = await supabase
    .from('characters')
    .select('id, name')
    .limit(1)

  if (!characters || characters.length === 0) {
    console.error('No characters found. Please create a character first.')
    return
  }

  const characterId = characters[0].id
  console.log(`Using character: ${characters[0].name} (${characterId})\n`)

  // Check if gather_wood quest exists
  const { data: questDef } = await supabase
    .from('quest_definitions')
    .select('*')
    .eq('id', 'gather_wood')
    .single()

  if (!questDef) {
    console.error('Quest "gather_wood" not found in database')
    return
  }

  console.log('Quest Definition:')
  console.log(`- ID: ${questDef.id}`)
  console.log(`- Title: ${questDef.title}`)
  console.log(`- Objective: ${questDef.objective}\n`)

  // Check if quest is accepted
  const { data: quest } = await supabase
    .from('quests')
    .select('*')
    .eq('character_id', characterId)
    .eq('quest_id', 'gather_wood')
    .eq('status', 'active')
    .maybeSingle()

  if (!quest) {
    console.log('⚠️  Quest not accepted. Accepting now...\n')

    // Parse objective
    const objective = questDef.objective
    const match = objective.match(/(\d+)\s+([\w\s]+)/i)
    const targetId = match ? match[2].trim().toLowerCase().replace(/\s+/g, '_') : undefined

    const { error } = await supabase
      .from('quests')
      .insert({
        character_id: characterId,
        quest_id: 'gather_wood',
        status: 'active',
        progress: {
          type: 'gather',
          current: 0,
          goal: match ? parseInt(match[1]) : 10,
          targetId: targetId
        }
      })

    if (error) {
      console.error('Error accepting quest:', error)
      return
    }

    console.log('✅ Quest accepted\n')
  } else {
    console.log('Quest Status:')
    console.log(`- Status: ${quest.status}`)
    console.log(`- Progress: ${JSON.stringify(quest.progress, null, 2)}\n`)
  }

  // Get the quest again to see current state
  const { data: currentQuest } = await supabase
    .from('quests')
    .select('*')
    .eq('character_id', characterId)
    .eq('quest_id', 'gather_wood')
    .eq('status', 'active')
    .single()

  if (!currentQuest) {
    console.error('Quest not found after acceptance')
    return
  }

  const progress = currentQuest.progress as any
  console.log('Current Quest Progress:')
  console.log(`- Type: ${progress.type}`)
  console.log(`- Current: ${progress.current}`)
  console.log(`- Goal: ${progress.goal}`)
  console.log(`- TargetId: ${progress.targetId}\n`)

  // Simulate trackQuestProgress call
  console.log('=== Simulating trackQuestProgress Call ===')
  console.log('Event Type: gather')
  console.log('Event Data: { targetId: "oak_log", amount: 10 }\n')

  // Check matching logic
  console.log('Matching Logic:')
  console.log(`- Quest Type (${progress.type}) === Event Type (gather): ${progress.type === 'gather' ? '✅' : '❌'}`)
  console.log(`- Quest TargetId (${progress.targetId}) === Event TargetId (oak_log): ${progress.targetId === 'oak_log' ? '✅' : '❌'}\n`)

  if (progress.type === 'gather' && progress.targetId === 'oak_log') {
    console.log('✅ Quest SHOULD be updated')

    const newCurrent = progress.current + 10
    console.log(`\nUpdating quest progress from ${progress.current} to ${Math.min(newCurrent, progress.goal)}`)

    const { error } = await supabase
      .from('quests')
      .update({
        progress: {
          ...progress,
          current: Math.min(newCurrent, progress.goal)
        }
      })
      .eq('character_id', characterId)
      .eq('quest_id', 'gather_wood')
      .eq('status', 'active')

    if (error) {
      console.error('Error updating quest:', error)
    } else {
      console.log('✅ Quest updated successfully')

      // Verify update
      const { data: updatedQuest } = await supabase
        .from('quests')
        .select('progress')
        .eq('character_id', characterId)
        .eq('quest_id', 'gather_wood')
        .single()

      if (updatedQuest) {
        console.log('\nFinal Progress:', updatedQuest.progress)
      }
    }
  } else {
    console.log('❌ Quest would NOT be updated (mismatch)')
  }
}

testGatherQuest().catch(console.error)
