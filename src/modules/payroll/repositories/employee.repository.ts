import { supabase } from '@/core/supabase/client';
import { useUIStore } from '@/core/stores/ui-store';
import { useAuthStore } from '@/core/auth/store';
import type { EmployeeInput } from '../validation/employee.schema';
import type { Database } from '@/shared/database.types';

type Employee = Database['public']['Tables']['employees']['Row'];

function getOfficeId(): string | null {
  const authOfficeId = useAuthStore.getState().user?.officeId || null;
  if (authOfficeId) return authOfficeId;
  return useUIStore.getState().activeOfficeId || null;
}

export const employeeRepository = {
  async list(): Promise<Employee[]> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('office_id', officeId)
      .order('created_at');

    if (error) throw error;
    return data || [];
  },

  async create(input: EmployeeInput): Promise<Employee> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');

    const { data: duplicate } = await supabase
      .from('employees')
      .select('id')
      .eq('pan', input.pan)
      .eq('office_id', officeId)
      .maybeSingle();

    if (duplicate) {
      throw new Error('An employee with this PAN already exists in this office');
    }

    const payload = {
      hprn_no: input.hprnNo || null,
      name: input.name,
      pan: input.pan,
      office_id: officeId,
      join_date: input.joinDate || null,
      transfer_date: input.transferDate || null,
      budget_head_id: input.budgetHeadId || null,
    };

    const { data, error } = await supabase
      .from('employees')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(input: EmployeeInput): Promise<Employee> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');
    if (!input.id) throw new Error('Employee ID is required for update');

    const { data: duplicate } = await supabase
      .from('employees')
      .select('id')
      .eq('pan', input.pan)
      .eq('office_id', officeId)
      .neq('id', input.id)
      .maybeSingle();

    if (duplicate) {
      throw new Error('An employee with this PAN already exists in this office');
    }

    const { data, error } = await supabase
      .from('employees')
      .update({
        hprn_no: input.hprnNo || null,
        name: input.name,
        pan: input.pan,
        join_date: input.joinDate || null,
        transfer_date: input.transferDate || null,
        budget_head_id: input.budgetHeadId || null,
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

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)
      .eq('office_id', officeId);

    if (error) throw error;
  },

  async getById(id: string): Promise<Employee | null> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .eq('office_id', officeId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};
