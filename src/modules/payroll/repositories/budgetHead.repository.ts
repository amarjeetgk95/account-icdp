import { supabase } from '@/core/supabase/client';
import { getOfficeScope, requireOfficeId } from '@/shared/utilities/office';
import type { Database } from '@/shared/database.types';
import type { BudgetHeadInput } from '../types';

type BudgetHeadRow = Database['public']['Tables']['budget_heads']['Row'];

export const budgetHeadRepository = {
  async list(): Promise<BudgetHeadRow[]> {
    const scope = getOfficeScope();
    if (!scope.all && !scope.officeId) throw new Error('No office selected');

    const baseQuery = supabase.from('budget_heads').select('*');
    const q = (scope.all
      ? baseQuery
      : baseQuery.eq('office_id', scope.officeId!))
      .order('sort_order', { ascending: true })
      .order('code', { ascending: true });

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async create(input: BudgetHeadInput): Promise<BudgetHeadRow> {
    const officeId = requireOfficeId();

    const { data: duplicate } = await supabase
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

    const { data, error } = await supabase
      .from('budget_heads')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(input: BudgetHeadInput): Promise<BudgetHeadRow> {
    const officeId = requireOfficeId();
    if (!input.id) throw new Error('Budget head ID is required for update');

    const { data: duplicate } = await supabase
      .from('budget_heads')
      .select('id')
      .eq('code', input.code)
      .eq('office_id', officeId)
      .neq('id', input.id)
      .maybeSingle();

    if (duplicate) {
      throw new Error(`A budget head with code "${input.code}" already exists in this office`);
    }

    const { data, error } = await supabase
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
    const officeId = requireOfficeId();

    const { error } = await supabase
      .from('budget_heads')
      .delete()
      .eq('id', id)
      .eq('office_id', officeId);

    if (error) throw error;
  },

  async getById(id: string): Promise<BudgetHeadRow | null> {
    const scope = getOfficeScope();
    if (!scope.all && !scope.officeId) throw new Error('No office selected');

    const baseQuery = supabase.from('budget_heads').select('*').eq('id', id);
    const q = (scope.all
      ? baseQuery
      : baseQuery.eq('office_id', scope.officeId!))
      .maybeSingle();

    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
};
