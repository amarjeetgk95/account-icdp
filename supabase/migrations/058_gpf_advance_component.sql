-- 058_gpf_advance_component.sql
-- GPF Advance shares treasury code 9670 with GPF Regular but is a separate
-- column on Karmayogi deduction sheets:
--   Prof Tax (9570) | HBA Interest (9591) | GPF Reg (9670) | GPF Advance (9670) |
--   GPF Reg Class 4 (9531) | NPS Reg (9534) | Govt Fund (9581) | Govt Saving (9582)
-- Without this row the detector drops the Advance column, shifting every later
-- column left by one (NPS->Fund, Fund->Saving, Saving lost) and blocking import
-- with "Total deductions does not match".
DO $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.payroll_components
    WHERE component_code = '9670' AND component_name = 'GPF Advance'
  ) THEN
    INSERT INTO public.payroll_components
      (component_code, component_name, short_name, type, kind, category, display_order,
       is_mandatory, is_total_field, is_system_generated, notes)
    VALUES
      ('9670', 'GPF Advance', 'GPF Adv', 'DEDUCTION', 'COMPONENT', 'Fund', 45,
       FALSE, FALSE, FALSE,
       'Shares treasury code 9670 with GPF Regular; matched by name only (never by code alone).')
    RETURNING id INTO v_id;

    INSERT INTO public.payroll_component_aliases (component_id, alias_text, alias_type) VALUES
      (v_id, 'GPF Advance', 'HEADER'),
      (v_id, 'GPF Adv', 'HEADER'),
      (v_id, 'GPF Advance (9670)', 'HEADER'),
      (v_id, 'GPF Adv (9670)', 'HEADER'),
      (v_id, '9670', 'CODE')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
