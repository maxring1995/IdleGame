#!/usr/bin/env node
/**
 * Integration test for quest tracking with real Supabase database
 * Run with: node scripts/test-quest-integration.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testQuestTracking() {
  console.log('🧪 Quest Tracking Integration Test\n')
  console.log('='.repeat(60))

  // Step 1: Get a test character
  console.log('\n📋 Step 1: Finding test character...')
  const { data: characters, error: charError } = await supabase
    .from('characters')
    .select('id, name, level')
    .limit(1)

  if (charError || !characters || characters.length === 0) {
    console.error('❌ Error: No characters found')
    console.error(charError)
    return
  }

  const character = characters[0]
  console.log(`✅ Using character: ${character.name} (ID: ${character.id})`)

  // Step 2: Check quest definition
  console.log('\n📋 Step 2: Checking quest definition...')
  const { data: questDef, error: defError } = await supabase
    .from('quest_definitions')
    .select('*')
    .eq('id', 'gather_wood')
    .single()

  if (defError || !questDef) {
    console.error('❌ Error: Quest definition not found')
    console.error(defError)
    return
  }

  console.log(`✅ Quest found: "${questDef.title}"`)
  console.log(`   Objective: ${questDef.objective}`)

  // Parse objective to get expected targetId
  const match = questDef.objective.match(/(\d+)\s+([\w\s]+)/i)
  const expectedTargetId = match ? match[2].trim().toLowerCase().replace(/\s+/g, '_') : undefined
  const expectedGoal = match ? parseInt(match[1]) : 10

  console.log(`   Expected targetId: "${expectedTargetId}"`)
  console.log(`   Expected goal: ${expectedGoal}`)

  // Step 3: Check if quest is accepted
  console.log('\n📋 Step 3: Checking quest acceptance...')
  const { data: existingQuest } = await supabase
    .from('quests')
    .select('*')
    .eq('character_id', character.id)
    .eq('quest_id', 'gather_wood')
    .maybeSingle()

  if (existingQuest) {
    console.log(`✅ Quest already accepted`)
    console.log(`   Status: ${existingQuest.status}`)
    console.log(`   Progress: ${JSON.stringify(existingQuest.progress)}`)

    // Reset progress to 0 for testing
    console.log('   Resetting progress to 0 for test...')
    await supabase
      .from('quests')
      .update({
        status: 'active',
        progress: {
          type: 'gather',
          current: 0,
          goal: expectedGoal,
          targetId: expectedTargetId
        }
      })
      .eq('character_id', character.id)
      .eq('quest_id', 'gather_wood')
    console.log('   ✅ Quest reset to 0/10')
  } else {
    console.log('   Quest not accepted, accepting now...')
    const { error: insertError } = await supabase
      .from('quests')
      .insert({
        character_id: character.id,
        quest_id: 'gather_wood',
        status: 'active',
        progress: {
          type: 'gather',
          current: 0,
          goal: expectedGoal,
          targetId: expectedTargetId
        }
      })

    if (insertError) {
      console.error('❌ Error accepting quest:', insertError)
      return
    }
    console.log('   ✅ Quest accepted')
  }

  // Step 4: Simulate trackQuestProgress
  console.log('\n📋 Step 4: Simulating trackQuestProgress...')

  const eventType = 'gather'
  const eventData = {
    targetId: 'oak_log',
    amount: 10
  }

  console.log(`   Event Type: "${eventType}"`)
  console.log(`   Event Data: ${JSON.stringify(eventData)}`)

  // Get active quests
  console.log('\n   Fetching active quests...')
  const { data: quests, error: questsError } = await supabase
    .from('quests')
    .select('id, quest_id, progress')
    .eq('character_id', character.id)
    .eq('status', 'active')

  if (questsError) {
    console.error('❌ Error fetching quests:', questsError)
    return
  }

  console.log(`   ✅ Found ${quests?.length || 0} active quest(s)`)

  if (!quests || quests.length === 0) {
    console.error('❌ No active quests found!')
    return
  }

  // Process each quest
  let updatedAny = false
  for (const quest of quests) {
    const progress = quest.progress

    console.log(`\n   ⚙️  Processing quest: ${quest.quest_id}`)
    console.log(`      Progress Type: "${progress.type}"`)
    console.log(`      Progress TargetId: "${progress.targetId}"`)
    console.log(`      Progress Current: ${progress.current}`)
    console.log(`      Progress Goal: ${progress.goal}`)

    // Check if type matches
    if (progress.type !== eventType) {
      console.log(`      ⏭️  Skipped (type mismatch: "${progress.type}" !== "${eventType}")`)
      continue
    }

    // Check if targetId matches
    if (progress.targetId && progress.targetId !== eventData.targetId) {
      console.log(`      ⏭️  Skipped (targetId mismatch: "${progress.targetId}" !== "${eventData.targetId}")`)
      continue
    }

    console.log(`      ✅ Quest matches! Updating progress...`)

    // Calculate new progress
    const newCurrent = progress.current + (eventData.amount || 1)
    const finalProgress = Math.min(newCurrent, progress.goal)

    console.log(`      📊 Progress: ${progress.current} + ${eventData.amount} = ${newCurrent}`)
    console.log(`      📊 Final (capped): ${finalProgress} / ${progress.goal}`)

    // Update in database
    const { data: updated, error: updateError } = await supabase
      .from('quests')
      .update({
        progress: {
          ...progress,
          current: finalProgress
        }
      })
      .eq('character_id', character.id)
      .eq('quest_id', quest.quest_id)
      .eq('status', 'active')
      .select()
      .single()

    if (updateError) {
      console.error('      ❌ Error updating quest:', updateError)
      return
    }

    console.log(`      ✅ Quest updated successfully!`)
    console.log(`      New progress: ${JSON.stringify(updated.progress)}`)
    updatedAny = true
  }

  if (!updatedAny) {
    console.log('\n⚠️  WARNING: No quests were updated! Check the matching logic.')
  }

  // Step 5: Verify final state
  console.log('\n📋 Step 5: Verifying final quest state...')
  const { data: finalQuest } = await supabase
    .from('quests')
    .select('*')
    .eq('character_id', character.id)
    .eq('quest_id', 'gather_wood')
    .single()

  if (finalQuest) {
    const finalProgress = finalQuest.progress
    console.log(`✅ Final Quest State:`)
    console.log(`   Status: ${finalQuest.status}`)
    console.log(`   Progress: ${finalProgress.current} / ${finalProgress.goal}`)

    if (finalProgress.current >= finalProgress.goal) {
      console.log(`\n🎉 SUCCESS! Quest is ready to complete!`)
    } else {
      console.log(`\n⚠️  Quest is not complete yet (${finalProgress.current}/${finalProgress.goal})`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Test completed!\n')
}

// Run the test
testQuestTracking().catch(error => {
  console.error('\n❌ Test failed with error:', error)
  process.exit(1)
})
