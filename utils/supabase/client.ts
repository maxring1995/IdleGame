import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // In Next.js, env vars are embedded at build time for client components
  // They should be available via process.env in the browser bundle
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase Client] ERROR: Missing environment variables!')
    console.error('[Supabase Client] This usually means the dev server needs to be restarted.')
    console.error('[Supabase Client] NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl || 'MISSING')
    console.error('[Supabase Client] NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET (hidden)' : 'MISSING')
    console.error('[Supabase Client] Available env keys:', Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')))

    throw new Error(
      'Missing Supabase environment variables. ' +
      'Make sure .env.local exists and restart the dev server with: npm run dev'
    )
  }

  console.log('[Supabase Client] ✅ Initialized successfully')

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
