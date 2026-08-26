import { supabase } from '@/core/supabase/client';
import { rpcArray } from '@/shared/utilities';
import type { Json } from '@/shared/json.types';
import type { UserInfo, Office, SystemStats, OfficeStats, OfficeCompletion, DataEntryReportRow, ImportHealthRow, OfficeConfig } from '../types';

function messageOf(data: Json | null, fallback: string): string {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    if (typeof obj.error === 'string') throw new Error(obj.error);
    if (typeof obj.message === 'string') return obj.message;
  }
  return fallback;
}

export const adminRepository = {
  async getSystemStats(): Promise<SystemStats> {
    const { data, error } = await supabase.rpc('get_system_stats');
    if (error) throw error;
    return (data as unknown as SystemStats) || {
      users: 0,
      admins: 0,
      suspended: 0,
      offices: 0,
      fy: new Date().getFullYear(),
      employees: 0,
      salaries: 0,
      parties: 0,
      transactions: 0,
      officeName: null,
    };
  },

  async getOfficeStats(): Promise<OfficeStats[]> {
    const { data, error } = await supabase.rpc('admin_office_stats');
    if (error) throw error;
    return rpcArray<OfficeStats>(data);
  },

  async getEntryCompletion(): Promise<OfficeCompletion[]> {
    const { data, error } = await supabase.rpc('admin_entry_completion');
    if (error) throw error;
    return rpcArray<OfficeCompletion>(data);
  },

  async getDataEntryReport(): Promise<DataEntryReportRow[]> {
    const { data, error } = await supabase.rpc('admin_data_entry_report');
    if (error) throw error;
    return rpcArray<DataEntryReportRow>(data);
  },

  async listUsers(): Promise<UserInfo[]> {
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) throw error;
    return rpcArray<UserInfo>(data);
  },

  async listOffices(): Promise<Office[]> {
    const { data, error } = await supabase.rpc('admin_list_offices');
    if (error) throw error;
    return rpcArray<Office>(data);
  },

  async setUserRole(userId: string, role: 'admin' | 'office', officeId: string | null): Promise<string> {
    const { data, error } = await supabase.rpc('admin_set_role', {
      user_id: userId,
      new_role: role,
      new_office_id: officeId,
    });
    if (error) throw error;
    return messageOf(data, 'Role updated');
  },

  async setUserStatus(userId: string, suspended: boolean): Promise<string> {
    const { data, error } = await supabase.rpc('admin_set_user_status', {
      user_id: userId,
      suspended,
    });
    if (error) throw error;
    return messageOf(data, suspended ? 'User suspended' : 'User activated');
  },

  async deleteUser(userId: string): Promise<string> {
    const { data, error } = await supabase.rpc('admin_delete_user', { user_id: userId });
    if (error) throw error;
    return messageOf(data, 'User deleted');
  },

  async createOffice(name: string, district: string): Promise<Office> {
    const { data, error } = await supabase.rpc('admin_create_office', {
      office_name: name,
      office_district: district,
    });
    if (error) throw error;
    const office = data as unknown as Office;
    if (!office || typeof office.id !== 'string') {
      throw new Error(messageOf(data, 'Failed to create office'));
    }
    return office;
  },

  async createUser(email: string, password: string, role: string, officeId: string | null): Promise<string> {
    const { data, error } = await supabase.rpc('admin_create_user', {
      user_email: email,
      user_password: password,
      user_role: role,
      user_office_id: officeId,
    });
    if (error) throw error;
    return messageOf(data, 'User created');
  },

  async inviteUser(email: string, role: string, officeId: string | null): Promise<string> {
    const { data, error } = await supabase.rpc('admin_invite_user', {
      user_email: email,
      user_role: role,
      user_office_id: officeId,
    });
    if (error) throw error;
    return messageOf(data, 'Invitation created');
  },

  async getFinancialYears(officeId: string): Promise<number[]> {
    const now = new Date();
    const defaultFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    if (!officeId || officeId.trim() === '') return [defaultFY];

    try {
      const { data, error } = await supabase.rpc('admin_office_financial_years', {
        target_office_id: officeId,
      });
      if (error) throw error;
      const years = (data as unknown as number[]) || [];
      return years.length > 0 ? years : [defaultFY];
    } catch {
      return [defaultFY];
    }
  },

  async getImportHealth(): Promise<ImportHealthRow[]> {
    const { data, error } = await supabase.rpc('admin_import_health');
    if (error) throw error;
    const rows = rpcArray<ImportHealthRow>(data);
    return rows.map((row) => ({ ...row, office_id: String(row.office_id) }));
  },

  async getOfficeConfig(officeId: string): Promise<OfficeConfig> {
    const { data, error } = await supabase.rpc('admin_office_config', {
      target_office_id: officeId,
    });
    if (error) throw error;
    return data as unknown as OfficeConfig;
  },

  async setOfficeFy(officeId: string, fy: number): Promise<string> {
    const { data, error } = await supabase.rpc('admin_set_office_fy', {
      target_office_id: officeId,
      fy,
    });
    if (error) throw error;
    return messageOf(data, 'Financial year updated');
  },
};

