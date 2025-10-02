# 🚀 Quick Start Guide

Get Eternal Realms running in 5 minutes!

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in/create an account
2. Click **"New Project"**
3. Fill in the details:
   - **Name**: Eternal Realms (or any name you like)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Pick the closest to you
4. Click **"Create new project"**
5. Wait 2-3 minutes for your project to set up

## Step 2: Get Your API Credentials

1. In your Supabase project dashboard, click **Settings** (gear icon) in the sidebar
2. Click **API** in the settings menu
3. You'll see two important values:
   - **Project URL** (looks like: `https://abcdefghijk.supabase.co`)
   - **anon public** key (under "Project API keys", looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
4. Keep this page open, you'll need these values!

## Step 3: Configure Your Local Environment

1. Open `.env.local` in this project
2. Replace the placeholder values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR-KEY-HERE
   ```
3. Save the file

## Step 4: Set Up the Database

### Option A: Via Supabase Dashboard (Easiest)

1. In your Supabase dashboard, go to **SQL Editor** (database icon in sidebar)
2. Click **"New query"**
3. Open the file `supabase/migrations/20241001000000_initial_schema.sql` in this project
4. Copy all the SQL code
5. Paste it into the Supabase SQL Editor
6. Click **"Run"** (or press Cmd/Ctrl + Enter)
7. You should see: "Success. No rows returned"

### Option B: Via Supabase CLI (Advanced)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (get project ref from dashboard URL)
supabase link --project-ref your-project-ref

# Push the migration
supabase db push
```

## Step 5: Verify Database Setup

1. In Supabase dashboard, go to **Table Editor**
2. You should see 5 tables:
   - ✅ profiles
   - ✅ characters
   - ✅ inventory
   - ✅ quests
   - ✅ achievements

If you see all 5 tables, you're good to go! 🎉

## Step 6: Configure Authentication (Optional but Recommended)

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. For development, you can disable email confirmation:
   - Go to **Authentication** → **Settings**
   - Scroll to **Email Auth**
   - **Disable** "Confirm email"

## Step 7: Run the Game!

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

You should see the login screen!

## First Time Playing

1. Enter a username (3-20 characters, letters/numbers/underscores)
2. Click **"Create Account"**
3. Enter a character name (2-30 characters, letters/spaces)
4. Click **"Begin Adventure"**

Your character will start earning experience and gold automatically! 🎮

## Troubleshooting

### "Supabase Not Configured" Warning
- Make sure you've updated `.env.local` with your actual credentials
- Restart the dev server: Stop it (Ctrl+C) and run `npm run dev` again

### Database Errors
- Check that you ran the SQL migration successfully
- In Supabase, go to Table Editor and verify the 5 tables exist

### Can't Sign Up
- Make sure the migration created the database trigger
- Check browser console (F12) for error messages
- Verify your Supabase URL and key are correct in `.env.local`

### Character Not Saving
- Check that RLS (Row Level Security) policies are enabled
- Go to Supabase → Table Editor → characters → Policies tab
- You should see several policies listed

## What's Next?

Check out `README.md` for:
- Full feature list
- Architecture overview
- How to add new features
- Contributing guidelines

## Need Help?

- Check the browser console (F12) for error messages
- Check Supabase logs: Dashboard → Logs
- Review the `supabase/README.md` for detailed setup info

---

**Happy gaming!** 🎮⚔️✨
