import { createClient } from '@/utils/supabase/server'
import Game from '@/components/Game'

/**
 * Direct character access for testing
 * Bypasses authentication and loads the "indate" character
 */
export default async function TestDirectPage() {
  const supabase = await createClient()

  // Get the user by email (using the actual "indate" character)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'max.ring@webdoc.com')
    .single()

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="panel p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Test User Not Found</h1>
          <p className="text-gray-400 mb-4">
            Could not find user with email "max.ring@webdoc.com"
          </p>
          <p className="text-sm text-gray-500">
            Character "indate" not found in database.
          </p>
        </div>
      </div>
    )
  }

  // Get the character for this profile
  const { data: character } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', profile.id)
    .single()

  if (!character) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="panel p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Character Not Found</h1>
          <p className="text-gray-400 mb-4">
            User "indate" exists but has no character.
          </p>
          <p className="text-sm text-gray-500">
            Please create a character for this user first.
          </p>
        </div>
      </div>
    )
  }

  // Create a mock user object for the Game component
  const mockUser = {
    id: profile.id,
    email: profile.email,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString()
  }

  return (
    <div>
      {/* Testing banner */}
      <div className="bg-yellow-900/50 border-b border-yellow-500/50 px-4 py-2 text-center">
        <p className="text-yellow-300 text-sm font-semibold">
          ⚠️ TESTING MODE - Direct Character Access (User: {profile.username}, Character: {character.character_name})
        </p>
      </div>

      <Game
        initialUser={mockUser as any}
        initialProfile={profile}
        initialCharacter={character}
      />
    </div>
  )
}
