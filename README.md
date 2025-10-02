# Eternal Realms - Idle RPG Game

An immersive idle RPG built with Next.js, Supabase, and TypeScript.

> 📚 **Documentation**: All detailed documentation, implementation guides, and technical references are in [`/docs`](docs/README.md)

## Features

✅ **Implemented**

**Phase 1: Core Systems**
- User authentication with email/username/password
- Character creation and management
- Real-time character stats tracking
- Idle experience and gold generation
- Persistent data storage with Supabase
- Row-level security for data protection
- Responsive UI with Tailwind CSS

**Phase 2: Inventory & Equipment**
- Complete inventory system with grid display
- Equipment system with stat bonuses
- Item catalog with rarity tiers
- Smart item stacking for consumables
- Equipment slots (weapon, armor, accessories)
- Automatic stat calculation from equipped items

**Phase 3: Combat System** ⚔️
- Turn-based combat mechanics
- 7 unique enemies with varying difficulty
- Damage calculation with variance
- Loot drop system with probability tables
- Experience and gold rewards
- Victory/defeat modals with rewards display
- Combat history tracking
- Health management and penalties

🚧 **Coming Soon**
- Auto-battle and idle combat
- Boss battles and dungeons
- Quests and storylines
- Skills and abilities system
- Achievements system
- Multiplayer features

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth with custom username system

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works fine)

### 1. Clone and Install

```bash
cd MyIdleGameOfDestiny
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for your project to be set up
3. Go to Project Settings → API
4. Copy your project URL and anon/public key

### 3. Configure Environment Variables

Create or update `.env.local`:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NODE_ENV=development
```

### 4. Set Up Database

Follow the instructions in `supabase/README.md` to run the database migration.

**Quick method:**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20241001000000_initial_schema.sql`
4. Paste and run in the SQL Editor

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Create Your First Character

1. Enter a username (3-20 characters, letters, numbers, underscores)
2. Click "Create Account"
3. Choose a character name
4. Start your adventure!

## Project Structure

```
.
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page with auth/game routing
│   └── globals.css         # Global styles
├── components/
│   ├── Auth.tsx            # Authentication component
│   ├── CharacterCreation.tsx  # Character creation flow
│   └── Game.tsx            # Main game interface
├── lib/
│   ├── supabase.ts         # Supabase client and types
│   ├── auth.ts             # Authentication utilities
│   ├── character.ts        # Character management
│   └── store.ts            # Zustand state management
├── supabase/
│   ├── migrations/         # Database migrations
│   └── README.md           # Supabase setup guide
└── README.md               # This file
```

## How It Works

### Authentication
- Users create accounts with just a username
- Behind the scenes, a unique email is generated (`username@eternalrealms.game`)
- Credentials are stored in localStorage for convenience
- Supabase handles all auth and session management

### Character System
- Each user gets one character
- Characters earn experience and gold automatically (idle mechanics)
- Stats increase on level up
- All data is synced to Supabase in real-time

### Database
- PostgreSQL with Row Level Security (RLS)
- Users can only access their own data
- Automatic profile creation via database triggers
- Optimized with indexes for performance

## Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Adding New Features

1. Update database schema in `supabase/migrations/`
2. Add TypeScript types in `lib/supabase.ts`
3. Create utility functions in `lib/`
4. Build UI components in `components/`
5. Update game logic in `components/Game.tsx`

## Security

- All tables use Row Level Security (RLS)
- Users can only read/write their own data
- Auth tokens are handled securely by Supabase
- Passwords are never exposed to the client

## Troubleshooting

For detailed troubleshooting guides, see:
- **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[docs/BUG_FIX_REPORT.md](docs/BUG_FIX_REPORT.md)** - Recent bug fixes

### Quick Fixes

**"Missing Supabase environment variables"**
- Make sure `.env.local` exists and has valid credentials
- Restart the dev server after adding environment variables

**Database errors**
- Verify the migration was run successfully
- Check RLS policies are enabled in Supabase dashboard
- Ensure your Supabase project is active

**Characters not saving**
- Check browser console for errors
- Verify Supabase credentials are correct
- Check network tab for failed API requests

## Contributing

This is a learning project, but feel free to fork and customize!

## License

MIT

## Acknowledgments

Built following the Eternal Realms implementation plan with Supabase integration.
