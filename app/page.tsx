import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Game from '@/components/Game'
import CharacterCreation from '@/components/CharacterCreation'

export default async function Home() {
  const supabase = await createClient()

  // Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no user, middleware will redirect to /login
  if (!user) {
    redirect('/login')
  }

  // Check if user has a profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // If no profile, create one
  if (!profile) {
    const { error } = await supabase.from('profiles').insert([
      {
        id: user.id,
        username: user.email?.split('@')[0] || 'player',
        email: user.email,
      },
    ])

    if (error) {
      console.error('Error creating profile:', error)
    }
  }

  // Check if user has a character
  const { data: character } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // If no character, show character creation
  if (!character) {
    return <CharacterCreation userId={user.id} />
  }

  // User has character, show game
  return <Game initialUser={user} initialProfile={profile} initialCharacter={character} />
}
