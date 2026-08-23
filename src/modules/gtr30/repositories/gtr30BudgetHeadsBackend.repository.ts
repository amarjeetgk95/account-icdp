import { supabase } from '@/core/supabase/client';
import type { Json } from '@/shared/json.types';
import type { GTR30BudgetHead } from '../types';
import { resolveOfficeIdStrict } from './officeScope';
import { gtr30BudgetHeadsSchema } from '../validation/gtr30BudgetHeads.schema';

function validateHeadsArray(raw: unknown): GTR30BudgetHead[] | null {
  const result = gtr30BudgetHeadsSchema.safeParse(raw);
  if (!result.success) {
    console.warn('[GTR30BudgetHeadsBackend] validation failed:', result.error.flatten());
    return null;
  }
  return result.data;
}

class Gtr30BudgetHeadsBackendRepository {
  async list(): Promise<GTR30BudgetHead[] | null> {
    const officeId = await resolveOfficeIdStrict();
    if (!officeId) return null;

    const { data, error } = await supabase.rpc('get_gtr30_budget_heads', {
      p_office_id: officeId,
    });
    if (error) {
      console.warn('[GTR30Backend] get_gtr30_budget_heads failed:', error);
      return null;
    }
    if (!Array.isArray(data)) return null;
    return validateHeadsArray(data);
  }

  async replaceAll(heads: GTR30BudgetHead[]): Promise<GTR30BudgetHead[] | null> {
    const officeId = await resolveOfficeIdStrict();
    if (!officeId) return null;

    const { data, error } = await supabase.rpc('upsert_gtr30_budget_heads', {
      p_office_id: officeId,
      p_heads: heads as unknown as Json,
    });
    if (error) {
      console.warn('[GTR30Backend] upsert_gtr30_budget_heads failed:', error);
      return null;
    }
    if (!Array.isArray(data)) return null;
    return validateHeadsArray(data);
  }
}

export const gtr30BudgetHeadsBackendRepository = new Gtr30BudgetHeadsBackendRepository();
