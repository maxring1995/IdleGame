// Unit tests for pure travel calculation functions
// These don't require database access

describe('Travel Time Calculation', () => {
  // Pure function for travel time - extracted for testing
  function calculateTravelTime(
    baseTime: number,
    modifiers: {
      characterLevel: number
      weather?: string
      buffs?: Array<{ type: string; value: number }>
    },
    connectionType: string
  ): number {
    let time = baseTime

    // Weather effects
    if (modifiers.weather === 'blizzard') time *= 1.5
    if (modifiers.weather === 'fog') time *= 1.2
    if (modifiers.weather === 'clear') time *= 0.9

    // Character level bonus
    const levelBonus = 1 - (modifiers.characterLevel * 0.002)
    time *= Math.max(levelBonus, 0.8)

    // Connection type modifiers
    if (connectionType === 'portal') time *= 0.1
    if (connectionType === 'teleport') time *= 0.05
    if (connectionType === 'secret_passage') time *= 1.3

    // Buffs
    if (modifiers.buffs) {
      modifiers.buffs.forEach(buff => {
        if (buff.type === 'travel_speed') {
          time *= (1 - buff.value)
        }
      })
    }

    return Math.max(Math.floor(time), 5)
  }

  it('should return base time with minimal modifiers', () => {
    const time = calculateTravelTime(60, { characterLevel: 1 }, 'path')
    expect(time).toBeGreaterThanOrEqual(5)
    expect(time).toBeLessThanOrEqual(60)
  })

  it('should reduce time for high-level characters', () => {
    const lowLevel = calculateTravelTime(60, { characterLevel: 1 }, 'path')
    const highLevel = calculateTravelTime(60, { characterLevel: 50 }, 'path')
    expect(highLevel).toBeLessThan(lowLevel)
  })

  it('should increase time in bad weather', () => {
    const clear = calculateTravelTime(60, { characterLevel: 10, weather: 'clear' }, 'path')
    const blizzard = calculateTravelTime(60, { characterLevel: 10, weather: 'blizzard' }, 'path')
    expect(blizzard).toBeGreaterThan(clear)
  })

  it('should make portals nearly instant', () => {
    const portal = calculateTravelTime(60, { characterLevel: 10 }, 'portal')
    expect(portal).toBeLessThan(10)
  })

  it('should apply speed buffs correctly', () => {
    const noBuff = calculateTravelTime(60, { characterLevel: 10 }, 'path')
    const withBuff = calculateTravelTime(60, {
      characterLevel: 10,
      buffs: [{ type: 'travel_speed', value: 0.5 }]
    }, 'path')
    expect(withBuff).toBeLessThan(noBuff)
  })

  it('should enforce minimum travel time of 5 seconds', () => {
    const time = calculateTravelTime(1, {
      characterLevel: 100,
      weather: 'clear',
      buffs: [{ type: 'travel_speed', value: 0.9 }]
    }, 'teleport')
    expect(time).toBe(5)
  })

  it('should cap level reduction at 20%', () => {
    const maxLevel = calculateTravelTime(100, { characterLevel: 200 }, 'path')
    const expectedMin = 100 * 0.8 // 20% reduction cap
    expect(maxLevel).toBeGreaterThanOrEqual(expectedMin - 1) // Allow for rounding
  })
})

describe('Travel Encounter Roll', () => {
  function rollTravelEncounter(
    characterLevel: number,
    dangerLevel: number,
    connectionType: string
  ) {
    // Portals/teleports have no encounters
    if (connectionType === 'portal' || connectionType === 'teleport') {
      return { type: 'none' }
    }

    // Calculate encounter chance
    let encounterChance = 0.20
    encounterChance += (dangerLevel / 200)
    if (connectionType === 'secret_passage') encounterChance += 0.15
    if (connectionType === 'path') encounterChance -= 0.10

    if (Math.random() > encounterChance) {
      return { type: 'none' }
    }

    // Roll encounter type
    const roll = Math.random()
    if (roll < 0.40) {
      return {
        type: 'combat',
        data: {
          message: 'You encounter enemies on the road!',
          enemyLevel: Math.max(1, characterLevel + Math.floor(Math.random() * 3) - 1)
        }
      }
    }
    if (roll < 0.65) {
      return {
        type: 'loot',
        data: {
          message: 'You discover a hidden cache!',
          gold: Math.floor(Math.random() * characterLevel * 10) + 10
        }
      }
    }
    if (roll < 0.85) {
      return {
        type: 'merchant',
        data: { message: 'A traveling merchant appears.' }
      }
    }
    return {
      type: 'lore',
      data: { message: 'You find something interesting.' }
    }
  }

  it('should never return encounters for portals', () => {
    for (let i = 0; i < 50; i++) {
      const encounter = rollTravelEncounter(10, 50, 'portal')
      expect(encounter.type).toBe('none')
    }
  })

  it('should never return encounters for teleports', () => {
    for (let i = 0; i < 50; i++) {
      const encounter = rollTravelEncounter(10, 50, 'teleport')
      expect(encounter.type).toBe('none')
    }
  })

  it('should return valid encounter types', () => {
    const validTypes = ['none', 'combat', 'loot', 'merchant', 'lore']
    for (let i = 0; i < 30; i++) {
      const encounter = rollTravelEncounter(10, 50, 'path')
      expect(validTypes).toContain(encounter.type)
    }
  })

  it('should include data for non-none encounters', () => {
    let foundEncounter = false
    for (let i = 0; i < 100; i++) {
      const encounter = rollTravelEncounter(10, 70, 'secret_passage')
      if (encounter.type !== 'none') {
        expect(encounter.data).toBeDefined()
        foundEncounter = true
        break
      }
    }
    expect(foundEncounter).toBe(true)
  })

  it('should generate appropriate enemy levels for combat', () => {
    const characterLevel = 25
    let foundCombat = false

    for (let i = 0; i < 200; i++) {
      const encounter = rollTravelEncounter(characterLevel, 60, 'path')
      if (encounter.type === 'combat') {
        expect(encounter.data.enemyLevel).toBeGreaterThanOrEqual(1)
        expect(encounter.data.enemyLevel).toBeLessThanOrEqual(characterLevel + 3)
        foundCombat = true
        break
      }
    }
    expect(foundCombat).toBe(true)
  })
})
