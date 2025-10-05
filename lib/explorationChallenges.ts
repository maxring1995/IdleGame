import { supabase } from './supabase'
import type { ExplorationChallenge } from './supabase'

export type ChallengeType = 'timed' | 'puzzle' | 'riddle' | 'skill_check' | 'combat' | 'collection'
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard' | 'extreme'

/**
 * Get available challenges for a zone
 */
export async function getAvailableChallenges(
  zoneId: string,
  characterLevel: number
): Promise<{ data: ExplorationChallenge[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('exploration_challenges')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('is_active', true)
      .lte('min_level', characterLevel)
      .order('difficulty', { ascending: true })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Start a challenge
 */
export async function startChallenge(
  characterId: string,
  challengeId: string
): Promise<{
  data: {
    challenge: ExplorationChallenge
    start_time: string
    puzzle_data?: any
  } | null
  error: Error | null
}> {
  try {
    const { data: challenge, error: challengeError } = await supabase
      .from('exploration_challenges')
      .select('*')
      .eq('id', challengeId)
      .single()

    if (challengeError) throw challengeError

    // Check if character meets requirements
    const { data: character } = await supabase
      .from('characters')
      .select('level')
      .eq('id', characterId)
      .single()

    if (character && character.level < challenge.min_level) {
      throw new Error(`Requires level ${challenge.min_level}`)
    }

    const startTime = new Date().toISOString()

    // Generate puzzle data if it's a puzzle/riddle challenge
    let puzzleData
    if (challenge.challenge_type === 'puzzle') {
      puzzleData = generatePuzzle(challenge.difficulty)
    } else if (challenge.challenge_type === 'riddle') {
      puzzleData = generateRiddle(challenge.difficulty)
    }

    // Store active challenge
    await supabase.from('active_challenges').insert({
      character_id: characterId,
      challenge_id: challengeId,
      start_time: startTime,
      puzzle_data: puzzleData
    })

    return {
      data: {
        challenge,
        start_time: startTime,
        puzzle_data: puzzleData
      },
      error: null
    }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Complete a challenge
 */
export async function completeChallenge(
  characterId: string,
  challengeId: string,
  solution?: any
): Promise<{
  data: {
    success: boolean
    time_taken: number
    rewards: Record<string, any>
    message: string
  } | null
  error: Error | null
}> {
  try {
    // Get active challenge
    const { data: activeChallenge, error: activeError } = await supabase
      .from('active_challenges')
      .select('*')
      .eq('character_id', characterId)
      .eq('challenge_id', challengeId)
      .single()

    if (activeError) throw activeError

    // Get challenge details
    const { data: challenge, error: challengeError } = await supabase
      .from('exploration_challenges')
      .select('*')
      .eq('id', challengeId)
      .single()

    if (challengeError) throw challengeError

    // Calculate time taken
    const startTime = new Date(activeChallenge.start_time).getTime()
    const endTime = Date.now()
    const timeTaken = Math.floor((endTime - startTime) / 1000) // seconds

    let success = false
    let timeBonus = 1.0

    // Check challenge type
    if (challenge.challenge_type === 'timed') {
      success = timeTaken <= challenge.time_limit_seconds
      if (success && timeTaken < challenge.time_limit_seconds / 2) {
        timeBonus = 1.5 // Bonus for fast completion
      }
    } else if (challenge.challenge_type === 'puzzle' || challenge.challenge_type === 'riddle') {
      success = validateSolution(activeChallenge.puzzle_data, solution)
    } else if (challenge.challenge_type === 'skill_check') {
      const requiredSkill = challenge.requirements?.skill_type
      const requiredLevel = challenge.requirements?.skill_level || 10

      const { data: skill } = await supabase
        .from('exploration_skills')
        .select('level')
        .eq('character_id', characterId)
        .eq('skill_type', requiredSkill)
        .single()

      success = skill && skill.level >= requiredLevel
    } else {
      success = true // Other challenge types auto-succeed
    }

    // Calculate rewards
    const baseRewards = challenge.rewards as Record<string, any>
    const rewards: Record<string, any> = {}

    for (const [key, value] of Object.entries(baseRewards)) {
      if (typeof value === 'number') {
        rewards[key] = Math.floor(value * timeBonus * (success ? 1 : 0.3))
      } else {
        rewards[key] = value
      }
    }

    // Apply rewards
    if (success && rewards.gold) {
      await supabase
        .from('characters')
        .update({ gold: supabase.raw(`gold + ${rewards.gold}`) })
        .eq('id', characterId)
    }

    if (success && rewards.experience) {
      await supabase
        .from('characters')
        .update({ experience: supabase.raw(`experience + ${rewards.experience}`) })
        .eq('id', characterId)
    }

    // Mark challenge as completed
    await supabase
      .from('active_challenges')
      .delete()
      .eq('character_id', characterId)
      .eq('challenge_id', challengeId)

    // Log completion
    await supabase.from('exploration_event_history').insert({
      character_id: characterId,
      event_type: 'challenge',
      event_name: challenge.challenge_name,
      outcome: success ? 'success' : 'failure',
      rewards
    })

    const message = success
      ? `Challenge completed! ${challenge.success_message || 'Victory!'}`
      : `Challenge failed. ${challenge.failure_message || 'Try again.'}`

    return {
      data: {
        success,
        time_taken: timeTaken,
        rewards,
        message
      },
      error: null
    }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Generate puzzle data
 */
function generatePuzzle(difficulty: ChallengeDifficulty): any {
  const puzzleTypes = ['math', 'pattern', 'logic', 'sequence']
  const type = puzzleTypes[Math.floor(Math.random() * puzzleTypes.length)]

  if (type === 'math') {
    const complexity = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4
    const num1 = Math.floor(Math.random() * 50) + 1
    const num2 = Math.floor(Math.random() * 30) + 1
    const num3 = Math.floor(Math.random() * 20) + 1

    if (complexity === 2) {
      return {
        type: 'math',
        question: `What is ${num1} + ${num2}?`,
        answer: num1 + num2
      }
    } else if (complexity === 3) {
      return {
        type: 'math',
        question: `What is (${num1} + ${num2}) × ${num3}?`,
        answer: (num1 + num2) * num3
      }
    } else {
      return {
        type: 'math',
        question: `What is ${num1} × ${num2} - ${num3}?`,
        answer: num1 * num2 - num3
      }
    }
  } else if (type === 'pattern') {
    const sequence = [2, 4, 8, 16, 32]
    return {
      type: 'pattern',
      question: `Complete the sequence: ${sequence.slice(0, 4).join(', ')}, ?`,
      answer: 32
    }
  } else if (type === 'sequence') {
    const start = Math.floor(Math.random() * 10) + 1
    const step = Math.floor(Math.random() * 5) + 2
    return {
      type: 'sequence',
      question: `What comes next: ${start}, ${start + step}, ${start + step * 2}, ${start + step * 3}, ?`,
      answer: start + step * 4
    }
  }

  return {
    type: 'logic',
    question: 'If all Bloops are Razzies and all Razzies are Lazzies, are all Bloops definitely Lazzies?',
    answer: 'yes'
  }
}

/**
 * Generate riddle data
 */
function generateRiddle(difficulty: ChallengeDifficulty): any {
  const riddles = {
    easy: [
      {
        question: 'I speak without a mouth and hear without ears. I have no body, but come alive with wind. What am I?',
        answer: 'echo',
        hints: ['Think about sound', 'It repeats what you say']
      },
      {
        question: 'What has keys but no locks, space but no room, and you can enter but can\'t go inside?',
        answer: 'keyboard',
        hints: ['Found on a desk', 'Used for typing']
      }
    ],
    medium: [
      {
        question: 'The more you take, the more you leave behind. What am I?',
        answer: 'footsteps',
        hints: ['Think about walking', 'Traces of movement']
      },
      {
        question: 'I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?',
        answer: 'map',
        hints: ['Used for navigation', 'Shows the world']
      }
    ],
    hard: [
      {
        question: 'What can travel around the world while staying in a corner?',
        answer: 'stamp',
        hints: ['Found on mail', 'Small and adhesive']
      },
      {
        question: 'I am not alive, but I grow; I don\'t have lungs, but I need air; I don\'t have a mouth, but water kills me. What am I?',
        answer: 'fire',
        hints: ['It produces heat', 'It can spread']
      }
    ],
    extreme: [
      {
        question: 'What is seen in the middle of March and April that can\'t be seen at the beginning or end of either month?',
        answer: 'r',
        hints: ['Think about spelling', 'Look at the letters']
      },
      {
        question: 'I am taken from a mine, and shut up in a wooden case, from which I am never released, and yet I am used by almost every person. What am I?',
        answer: 'pencil lead',
        hints: ['Used for writing', 'Made of graphite']
      }
    ]
  }

  const riddleSet = riddles[difficulty] || riddles.easy
  const riddle = riddleSet[Math.floor(Math.random() * riddleSet.length)]

  return {
    type: 'riddle',
    question: riddle.question,
    answer: riddle.answer.toLowerCase(),
    hints: riddle.hints
  }
}

/**
 * Validate puzzle/riddle solution
 */
function validateSolution(puzzleData: any, solution: any): boolean {
  if (!puzzleData || !solution) return false

  if (puzzleData.type === 'math' || puzzleData.type === 'pattern' || puzzleData.type === 'sequence') {
    return parseInt(solution) === puzzleData.answer
  } else if (puzzleData.type === 'riddle' || puzzleData.type === 'logic') {
    return solution.toString().toLowerCase().trim() === puzzleData.answer.toLowerCase().trim()
  }

  return false
}

/**
 * Get hint for active puzzle
 */
export async function getHint(
  characterId: string,
  challengeId: string,
  hintIndex: number = 0
): Promise<{ data: string | null; error: Error | null }> {
  try {
    const { data: activeChallenge, error } = await supabase
      .from('active_challenges')
      .select('puzzle_data')
      .eq('character_id', characterId)
      .eq('challenge_id', challengeId)
      .single()

    if (error) throw error

    const hints = activeChallenge.puzzle_data?.hints || []
    if (hintIndex < hints.length) {
      return { data: hints[hintIndex], error: null }
    }

    return { data: 'No more hints available', error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Seed challenges for a zone
 */
export async function seedChallenges(zoneId: string, zoneLevel: number): Promise<void> {
  const challenges = [
    {
      challenge_name: 'Speed Trial',
      challenge_type: 'timed',
      description: 'Complete exploration within the time limit',
      difficulty: 'easy',
      time_limit_seconds: 120,
      min_level: zoneLevel,
      rewards: { gold: 100, experience: 50 },
      success_message: 'Lightning fast!',
      failure_message: 'Too slow...'
    },
    {
      challenge_name: 'Ancient Puzzle',
      challenge_type: 'puzzle',
      description: 'Solve the mysterious puzzle',
      difficulty: 'medium',
      time_limit_seconds: 300,
      min_level: zoneLevel + 2,
      rewards: { gold: 200, experience: 100, special_item: 'puzzle_box' },
      success_message: 'Brilliant mind!',
      failure_message: 'The puzzle remains unsolved...'
    },
    {
      challenge_name: 'Riddle of the Ancients',
      challenge_type: 'riddle',
      description: 'Answer the ancient riddle correctly',
      difficulty: 'hard',
      time_limit_seconds: 180,
      min_level: zoneLevel + 5,
      rewards: { gold: 300, experience: 150 },
      success_message: 'Wise one!',
      failure_message: 'The riddle stumps you...'
    },
    {
      challenge_name: 'Master Explorer',
      challenge_type: 'skill_check',
      description: 'Demonstrate exceptional exploration skills',
      difficulty: 'hard',
      min_level: zoneLevel + 3,
      requirements: { skill_type: 'cartography', skill_level: 15 },
      rewards: { gold: 250, experience: 125 },
      success_message: 'True explorer!',
      failure_message: 'More training needed...'
    }
  ]

  for (const challenge of challenges) {
    await supabase.from('exploration_challenges').insert({
      zone_id: zoneId,
      ...challenge,
      is_active: true
    })
  }
}
