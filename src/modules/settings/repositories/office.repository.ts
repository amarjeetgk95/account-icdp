import { supabase } from '@/core/supabase/client';
import type { OfficeDetailsInput } from '../validation/settings.schema';

export const EMPTY_DETAILS: OfficeDetailsInput = {
  officeName: '',
  subtitle: '',
  departmentDivision: '',
  district: '',
  address: '',
  phone: '',
  email: '',
  gst: '',
  tan: '',
};

function mapRowToInput(row: {
  office_name?: string | null;
  subtitle?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gst?: string | null;
  tan?: string | null;
}): OfficeDetailsInput {
  return {
    officeName: row.office_name || '',
    subtitle: row.subtitle || '',
    departmentDivision: row.subtitle || '',
    district: '',
    address: row.address || '',
    phone: row.phone || '',
    email: row.email || '',
    gst: row.gst || '',
    tan: row.tan || '',
  };
}

export const officeRepository = {
  async getName(): Promise<string> {
    const { data, error } = await supabase
      .from('office_details')
      .select('office_name')
      // NOTE: order by created_at, NOT updated_at — live DBs drifted and
      // some are missing the updated_at column entirely (42703).
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // PGRST116 = no rows: fall through to offices fallback. Any other error
    // must surface (previously swallowed, masking RLS/connection issues).
    if (error && error.code !== 'PGRST116') {
      console.error('[office.repository] getName failed:', error);
      throw new Error(error.message);
    }

    if (data?.office_name) return data.office_name;

    const { data: office } = await supabase
      .from('offices')
      .select('name')
      .limit(1)
      .maybeSingle();

    return office?.name || 'ICDP SURAT, GUJARAT';
  },

  async get(): Promise<OfficeDetailsInput> {
    let fromTable: Partial<OfficeDetailsInput> = {};
    try {
      const { data, error } = await supabase
        .from('office_details')
        .select('office_name, subtitle, address, phone, email, gst, tan')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        fromTable = mapRowToInput(data);
      }
    } catch (err) {
      console.warn('[office.repository] get from office_details warning:', err);
    }

    // Also read extended settings from paybill_settings (stores departmentDivision & district)
    let fromExtended: Partial<OfficeDetailsInput> = {};
    try {
      const { data, error } = await supabase
        .from('paybill_settings')
        .select('settings_value')
        .eq('settings_key', 'office_details_extended')
        .maybeSingle();

      if (!error && data?.settings_value && typeof data.settings_value === 'object') {
        fromExtended = data.settings_value as Partial<OfficeDetailsInput>;
      }
    } catch (err) {
      console.warn('[office.repository] get from paybill_settings warning:', err);
    }

    // Fallback to Form 16 Deductor & GTR-30 Defaults if still empty
    let fallbackName = '';
    let fallbackDivision = '';
    let fallbackDistrict = '';
    let fallbackAddress = '';
    let fallbackTan = '';

    try {
      const { data: f16Data } = await supabase
        .from('paybill_settings')
        .select('settings_value')
        .eq('settings_key', 'form16_deductor_defaults')
        .maybeSingle();

      if (f16Data?.settings_value && typeof f16Data.settings_value === 'object') {
        const f16 = f16Data.settings_value as Record<string, any>;
        const parts = String(f16.employerName || '').split('\n').map((s) => s.trim()).filter(Boolean);
        fallbackName = parts[0] || '';
        fallbackDivision = parts[1] || '';
        fallbackAddress = f16.employerAddress || '';
        fallbackTan = f16.employerTan || '';
        fallbackDistrict = f16.signatoryPlace || '';
      }
    } catch {
      // ignore
    }

    return {
      officeName: fromTable.officeName || fromExtended.officeName || fallbackName,
      subtitle: fromTable.subtitle || fromExtended.subtitle || fallbackDivision,
      departmentDivision:
        fromExtended.departmentDivision || fromTable.subtitle || fallbackDivision,
      district: fromExtended.district || fallbackDistrict,
      address: fromTable.address || fromExtended.address || fallbackAddress,
      phone: fromTable.phone || fromExtended.phone || '',
      email: fromTable.email || fromExtended.email || '',
      gst: fromTable.gst || fromExtended.gst || '',
      tan: fromTable.tan || fromExtended.tan || fallbackTan,
    };
  },

  async save(input: OfficeDetailsInput): Promise<void> {
    // Deterministic single-row lookup: newest first. The old
    // `.limit(1)` without ORDER BY could read/update an arbitrary row when
    // duplicates exist, so save appeared to succeed yet refresh showed
    // stale data from a different row.
    const { data: existing, error: lookupError } = await supabase
      .from('office_details')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError && lookupError.code !== 'PGRST116') throw lookupError;

    // NOTE: no updated_at in the payload — the column is missing on some
    // live DBs (42703). created_at DEFAULT NOW() stamps new rows.
    const payload = {
      office_name: (input.officeName ?? '').trim(),
      subtitle: ((input.departmentDivision || input.subtitle) ?? '').trim(),
      address: (input.address ?? '').trim(),
      phone: (input.phone ?? '').trim(),
      email: (input.email ?? '').trim(),
      gst: (input.gst ?? '').trim(),
      tan: (input.tan ?? '').trim(),
    };

    let savedId: string | undefined;

    if (existing?.id) {
      // .select('id') verifies the UPDATE actually hit a row: under RLS a
      // blocked update can return 0 rows with no error, which previously
      // looked like success but persisted nothing.
      const { data: updated, error } = await supabase
        .from('office_details')
        .update(payload)
        .eq('id', existing.id)
        .select('id');

      if (error) throw error;
      if (!updated || updated.length === 0) {
        throw new Error(
          'Office update affected 0 rows — write was blocked (check Supabase RLS policies / login).'
        );
      }
      savedId = updated[0].id;
    } else {
      const { data: inserted, error } = await supabase
        .from('office_details')
        .insert(payload)
        .select('id')
        .single();

      if (error) throw error;
      savedId = inserted.id;
    }

    // Persist full extended payload to paybill_settings so departmentDivision & district are always saved
    try {
      const cleanExtended = {
        officeName: (input.officeName ?? '').trim(),
        subtitle: (input.subtitle ?? '').trim(),
        departmentDivision: (input.departmentDivision ?? '').trim(),
        district: (input.district ?? '').trim(),
        address: (input.address ?? '').trim(),
        phone: (input.phone ?? '').trim(),
        email: (input.email ?? '').trim(),
        gst: (input.gst ?? '').trim(),
        tan: (input.tan ?? '').trim(),
      };

      const { data: updated } = await supabase
        .from('paybill_settings')
        .update({
          settings_value: cleanExtended as any,
          updated_at: new Date().toISOString(),
        })
        .eq('settings_key', 'office_details_extended')
        .select('settings_key');

      if (!updated || updated.length === 0) {
        await supabase.from('paybill_settings').insert({
          settings_key: 'office_details_extended',
          settings_value: cleanExtended as any,
        });
      }
    } catch (extErr) {
      console.warn('[office.repository] saving office_details_extended warning:', extErr);
    }

    // Best-effort singleton cleanup: earlier buggy saves could have left
    // duplicate rows, making reads non-deterministic. Never fail the save
    // itself because of cleanup (e.g. RLS without DELETE right).
    try {
      if (savedId) {
        const { error: cleanupError } = await supabase
          .from('office_details')
          .delete()
          .neq('id', savedId);
        if (cleanupError) {
          console.warn('[office.repository] duplicate cleanup skipped:', cleanupError.message);
        }
      }
    } catch (cleanupErr) {
      console.warn('[office.repository] duplicate cleanup skipped:', cleanupErr);
    }
  },
};
