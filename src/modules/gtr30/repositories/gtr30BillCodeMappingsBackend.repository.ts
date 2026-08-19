import { supabase } from '@/core/supabase/client';
import { useAuthStore } from '@/core/auth/store';
import {
  getOfficeId,
  isAllOfficesMode,
  resolveOfficeIdForUser,
} from '@/shared/utilities/office';
import type { Json } from '@/shared/json.types';
import type { GTR30BillCodeMapping } from '../types';

async function resolveOfficeId(): Promise<string | null> {
  if (isAllOfficesMode()) return null;
  const existing = getOfficeId();
  if (existing) return existing;

  const userId = useAuthStore.getState().user?.id;
  if (!userId) return null;
  return resolveOfficeIdForUser(userId);
}

class Gtr30BillCodeMappingsBackendRepository {
  async list(): Promise<GTR30BillCodeMapping[] | null> {
    const officeId = await resolveOfficeId();
    if (!officeId) return null;

    const { data, error } = await supabase.rpc('get_gtr30_bill_code_mappings', {
      p_office_id: officeId,
    });
    if (error) {
      console.warn('[GTR30Backend] get_gtr30_bill_code_mappings failed:', error);
      return null;
    }
    if (!Array.isArray(data)) return null;
    return data as unknown as GTR30BillCodeMapping[];
  }

  async replaceAll(
    mappings: GTR30BillCodeMapping[]
  ): Promise<GTR30BillCodeMapping[] | null> {
    const officeId = await resolveOfficeId();
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
    return data as unknown as GTR30BillCodeMapping[];
  }
}

export const gtr30BillCodeMappingsBackendRepository = new Gtr30BillCodeMappingsBackendRepository();
