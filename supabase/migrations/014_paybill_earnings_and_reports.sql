-- 014_paybill_earnings_and_reports.sql
-- Pay Bill PDF Import data storage, detailed allowance breakdown, and Monthly Allowance Matrix Report

-- 1. Table for Pay Bill PDF Import Batches
CREATE TABLE IF NOT EXISTS public.paybill_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id BIGINT NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  bill_no TEXT NOT NULL,
  month TEXT NOT NULL,
  financial_year INTEGER NOT NULL,
  ddo_hrpn TEXT,
  ddo_name TEXT,
  major_head TEXT,
  ddo_code TEXT,
  department TEXT,
  office_name TEXT,
  tan_no TEXT,
  cardex_no TEXT,
  total_records INTEGER NOT NULL DEFAULT 0,
  matched_count INTEGER NOT NULL DEFAULT 0,
  gross_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  uploaded_file TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table for Employee-Wise Pay Bill Monthly Earnings (all 8 allowance parameters)
CREATE TABLE IF NOT EXISTS public.paybill_employee_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.paybill_imports(id) ON DELETE CASCADE,
  office_id BIGINT NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  employee_id TEXT,
  hrpn TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  designation TEXT,
  pay_scale TEXT,
  ph TEXT,
  slo TEXT,
  month TEXT NOT NULL,
  financial_year INTEGER NOT NULL,
  basic_pay NUMERIC(12,2) DEFAULT 0,
  da NUMERIC(12,2) DEFAULT 0,
  hra NUMERIC(12,2) DEFAULT 0,
  cla NUMERIC(12,2) DEFAULT 0,
  medical_allowance NUMERIC(12,2) DEFAULT 0,
  transport_allowance NUMERIC(12,2) DEFAULT 0,
  npp_allowance NUMERIC(12,2) DEFAULT 0,
  gross_amount NUMERIC(12,2) DEFAULT 0,
  mapping_status TEXT NOT NULL CHECK (mapping_status IN ('MATCHED', 'NOT_FOUND', 'DUPLICATE', 'INVALID_HRPN')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_paybill_imports_office ON public.paybill_imports(office_id);
CREATE INDEX IF NOT EXISTS idx_paybill_imports_fy ON public.paybill_imports(office_id, financial_year);
CREATE INDEX IF NOT EXISTS idx_paybill_earnings_office ON public.paybill_employee_earnings(office_id);
CREATE INDEX IF NOT EXISTS idx_paybill_earnings_hrpn ON public.paybill_employee_earnings(hrpn);
CREATE INDEX IF NOT EXISTS idx_paybill_earnings_lookup ON public.paybill_employee_earnings(office_id, financial_year, month);
CREATE UNIQUE INDEX IF NOT EXISTS idx_paybill_earnings_import_hrpn
  ON public.paybill_employee_earnings(import_id, hrpn);

-- RLS Policies
ALTER TABLE public.paybill_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paybill_employee_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view paybill imports in their office"
  ON public.paybill_imports FOR SELECT
  USING (public.can_access_office(office_id));

CREATE POLICY "Users can manage paybill imports in their office"
  ON public.paybill_imports FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

CREATE POLICY "Admins can manage all paybill imports"
  ON public.paybill_imports FOR ALL
  USING (public.is_admin());

CREATE POLICY "Users can view paybill employee earnings in their office"
  ON public.paybill_employee_earnings FOR SELECT
  USING (public.can_access_office(office_id));

CREATE POLICY "Users can manage paybill employee earnings in their office"
  ON public.paybill_employee_earnings FOR ALL
  USING (public.can_access_office(office_id))
  WITH CHECK (public.can_access_office(office_id));

CREATE POLICY "Admins can manage all paybill employee earnings"
  ON public.paybill_employee_earnings FOR ALL
  USING (public.is_admin());

-- 3. Stored RPC Function to calculate Monthly Allowance Parameter Matrix Report
-- (Columns = 12 Months + Quarters + FY Total; Rows = Basic Pay, DA, HRA, CLA, Medical, Transport, NPP, Gross)
DROP FUNCTION IF EXISTS public.get_paybill_parameter_matrix(BIGINT, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.get_paybill_parameter_matrix(
  p_office_id BIGINT,
  p_financial_year INTEGER,
  p_hrpn TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_months TEXT[] := ARRAY[
    'April', 'May', 'June',
    'July', 'August', 'September',
    'October', 'November', 'December',
    'January', 'February', 'March'
  ];
  v_parameters TEXT[] := ARRAY[
    'Basic Pay',
    'DA (0103)',
    'HRA (0110)',
    'CLA (0111)',
    'Medical Allowance (0107)',
    'Transport Allowance (0113)',
    'Non Private Practice (0128)',
    'Gross Amount'
  ];
  v_param_keys TEXT[] := ARRAY[
    'basic_pay',
    'da',
    'hra',
    'cla',
    'medical_allowance',
    'transport_allowance',
    'npp_allowance',
    'gross_amount'
  ];
  v_rows JSON[];
  v_row_json JSON;
  v_month_vals NUMERIC[];
  v_q1 NUMERIC;
  v_q2 NUMERIC;
  v_q3 NUMERIC;
  v_q4 NUMERIC;
  v_total NUMERIC;
  v_m TEXT;
  v_val NUMERIC;
  i INTEGER;
  j INTEGER;
BEGIN
  v_rows := ARRAY[]::JSON[];

  FOR i IN 1..array_length(v_parameters, 1) LOOP
    v_month_vals := ARRAY[]::NUMERIC[];
    v_total := 0;

    FOR j IN 1..12 LOOP
      v_m := v_months[j];

      EXECUTE format(
        'SELECT COALESCE(SUM(%I), 0) FROM public.paybill_employee_earnings ' ||
        'WHERE office_id = $1 AND financial_year = $2 AND month = $3 ' ||
        CASE WHEN p_hrpn IS NOT NULL AND p_hrpn <> '''' THEN 'AND hrpn = $4' ELSE '' END,
        v_param_keys[i]
      )
      INTO v_val
      USING p_office_id, p_financial_year, v_m, p_hrpn;

      v_month_vals := array_append(v_month_vals, v_val);
      v_total := v_total + v_val;
    END LOOP;

    v_q1 := v_month_vals[1] + v_month_vals[2] + v_month_vals[3];
    v_q2 := v_month_vals[4] + v_month_vals[5] + v_month_vals[6];
    v_q3 := v_month_vals[7] + v_month_vals[8] + v_month_vals[9];
    v_q4 := v_month_vals[10] + v_month_vals[11] + v_month_vals[12];

    v_row_json := json_build_object(
      'parameter', v_parameters[i],
      'key', v_param_keys[i],
      'months', json_build_object(
        'April', v_month_vals[1],
        'May', v_month_vals[2],
        'June', v_month_vals[3],
        'July', v_month_vals[4],
        'August', v_month_vals[5],
        'September', v_month_vals[6],
        'October', v_month_vals[7],
        'November', v_month_vals[8],
        'December', v_month_vals[9],
        'January', v_month_vals[10],
        'February', v_month_vals[11],
        'March', v_month_vals[12]
      ),
      'q1', v_q1,
      'q2', v_q2,
      'q3', v_q3,
      'q4', v_q4,
      'total', v_total
    );

    v_rows := array_append(v_rows, v_row_json);
  END LOOP;

  RETURN json_build_object(
    'financial_year', p_financial_year,
    'hrpn', p_hrpn,
    'month_labels', v_months,
    'rows', array_to_json(v_rows)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
