-- ============================================================================
-- 060_discrete_office_positions.sql
-- Discrete Sanctioned Positions & Posting History for Single-Office ICDP Surat
-- ============================================================================

BEGIN;

-- 1. Discrete Sanctioned Positions
CREATE TABLE IF NOT EXISTS public.positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_no TEXT NOT NULL,                                              -- Departmental allotted post number
    designation_title TEXT NOT NULL DEFAULT '',                             -- English: 'Senior Clerk'
    designation_title_gu TEXT NOT NULL DEFAULT '',                          -- Gujarati: 'સિનિયર કારકુન'
    cadre_class TEXT,                                                       -- 'Class-1', 'Class-2', 'Class-3', 'Class-4'
    pay_matrix_level TEXT,                                                  -- 'Level 4', 'Level 8', etc.
    pay_scale TEXT,                                                         -- e.g. '25500-81100'
    budget_head_id BIGINT REFERENCES public.budget_heads(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'VACANT' 
        CHECK (status IN ('FILLED', 'VACANT', 'UNDER_CHARGE', 'ABOLISHED', 'CANCELLED')),
    status_date DATE NOT NULL DEFAULT CURRENT_DATE,
    current_employee_id UUID REFERENCES public.establishment_employees(id) ON DELETE SET NULL,
    charge_employee_id UUID REFERENCES public.establishment_employees(id) ON DELETE SET NULL,
    display_order INTEGER,                                                  -- Order within Budget Head group
    resolution_note TEXT,                                                   -- ઠરાવ વિગત for Abolished / Cancelled
    resolution_pdf_url TEXT,                                                -- Storage link for resolution PDF (<= 2MB)
    remarks TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safety reconciliation: if positions table was created in an earlier partial attempt with UUID column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'positions' 
          AND column_name = 'budget_head_id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.positions DROP CONSTRAINT IF EXISTS positions_budget_head_id_fkey;
        ALTER TABLE public.positions ALTER COLUMN budget_head_id TYPE BIGINT USING NULL;
        ALTER TABLE public.positions ADD CONSTRAINT positions_budget_head_id_fkey 
            FOREIGN KEY (budget_head_id) REFERENCES public.budget_heads(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Unique index on active position numbers (allowing duplicate '-' or retired posts)
CREATE UNIQUE INDEX IF NOT EXISTS idx_positions_unique_active_no 
    ON public.positions(lower(trim(position_no))) 
    WHERE status NOT IN ('ABOLISHED', 'CANCELLED') AND position_no <> '-' AND position_no <> '';

CREATE INDEX IF NOT EXISTS idx_positions_status ON public.positions(status);
CREATE INDEX IF NOT EXISTS idx_positions_budget_head ON public.positions(budget_head_id);
CREATE INDEX IF NOT EXISTS idx_positions_current_emp ON public.positions(current_employee_id);
CREATE INDEX IF NOT EXISTS idx_positions_charge_emp ON public.positions(charge_employee_id);

-- 2. Position History (Audit Trail for transfers, promotions, and retirements)
CREATE TABLE IF NOT EXISTS public.position_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.establishment_employees(id) ON DELETE CASCADE,
    assignment_type TEXT NOT NULL DEFAULT 'REGULAR'
        CHECK (assignment_type IN ('REGULAR', 'TRANSFER_IN', 'PROMOTION', 'ADDITIONAL_CHARGE')),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,                                                          -- NULL = currently occupying
    order_no TEXT,                                                          -- Transfer / Appointment / Relieve order no
    order_date DATE,
    relieve_reason TEXT,                                                    -- 'TRANSFERRED', 'RETIRED', 'RESIGNED', 'PROMOTED'
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_hist_position ON public.position_history(position_id);
CREATE INDEX IF NOT EXISTS idx_pos_hist_employee ON public.position_history(employee_id);

-- 3. Ensure Bilingual Columns Exist in establishment_employees
ALTER TABLE public.establishment_employees
    ADD COLUMN IF NOT EXISTS name_gu TEXT,
    ADD COLUMN IF NOT EXISTS designation_gu TEXT;

-- 4. Enable Single-Office Row Level Security
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "positions_single_office_all" ON public.positions;
CREATE POLICY "positions_single_office_all" ON public.positions 
    FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "position_history_single_office_all" ON public.position_history;
CREATE POLICY "position_history_single_office_all" ON public.position_history 
    FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Resolution PDF Storage Bucket (if storage schema exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resolution-pdfs', 'resolution-pdfs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

COMMIT;
