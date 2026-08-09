import { supabase } from '@/core/supabase/client';
import { useUIStore } from '@/core/stores/ui-store';
import { useAuthStore } from '@/core/auth/store';
import type { Database } from '@/shared/database.types';
import type { BudgetHeadInput } from '../types';

type BudgetHeadRow = Database['public']['Tables']['budget_heads']['Row'];

function getOfficeId(): string | null {
  const authOfficeId = useAuthStore.getState().user?.officeId || null;
  if (authOfficeId) return authOfficeId;
  return useUIStore.getState().activeOfficeId || null;
}

export const budgetHeadRepository = {
  async list(): Promise<BudgetHeadRow[]> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');

    const { data, error } = await (supabase as any)
      .from('budget_heads')
      .select('*')
      .eq('office_id', officeId)
      .order('sort_order', { ascending: true })
      .order('code', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(input: BudgetHeadInput): Promise<BudgetHeadRow> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');

    const { data: duplicate } = await (supabase as any)
      .from('budget_heads')
      .select('id')
      .eq('code', input.code)
      .eq('office_id', officeId)
      .maybeSingle();

    if (duplicate) {
      throw new Error(`A budget head with code "${input.code}" already exists in this office`);
    }

    const payload = {
      code: input.code,
      name: input.name,
      office_id: officeId,
    };

    const { data, error } = await (supabase as any)
      .from('budget_heads')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(input: BudgetHeadInput): Promise<BudgetHeadRow> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');
    if (!input.id) throw new Error('Budget head ID is required for update');

    const { data: duplicate } = await (supabase as any)
      .from('budget_heads')
      .select('id')
      .eq('code', input.code)
      .eq('office_id', officeId)
      .neq('id', input.id)
      .maybeSingle();

    if (duplicate) {
      throw new Error(`A budget head with code "${input.code}" already exists in this office`);
    }

    const { data, error } = await (supabase as any)
      .from('budget_heads')
      .update({
        code: input.code,
        name: input.name,
      })
      .eq('id', input.id)
      .eq('office_id', officeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');

    const { error } = await (supabase as any)
      .from('budget_heads')
      .delete()
      .eq('id', id)
      .eq('office_id', officeId);

    if (error) throw error;
  },

  async getById(id: string): Promise<BudgetHeadRow | null> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');

    const { data, error } = await (supabase as any)
      .from('budget_heads')
      .select('*')
      .eq('id', id)
      .eq('office_id', officeId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};
