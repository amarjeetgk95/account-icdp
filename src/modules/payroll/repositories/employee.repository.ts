import { supabase } from '@/core/supabase/client';
import type { EmployeeInput } from '../validation/employee.schema';
import type { Database } from '@/shared/database.types';

type Employee = Database['public']['Tables']['employees']['Row'];

export const employeeRepository = {
  async list(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('id');

    if (error) throw error;
    return data || [];
  },

  async create(input: EmployeeInput): Promise<Employee> {
    const { data: duplicate } = await supabase
      .from('employees')
      .select('id')
      .eq('pan', input.pan)
      .maybeSingle();

    if (duplicate) {
      throw new Error('An employee with this PAN already exists');
    }

    const payload = {
      hprn_no: input.hprnNo || null,
      name: input.name,
      pan: input.pan,
      designation: input.designation || null,
      pay_scale: input.payScale || null,
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
    if (!input.id) throw new Error('Employee ID is required for update');

    const { data: duplicate } = await supabase
      .from('employees')
      .select('id')
      .eq('pan', input.pan)
      .neq('id', input.id)
      .maybeSingle();

    if (duplicate) {
      throw new Error('An employee with this PAN already exists');
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
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getById(id: string): Promise<Employee | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};
