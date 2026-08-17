import { supabase } from '@/core/supabase/client';
import { useAuthStore } from '@/core/auth/store';
import {
  getOfficeId,
  isAllOfficesMode,
  resolveOfficeIdForUser,
} from '@/shared/utilities/office';
import type { Json } from '@/shared/json.types';
import type { GTR30EmployeeMaster, GTR30MasterGroup } from '../types';

async function resolveOfficeId(): Promise<string | null> {
  if (isAllOfficesMode()) return null;
  const existing = getOfficeId();
  if (existing) return existing;

  const userId = useAuthStore.getState().user?.id;
  if (!userId) return null;
  return resolveOfficeIdForUser(userId);
}

export class Gtr30EmployeeMasterBackendRepository {
  async listGroups(): Promise<GTR30MasterGroup[] | null> {
    const officeId = await resolveOfficeId();
    if (!officeId) return null;

    const { data, error } = await supabase.rpc('list_gtr30_employee_master', {
      p_office_id: officeId,
    });
    if (error) {
      console.warn('[GTR30Backend] list_gtr30_employee_master failed:', error);
      return null;
    }
    if (!Array.isArray(data)) return null;
    return data as unknown as GTR30MasterGroup[];
  }

  async getGroup(
    monthKey: string,
    billCode: string
  ): Promise<GTR30EmployeeMaster[] | null> {
    const officeId = await resolveOfficeId();
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
    return data as unknown as GTR30EmployeeMaster[];
  }

  async replaceGroup(
    monthKey: string,
    billCode: string,
    employees: GTR30EmployeeMaster[]
  ): Promise<GTR30EmployeeMaster[] | null> {
    const officeId = await resolveOfficeId();
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
    return data as unknown as GTR30EmployeeMaster[];
  }
}

export const gtr30EmployeeMasterBackendRepository = new Gtr30EmployeeMasterBackendRepository();
