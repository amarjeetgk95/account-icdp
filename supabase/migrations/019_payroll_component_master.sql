-- 019_payroll_component_master.sql
-- Central Payroll Component Master: defines every earning/deduction component the
-- application recognizes. The PDF parser matches detected headers against this master
-- so new payroll components can be added via configuration (no parser code changes).
--
-- Tables:
--   1. payroll_components          - authoritative component definitions
--   2. payroll_component_aliases   - PDF header / code aliases per component
--   3. paybill_employee_components - dynamic per-employee component values (snapshot)

-- =====================================================================
-- 1. Payroll Component Master
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.payroll_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_code TEXT,
  component_name TEXT NOT NULL,
  short_name TEXT,
  type TEXT NOT NULL CHECK (type IN ('EARNING', 'DEDUCTION')),
  kind TEXT NOT NULL DEFAULT 'COMPONENT' CHECK (kind IN ('COMPONENT', 'TOTAL', 'NET_PAY')),
  category TEXT,
  sub_category TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  is_total_field BOOLEAN NOT NULL DEFAULT FALSE,
  is_system_generated BOOLEAN NOT NULL DEFAULT FALSE,
  validation_rule JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Component codes are business identifiers but are NOT globally unique
-- (e.g. Basic Pay and Special Additional Pay both use 0101/0102).
CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_components_code_name
  ON public.payroll_components(component_code, component_name);

CREATE INDEX IF NOT EXISTS idx_payroll_components_type ON public.payroll_components(type);
CREATE INDEX IF NOT EXISTS idx_payroll_components_active ON public.payroll_components(active);
CREATE INDEX IF NOT EXISTS idx_payroll_components_order ON public.payroll_components(display_order);

-- =====================================================================
-- 2. Component Aliases (PDF header labels + code aliases)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.payroll_component_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES public.payroll_components(id) ON DELETE CASCADE,
  alias_text TEXT NOT NULL,
  alias_type TEXT NOT NULL DEFAULT 'HEADER' CHECK (alias_type IN ('HEADER', 'CODE')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(component_id, alias_text)
);

CREATE INDEX IF NOT EXISTS idx_payroll_component_aliases_component
  ON public.payroll_component_aliases(component_id);

-- =====================================================================
-- 3. Per-employee dynamic component values (historical snapshot)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.paybill_employee_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paybill_employee_id UUID,
  import_id UUID REFERENCES public.paybill_imports(id) ON DELETE CASCADE,
  office_id BIGINT NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  sheet_type TEXT NOT NULL DEFAULT 'EARNING' CHECK (sheet_type IN ('EARNING', 'DEDUCTION')),
  hrpn TEXT,
  component_id UUID REFERENCES public.payroll_components(id) ON DELETE SET NULL,
  component_code TEXT,
  component_name TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'PDF',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paybill_employee_components_employee
  ON public.paybill_employee_components(paybill_employee_id);
CREATE INDEX IF NOT EXISTS idx_paybill_employee_components_import
  ON public.paybill_employee_components(import_id);
CREATE INDEX IF NOT EXISTS idx_paybill_employee_components_office
  ON public.paybill_employee_components(office_id);
CREATE INDEX IF NOT EXISTS idx_paybill_employee_components_component
  ON public.paybill_employee_components(component_id);

-- =====================================================================
-- RLS Policies
-- =====================================================================
ALTER TABLE public.payroll_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_component_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paybill_employee_components ENABLE ROW LEVEL SECURITY;

-- Component Master is shared application-wide configuration. Any authenticated
-- user may read and maintain it (deletion/soft-deactivation is enforced at the
-- application layer to protect historical references).
CREATE POLICY "Any authenticated user can view components"
  ON public.payroll_components FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Any authenticated user can manage components"
  ON public.payroll_components FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage all components"
  ON public.payroll_components FOR ALL
  USING (public.is_admin());

CREATE POLICY "Any authenticated user can view component aliases"
  ON public.payroll_component_aliases FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Any authenticated user can manage component aliases"
  ON public.payroll_component_aliases FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage all component aliases"
  ON public.payroll_component_aliases FOR ALL
  USING (public.is_admin());

-- Employee component values are office-scoped historical data.
CREATE POLICY "Users can view employee components in their office"
  ON public.paybill_employee_components FOR SELECT
  USING (public.can_access_office(office_id));

