-- 061_nppa_header_aliases.sql
-- Karmayogi prints the NPPA column in several abbreviated forms
-- ("NPPA", "N.P.P.A.", "NPPA (0128)") depending on the bill. Without these
-- aliases the header detector misses the column whenever the full
-- "Non Private Practice Allow (0128)" wording (or its treasury code) is not
-- printed, shifting every later amount left and fetching NPPA as 0.
DO $$
DECLARE
  v_id UUID;
  v_alias TEXT;
BEGIN
  SELECT id INTO v_id FROM public.payroll_components
  WHERE component_code = '0128'
    AND component_name = 'Non Private Practice Allowance'
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    FOREACH v_alias IN ARRAY ARRAY['NPPA', 'NPPA (0128)', 'N.P.P.A.', 'N P P A', 'Non Private Practice Allowance (0128)'] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.payroll_component_aliases
        WHERE component_id = v_id
          AND alias_text = v_alias
          AND alias_type = 'HEADER'
      ) THEN
        INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type)
        VALUES (v_id, v_alias, 'HEADER');
      END IF;
    END LOOP;
  END IF;
END $$;
