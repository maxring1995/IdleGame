-- =====================================================================================
-- GATHERING CONTRACTS SYSTEM
-- =====================================================================================
-- Daily and weekly contracts for players to complete by gathering specific materials
-- Features:
-- - Contract templates with requirements and rewards
-- - Character contracts tracking progress
-- - Automatic reset times (daily at 5 AM UTC, weekly on Mondays)
-- - Contract history for completed contracts
-- - RPC functions for contract management
-- =====================================================================================

-- Create gathering_contracts table for contract templates
CREATE TABLE IF NOT EXISTS public.gathering_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_type TEXT NOT NULL CHECK (contract_type IN ('daily', 'weekly', 'special')),
    name TEXT NOT NULL,
    description TEXT,
    requirements JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {material_id, quantity}
    rewards JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {type, id?, amount}
    min_level INTEGER NOT NULL DEFAULT 1,
    max_level INTEGER NOT NULL DEFAULT 99,
    weight INTEGER NOT NULL DEFAULT 100, -- For weighted random selection
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create character_contracts table for active contracts
CREATE TABLE IF NOT EXISTS public.character_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES public.gathering_contracts(id) ON DELETE CASCADE,
    contract_type TEXT NOT NULL CHECK (contract_type IN ('daily', 'weekly', 'special')),
    progress JSONB NOT NULL DEFAULT '{}'::jsonb, -- material_id -> quantity gathered
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    is_claimed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate active contracts
    CONSTRAINT unique_active_contract UNIQUE (character_id, contract_id, is_claimed)
);

-- Create contract_history table for tracking completed contracts
CREATE TABLE IF NOT EXISTS public.contract_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.gathering_contracts(id) ON DELETE SET NULL,
    contract_name TEXT NOT NULL,
    contract_type TEXT NOT NULL CHECK (contract_type IN ('daily', 'weekly', 'special')),
    completed_at TIMESTAMPTZ NOT NULL,
    time_taken_seconds INTEGER,
    rewards_claimed JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_character_contracts_character_id ON public.character_contracts(character_id);
CREATE INDEX IF NOT EXISTS idx_character_contracts_expires_at ON public.character_contracts(expires_at);
CREATE INDEX IF NOT EXISTS idx_character_contracts_is_claimed ON public.character_contracts(is_claimed);
CREATE INDEX IF NOT EXISTS idx_contract_history_character_id ON public.contract_history(character_id);
CREATE INDEX IF NOT EXISTS idx_contract_history_completed_at ON public.contract_history(completed_at DESC);

-- =====================================================================================
-- RPC FUNCTIONS
-- =====================================================================================

