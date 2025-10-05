-- =====================================================================================
-- DISABLE ROW LEVEL SECURITY ON ALL TABLES
-- =====================================================================================
-- WARNING: This disables all security policies and makes your database completely open.
-- This should only be used for development purposes.
-- =====================================================================================

-- Disable RLS on all main tables
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.characters DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.character_skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.enemies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.active_combat DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.combat_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gathering_nodes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.active_gathering DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.material_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.active_crafting DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.active_auto_gathering DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.character_quests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.character_travel DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.zone_discoveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.zone_unlocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exploration_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exploration_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crafting_recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.merchant_listings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transaction_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exploration_zones DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.node_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.world_zones DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.class_abilities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.character_abilities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.character_skill_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quest_definitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.achievements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.character_achievements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.node_spawn_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gathering_contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.character_contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contract_history DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to clean up
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                      pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Grant full permissions to authenticated and anon users on all tables
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated', tbl.tablename);
    END LOOP;
END $$;

-- Grant usage and update on all sequences
DO $$
DECLARE
    seq RECORD;
BEGIN
    FOR seq IN
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE format('GRANT USAGE, UPDATE ON SEQUENCE public.%I TO anon, authenticated', seq.sequence_name);
    END LOOP;
END $$;

-- Grant execute on all functions
DO $$
DECLARE
    func RECORD;
BEGIN
    FOR func IN
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
    LOOP
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I TO anon, authenticated', func.routine_name);
    END LOOP;
END $$;

-- Confirmation message
DO $$
BEGIN
    RAISE NOTICE 'Row Level Security has been DISABLED on all tables.';
    RAISE NOTICE 'WARNING: Your database is now completely open!';
    RAISE NOTICE 'This configuration should only be used for development.';
END $$;