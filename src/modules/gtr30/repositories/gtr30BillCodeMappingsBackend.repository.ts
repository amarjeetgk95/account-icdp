import { supabase } from '@/core/supabase/client';
import type { Json } from '@/shared/json.types';
import type { GTR30BillCodeMapping } from '../types';
import { resolveOfficeIdStrict } from './officeScope';
import { gtr30BillCodeMappingsSchema } from '../validation/gtr30BillCodeMappings.schema';

function validateMappingsArray(raw: unknown): GTR30BillCodeMapping[] | null {
  const result = gtr30BillCodeMappingsSchema.safeParse(raw);
  if (!result.success) {
    console.warn('[GTR30BillCodeMappingsBackend] validation failed:', result.error.flatten());
    return null;
  }
  return result.data;
}

class Gtr30BillCodeMappingsBackendRepository {
  async list(): Promise<GTR30BillCodeMapping[] | null> {
    const officeId = await resolveOfficeIdStrict();
    if (!officeId) return null;

    const { data, error } = await supabase.rpc('get_gtr30_bill_code_mappings', {
      p_office_id: officeId,
    });
    if (error) {
      console.warn('[GTR30Backend] get_gtr30_bill_code_mappings failed:', error);
      return null;
    }
    if (!Array.isArray(data)) return null;
    return validateMappingsArray(data);
  }

  async replaceAll(
    mappings: GTR30BillCodeMapping[]
  ): Promise<GTR30BillCodeMapping[] | null> {
    const officeId = await resolveOfficeIdStrict();
    if (!officeId) return null;

    const { data, error } = await supabase.rpc('upsert_gtr30_bill_code_mappings', {
      p_office_id: officeId,
      p_mappings: mappings as unknown as Json,
    });
    if (error) {
      console.warn('[GTR30Backend] upsert_gtr30_bill_code_mappings failed:', error);
      return null;
    }
    if (!Array.isArray(data)) return null;
    return validateMappingsArray(data);
  }
}

export const gtr30BillCodeMappingsBackendRepository = new Gtr30BillCodeMappingsBackendRepository();