-- Function to get available contracts for a character
CREATE OR REPLACE FUNCTION public.get_available_contracts(
    p_character_id UUID,
    p_contract_type TEXT
)
RETURNS TABLE (
    id UUID,
    contract_type TEXT,
    name TEXT,
    description TEXT,
    requirements JSONB,
    rewards JSONB,
    min_level INTEGER,
    max_level INTEGER,
    weight INTEGER,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_character_level INTEGER;
    v_active_count INTEGER;
    v_max_contracts INTEGER;
BEGIN
    -- Get character level
    SELECT level INTO v_character_level
    FROM characters
    WHERE characters.id = p_character_id;

    IF v_character_level IS NULL THEN
        RAISE EXCEPTION 'Character not found';
    END IF;

    -- Set max contracts based on type
    v_max_contracts := CASE p_contract_type
        WHEN 'daily' THEN 3
        WHEN 'weekly' THEN 2
        WHEN 'special' THEN 1
        ELSE 3
    END;

    -- Count active contracts of this type
    SELECT COUNT(*) INTO v_active_count
    FROM character_contracts cc
    WHERE cc.character_id = p_character_id
        AND cc.contract_type = p_contract_type
        AND cc.is_claimed = false
        AND cc.expires_at > NOW();

    -- If already at max, return empty
    IF v_active_count >= v_max_contracts THEN
        RETURN;
    END IF;

    -- Return available contracts
    -- Using table alias to avoid ambiguity
    RETURN QUERY
    SELECT
        gc.id,
        gc.contract_type,
        gc.name,
        gc.description,
        gc.requirements,
        gc.rewards,
        gc.min_level,
        gc.max_level,
        gc.weight,
        gc.is_active,
        gc.created_at,
        gc.updated_at
    FROM gathering_contracts gc
    WHERE gc.contract_type = p_contract_type
        AND gc.is_active = true
        AND gc.min_level <= v_character_level
        AND gc.max_level >= v_character_level
        AND NOT EXISTS (
            -- Exclude already accepted contracts
            SELECT 1
            FROM character_contracts cc2
            WHERE cc2.character_id = p_character_id
                AND cc2.contract_id = gc.id
                AND cc2.is_claimed = false
                AND cc2.expires_at > NOW()
        )
    ORDER BY RANDOM()
    LIMIT (v_max_contracts - v_active_count);
END;
$$;

-- Function to claim contract rewards
CREATE OR REPLACE FUNCTION public.claim_contract_rewards(
    p_character_id UUID,
    p_contract_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_character_contract RECORD;
    v_contract RECORD;
    v_reward JSONB;
    v_rewards_given JSONB := '[]'::jsonb;
    v_time_taken INTEGER;
BEGIN
    -- Get the character contract with contract details
    SELECT
        cc.*,
        gc.name as contract_name,
        gc.rewards
    INTO v_character_contract
    FROM character_contracts cc
    JOIN gathering_contracts gc ON gc.id = cc.contract_id
    WHERE cc.id = p_contract_id
        AND cc.character_id = p_character_id
        AND cc.is_completed = true
        AND cc.is_claimed = false;

    IF v_character_contract IS NULL THEN
        RAISE EXCEPTION 'Contract not found or not claimable';
    END IF;

    -- Process each reward
    FOR v_reward IN SELECT * FROM jsonb_array_elements(v_character_contract.rewards)
    LOOP
        IF v_reward->>'type' = 'gold' THEN
            -- Add gold
            UPDATE characters
            SET gold = gold + (v_reward->>'amount')::INTEGER
            WHERE characters.id = p_character_id;

        ELSIF v_reward->>'type' = 'xp' THEN
            -- Add experience
            UPDATE characters
            SET experience = experience + (v_reward->>'amount')::INTEGER
            WHERE characters.id = p_character_id;

            -- Check for level up
            UPDATE characters
            SET level = FLOOR(SQRT(experience / 100.0)) + 1
            WHERE characters.id = p_character_id;

        ELSIF v_reward->>'type' = 'item' THEN
            -- Add item to inventory
            INSERT INTO inventory (character_id, item_id, quantity)
            VALUES (p_character_id, (v_reward->>'id')::UUID, (v_reward->>'amount')::INTEGER)
            ON CONFLICT (character_id, item_id, slot)
            DO UPDATE SET quantity = inventory.quantity + (v_reward->>'amount')::INTEGER;
        END IF;

        v_rewards_given := v_rewards_given || v_reward;
    END LOOP;

    -- Mark contract as claimed
    UPDATE character_contracts
    SET is_claimed = true,
        claimed_at = NOW()
    WHERE character_contracts.id = p_contract_id;

    -- Calculate time taken
    v_time_taken := EXTRACT(EPOCH FROM (v_character_contract.completed_at - v_character_contract.started_at))::INTEGER;

    -- Add to history
    INSERT INTO contract_history (
        character_id,
        contract_id,
        contract_name,
        contract_type,
        completed_at,
        time_taken_seconds,
        rewards_claimed
    ) VALUES (
        p_character_id,
        v_character_contract.contract_id,
        v_character_contract.contract_name,
        v_character_contract.contract_type,
        v_character_contract.completed_at,
        v_time_taken,
        v_rewards_given
    );

    RETURN jsonb_build_object(
        'success', true,
        'rewards', v_rewards_given
    );
END;
$$;

-- =====================================================================================
-- ROW LEVEL SECURITY
-- =====================================================================================

-- Enable RLS on all tables
ALTER TABLE public.gathering_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_history ENABLE ROW LEVEL SECURITY;

-- Gathering contracts policies (read-only for all authenticated users)
CREATE POLICY "gathering_contracts_select_policy" ON public.gathering_contracts
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Character contracts policies
CREATE POLICY "character_contracts_select_policy" ON public.character_contracts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.character_id = character_contracts.character_id
        )
    );

CREATE POLICY "character_contracts_insert_policy" ON public.character_contracts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.character_id = character_contracts.character_id
        )
    );

CREATE POLICY "character_contracts_update_policy" ON public.character_contracts
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.character_id = character_contracts.character_id
        )
    );

-- Contract history policies
CREATE POLICY "contract_history_select_policy" ON public.contract_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.character_id = contract_history.character_id
        )
    );

CREATE POLICY "contract_history_insert_policy" ON public.contract_history
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.character_id = contract_history.character_id
        )
    );

-- =====================================================================================
-- SAMPLE CONTRACT DATA
-- =====================================================================================

-- Insert sample daily contracts
INSERT INTO public.gathering_contracts (contract_type, name, description, requirements, rewards, min_level, max_level, weight) VALUES
-- Beginner daily contracts (levels 1-20)
('daily', 'Wood Collector', 'Gather basic wood materials',
 '[{"material_id": "oak_log", "quantity": 10}]'::jsonb,
 '[{"type": "gold", "amount": 50}, {"type": "xp", "amount": 100}]'::jsonb,
 1, 20, 100),

('daily', 'Stone Gatherer', 'Mine some basic ores',
 '[{"material_id": "copper_ore", "quantity": 8}]'::jsonb,
 '[{"type": "gold", "amount": 60}, {"type": "xp", "amount": 120}]'::jsonb,
 1, 20, 100),

