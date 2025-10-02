# Troubleshooting: Varför kommer jag direkt till CharacterCreation?

## Ditt Specifika Problem

Du har rapporterat:
- ✅ När du loggar ut → kommer till `/login` (korrekt)
- ❌ När du startar appen → går direkt till CharacterCreation (inte `/login`)

## Möjliga Orsaker

### 1. **Du har en aktiv session i browsern** (TROLIGAST)

**Vad som händer:**
```
Browser har cookie → middleware ser user → går till /
→ app/page.tsx ser user men ingen character i cache
→ visar CharacterCreation
```

**Databas-verifiering:**
Din användare `max.ring@webdoc.com` har:
- ✅ Profil: `localytestuser`
- ✅ Karaktär: `indate`

Men något är fel med cache/session-hanteringen.

### 2. **Next.js Cache Problem**

Server-side komponenten `app/page.tsx` kan ha cachat ett gammalt tillstånd där karaktären inte fanns.

### 3. **Cookie/Session Mismatch**

Browser-cookies kan peka på en gammal session där karaktären inte fanns ännu.

## Lösningar

### Lösning 1: Rensa Browser-Session (ENKLAST)

```bash
# I browsern:
1. Öppna Developer Tools (F12)
2. Application/Storage → Cookies
3. Ta bort alla cookies för localhost:3000
4. Ladda om sidan
5. Du ska nu komma till /login
```

### Lösning 2: Rensa Next.js Cache

```bash
# I terminalen:
rm -rf .next
npm run dev
```

### Lösning 3: Incognito/Private Window

Öppna appen i ett inkognitofönster för att testa "ren" session.

### Lösning 4: Skapa ny testanvändare

```typescript
// I /login:
Email: test-new-user@example.com
Password: testpassword123
```

Detta ska ge dig det korrekta flödet:
1. /login (inloggningssida)
2. Skapa konto
3. → Redirectas till /
4. → app/page.tsx ser ingen character
5. → Visar CharacterCreation
6. Skapa character
7. → Redirectas till Game

## Förväntat Flöde

### Första Gången (Ny Användare)
```
1. Besök localhost:3000
2. Middleware: Ingen session → redirect till /login ✅
3. /login: Visa inloggningsformulär ✅
4. User fyller i email/password → signup
5. Redirect till / (home)
6. app/page.tsx: User finns, profil finns (auto-skapad), men INGEN character
7. Visa CharacterCreation ✅
8. User skapar character
9. Server action → redirect till /
10. app/page.tsx: User finns, character finns
11. Visa Game ✅
```

### Nästa Gång (Befintlig Användare)
```
1. Besök localhost:3000
2. Middleware: Session finns → tillåt access till /
3. app/page.tsx: User finns, character finns
4. Visa Game direkt ✅
```

### Efter Logout
```
1. Klicka "Sign Out"
2. signOut() action → redirect till /login ✅
3. /login: Visa inloggningsformulär ✅
```

## Debug: Kontrollera Vad Som Händer

Lägg till logging i `app/page.tsx`:

```typescript
export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  console.log('🔍 DEBUG - User:', user?.email)

  if (!user) {
    console.log('❌ No user, redirecting to /login')
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  console.log('🔍 DEBUG - Profile:', profile?.username)

  const { data: character } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', user.id)
    .single()

  console.log('🔍 DEBUG - Character:', character?.name)

  if (!character) {
    console.log('⚠️ No character found, showing CharacterCreation')
    return <CharacterCreation userId={user.id} />
  }

  console.log('✅ All good, showing Game')
  return <Game initialUser={user} initialProfile={profile} initialCharacter={character} />
}
```

Kör sedan:
```bash
npm run dev
# Öppna http://localhost:3000
# Kolla terminalen för console.log output
```

## Förväntad Output

### Om du har session men ingen character:
```
🔍 DEBUG - User: max.ring@webdoc.com
🔍 DEBUG - Profile: localytestuser
🔍 DEBUG - Character: undefined
⚠️ No character found, showing CharacterCreation
```

### Om du har session OCH character:
```
🔍 DEBUG - User: max.ring@webdoc.com
🔍 DEBUG - Profile: localytestuser
🔍 DEBUG - Character: indate
✅ All good, showing Game
```

### Om ingen session:
```
❌ No user, redirecting to /login
```

## Ditt Specifika Fall

Baserat på databasen har du:
- User: `max.ring@webdoc.com`
- Profile: `localytestuser`
- Character: `indate`

**Du borde se Game-skärmen, inte CharacterCreation!**

Detta tyder på att Supabase-queryn i `app/page.tsx` misslyckades att hämta karaktären.

### Möjliga orsaker:

1. **RLS Policy blockerar** - Men vi har verifierat policies ✅
2. **user_id mismatch** - Profil-ID matchar inte character.user_id
3. **Cache issue** - Next.js cachar gammalt state
4. **Session corruption** - Browser-cookies är korrupta

### Snabb Fix

```bash
# 1. Rensa allt
rm -rf .next
rm -rf node_modules/.cache

# 2. Starta om
npm run dev

# 3. I browsern:
# - Öppna DevTools (F12)
# - Console → kör: localStorage.clear(); sessionStorage.clear();
# - Application → Clear site data
# - Ladda om sidan
```

Då ska du komma till `/login` som en helt ny användare.

## Verifiering

För att verifiera att allt fungerar korrekt:

```bash
# Terminal 1: Starta server
npm run dev

# Terminal 2: Kör test
npx playwright test tests/auth.spec.ts --headed
```

Detta testar hela flödet från början till slut.
