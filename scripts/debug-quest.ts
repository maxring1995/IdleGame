/**
 * Debug script to test quest tracking
 */

// Simulate the data flow:
const questObjective = "Gather 10 Oak Log"
const materialId = "oak_log"

// Parse objective (from quests.ts parseObjective function)
const match = questObjective.match(/(\d+)\s+([\w\s]+)/i)
const targetId = match ? match[2].trim().toLowerCase().replace(/\s+/g, '_') : undefined

console.log('=== Quest Debug ===')
console.log('Quest Objective:', questObjective)
console.log('Parsed targetId:', targetId)
console.log('Material ID:', materialId)
console.log('Match:', targetId === materialId ? '✅ MATCH' : '❌ MISMATCH')
console.log('')

// Simulate trackQuestProgress call
console.log('=== Track Quest Progress Call ===')
console.log('Event Type:', 'gather')
console.log('Event Data:', { targetId: materialId, amount: 10 })
console.log('')

// Check matching logic
if (targetId && targetId !== materialId) {
  console.log('❌ Would SKIP due to targetId mismatch')
} else {
  console.log('✅ Would UPDATE quest progress')
}