('daily', 'Fisherman''s Daily', 'Catch fresh fish',
 '[{"material_id": "raw_shrimp", "quantity": 15}]'::jsonb,
 '[{"type": "gold", "amount": 40}, {"type": "xp", "amount": 80}]'::jsonb,
 1, 20, 100),

-- Intermediate daily contracts (levels 10-40)
('daily', 'Lumberjack''s Task', 'Gather quality wood',
 '[{"material_id": "willow_log", "quantity": 12}, {"material_id": "oak_log", "quantity": 8}]'::jsonb,
 '[{"type": "gold", "amount": 150}, {"type": "xp", "amount": 300}]'::jsonb,
 10, 40, 100),

('daily', 'Miner''s Duty', 'Collect various ores',
 '[{"material_id": "iron_ore", "quantity": 10}, {"material_id": "copper_ore", "quantity": 5}]'::jsonb,
 '[{"type": "gold", "amount": 200}, {"type": "xp", "amount": 400}]'::jsonb,
 15, 40, 100),

('daily', 'Hunter''s Challenge', 'Gather hunting materials',
 '[{"material_id": "rabbit_fur", "quantity": 8}, {"material_id": "wolf_pelt", "quantity": 4}]'::jsonb,
 '[{"type": "gold", "amount": 250}, {"type": "xp", "amount": 500}]'::jsonb,
 20, 50, 100),

-- Advanced daily contracts (levels 30+)
('daily', 'Expert Woodcutter', 'Gather rare woods',
 '[{"material_id": "maple_log", "quantity": 10}, {"material_id": "yew_log", "quantity": 5}]'::jsonb,
 '[{"type": "gold", "amount": 500}, {"type": "xp", "amount": 1000}]'::jsonb,
 30, 70, 100),

('daily', 'Master Miner', 'Mine precious materials',
 '[{"material_id": "mithril_ore", "quantity": 8}, {"material_id": "gold_ore", "quantity": 3}]'::jsonb,
 '[{"type": "gold", "amount": 800}, {"type": "xp", "amount": 1500}]'::jsonb,
 40, 80, 100),

-- Weekly contracts (more requirements, better rewards)
('weekly', 'Weekly Woodcutting', 'Complete woodcutting tasks for the week',
 '[{"material_id": "oak_log", "quantity": 50}, {"material_id": "willow_log", "quantity": 30}]'::jsonb,
 '[{"type": "gold", "amount": 1000}, {"type": "xp", "amount": 2000}]'::jsonb,
 5, 30, 100),

('weekly', 'Weekly Mining', 'Complete mining tasks for the week',
 '[{"material_id": "copper_ore", "quantity": 40}, {"material_id": "iron_ore", "quantity": 25}, {"material_id": "coal", "quantity": 20}]'::jsonb,
 '[{"type": "gold", "amount": 1500}, {"type": "xp", "amount": 3000}]'::jsonb,
 10, 40, 100),

('weekly', 'Weekly Fishing', 'Complete fishing tasks for the week',
 '[{"material_id": "raw_shrimp", "quantity": 60}, {"material_id": "raw_trout", "quantity": 30}]'::jsonb,
 '[{"type": "gold", "amount": 1200}, {"type": "xp", "amount": 2500}]'::jsonb,
 5, 35, 100),

('weekly', 'Master Gatherer', 'Gather a variety of materials',
 '[{"material_id": "maple_log", "quantity": 20}, {"material_id": "mithril_ore", "quantity": 15}, {"material_id": "raw_salmon", "quantity": 25}]'::jsonb,
 '[{"type": "gold", "amount": 3000}, {"type": "xp", "amount": 5000}]'::jsonb,
 30, 70, 100),

-- Special event contracts
('special', 'Rare Material Hunt', 'Gather rare materials for a special event',
 '[{"material_id": "magic_log", "quantity": 5}, {"material_id": "runite_ore", "quantity": 3}]'::jsonb,
 '[{"type": "gold", "amount": 5000}, {"type": "xp", "amount": 10000}]'::jsonb,
 50, 99, 50),

('special', 'Alchemist''s Request', 'Gather herbs for the alchemist',
 '[{"material_id": "guam_leaf", "quantity": 20}, {"material_id": "harralander", "quantity": 15}, {"material_id": "ranarr_weed", "quantity": 10}]'::jsonb,
 '[{"type": "gold", "amount": 2000}, {"type": "xp", "amount": 4000}]'::jsonb,
 20, 60, 75);

-- =====================================================================================
-- GRANT PERMISSIONS
-- =====================================================================================

GRANT SELECT ON public.gathering_contracts TO anon, authenticated;
GRANT ALL ON public.character_contracts TO authenticated;
GRANT ALL ON public.contract_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_contracts TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_contract_rewards TO authenticated;