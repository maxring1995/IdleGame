# Supabase Setup Instructions

## Prerequisites
- A Supabase account (https://supabase.com)
- Supabase CLI installed (optional, but recommended)

## Setup Steps

### 1. Create a New Supabase Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in your project details:
   - Name: "Eternal Realms"
   - Database Password: (choose a strong password)
   - Region: (choose the closest to your users)
4. Wait for the project to be created

### 2. Get Your API Credentials
1. In your project dashboard, go to Settings → API
2. Copy the following values:
   - **Project URL**: Your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key**: Your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Update your `.env.local` file with these values

### 3. Run the Database Migration
There are two ways to set up your database:

#### Option A: Using Supabase Dashboard (Easiest)
1. In your Supabase project, go to "SQL Editor"
2. Click "New Query"
3. Copy the contents of `migrations/20241001000000_initial_schema.sql`
4. Paste into the SQL editor
5. Click "Run"

#### Option B: Using Supabase CLI (Recommended for development)
```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

### 4. Verify Setup
After running the migration, verify in your Supabase dashboard:
1. Go to "Database" → "Tables"
2. You should see the following tables:
   - profiles
   - characters
   - inventory
   - quests
   - achievements

### 5. Configure Authentication
1. Go to Authentication → Providers
2. Enable "Email" provider
3. Disable email confirmation for development (optional):
   - Go to Authentication → Settings
   - Under "Email Auth", disable "Confirm email"

## Database Schema Overview

### Tables
- **profiles**: User profile information
- **characters**: Player characters with stats and resources
- **inventory**: Character items and equipment
- **quests**: Active and completed quests
- **achievements**: Unlocked achievements

### Security
All tables use Row Level Security (RLS) to ensure users can only access their own data.

## Development Notes

- The migration creates all necessary tables, indexes, and RLS policies
- User profiles are automatically created via a trigger when a new user signs up
- Each user can have one character (enforced by UNIQUE constraint)
- All timestamps use TIMESTAMPTZ for proper timezone handling
