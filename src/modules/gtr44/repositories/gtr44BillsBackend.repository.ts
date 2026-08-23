import { supabase } from '@/core/supabase/client';
import { useAuthStore } from '@/core/auth/store';
import { getOfficeId, isAllOfficesMode, resolveOfficeIdForUser } from '@/shared/utilities/office';
import type { Json } from '@/shared/json.types';
import type { GTR44Bill, GTR44FormData } from '../types';
import { getGrossAmount, getTotalDeductions } from '../services/gtr44Calc.service';

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
  billNo: string;
  fy: number | null;
  month: string | null;
  status: GTR44Bill['status'];
  grossAmount: number;
  netAmount: number;
  createdDate: string;
  updatedDate: string;
  createdBy?: string | null;
  formData: GTR44FormData;
}

function rowToBill(row: BillRow): GTR44Bill {
  const fd = row.formData ?? ({} as GTR44FormData);
  // Derive fallbacks from formData if row fields missing
  const gross = row.grossAmount ?? getGrossAmount(fd as GTR44FormData);
  const net = row.netAmount ?? gross - getTotalDeductions((fd as GTR44FormData).deductions);
  // Build a GTR44Bill with required fields, using formData as source of truth for many optional fields
  const fallbackForm = fd as GTR44FormData;
  return {
    id: row.id,
    billNo: row.billNo || fallbackForm.billRegisterNo || `GTR44-${row.id.slice(0, 8)}`,
    billDate: fallbackForm.billRegisterDate || row.createdDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    tokenNo: fallbackForm.tokenNo1 || '',
    tokenDate: fallbackForm.tokenDate1 || '',
    officeName: fallbackForm.officeName || '',
    ddoCardexCode: fallbackForm.ddoCardexCode || '',
    fy: (row.fy ?? parseInt(fallbackForm.budgetGrantYearFrom)) || new Date().getFullYear(),
    month: row.month || fallbackForm.monthOf || '',
    district: fallbackForm.district || '',
    sector: fallbackForm.sector || '',
    demandNo: fallbackForm.demandNo || '',
    majorHead: fallbackForm.majorHead || '',
    subMajorHead: fallbackForm.subMajorHead || '',
    minorHead: fallbackForm.minorHead || '',
    subHead: fallbackForm.subHead || '',
    detailedHead: fallbackForm.detailedHead || '',
    edpCode: fallbackForm.partyEntries?.[0]?.edpCode || fallbackForm.expenditureItems?.[0]?.edpCode || '',
    budgetAllotment: fallbackForm.budgetGrant || 0,
    ytdExpenditure: fallbackForm.expenditureIncludingBill || 0,
    availableBalance: fallbackForm.balance || 0,
    subVouchers: (fallbackForm.partyEntries || []).map((e) => ({
      id: e.id,
      subVoucherNo: e.subVoucherNo || String(e.srNo),
      payeeName: e.partyName,
      description: e.details,
      amount: e.amount,
      edpCode: e.edpCode,
    })),
    deductions: [],
    grossAmount: gross,
    totalDeduction: getTotalDeductions((fd as GTR44FormData).deductions),
    netAmount: net,
    status: row.status || 'draft',
    createdDate: row.createdDate,
    updatedDate: row.updatedDate,
    formData: fd as GTR44FormData,
  };
}

function billToPayload(bill: GTR44Bill): Record<string, unknown> {
  // The RPC upsert_gtr44_bill expects p_data containing id, billNo, fy, month, status, grossAmount, netAmount and formData
  // We send a flat object plus nested formData for server to extract bill_no etc.
  return {
    id: bill.id,
    billNo: bill.billNo,
    fy: bill.fy,
    month: bill.month,
    status: bill.status,
    grossAmount: bill.grossAmount,
    netAmount: bill.netAmount,
    formData: bill.formData as unknown as Json,
  };
}

class Gtr44BillsBackendRepository {
  async list(): Promise<GTR44Bill[] | null> {
    const officeId = await resolveOfficeId();
    if (!officeId) return null;
    const { data, error } = await supabase.rpc('list_gtr44_bills' as any, {
      p_office_id: officeId,
    } as unknown as Record<string, unknown>);
    if (error) {
      console.warn('[GTR44BillsBackend] list_gtr44_bills failed:', error);
      return null;
    }
    if (!Array.isArray(data)) return [];
    return (data as unknown as BillRow[]).map(rowToBill);
  }

  async get(id: string): Promise<GTR44Bill | null> {
    const officeId = await resolveOfficeId();
    if (!officeId) throw new Error('No office selected');
    const { data, error } = await supabase.rpc('get_gtr44_bill' as any, {
      p_office_id: officeId,
      p_bill_id: id,
    } as unknown as Record<string, unknown>);
    if (error) {
      console.error('[GTR44BillsBackend] get_gtr44_bill failed:', error);
      throw new Error(error.message || 'Database error while fetching bill');
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    if ((data as Record<string, unknown>).error) {
      const rpcError = (data as Record<string, unknown>).error;
      console.error('[GTR44BillsBackend] get_gtr44_bill error:', rpcError);
      throw new Error(String(rpcError));
    }
    return rowToBill(data as unknown as BillRow);
  }

  async save(bill: GTR44Bill): Promise<GTR44Bill | null> {
    const officeId = await resolveOfficeId();
    if (!officeId) throw new Error('No office selected. Please select an office to save bills.');
    const payload = billToPayload(bill);
    const { data, error } = await supabase.rpc('upsert_gtr44_bill' as any, {
      p_office_id: officeId,
      p_data: payload as unknown as Json,
    } as unknown as Record<string, unknown>);
    if (error) {
      console.error('[GTR44BillsBackend] upsert_gtr44_bill failed:', error);
      throw new Error(error.message || 'Database error while saving bill');
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Invalid response from server');
    }
    if ((data as Record<string, unknown>).error) {
      const rpcError = (data as Record<string, unknown>).error;
      console.error('[GTR44BillsBackend] upsert error:', rpcError);
      throw new Error(String(rpcError));
    }
    return rowToBill(data as unknown as BillRow);
  }

  async delete(id: string): Promise<boolean | null> {
    const officeId = await resolveOfficeId();
    if (!officeId) throw new Error('No office selected');
    const { data, error } = await supabase.rpc('delete_gtr44_bill' as any, {
      p_office_id: officeId,
      p_bill_id: id,
    } as unknown as Record<string, unknown>);
    if (error) {
      console.error('[GTR44BillsBackend] delete_gtr44_bill failed:', error);
      throw new Error(error.message || 'Database error while deleting bill');
    }
    if (!data || typeof data !== 'object') return false;
    return !!(data as Record<string, unknown>).deleted;
  }
}

export const gtr44BillsBackendRepository = new Gtr44BillsBackendRepository();
