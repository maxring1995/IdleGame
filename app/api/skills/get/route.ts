import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { characterId, skillType } = await request.json()

    if (!characterId || !skillType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Try to get existing skill
    const { data: existingSkill, error: getError } = await supabase
      .from('character_skills')
      .select('*')
      .eq('character_id', characterId)
      .eq('skill_type', skillType)
      .single()

    // If skill exists, return it
    if (existingSkill) {
      return NextResponse.json({ skill: existingSkill })
    }

    // If error is something other than "not found", return the error
    if (getError && getError.code !== 'PGRST116') {
      return NextResponse.json({ error: getError.message }, { status: 500 })
    }

    // Create new skill if it doesn't exist
    const { data: newSkill, error: createError } = await supabase
      .from('character_skills')
      .insert({
        character_id: characterId,
        skill_type: skillType,
        level: 1,
        experience: 0
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ skill: newSkill })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
