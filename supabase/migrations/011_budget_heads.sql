-- 011_budget_heads.sql
-- Budget heads (major head / minor head) for classifying employee salaries.
-- Each office manages its own set of budget heads; employees are optionally
-- assigned to a head (budget_head_id on employees).
--
-- This powers the Budget Head Report: head-wise aggregates of gross salary,
-- DA & other, income tax, and net paid for each quarter of a financial year.
--
-- NOTE: id/office_id are BIGINT to match the live legacy-imported schema
-- (see remediation.sql). Idempotent — safe to re-run via SQL editor.

-- ---------------------------------------------------------------------------
-- budget_heads table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budget_heads (
  id BIGSERIAL PRIMARY KEY,
  office_id BIGINT NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT budget_heads_office_code_unique UNIQUE (office_id, code)
);

CREATE INDEX IF NOT EXISTS idx_budget_heads_office ON public.budget_heads(office_id);

-- ---------------------------------------------------------------------------
-- Link employees to a budget head (nullable; SET NULL if head is deleted)
-- ---------------------------------------------------------------------------
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS budget_head_id BIGINT REFERENCES public.budget_heads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employees_budget_head ON public.employees(budget_head_id);

-- ---------------------------------------------------------------------------
-- Row Level Security (mirrors 009 convention: office users manage their office)
-- ---------------------------------------------------------------------------
ALTER TABLE public.budget_heads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budget heads in their office"
  ON public.budget_heads FOR SELECT
  USING (public.can_access_office(office_id));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'budget_heads' AND policyname = 'budget_heads_office_manage'
  ) THEN
    CREATE POLICY "budget_heads_office_manage"
      ON public.budget_heads FOR ALL
      USING (public.can_access_office(office_id))
      WITH CHECK (public.can_access_office(office_id));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'budget_heads' AND policyname = 'Admins can manage all budget heads'
  ) THEN
    CREATE POLICY "Admins can manage all budget heads"
      ON public.budget_heads FOR ALL
      USING (public.is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Privileges (mirrors remediation.sql grants)
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.budget_heads TO authenticated;
GRANT SELECT ON TABLE public.budget_heads TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.budget_heads_id_seq TO authenticated;
