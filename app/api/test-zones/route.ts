import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()

  console.log('[test-zones] Querying zones...')

  const { data, error } = await supabase
    .from('world_zones')
    .select('*')
    .lte('required_level', 1)
    .order('required_level', { ascending: true })

  console.log('[test-zones] Result:', { data, error })

  return NextResponse.json({ data, error })
}
