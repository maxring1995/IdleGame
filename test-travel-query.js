// Quick test script to debug the 406 error
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testQuery() {
  console.log('Testing active_travels query...')

  const { data, error } = await supabase
    .from('active_travels')
    .select('*')
    .eq('character_id', '01173979-0c33-4a0a-a90c-c2817e5e1ede')
    .eq('status', 'traveling')

  console.log('Result:', { data, error })

  // Also test without the status filter
  console.log('\nTesting without status filter...')
  const { data: data2, error: error2 } = await supabase
    .from('active_travels')
    .select('*')
    .eq('character_id', '01173979-0c33-4a0a-a90c-c2817e5e1ede')

  console.log('Result:', { data: data2, error: error2 })
}

testQuery()
