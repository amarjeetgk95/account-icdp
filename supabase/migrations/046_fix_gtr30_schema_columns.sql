-- ============================================================================
-- 046_fix_gtr30_schema_columns.sql
-- Ensure all required columns exist in GTR-30 tables for single-office mode
-- Adds missing JSONB payload and pay_entries columns, unique constraints, and permissive RLS
-- ============================================================================

BEGIN;

-- 1. gtr30_bill_code_mappings table fixes
CREATE TABLE IF NOT EXISTS public.gtr30_bill_code_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_code TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gtr30_bill_code_mappings
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Deduplicate any duplicate bill_codes before adding unique constraint
DELETE FROM public.gtr30_bill_code_mappings
WHERE ctid NOT IN (
  SELECT min(ctid)
  FROM public.gtr30_bill_code_mappings
  GROUP BY bill_code
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.gtr30_bill_code_mappings'::regclass
      AND contype = 'u'
  ) THEN
    ALTER TABLE public.gtr30_bill_code_mappings
      ADD CONSTRAINT gtr30_bill_code_mappings_bill_code_unique UNIQUE (bill_code);
  END IF;
END $$;

-- 2. gtr30_employee_master table fixes
CREATE TABLE IF NOT EXISTS public.gtr30_employee_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_key TEXT NOT NULL,
  bill_code TEXT NOT NULL,
  sr_no INTEGER NOT NULL DEFAULT 0,
  hrpn_no TEXT,
  name TEXT NOT NULL DEFAULT '',
  designation TEXT,
  designation_gujarati TEXT,
  cadre_class TEXT,
  pay_scale TEXT,
  grade_pay TEXT,
  pay_level_cell TEXT,
  ppa_no TEXT,
  current_pay NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_pay_date DATE,
  quarter_address TEXT,
  insurance_group TEXT,
  insurance_type TEXT,
  hra_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  da NUMERIC(14,2) DEFAULT 0,
  transport_allowance NUMERIC(14,2) NOT NULL DEFAULT 0,
  medical_allowance NUMERIC(14,2) NOT NULL DEFAULT 0,
  cla_allowance NUMERIC(14,2) NOT NULL DEFAULT 0,
  rent_of_building NUMERIC(14,2) DEFAULT 0,
  professional_tax NUMERIC(14,2) DEFAULT 0,
  gis1981_insurance NUMERIC(14,2) DEFAULT 0,
  gis1981_savings NUMERIC(14,2) DEFAULT 0,
  gis_1981_insurance NUMERIC(14,2) DEFAULT 0,
  gis_1981_savings NUMERIC(14,2) DEFAULT 0,
  nps_pension NUMERIC(14,2) DEFAULT 0,
  society_deduction NUMERIC(14,2) DEFAULT 0,
  remarks TEXT,
  pay_entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gtr30_employee_master
  ADD COLUMN IF NOT EXISTS designation_gujarati TEXT,
  ADD COLUMN IF NOT EXISTS cadre_class TEXT,
  ADD COLUMN IF NOT EXISTS grade_pay TEXT,
  ADD COLUMN IF NOT EXISTS pay_level_cell TEXT,
  ADD COLUMN IF NOT EXISTS ppa_no TEXT,
  ADD COLUMN IF NOT EXISTS quarter_address TEXT,
  ADD COLUMN IF NOT EXISTS insurance_group TEXT,
  ADD COLUMN IF NOT EXISTS insurance_type TEXT,
  ADD COLUMN IF NOT EXISTS da NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rent_of_building NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS professional_tax NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gis1981_insurance NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gis1981_savings NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gis_1981_insurance NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gis_1981_savings NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nps_pension NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS society_deduction NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS pay_entries JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 3. gtr30_budget_heads table fixes
CREATE TABLE IF NOT EXISTS public.gtr30_budget_heads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gtr30_budget_heads
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 4. gtr30_bills table fixes
CREATE TABLE IF NOT EXISTS public.gtr30_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_register_no TEXT NOT NULL DEFAULT '',
  bill_date DATE,
  month_of TEXT,
  bill_code TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  gross_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  deductions_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gtr30_bills
  ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 5. paybill_settings table fixes
CREATE TABLE IF NOT EXISTS public.paybill_settings (
  settings_key TEXT PRIMARY KEY,
  settings_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.paybill_settings'::regclass
      AND contype IN ('p', 'u')
  ) THEN
    ALTER TABLE public.paybill_settings
      ADD CONSTRAINT paybill_settings_settings_key_unique UNIQUE (settings_key);
  END IF;
END $$;

-- 5. Seed default bill codes and budget heads if tables are empty
DELETE FROM public.gtr30_bill_code_mappings
WHERE bill_code IN ('GTR30-SAL', 'GTR30-DA', 'GTR30-BONUS');

