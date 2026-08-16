import { supabase } from '@/core/supabase/client';
import { getOfficeScope, requireOfficeId } from '@/shared/utilities/office';
import type { EmployeeInput } from '../validation/employee.schema';
import type { Database } from '@/shared/database.types';

type Employee = Database['public']['Tables']['employees']['Row'];

export const employeeRepository = {
  async list(): Promise<Employee[]> {
    const scope = getOfficeScope();
    if (!scope.all && !scope.officeId) throw new Error('No office selected');

    const baseQuery = supabase.from('employees').select('*');
    const q = (scope.all
      ? baseQuery
      : baseQuery.eq('office_id', scope.officeId!))
      .order('id');

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async create(input: EmployeeInput): Promise<Employee> {
    const officeId = requireOfficeId();

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
      designation: input.designation || null,
      pay_scale: input.payScale || null,
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
    const officeId = requireOfficeId();
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
        designation: input.designation || null,
        pay_scale: input.payScale || null,
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
    const officeId = requireOfficeId();

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)
      .eq('office_id', officeId);

    if (error) throw error;
  },

  async getById(id: string): Promise<Employee | null> {
    const scope = getOfficeScope();
    if (!scope.all && !scope.officeId) throw new Error('No office selected');

    const baseQuery = supabase.from('employees').select('*').eq('id', id);
    const q = (scope.all
      ? baseQuery
      : baseQuery.eq('office_id', scope.officeId!))
      .maybeSingle();

    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
};
