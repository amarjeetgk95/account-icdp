import { supabase } from '@/core/supabase/client';
import type { Json } from '@/shared/json.types';
import type { GTR30EmployeeMaster, GTR30MasterGroup } from '../types';
import { resolveOfficeIdStrict } from './officeScope';
import { gtr30EmployeeMasterDbSchema } from '../validation/gtr30EmployeeMaster.schema';
import { z } from 'zod';

function validateEmployeeMasterArray(raw: unknown): GTR30EmployeeMaster[] | null {
  const result = z.array(gtr30EmployeeMasterDbSchema).safeParse(raw);
  if (!result.success) {
    console.warn('[GTR30EmployeeMasterBackend] validation failed:', result.error.flatten());
    return null;
  }
  return result.data;
}

function validateMasterGroupArray(raw: unknown): GTR30MasterGroup[] | null {
  const groupSchema = z.object({
    monthKey: z.string(),
    billCode: z.string(),
    employees: z.array(gtr30EmployeeMasterDbSchema),
  });
  const result = z.array(groupSchema).safeParse(raw);
  if (!result.success) {
    console.warn('[GTR30EmployeeMasterBackend] group validation failed:', result.error.flatten());
    return null;
  }
  return result.data;
}

class Gtr30EmployeeMasterBackendRepository {
  async listGroups(): Promise<GTR30MasterGroup[] | null> {
    const officeId = await resolveOfficeIdStrict();
    if (!officeId) return null;

    const { data, error } = await supabase.rpc('list_gtr30_employee_master', {
      p_office_id: officeId,
    });
    if (error) {
      console.warn('[GTR30Backend] list_gtr30_employee_master failed:', error);
      return null;
    }
    if (!Array.isArray(data)) return null;
    return validateMasterGroupArray(data);
  }

  async getGroup(
    monthKey: string,
    billCode: string
  ): Promise<GTR30EmployeeMaster[] | null> {
    const officeId = await resolveOfficeIdStrict();
    if (!officeId) return null;

    const { data, error } = await supabase.rpc('get_gtr30_employee_master', {
      p_office_id: officeId,
      p_month_key: monthKey,
      p_bill_code: billCode,
    });
    if (error) {
      console.warn('[GTR30Backend] get_gtr30_employee_master failed:', error);
      return null;
    }
    if (!Array.isArray(data)) return null;
    return validateEmployeeMasterArray(data);
  }

  async replaceGroup(
    monthKey: string,
    billCode: string,
    employees: GTR30EmployeeMaster[]
  ): Promise<GTR30EmployeeMaster[] | null> {
    const officeId = await resolveOfficeIdStrict();
    if (!officeId) return null;

    const { data, error } = await supabase.rpc('upsert_gtr30_employee_master', {
      p_office_id: officeId,
      p_month_key: monthKey,
      p_bill_code: billCode,
      p_employees: employees as unknown as Json,
    });
    if (error) {
      console.warn('[GTR30Backend] upsert_gtr30_employee_master failed:', error);
      return null;
    }
    if (!Array.isArray(data)) return null;
    return validateEmployeeMasterArray(data);
  }
}

export const gtr30EmployeeMasterBackendRepository = new Gtr30EmployeeMasterBackendRepository();
