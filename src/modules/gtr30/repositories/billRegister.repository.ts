import { supabase } from '@/core/supabase/client';
import type { Json } from '@/shared/json.types';
import type { GTR30Bill, GTR30BillStatus, GTR30FormData } from '../types';
import { resolveOfficeIdStrict } from './officeScope';
import { z } from 'zod';

interface BillRow {
  id: string;
  billRegisterNo: string;
  billDate: string | null;
  monthOf: string | null;
  billCode: string | null;
  status: GTR30BillStatus;
  grossTotal: number;
  deductionsTotal: number;
  netTotal: number;
  createdDate: string;
  updatedDate: string;
  data: GTR30FormData;
}

function rowToBill(row: BillRow): GTR30Bill {
  // Strip the nested `data` column: spreading `...row` used to re-embed the
  // whole form payload under `bill.data`, which was then persisted back into
  // the JSONB column on every edit-save (roughly doubling stored size).
  const { data: _column, ...rowScalars } = row;
  void _column;
  const bill: GTR30Bill = {
    ...row.data,
    ...rowScalars,
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
  // Defensively drop a legacy nested `data` key (bills loaded before the
  // rowToBill fix carried a duplicate copy of the form payload).
  const { data: _legacyData, ...cleanFormData } = formData as Record<string, unknown>;
  void _legacyData;
  return cleanFormData;
}

const billRowSchema = z.object({
  id: z.string(),
  billRegisterNo: z.string(),
  billDate: z.string().nullable(),
  monthOf: z.string().nullable(),
  billCode: z.string().nullable(),
  status: z.enum(['draft', 'submitted', 'passed', 'rejected']),
  grossTotal: z.number(),
  deductionsTotal: z.number(),
  netTotal: z.number(),
  createdDate: z.string(),
  updatedDate: z.string(),
  data: z.record(z.unknown()),
});

function validateBillRow(raw: unknown): BillRow | null {
  const result = billRowSchema.safeParse(raw);
  if (!result.success) {
    console.warn('[GTR30BillRegister] validation failed:', result.error.flatten());
    return null;
  }
  const validated = result.data;
  return {
    ...validated,
    data: validated.data as unknown as GTR30FormData,
  };
}

class Gtr30BillRegisterRepository {
  async list(): Promise<GTR30Bill[]> {
    const officeId = await resolveOfficeIdStrict();

    const { data, error } = await supabase.rpc('list_gtr30_bills', {
      p_office_id: officeId as unknown as string,
    });
    if (error) {
      console.warn('[GTR30BillRegister] list_gtr30_bills failed:', error);
      throw new Error(error.message);
    }
    if (!Array.isArray(data)) return [];
    return (data as unknown as BillRow[])
      .map(validateBillRow)
      .filter((b): b is BillRow => b !== null)
      .map(rowToBill);
  }

  async get(id: string): Promise<GTR30Bill | null> {
    const officeId = await resolveOfficeIdStrict();
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
    const validated = validateBillRow(data);
    if (!validated) return null;
    return rowToBill(validated);
  }

  async save(bill: GTR30Bill): Promise<GTR30Bill> {
    const officeId = await resolveOfficeIdStrict();
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
    const validated = validateBillRow(data);
    if (!validated) throw new Error('Bill save returned invalid data.');
    return rowToBill(validated);
  }

  async delete(id: string): Promise<void> {
    const officeId = await resolveOfficeIdStrict();
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
