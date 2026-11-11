import { supabase } from '@/core/supabase/client';
import type { Database } from '@/shared/database.types';
import type { BudgetHeadInput } from '../types';

type BudgetHeadRow = Database['public']['Tables']['budget_heads']['Row'];

export const budgetHeadRepository = {
  async list(): Promise<BudgetHeadRow[]> {
    const { data, error } = await supabase
      .from('budget_heads')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('code', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(input: BudgetHeadInput): Promise<BudgetHeadRow> {
    const { data: duplicate } = await supabase
      .from('budget_heads')
      .select('id')
      .eq('code', input.code)
      .maybeSingle();

    if (duplicate) {
      throw new Error(`A budget head with code "${input.code}" already exists`);
    }

    const payload = {
      code: input.code,
      name: input.name,
    };

    const { data, error } = await supabase
      .from('budget_heads')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(input: BudgetHeadInput): Promise<BudgetHeadRow> {
    if (!input.id) throw new Error('Budget head ID is required for update');

    const { data: duplicate } = await supabase
      .from('budget_heads')
      .select('id')
      .eq('code', input.code)
      .neq('id', input.id)
      .maybeSingle();

    if (duplicate) {
      throw new Error(`A budget head with code "${input.code}" already exists`);
    }

    const { data, error } = await supabase
      .from('budget_heads')
      .update({
        code: input.code,
        name: input.name,
      })
      .eq('id', input.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('budget_heads')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
