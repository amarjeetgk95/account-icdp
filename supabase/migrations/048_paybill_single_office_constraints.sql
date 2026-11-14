-- ============================================================================
-- 048_paybill_single_office_constraints.sql
-- Create clean single-office constraints for paybill tables:
-- 1. paybill_employee_earnings (hrpn, month, financial_year)
-- 2. paybill_employee_deductions (hrpn, month, financial_year)
-- 3. paybill_settings (settings_key)
-- 4. paybill_imports (lower(bill_no), month, financial_year, sheet_type)
-- 5. Modernize get_paybill_parameter_matrix RPC for single-office & March-February accounting
-- ============================================================================

BEGIN;

-- 1. Clean duplicates and add unique constraint on paybill_employee_earnings
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'paybill_employee_earnings') THEN
    DELETE FROM public.paybill_employee_earnings
    WHERE ctid NOT IN (
      SELECT min(ctid)
      FROM public.paybill_employee_earnings
      GROUP BY hrpn, month, financial_year
    );

    ALTER TABLE public.paybill_employee_earnings
      DROP CONSTRAINT IF EXISTS paybill_employee_earnings_single_office_key;
    ALTER TABLE public.paybill_employee_earnings
      DROP CONSTRAINT IF EXISTS paybill_employee_earnings_office_id_hrpn_month_financial_year_key;

    ALTER TABLE public.paybill_employee_earnings
      ADD CONSTRAINT paybill_employee_earnings_single_office_key
      UNIQUE (hrpn, month, financial_year);
  END IF;
END $$;

-- 2. Clean duplicates and add unique constraint on paybill_employee_deductions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'paybill_employee_deductions') THEN
    DELETE FROM public.paybill_employee_deductions
    WHERE ctid NOT IN (
      SELECT min(ctid)
      FROM public.paybill_employee_deductions
      GROUP BY hrpn, month, financial_year
    );

    ALTER TABLE public.paybill_employee_deductions
      DROP CONSTRAINT IF EXISTS paybill_employee_deductions_single_office_key;
    ALTER TABLE public.paybill_employee_deductions
      DROP CONSTRAINT IF EXISTS paybill_employee_deductions_office_id_hrpn_month_financial_ye_key;

    ALTER TABLE public.paybill_employee_deductions
      ADD CONSTRAINT paybill_employee_deductions_single_office_key
      UNIQUE (hrpn, month, financial_year);
  END IF;
END $$;

-- 3. Clean duplicates and add unique constraint on paybill_settings
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'paybill_settings') THEN
    DELETE FROM public.paybill_settings
    WHERE ctid NOT IN (
      SELECT min(ctid)
      FROM public.paybill_settings
      GROUP BY settings_key
    );

    ALTER TABLE public.paybill_settings
      DROP CONSTRAINT IF EXISTS paybill_settings_key_unique;
    ALTER TABLE public.paybill_settings
      DROP CONSTRAINT IF EXISTS paybill_settings_office_id_settings_key_key;

    ALTER TABLE public.paybill_settings
      ADD CONSTRAINT paybill_settings_key_unique
      UNIQUE (settings_key);
  END IF;
END $$;

-- 4. Clean duplicates and add unique index on paybill_imports
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'paybill_imports') THEN
    DROP INDEX IF EXISTS public.idx_paybill_imports_single_office_unique;
    DROP INDEX IF EXISTS public.idx_paybill_imports_office_bill_month_fy;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_paybill_imports_single_office_unique
      ON public.paybill_imports (lower(bill_no), month, financial_year, sheet_type);
  END IF;
END $$;

-- 5. Modernize get_paybill_parameter_matrix RPC for single-office & March-February FY
CREATE OR REPLACE FUNCTION public.get_paybill_parameter_matrix(
  p_financial_year INTEGER,
  p_hrpn TEXT DEFAULT NULL,
  p_office_id BIGINT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_months TEXT[] := ARRAY[
    'March', 'April', 'May',
    'June', 'July', 'August',
    'September', 'October', 'November',
    'December', 'January', 'February'
  ];
  v_parameters TEXT[] := ARRAY[
    'Basic Pay',
    'DA (0103)',
    'HRA (0110)',
    'CLA (0111)',
    'Medical Allowance (0107)',
    'Transport Allowance (0113)',
    'Special Additional Pay (0101)',
    'Washing Allowance (0132)',
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
    'special_pay',
    'washing_allowance',
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
        'WHERE financial_year = $1 AND month = $2 ' ||
        CASE WHEN p_hrpn IS NOT NULL AND p_hrpn <> '''' THEN 'AND hrpn = $3' ELSE '' END,
        v_param_keys[i]
      )
      INTO v_val
      USING p_financial_year, v_m, p_hrpn;

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
        'March', v_month_vals[1],
        'April', v_month_vals[2],
        'May', v_month_vals[3],
        'June', v_month_vals[4],
        'July', v_month_vals[5],
        'August', v_month_vals[6],
        'September', v_month_vals[7],
        'October', v_month_vals[8],
        'November', v_month_vals[9],
        'December', v_month_vals[10],
        'January', v_month_vals[11],
        'February', v_month_vals[12]
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
    'rows', v_rows
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
