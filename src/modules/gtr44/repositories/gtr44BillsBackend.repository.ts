import { supabase } from '@/core/supabase/client';
import type { Json } from '@/shared/json.types';
import type { GTR44Bill, GTR44FormData } from '../types';
import { getGrossAmount, getTotalDeductions } from '../services/gtr44Calc.service';
import { useUIStore } from '@/core/stores/ui-store';

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
  const gross = row.grossAmount ?? getGrossAmount(fd as GTR44FormData);
  const net = row.netAmount ?? gross - getTotalDeductions((fd as GTR44FormData).deductions);
  const fallbackForm = fd as GTR44FormData;
  return {
    id: row.id,
    billNo: row.billNo || fallbackForm.billRegisterNo || `GTR44-${row.id.slice(0, 8)}`,
    billDate: fallbackForm.billRegisterDate || row.createdDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    tokenNo: fallbackForm.tokenNo1 || '',
    tokenDate: fallbackForm.tokenDate1 || '',
    officeName: fallbackForm.officeName || '',
    ddoCardexCode: fallbackForm.ddoCardexCode || '',
    fy: (row.fy ?? parseInt(fallbackForm.budgetGrantYearFrom)) || useUIStore.getState().activeFinancialYear,
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

/**
 * Migration 053 normalized mirror: one row per expenditure item / sub-voucher.
 * Snapshot JSONB (`form_data`) remains the source of truth; reads never touch this.
 */
export interface GTR44ExpenditureLineInsert {
  bill_id: string;
  item_code: string | null;
  label: string;
  amount: number;
}

export interface GTR44SubVoucherLineInsert {
  bill_id: string;
  sub_voucher_no: string | null;
  payee_name: string;
  description: string;
  amount: number;
  edp_code: string | null;
}

const numOrZero = (v: unknown): number => {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

const textOr = (v: unknown, fallback = ''): string =>
  v === null || v === undefined ? fallback : String(v);

/** Pure mapping: form_data.expenditureItems -> normalized lines (tolerant keys). */
export function mapGtr44BillToExpenditureLines(bill: GTR44Bill): GTR44ExpenditureLineInsert[] {
  const billId = bill.id || '';
  const items = bill.formData?.expenditureItems ?? [];
  return items.map((it) => {
    const rec = it as unknown as Record<string, unknown>;
    const code = textOr(it.code ?? rec.itemCode ?? rec.item_code, '').trim();
    return {
      bill_id: billId,
      item_code: code === '' ? null : code,
      label: textOr(it.name ?? rec.label, ''),
      amount: numOrZero(it.amount),
    };
  });
}

/** Pure mapping: form_data.partyEntries -> normalized sub-vouchers (tolerant keys). */
export function mapGtr44BillToSubVouchers(bill: GTR44Bill): GTR44SubVoucherLineInsert[] {
  const billId = bill.id || '';
  const entries = bill.formData?.partyEntries ?? [];
  return entries.map((e) => {
    const rec = e as unknown as Record<string, unknown>;
    const no = textOr(e.subVoucherNo ?? rec.sub_voucher_no ?? e.srNo ?? '', '').trim();
    const edp = textOr(e.edpCode ?? rec.edp_code ?? rec.edp ?? '', '').trim();
    return {
      bill_id: billId,
      sub_voucher_no: no === '' ? null : no,
      payee_name: textOr(e.partyName ?? rec.party_name ?? rec.payeeName ?? rec.payee_name, ''),
      description: textOr(e.details ?? rec.description, ''),
      amount: numOrZero(e.amount),
      edp_code: edp === '' ? null : edp,
    };
  });
}

/** Minimal structural type for the 053 tables (absent from generated Database types). */
interface Gtr44LineTable {
  delete(): { eq(col: string, val: string): PromiseLike<{ error: unknown }> };
  insert(rows: unknown[]): PromiseLike<{ error: unknown }>;
}

function gtr44LineTable(name: string): Gtr44LineTable {
  return (supabase as unknown as { from(table: string): Gtr44LineTable }).from(name);
}

/**
 * Best-effort mirror of expenditure lines + sub-vouchers. NEVER throws:
 * form_data JSONB remains the source of truth, and if 053 is unapplied the
 * deletes error and we skip silently.
 */
async function syncGtr44BillLines(bill: GTR44Bill, rowId: string): Promise<void> {
  try {
    const withId: GTR44Bill = { ...bill, id: rowId };
    const expLines = mapGtr44BillToExpenditureLines(withId);
    const subVouchers = mapGtr44BillToSubVouchers(withId);
    const { error: expDeleteError } = await gtr44LineTable('gtr44_bill_lines').delete().eq('bill_id', rowId);
    if (expDeleteError) return;
    const { error: svDeleteError } = await gtr44LineTable('gtr44_sub_vouchers').delete().eq('bill_id', rowId);
    if (svDeleteError) return;
    if (expLines.length > 0) await gtr44LineTable('gtr44_bill_lines').insert(expLines);
    if (subVouchers.length > 0) await gtr44LineTable('gtr44_sub_vouchers').insert(subVouchers);
  } catch {
    // Intentionally silent: line items are a derived mirror only.
  }
}

const LIST_COLUMNS = [
  'id',
  'bill_no',
  'fy',
  'month',
  'status',
  'gross_amount',
  'net_amount',
  'created_at',
  'updated_at',
  'created_by',
  'bill_date:form_data->>billRegisterDate',
  'office_name:form_data->>officeName',
  'token_no:form_data->>tokenNo1',
  'token_date:form_data->>tokenDate1',
  'ddo_cardex_code:form_data->>ddoCardexCode',
].join(',');

function rowToBillSummary(row: Record<string, unknown>): GTR44Bill {
  const createdDate = String(row.created_at || '');
  const billDate = String(row.bill_date || createdDate.slice(0, 10) || '');
  const officeName = String(row.office_name || '');
  return {
    id: String(row.id),
    billNo: String(row.bill_no || ''),
    billDate,
    tokenNo: String(row.token_no || ''),
    tokenDate: String(row.token_date || ''),
    officeName,
    ddoCardexCode: String(row.ddo_cardex_code || ''),
    fy: Number(row.fy) || useUIStore.getState().activeFinancialYear,
    month: String(row.month || ''),
    district: '',
    sector: '',
    demandNo: '',
    majorHead: '',
    subMajorHead: '',
    minorHead: '',
    subHead: '',
    detailedHead: '',
    edpCode: '',
    budgetAllotment: 0,
    ytdExpenditure: 0,
    availableBalance: 0,
    subVouchers: [],
    deductions: [],
    grossAmount: Number(row.gross_amount) || 0,
    totalDeduction: 0,
    netAmount: Number(row.net_amount) || 0,
    status: (row.status as GTR44Bill['status']) || 'draft',
    createdDate,
    updatedDate: String(row.updated_at || ''),
    formData: { billRegisterDate: billDate, officeName } as GTR44FormData,
  };
}

class Gtr44BillsBackendRepository {
  async listSummary(): Promise<Array<{ grossAmount: number; status: GTR44Bill['status'] }>> {
    try {
      const { data, error } = await supabase
        .from('gtr44_bills')
        .select('gross_amount,status');

      if (error) {
        console.warn('[GTR44BillsBackend] listSummary failed:', error);
        return [];
      }

      if (!Array.isArray(data)) return [];

      return data.map((r: Record<string, unknown>) => ({
        grossAmount: Number(r.gross_amount) || 0,
        status: (r.status as GTR44Bill['status']) || 'draft',
      }));
    } catch (err) {
      console.warn('[GTR44BillsBackend] listSummary error:', err);
      return [];
    }
  }

  /**
   * Register list: scalar columns plus the few JSON fields the list screen
   * renders. The full form_data payload is fetched by get() only.
   */
  async list(): Promise<GTR44Bill[] | null> {
    try {
      const { data, error } = await supabase
        .from('gtr44_bills')
        .select(LIST_COLUMNS)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[GTR44BillsBackend] summary list failed, falling back to full payload:', error);
        return this.listFull();
      }

      if (!Array.isArray(data)) return [];

      return data.map((r) => rowToBillSummary(r as unknown as Record<string, unknown>));
    } catch (err) {
      console.warn('[GTR44BillsBackend] list error, falling back to full payload:', err);
      return this.listFull();
    }
  }

  private async listFull(): Promise<GTR44Bill[]> {
    try {
      const { data, error } = await supabase
        .from('gtr44_bills')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[GTR44BillsBackend] listFull failed:', error);
        return [];
      }

      if (!Array.isArray(data)) return [];

      return data.map((r: Record<string, unknown>) => {
        const rawRow: BillRow = {
          id: String(r.id),
          billNo: String(r.bill_no || ''),
          fy: r.fy ? Number(r.fy) : null,
          month: r.month ? String(r.month) : null,
          status: (r.status as GTR44Bill['status']) || 'draft',
          grossAmount: Number(r.gross_amount) || 0,
          netAmount: Number(r.net_amount) || 0,
          createdDate: String(r.created_at || ''),
          updatedDate: String(r.updated_at || ''),
          createdBy: r.created_by ? String(r.created_by) : null,
          formData: (r.form_data as unknown as GTR44FormData) || ({} as GTR44FormData),
        };
        return rowToBill(rawRow);
      });
    } catch (err) {
      console.warn('[GTR44BillsBackend] listFull error:', err);
      return [];
    }
  }

  async get(id: string): Promise<GTR44Bill | null> {
    try {
      const { data: r, error } = await supabase
        .from('gtr44_bills')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !r) return null;

      const rawRow: BillRow = {
        id: String(r.id),
        billNo: String(r.bill_no || ''),
        fy: r.fy ? Number(r.fy) : null,
        month: r.month ? String(r.month) : null,
        status: (r.status as GTR44Bill['status']) || 'draft',
        grossAmount: Number(r.gross_amount) || 0,
        netAmount: Number(r.net_amount) || 0,
        createdDate: String(r.created_at || ''),
        updatedDate: String(r.updated_at || ''),
        createdBy: r.created_by ? String(r.created_by) : null,
        formData: (r.form_data as unknown as GTR44FormData) || ({} as GTR44FormData),
      };

      return rowToBill(rawRow);
    } catch (err) {
      console.error('[GTR44BillsBackend] get error:', err);
      return null;
    }
  }

  async save(bill: GTR44Bill): Promise<GTR44Bill | null> {
    try {
      const rowId = bill.id || crypto.randomUUID();
      const payload = {
        id: rowId,
        bill_no: bill.billNo || bill.formData?.billRegisterNo || '',
        fy: bill.fy || null,
        month: bill.month || bill.formData?.monthOf || null,
        status: bill.status || 'draft',
        gross_amount: bill.grossAmount || 0,
        net_amount: bill.netAmount || 0,
        form_data: (bill.formData || {}) as unknown as Json,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('gtr44_bills')
        .upsert(payload);

      if (error) {
        console.error('[GTR44BillsBackend] save error:', error);
        throw new Error(error.message);
      }

      // 053 dual-write (best-effort, never throws): replace normalized lines + sub-vouchers.
      await syncGtr44BillLines(bill, rowId);

      return (await this.get(rowId)) || bill;
    } catch (err) {
      console.error('[GTR44BillsBackend] save caught error:', err);
      throw err;
    }
  }

  async delete(id: string): Promise<boolean | null> {
    try {
      const { error } = await supabase
        .from('gtr44_bills')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[GTR44BillsBackend] delete error:', error);
        throw new Error(error.message);
      }
      return true;
    } catch (err) {
      console.error('[GTR44BillsBackend] delete caught error:', err);
      return false;
    }
  }
}

export const gtr44BillsBackendRepository = new Gtr44BillsBackendRepository();