CREATE POLICY "Users can manage employee components in their office"
  ON public.paybill_employee_components FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

CREATE POLICY "Admins can manage all employee components"
  ON public.paybill_employee_components FOR ALL
  USING (public.is_admin());

-- =====================================================================
-- Seed Data: components recognized from the Gujarat Pay Bill PDFs
-- =====================================================================
DO $$
DECLARE
  v_id UUID;
  v_code TEXT;
  v_name TEXT;
  v_type TEXT;
  v_kind TEXT;
  v_short TEXT;
  v_cat TEXT;
  v_order INTEGER;
  v_total_field BOOLEAN;
  v_aliases TEXT[];
  v_code_aliases TEXT[];
  v_notes TEXT;
  alias TEXT;
BEGIN
  -- EARNINGS ------------------------------------------------------------
  FOREACH v_code IN ARRAY ARRAY['0101'] LOOP
    IF NOT EXISTS (SELECT 1 FROM public.payroll_components WHERE component_code = '0101' AND component_name = 'Basic Pay') THEN
      INSERT INTO public.payroll_components
        (component_code, component_name, short_name, type, kind, category, display_order, is_mandatory, is_total_field, is_system_generated, notes)
      VALUES ('0101', 'Basic Pay', 'Basic', 'EARNING', 'COMPONENT', 'Salary', 10, TRUE, FALSE, FALSE,
              'Basic pay head printed as Basic Pay (0101)/(0102) on the earning sheet.')
      RETURNING id INTO v_id;
      INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type) VALUES
        (v_id, 'Basic Pay', 'HEADER'), (v_id, 'Basic', 'HEADER'), (v_id, 'Basic Pay (0101)/(0102)', 'HEADER'),
        (v_id, '0101', 'CODE'), (v_id, '0102', 'CODE')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM public.payroll_components WHERE component_code = '0103' AND component_name = 'DA') THEN
    INSERT INTO public.payroll_components
      (component_code, component_name, short_name, type, kind, category, display_order, is_mandatory, is_total_field, is_system_generated, notes)
    VALUES ('0103', 'DA', 'DA', 'EARNING', 'COMPONENT', 'Allowance', 20, TRUE, FALSE, FALSE,
            'Dearness Allowance. Printed as DA (0103).')
    RETURNING id INTO v_id;
    INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type) VALUES
      (v_id, 'DA', 'HEADER'), (v_id, 'Dearness Allowance', 'HEADER'), (v_id, 'DA (0103)', 'HEADER'),
      (v_id, '0103', 'CODE')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payroll_components WHERE component_code = '0110' AND component_name = 'HRA') THEN
    INSERT INTO public.payroll_components
      (component_code, component_name, short_name, type, kind, category, display_order, is_mandatory, is_total_field, is_system_generated, notes)
    VALUES ('0110', 'HRA', 'HRA', 'EARNING', 'COMPONENT', 'Allowance', 30, TRUE, FALSE, FALSE,
            'House Rent Allowance. Printed as HRA (0110).')
    RETURNING id INTO v_id;
    INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type) VALUES
      (v_id, 'HRA', 'HEADER'), (v_id, 'House Rent Allowance', 'HEADER'), (v_id, 'HRA (0110)', 'HEADER'),
      (v_id, '0110', 'CODE')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payroll_components WHERE component_code = '0111' AND component_name = 'CLA') THEN
    INSERT INTO public.payroll_components
      (component_code, component_name, short_name, type, kind, category, display_order, is_mandatory, is_total_field, is_system_generated, notes)
    VALUES ('0111', 'CLA', 'CLA', 'EARNING', 'COMPONENT', 'Allowance', 40, TRUE, FALSE, FALSE,
            'City Compensatory Allowance. Printed as CLA (0111).')
    RETURNING id INTO v_id;
    INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type) VALUES
      (v_id, 'CLA', 'HEADER'), (v_id, 'City Compensatory Allowance', 'HEADER'), (v_id, 'CLA (0111)', 'HEADER'),
      (v_id, '0111', 'CODE')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payroll_components WHERE component_code = '0107' AND component_name = 'Medical Allowance') THEN
    INSERT INTO public.payroll_components
      (component_code, component_name, short_name, type, kind, category, display_order, is_mandatory, is_total_field, is_system_generated, notes)
    VALUES ('0107', 'Medical Allowance', 'Med Allow', 'EARNING', 'COMPONENT', 'Allowance', 50, TRUE, FALSE, FALSE,
            'Printed as Med Allow (0107).')
    RETURNING id INTO v_id;
    INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type) VALUES
      (v_id, 'Med Allow', 'HEADER'), (v_id, 'Medical Allowance', 'HEADER'), (v_id, 'Med', 'HEADER'), (v_id, 'Med Allow (0107)', 'HEADER'),
      (v_id, '0107', 'CODE')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payroll_components WHERE component_code = '0113' AND component_name = 'Transport Allowance') THEN
    INSERT INTO public.payroll_components
      (component_code, component_name, short_name, type, kind, category, display_order, is_mandatory, is_total_field, is_system_generated, notes)
    VALUES ('0113', 'Transport Allowance', 'Trans Allow', 'EARNING', 'COMPONENT', 'Allowance', 60, TRUE, FALSE, FALSE,
            'Printed as Trans Allow (0113).')
    RETURNING id INTO v_id;
    INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type) VALUES
      (v_id, 'Trans Allow', 'HEADER'), (v_id, 'Transport Allowance', 'HEADER'), (v_id, 'Trans', 'HEADER'), (v_id, 'Trans Allow (0113)', 'HEADER'),
      (v_id, '0113', 'CODE')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payroll_components WHERE component_code = '0128' AND component_name = 'Non Private Practice Allowance') THEN
    INSERT INTO public.payroll_components
      (component_code, component_name, short_name, type, kind, category, display_order, is_mandatory, is_total_field, is_system_generated, notes)
    VALUES ('0128', 'Non Private Practice Allowance', 'NPP Allow', 'EARNING', 'COMPONENT', 'Allowance', 70, FALSE, FALSE, FALSE,
            'Printed as Non Private Practice Allow (0128).')
    RETURNING id INTO v_id;
    INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type) VALUES
      (v_id, 'Non Private Practice Allow', 'HEADER'), (v_id, 'Non Private Practice Allowance', 'HEADER'), (v_id, 'NPP', 'HEADER'), (v_id, 'Non Private Practice Allow (0128)', 'HEADER'),
      (v_id, '0128', 'CODE')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payroll_components WHERE component_code = '0101' AND component_name = 'Special Additional Pay') THEN
    INSERT INTO public.payroll_components
      (component_code, component_name, short_name, type, kind, category, display_order, is_mandatory, is_total_field, is_system_generated, notes)
    VALUES ('0101', 'Special Additional Pay', 'Special Pay', 'EARNING', 'COMPONENT', 'Allowance', 80, FALSE, FALSE, FALSE,
            'Printed as Special Additional Pay (0101)/(0102) on clerical sheets. Shares the 0101/0102 code with Basic Pay; matched by name.')
    RETURNING id INTO v_id;
    INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type) VALUES
      (v_id, 'Special Additional Pay', 'HEADER'), (v_id, 'Special Pay', 'HEADER'), (v_id, 'Special Addl Pay', 'HEADER'), (v_id, 'Special Additional Pay (0101)/(0102)', 'HEADER'),
      (v_id, '0101', 'CODE'), (v_id, '0102', 'CODE')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payroll_components WHERE component_code = '0132' AND component_name = 'Washing Allowance') THEN
    INSERT INTO public.payroll_components
      (component_code, component_name, short_name, type, kind, category, display_order, is_mandatory, is_total_field, is_system_generated, notes)
    VALUES ('0132', 'Washing Allowance', 'Washing Allow', 'EARNING', 'COMPONENT', 'Allowance', 90, FALSE, FALSE, FALSE,
            'Printed as Washing Allow (0132).')
    RETURNING id INTO v_id;
    INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type) VALUES
      (v_id, 'Washing Allow', 'HEADER'), (v_id, 'Washing Allowance', 'HEADER'), (v_id, 'Washing', 'HEADER'), (v_id, 'Washing Allow (0132)', 'HEADER'),
      (v_id, '0132', 'CODE')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payroll_components WHERE component_code = 'GROSS' AND component_name = 'Gross Amount') THEN
    INSERT INTO public.payroll_components
      (component_code, component_name, short_name, type, kind, category, display_order, is_mandatory, is_total_field, is_system_generated, notes)
    VALUES ('GROSS', 'Gross Amount', 'Gross Amt', 'EARNING', 'TOTAL', 'Total', 900, FALSE, TRUE, TRUE,
            'Calculated summary field printed on the earning sheet as Gross Amt.')
    RETURNING id INTO v_id;
    INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type) VALUES
      (v_id, 'Gross Amt', 'HEADER'), (v_id, 'Gross Amount', 'HEADER'), (v_id, 'Gross', 'HEADER'),
      (v_id, 'GROSS', 'CODE')
    ON CONFLICT DO NOTHING;
  END IF;

  -- DEDUCTIONS ----------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.payroll_components WHERE component_code = '9510' AND component_name = 'Income Tax') THEN
    INSERT INTO public.payroll_components
      (component_code, component_name, short_name, type, kind, category, display_order, is_mandatory, is_total_field, is_system_generated, notes)
    VALUES ('9510', 'Income Tax', 'IT', 'DEDUCTION', 'COMPONENT', 'Tax', 10, TRUE, FALSE, FALSE,
            'Printed as Income Tax (9510).')
    RETURNING id INTO v_id;
    INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type) VALUES
      (v_id, 'Income Tax', 'HEADER'), (v_id, 'IT', 'HEADER'), (v_id, 'Income Tax (9510)', 'HEADER'),
      (v_id, '9510', 'CODE')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payroll_components WHERE component_code = '9570' AND component_name = 'Professional Tax') THEN
    INSERT INTO public.payroll_components
      (component_code, component_name, short_name, type, kind, category, display_order, is_mandatory, is_total_field, is_system_generated, notes)
    VALUES ('9570', 'Professional Tax', 'Prof Tax', 'DEDUCTION', 'COMPONENT', 'Tax', 20, TRUE, FALSE, FALSE,
            'Printed as Prof Tax (9570).')
    RETURNING id INTO v_id;
    INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type) VALUES
      (v_id, 'Prof Tax', 'HEADER'), (v_id, 'Professional Tax', 'HEADER'), (v_id, 'PT', 'HEADER'), (v_id, 'Prof Tax (9570)', 'HEADER'),
      (v_id, '9570', 'CODE')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payroll_components WHERE component_code = '9591' AND component_name = 'HBA Interest') THEN
    INSERT INTO public.payroll_components
      (component_code, component_name, short_name, type, kind, category, display_order, is_mandatory, is_total_field, is_system_generated, notes)
    VALUES ('9591', 'HBA Interest', 'HBA', 'DEDUCTION', 'COMPONENT', 'Loan', 30, FALSE, FALSE, FALSE,
            'House Building Advance interest. Printed as HBA Interest (9591).')
    RETURNING id INTO v_id;
    INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type) VALUES
      (v_id, 'HBA Interest', 'HEADER'), (v_id, 'HBA', 'HEADER'), (v_id, 'HBA Interest (9591)', 'HEADER'),
      (v_id, '9591', 'CODE')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payroll_components WHERE component_code = '9670' AND component_name = 'GPF Regular') THEN
    INSERT INTO public.payroll_components
      (component_code, component_name, short_name, type, kind, category, display_order, is_mandatory, is_total_field, is_system_generated, notes)
    VALUES ('9670', 'GPF Regular', 'GPF Reg', 'DEDUCTION', 'COMPONENT', 'Fund', 40, FALSE, FALSE, FALSE,
            'Printed as GPF Reg (9670).')
    RETURNING id INTO v_id;
    INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type) VALUES
      (v_id, 'GPF Reg', 'HEADER'), (v_id, 'GPF Regular', 'HEADER'), (v_id, 'GPF', 'HEADER'), (v_id, 'GPF Regular (9670)', 'HEADER'),
      (v_id, '9670', 'CODE')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payroll_components WHERE component_code = '9531' AND component_name = 'GPF Regular Class 4') THEN
    INSERT INTO public.payroll_components
      (component_code, component_name, short_name, type, kind, category, display_order, is_mandatory, is_total_field, is_system_generated, notes)
    VALUES ('9531', 'GPF Regular Class 4', 'GPF Class 4', 'DEDUCTION', 'COMPONENT', 'Fund', 50, FALSE, FALSE, FALSE,
            'Printed as GPF Reg Class 4 (9531).')
    RETURNING id INTO v_id;
    INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type) VALUES
      (v_id, 'GPF Reg Class 4', 'HEADER'), (v_id, 'GPF Regular Class 4', 'HEADER'), (v_id, 'GPF Class 4', 'HEADER'), (v_id, 'GPF Class 4 (9531)', 'HEADER'),
      (v_id, '9531', 'CODE')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payroll_components WHERE component_code = '9534' AND component_name = 'NPS Regular') THEN
    INSERT INTO public.payroll_components
      (component_code, component_name, short_name, type, kind, category, display_order, is_mandatory, is_total_field, is_system_generated, notes)
    VALUES ('9534', 'NPS Regular', 'NPS Reg', 'DEDUCTION', 'COMPONENT', 'Fund', 60, FALSE, FALSE, FALSE,
            'National Pension System regular contribution. Printed as NPS Reg (9534).')
    RETURNING id INTO v_id;
    INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type) VALUES
      (v_id, 'NPS Reg', 'HEADER'), (v_id, 'NPS Regular', 'HEADER'), (v_id, 'NPS', 'HEADER'), (v_id, 'NPS Regular (9534)', 'HEADER'),
      (v_id, '9534', 'CODE')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payroll_components WHERE component_code = '9581' AND component_name = 'Govt Fund') THEN
    INSERT INTO public.payroll_components
      (component_code, component_name, short_name, type, kind, category, display_order, is_mandatory, is_total_field, is_system_generated, notes)
    VALUES ('9581', 'Govt Fund', 'Govt Fund', 'DEDUCTION', 'COMPONENT', 'GIS', 70, FALSE, FALSE, FALSE,
            'Printed as Govt Fund (9581) on the deduction sheet (GIS contribution).')
    RETURNING id INTO v_id;
    INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type) VALUES
      (v_id, 'Govt Fund', 'HEADER'), (v_id, 'GIS Govt Fund', 'HEADER'), (v_id, 'Govt Fund (9581)', 'HEADER'),
      (v_id, '9581', 'CODE')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payroll_components WHERE component_code = '9582' AND component_name = 'Govt Saving') THEN
    INSERT INTO public.payroll_components
      (component_code, component_name, short_name, type, kind, category, display_order, is_mandatory, is_total_field, is_system_generated, notes)
    VALUES ('9582', 'Govt Saving', 'Govt Saving', 'DEDUCTION', 'COMPONENT', 'GIS', 80, FALSE, FALSE, FALSE,
            'Printed as Govt Saving (9582) on the deduction sheet (GIS savings).')
    RETURNING id INTO v_id;
    INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type) VALUES
      (v_id, 'Govt Saving', 'HEADER'), (v_id, 'GIS Govt Saving', 'HEADER'), (v_id, 'Govt Saving (9582)', 'HEADER'),
      (v_id, '9582', 'CODE')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payroll_components WHERE component_code = 'TOTDED' AND component_name = 'Total Deductions') THEN
    INSERT INTO public.payroll_components
      (component_code, component_name, short_name, type, kind, category, display_order, is_mandatory, is_total_field, is_system_generated, notes)
    VALUES ('TOTDED', 'Total Deductions', 'Total Ded', 'DEDUCTION', 'TOTAL', 'Total', 900, FALSE, TRUE, TRUE,
            'Calculated summary field printed on the deduction sheet as Total Ded.')
    RETURNING id INTO v_id;
    INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type) VALUES
      (v_id, 'Total Ded', 'HEADER'), (v_id, 'Total Deductions', 'HEADER'), (v_id, 'Total Deduction', 'HEADER'),
      (v_id, 'TOTDED', 'CODE')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payroll_components WHERE component_code = 'NETPAY' AND component_name = 'Net Pay') THEN
    INSERT INTO public.payroll_components
      (component_code, component_name, short_name, type, kind, category, display_order, is_mandatory, is_total_field, is_system_generated, notes)
    VALUES ('NETPAY', 'Net Pay', 'Net Pay', 'DEDUCTION', 'NET_PAY', 'Total', 910, FALSE, TRUE, TRUE,
            'Net pay summary field printed on the deduction sheet.')
    RETURNING id INTO v_id;
    INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type) VALUES
      (v_id, 'Net Pay', 'HEADER'),
      (v_id, 'NETPAY', 'CODE')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;