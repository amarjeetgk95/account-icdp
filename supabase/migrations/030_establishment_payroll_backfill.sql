-- 030_establishment_payroll_backfill.sql
-- Backfill the Establishment register from the TDS Payroll employee roster
-- (public.employees). Deduplicates by HRPN, PAN, or name.

DROP FUNCTION IF EXISTS public.backfill_establishment_from_payroll(BIGINT);

CREATE OR REPLACE FUNCTION public.backfill_establishment_from_payroll(
  p_office_id BIGINT
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_inserted INTEGER := 0;
BEGIN
  IF NOT public.can_access_office(p_office_id) THEN
    RETURN json_build_object('error', 'Office access required');
  END IF;

  INSERT INTO public.establishment_employees (
    id, office_id, hrpn_no, name, designation, pay_scale, pan,
    join_date, transfer_date, active, updated_at
  )
  SELECT
    gen_random_uuid(),
    p_office_id,
    NULLIF(e.hprn_no, ''),
    COALESCE(e.name, ''),
    e.designation,
    e.pay_scale,
    NULLIF(e.pan, ''),
    e.join_date,
    e.transfer_date,
    TRUE,
    NOW()
  FROM public.employees e
  WHERE e.office_id::text = p_office_id::text
    AND NOT EXISTS (
      SELECT 1 FROM public.establishment_employees est
      WHERE est.office_id = p_office_id
        AND (
          (COALESCE(NULLIF(e.hprn_no, ''), '') <> '' AND est.hrpn_no = e.hprn_no)
          OR (COALESCE(NULLIF(e.pan, ''), '') <> '' AND est.pan = e.pan)
          OR ((e.hprn_no IS NULL OR e.hprn_no = '') AND lower(est.name) = lower(e.name))
        )
    );

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  SELECT COALESCE(json_agg(emp), '[]'::json) INTO v_result
  FROM (
    SELECT est.id, est.name, est.hrpn_no AS "hrpnNo", est.pan
    FROM public.establishment_employees est
    WHERE est.office_id = p_office_id
    ORDER BY est.name
  ) emp;

  RETURN json_build_object(
    'inserted', v_inserted,
    'updated', 0,
    'total', COALESCE(json_array_length(v_result), 0),
    'employees', v_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
