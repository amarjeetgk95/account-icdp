import { supabase } from '@/core/supabase/client';
import { useAuthStore } from '@/core/auth/store';
import {
  getOfficeId,
  isAllOfficesMode,
  resolveOfficeIdForUser,
} from '@/shared/utilities/office';
import type { Json } from '@/shared/json.types';
import type { GTR30Bill } from '../types';

async function resolveOfficeId(): Promise<string | null> {
  if (isAllOfficesMode()) return null;
  const existing = getOfficeId();
  if (existing) return existing;

  const userId = useAuthStore.getState().user?.id;
  if (!userId) return null;
  return resolveOfficeIdForUser(userId);
}

interface BillRow {
  id: string;
  billRegisterNo: string;
  billDate: string | null;
  monthOf: string | null;
  billCode: string | null;
  status: 'draft' | 'submitted' | 'passed';
  grossTotal: number;
  deductionsTotal: number;
  netTotal: number;
  createdDate: string;
  updatedDate: string;
  data: GTR30Bill;
}

function rowToBill(row: BillRow): GTR30Bill {
  const bill: GTR30Bill = {
    ...row.data,
    ...row,
    billDate: row.billDate ?? '',
    monthOf: row.monthOf ?? '',
    billCode: row.billCode ?? '',
  };
  return bill;
}

function billToRowPayload(bill: GTR30Bill): Record<string, unknown> {
  const { id, createdDate, updatedDate, grossTotal, deductionsTotal, netTotal, ...formData } = bill;
  void id;
  void createdDate;
  void updatedDate;
  void grossTotal;
  void deductionsTotal;
  void netTotal;
  return formData as Record<string, unknown>;
}

export class Gtr30BillRegisterRepository {
  async list(): Promise<GTR30Bill[]> {
    const officeId = await resolveOfficeId();
    if (!officeId) return [];

    const { data, error } = await supabase.rpc('list_gtr30_bills', {
      p_office_id: officeId,
    });
    if (error) {
      console.warn('[GTR30BillRegister] list_gtr30_bills failed:', error);
      throw new Error(error.message);
    }
    if (!Array.isArray(data)) return [];
    return (data as unknown as BillRow[]).map(rowToBill);
  }

  async get(id: string): Promise<GTR30Bill | null> {
    const officeId = await resolveOfficeId();
    if (!officeId) return null;

    const { data, error } = await supabase.rpc('get_gtr30_bill', {
      p_office_id: officeId,
      p_bill_id: id,
    });
    if (error) {
      console.warn('[GTR30BillRegister] get_gtr30_bill failed:', error);
      throw new Error(error.message);
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    return rowToBill(data as unknown as BillRow);
  }

  async save(bill: GTR30Bill): Promise<GTR30Bill> {
    const officeId = await resolveOfficeId();
    if (!officeId) {
      throw new Error('Office session required to save a GTR-30 bill.');
    }

    const payload = billToRowPayload(bill);
    const { data, error } = await supabase.rpc('upsert_gtr30_bill', {
      p_office_id: officeId,
      p_data: { ...payload, id: bill.id } as unknown as Json,
    });
    if (error) {
      console.warn('[GTR30BillRegister] upsert_gtr30_bill failed:', error);
      throw new Error(error.message);
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Bill save returned an invalid response.');
    }
    return rowToBill(data as unknown as BillRow);
  }

  async delete(id: string): Promise<void> {
    const officeId = await resolveOfficeId();
    if (!officeId) {
      throw new Error('Office session required to delete a GTR-30 bill.');
    }

    const { data, error } = await supabase.rpc('delete_gtr30_bill', {
      p_office_id: officeId,
      p_bill_id: id,
    });
    if (error) {
      console.warn('[GTR30BillRegister] delete_gtr30_bill failed:', error);
      throw new Error(error.message);
    }
    void data;
  }
}

export const gtr30BillRegisterRepository = new Gtr30BillRegisterRepository();
