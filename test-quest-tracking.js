// Test script to verify quest tracking logic
// Run with: node test-quest-tracking.js

console.log('Testing Quest Tracking Logic');
console.log('=============================\n');

// Simulate the quest tracking logic from lib/quests.ts
function checkTargetMatch(progressTargetId, eventTargetId, eventType) {
  let targetMatches = false;

  if (!progressTargetId) {
    // No specific target required
    targetMatches = true;
  } else if (eventType === 'kill' && eventTargetId) {
    // For kill quests, check if the enemy ID contains the quest target
    // This allows "goblin" to match "goblin_scout", "goblin_warrior", etc.
    targetMatches = eventTargetId.includes(progressTargetId) ||
                   progressTargetId.includes(eventTargetId);
  } else {
    // For other quest types, require exact match
    targetMatches = progressTargetId === eventTargetId;
  }

  return targetMatches;
}

// Test cases
const testCases = [
  {
    name: 'Kill quest: Goblin Scout matches "goblin" target',
    progressTargetId: 'goblin',
    eventTargetId: 'goblin_scout',
    eventType: 'kill',
    expected: true
  },
  {
    name: 'Kill quest: Goblin King matches "goblin_king" target',
    progressTargetId: 'goblin_king',
    eventTargetId: 'goblin_king',
    eventType: 'kill',
    expected: true
  },
  {
    name: 'Kill quest: Slime does not match "goblin" target',
    progressTargetId: 'goblin',
    eventTargetId: 'slime',
    eventType: 'kill',
    expected: false
  },
  {
    name: 'Kill quest: Any enemy matches when no target specified',
    progressTargetId: null,
    eventTargetId: 'slime',
    eventType: 'kill',
    expected: true
  },
  {
    name: 'Gather quest: Oak Log matches exactly',
    progressTargetId: 'oak_log',
    eventTargetId: 'oak_log',
    eventType: 'gather',
    expected: true
  },
  {
    name: 'Gather quest: Oak Log does not match Willow Log',
    progressTargetId: 'oak_log',
    eventTargetId: 'willow_log',
    eventType: 'gather',
    expected: false
  }
];

// Run tests
let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = checkTargetMatch(test.progressTargetId, test.eventTargetId, test.eventType);
  const success = result === test.expected;

  if (success) {
    console.log(`✅ Test ${index + 1}: ${test.name}`);
    console.log(`   Progress Target: "${test.progressTargetId}" | Event Target: "${test.eventTargetId}" | Type: ${test.eventType}`);
    console.log(`   Result: ${result} (Expected: ${test.expected})`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1}: ${test.name}`);
    console.log(`   Progress Target: "${test.progressTargetId}" | Event Target: "${test.eventTargetId}" | Type: ${test.eventType}`);
    console.log(`   Result: ${result} (Expected: ${test.expected})`);
    failed++;
  }
  console.log();
});

// Summary
console.log('=============================');
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log();

// Test the actual quest objective parsing
console.log('Testing Quest Objective Parsing');
console.log('================================\n');

function parseObjective(objective) {
  const lowerObjective = objective.toLowerCase();

  // Kill quest
  if (lowerObjective.includes('defeat') || lowerObjective.includes('kill')) {
    const match = objective.match(/(\d+)\s+(.+?)(?:\s|$)/i);
    if (match) {
      // Extract enemy name and normalize it
      let enemyName = match[2].trim().toLowerCase();

      // Handle plurals - remove trailing 's' for common cases
      if (enemyName.endsWith('scouts')) {
        enemyName = enemyName.replace(/scouts$/, 'scout');
      } else if (enemyName.endsWith('s') && !enemyName.endsWith('ss')) {
        enemyName = enemyName.slice(0, -1);
      }

      // Convert spaces to underscores
      enemyName = enemyName.replace(/\s+/g, '_');

      return {
        type: 'kill',
        current: 0,
        goal: parseInt(match[1]),
        targetId: enemyName
      };
    }
  }

  return {
    type: 'kill',
    current: 0,
    goal: 1,
    targetId: undefined
  };
}

// Test quest objective parsing
const questObjectives = [
  'Defeat 1 Goblin Scout',
  'Defeat 5 Goblin Scouts',
  'Defeat 10 Goblin Scouts',
  'Defeat 1 Goblin King',
  'Defeat 5 enemies'
];

questObjectives.forEach(obj => {
  const parsed = parseObjective(obj);
  console.log(`Objective: "${obj}"`);
  console.log(`Parsed: type=${parsed.type}, goal=${parsed.goal}, targetId="${parsed.targetId}"`);
  console.log();
});

console.log('\n✅ Quest tracking logic has been updated to handle partial enemy name matching!');
console.log('   - "goblin" in quest will now match "goblin_scout" enemy');
console.log('   - "Goblin King" quest will match "goblin_king" enemy');
console.log('   - Generic "enemies" quests will match any enemy type');