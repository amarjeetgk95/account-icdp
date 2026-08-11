-- ICDP Tax System - Financial Aggregates RPC Stored Functions
-- Created: 2026-08-10

-- Drop existing functions if recreating
DROP FUNCTION IF EXISTS public.get_payroll_quarter_report(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.get_budget_head_report(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.get_party_tds_summary(UUID, INTEGER);

-- 1. Get Payroll 24Q Quarter Report Aggregate
CREATE OR REPLACE FUNCTION public.get_payroll_quarter_report(
  p_office_id UUID,
  p_financial_year INTEGER,
  p_quarter TEXT
)
RETURNS JSON AS $$
DECLARE
  v_months TEXT[];
  v_result JSON;
BEGIN
  v_months := CASE p_quarter
    WHEN 'Q1' THEN ARRAY['April', 'May', 'June']
    WHEN 'Q2' THEN ARRAY['July', 'August', 'September']
    WHEN 'Q3' THEN ARRAY['October', 'November', 'December']
    WHEN 'Q4' THEN ARRAY['January', 'February', 'March']
    ELSE ARRAY['April', 'May', 'June']
  END;

  SELECT json_agg(
    json_build_object(
      'name', emp.name,
      'pan', emp.pan,
      'g', ARRAY[
        COALESCE((SELECT s.gross FROM public.employee_salaries s WHERE s.employee_id = emp.id AND s.financial_year = p_financial_year AND s.month = v_months[1] AND s.office_id = p_office_id LIMIT 1), 0),
        COALESCE((SELECT s.gross FROM public.employee_salaries s WHERE s.employee_id = emp.id AND s.financial_year = p_financial_year AND s.month = v_months[2] AND s.office_id = p_office_id LIMIT 1), 0),
        COALESCE((SELECT s.gross FROM public.employee_salaries s WHERE s.employee_id = emp.id AND s.financial_year = p_financial_year AND s.month = v_months[3] AND s.office_id = p_office_id LIMIT 1), 0)
      ],
      'd', COALESCE((
        SELECT SUM(s.da) FROM public.employee_salaries s 
        WHERE s.employee_id = emp.id AND s.financial_year = p_financial_year AND s.month = ANY(v_months) AND s.office_id = p_office_id
      ), 0),
      'total', COALESCE((
        SELECT SUM(s.gross + s.da) FROM public.employee_salaries s 
        WHERE s.employee_id = emp.id AND s.financial_year = p_financial_year AND s.month = ANY(v_months) AND s.office_id = p_office_id
      ), 0),
      't', ARRAY[
        COALESCE((SELECT s.tax FROM public.employee_salaries s WHERE s.employee_id = emp.id AND s.financial_year = p_financial_year AND s.month = v_months[1] AND s.office_id = p_office_id LIMIT 1), 0),
        COALESCE((SELECT s.tax FROM public.employee_salaries s WHERE s.employee_id = emp.id AND s.financial_year = p_financial_year AND s.month = v_months[2] AND s.office_id = p_office_id LIMIT 1), 0),
        COALESCE((SELECT s.tax FROM public.employee_salaries s WHERE s.employee_id = emp.id AND s.financial_year = p_financial_year AND s.month = v_months[3] AND s.office_id = p_office_id LIMIT 1), 0)
      ],
      'tax', COALESCE((
        SELECT SUM(s.tax) FROM public.employee_salaries s 
        WHERE s.employee_id = emp.id AND s.financial_year = p_financial_year AND s.month = ANY(v_months) AND s.office_id = p_office_id
      ), 0)
    )
  ) INTO v_result
  FROM public.employees emp
  WHERE emp.office_id = p_office_id AND emp.name IS NOT NULL AND emp.pan IS NOT NULL
  ORDER BY emp.name;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Get Budget Head Financial Year Aggregate Report
CREATE OR REPLACE FUNCTION public.get_budget_head_report(
  p_office_id UUID,
  p_financial_year INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'head_id', bh.id,
      'code', bh.code,
      'name', bh.name,
      'employee_count', (SELECT COUNT(*) FROM public.employees e WHERE e.budget_head_id = bh.id AND e.office_id = p_office_id),
      'total_gross', COALESCE((
        SELECT SUM(s.gross) FROM public.employee_salaries s
        JOIN public.employees e ON s.employee_id = e.id
        WHERE e.budget_head_id = bh.id AND s.financial_year = p_financial_year AND s.office_id = p_office_id
      ), 0),
      'total_da', COALESCE((
        SELECT SUM(s.da) FROM public.employee_salaries s
        JOIN public.employees e ON s.employee_id = e.id
        WHERE e.budget_head_id = bh.id AND s.financial_year = p_financial_year AND s.office_id = p_office_id
      ), 0),
      'total_tax', COALESCE((
        SELECT SUM(s.tax) FROM public.employee_salaries s
        JOIN public.employees e ON s.employee_id = e.id
        WHERE e.budget_head_id = bh.id AND s.financial_year = p_financial_year AND s.office_id = p_office_id
      ), 0)
    )
  ) INTO v_result
  FROM public.budget_heads bh
  WHERE bh.office_id = p_office_id
  ORDER BY bh.sort_order, bh.code;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Get Party 26Q TDS Aggregate Summary
CREATE OR REPLACE FUNCTION public.get_party_tds_summary(
  p_office_id UUID,
  p_financial_year INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'party_id', p.id,
      'party_name', p.name,
      'gst_no', p.gst_no,
      'pan_no', p.pan_no,
      'transaction_count', COUNT(t.id),
      'total_amount', COALESCE(SUM(t.amount), 0),
      'total_cgst', COALESCE(SUM(t.cgst), 0),
      'total_sgst', COALESCE(SUM(t.sgst), 0),
      'total_igst', COALESCE(SUM(t.igst), 0),
      'total_gst', COALESCE(SUM(t.total_gst), 0),
      'total_income_tax', COALESCE(SUM(t.income_tax), 0)
    )
  ) INTO v_result
  FROM public.parties p
  LEFT JOIN public.party_transactions t ON t.party_id = p.id AND t.office_id = p_office_id
  WHERE p.office_id = p_office_id
  GROUP BY p.id, p.name, p.gst_no, p.pan_no
  ORDER BY p.name;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