INSERT INTO public.gtr30_budget_heads (id, name, payload)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Statistical Wing (CSS) — Pay & Allowances',
  '{"headChargeable": "2403001139900", "controllingOfficer": "0101", "classOfExpenditure": "1", "fund": "3", "drawingOfficer": "299", "demandNo": "004", "typeOfBudget": "1", "schemeNo": "0000000", "sector": "Sector-C-Economic Service", "majorHead": "Major Head-2403 Animal Husbandry", "subMajorHead": "-", "minorHead": "Minor Head-113 Administrative Investigation and Statistics", "subHead": "Sub Head-05 Scheme for Strengthening of Statistical Wing in Directorate of Animal Husbandry (Pay and Allowances for Centrally Sponsored Scheme)", "budgetYear": "2026-27"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.gtr30_budget_heads);

INSERT INTO public.gtr30_bill_code_mappings (id, bill_code, description, payload)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  'GTR-30-GO-STATS',
  'GTR-30 Gazetted Officers (Stats) Bill',
  '{"controllingOfficer": "0101", "classOfExpenditure": "1", "fund": "3", "drawingOfficer": "299", "demandNo": "004", "typeOfBudget": "1", "schemeNo": "0000000", "headChargeable": "2403001139900", "sector": "Sector-C-Economic Service", "majorHead": "Major Head-2403 Animal Husbandry", "subMajorHead": "-", "minorHead": "Minor Head-113 Administrative Investigation and Statistics", "subHead": "Sub Head-05 Scheme for Strengthening of Statistical Wing in Directorate of Animal Husbandry (Pay and Allowances for Centrally Sponsored Scheme)", "budgetYear": "2026-27"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.gtr30_bill_code_mappings WHERE bill_code = 'GTR-30-GO-STATS');

INSERT INTO public.gtr30_bill_code_mappings (id, bill_code, description, payload)
SELECT
  '00000000-0000-0000-0000-000000000002'::uuid,
  'GTR-30-NGO-STATS',
  'GTR-30 Non-Gazetted Staff (Stats) Bill',
  '{"controllingOfficer": "0101", "classOfExpenditure": "1", "fund": "3", "drawingOfficer": "299", "demandNo": "004", "typeOfBudget": "1", "schemeNo": "0000000", "headChargeable": "2403001139900", "sector": "Sector-C-Economic Service", "majorHead": "Major Head-2403 Animal Husbandry", "subMajorHead": "-", "minorHead": "Minor Head-113 Administrative Investigation and Statistics", "subHead": "Sub Head-05 Scheme for Strengthening of Statistical Wing in Directorate of Animal Husbandry (Pay and Allowances for Centrally Sponsored Scheme)", "budgetYear": "2026-27"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.gtr30_bill_code_mappings WHERE bill_code = 'GTR-30-NGO-STATS');

-- 6. Open RLS for single-office access
ALTER TABLE public.gtr30_bill_code_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtr30_employee_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtr30_budget_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtr30_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paybill_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for gtr30_bill_code_mappings" ON public.gtr30_bill_code_mappings;
DROP POLICY IF EXISTS "Authenticated users access gtr30_bill_code_mappings" ON public.gtr30_bill_code_mappings;
CREATE POLICY "Allow all for gtr30_bill_code_mappings"
  ON public.gtr30_bill_code_mappings FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for gtr30_employee_master" ON public.gtr30_employee_master;
DROP POLICY IF EXISTS "Authenticated users access gtr30_employee_master" ON public.gtr30_employee_master;
CREATE POLICY "Allow all for gtr30_employee_master"
  ON public.gtr30_employee_master FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for gtr30_budget_heads" ON public.gtr30_budget_heads;
DROP POLICY IF EXISTS "Authenticated users access gtr30_budget_heads" ON public.gtr30_budget_heads;
CREATE POLICY "Allow all for gtr30_budget_heads"
  ON public.gtr30_budget_heads FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for gtr30_bills" ON public.gtr30_bills;
DROP POLICY IF EXISTS "Authenticated users access gtr30_bills" ON public.gtr30_bills;
CREATE POLICY "Allow all for gtr30_bills"
  ON public.gtr30_bills FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for paybill_settings" ON public.paybill_settings;
CREATE POLICY "Allow all for paybill_settings"
  ON public.paybill_settings FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON TABLE public.gtr30_bill_code_mappings TO authenticated, anon;
GRANT ALL ON TABLE public.gtr30_employee_master TO authenticated, anon;
GRANT ALL ON TABLE public.gtr30_budget_heads TO authenticated, anon;
GRANT ALL ON TABLE public.gtr30_bills TO authenticated, anon;
GRANT ALL ON TABLE public.paybill_settings TO authenticated, anon;

COMMIT;
