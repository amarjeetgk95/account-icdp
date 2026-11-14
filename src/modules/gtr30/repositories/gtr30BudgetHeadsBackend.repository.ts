import { supabase } from '@/core/supabase/client';
import type { Json } from '@/shared/json.types';
import type { GTR30BudgetHead } from '../types';
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
    try {
      const { data, error } = await supabase
        .from('gtr30_budget_heads')
        .select('*')
        .order('name');

      if (error) {
        console.warn('[GTR30Backend] get_gtr30_budget_heads failed:', error);
        return [];
      }

      if (!Array.isArray(data)) return [];

      const formatted = data.map((r: Record<string, unknown>) => ({
        id: String(r.id),
        name: String(r.name || ''),
        ...((r.payload as Record<string, unknown>) || {}),
      }));

      return validateHeadsArray(formatted) || (formatted as unknown as GTR30BudgetHead[]);
    } catch (err) {
      console.warn('[GTR30BudgetHeadsBackend] list error:', err);
      return [];
    }
  }

  async replaceAll(heads: GTR30BudgetHead[]): Promise<GTR30BudgetHead[] | null> {
    try {
      const incomingIds = new Set(heads.map((h) => h.id).filter(Boolean));

      // 1. Delete removed heads
      const { data: existing } = await supabase.from('gtr30_budget_heads').select('id');
      const toDelete = (existing || [])
        .map((e: { id: string }) => String(e.id))
        .filter((id) => !incomingIds.has(id));

      if (toDelete.length > 0) {
        await supabase.from('gtr30_budget_heads').delete().in('id', toDelete);
      }

      // 2. Upsert incoming heads
      for (const h of heads) {
        const { id, name, ...payload } = h;
        await supabase.from('gtr30_budget_heads').upsert({
          id: id || crypto.randomUUID(),
          name: name || '',
          payload: payload as unknown as Json,
          updated_at: new Date().toISOString(),
        });
      }

      return this.list();
    } catch (err) {
      console.error('[GTR30BudgetHeadsBackend] replaceAll error:', err);
      throw err;
    }
  }
}

export const gtr30BudgetHeadsBackendRepository = new Gtr30BudgetHeadsBackendRepository();
