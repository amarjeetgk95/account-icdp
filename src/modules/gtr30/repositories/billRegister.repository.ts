import { supabase } from '@/core/supabase/client';
import type { Json } from '@/shared/json.types';
import type { GTR30Bill, GTR30BillStatus, GTR30Employee, GTR30FormData } from '../types';
import { deductionsTotal, earningsTotal } from '../services/gtr30Calc.service';
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

const SUMMARY_COLUMNS = [
  'id',
  'bill_register_no',
  'bill_date',
  'month_of',
  'bill_code',
  'status',
  'gross_total',
  'deductions_total',
  'net_total',
  'created_at',
  'updated_at',
  'office_name',
  'employee_count',
  'employee_names',
].join(',');

function rowToBillSummary(row: Record<string, unknown>): GTR30Bill {
  return {
    id: String(row.id),
    billRegisterNo: String(row.bill_register_no || ''),
    billDate: row.bill_date ? String(row.bill_date) : '',
    monthOf: row.month_of ? String(row.month_of) : '',
    billCode: row.bill_code ? String(row.bill_code) : '',
    status: (row.status as GTR30BillStatus) || 'draft',
    grossTotal: Number(row.gross_total) || 0,
    deductionsTotal: Number(row.deductions_total) || 0,
    netTotal: Number(row.net_total) || 0,
    createdDate: String(row.created_at || ''),
    updatedDate: String(row.updated_at || ''),
    officeName: String(row.office_name || ''),
    employeeCount: Number(row.employee_count) || 0,
    employeeNames: String(row.employee_names || ''),
    employees: [],
  } as unknown as GTR30Bill;
}

const billRowSchema = z.object({
  id: z.string(),
  billRegisterNo: z.string().default(''),
  billDate: z.string().nullable().optional(),
  monthOf: z.string().nullable().optional(),
  billCode: z.string().nullable().optional(),
  status: z.string().optional().default('draft'),
  grossTotal: z.coerce.number().default(0),
  deductionsTotal: z.coerce.number().default(0),
  netTotal: z.coerce.number().default(0),
  createdDate: z.string().optional().default(''),
  updatedDate: z.string().optional().default(''),
  data: z.record(z.unknown()).optional().default({}),
});

function validateBillRow(raw: unknown): BillRow {
  const result = billRowSchema.safeParse(raw);
  if (!result.success) {
    const r = (raw || {}) as Record<string, unknown>;
    return {
      id: String(r.id || crypto.randomUUID()),
      billRegisterNo: String(r.billRegisterNo || ''),
      billDate: r.billDate ? String(r.billDate) : null,
      monthOf: r.monthOf ? String(r.monthOf) : null,
      billCode: r.billCode ? String(r.billCode) : null,
      status: (r.status as GTR30BillStatus) || 'draft',
      grossTotal: Number(r.grossTotal) || 0,
      deductionsTotal: Number(r.deductionsTotal) || 0,
      netTotal: Number(r.netTotal) || 0,
      createdDate: String(r.createdDate || ''),
      updatedDate: String(r.updatedDate || ''),
      data: (r.data as GTR30FormData) || ({} as GTR30FormData),
    };
  }
  const validated = result.data;
  return {
    id: validated.id,
    billRegisterNo: validated.billRegisterNo,
    billDate: validated.billDate ?? null,
    monthOf: validated.monthOf ?? null,
    billCode: validated.billCode ?? null,
    status: (validated.status as GTR30BillStatus) || 'draft',
    grossTotal: validated.grossTotal,
    deductionsTotal: validated.deductionsTotal,
    netTotal: validated.netTotal,
    createdDate: validated.createdDate,
    updatedDate: validated.updatedDate,
    data: (validated.data as unknown as GTR30FormData) || ({} as GTR30FormData),
  };
}

/**
 * Migration 053 normalized mirror: one row per employee on a GTR-30 bill.
 * Snapshot JSONB (`data`) remains the source of truth; reads never touch this.
 */
export interface GTR30BillLineInsert {
  bill_id: string;
  hrpn: string | null;
  employee_name: string;
  gross: number;
  deductions: number;
  net: number;
}

const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

function readEmployeeHrpn(e: GTR30Employee): string | null {
  const rec = e as unknown as Record<string, unknown>;
  const raw = e.hrpnNo ?? rec.hrpn_no ?? rec.hrpn;
  const s = raw === null || raw === undefined ? '' : String(raw).trim();
  return s === '' ? null : s;
}

function readEmployeeName(e: GTR30Employee): string {
  const rec = e as unknown as Record<string, unknown>;
  const raw = e.name ?? rec.employeeName ?? rec.employee_name ?? '';
  return String(raw ?? '');
}

/**
 * Pure mapping from bill snapshot to normalized lines. Line math reuses
 * earningsTotal/deductionsTotal from gtr30Calc.service (not duplicated).
 * Values are rounded to 2dp so the 053 CHECK (net = gross - deductions)
 * holds exactly under NUMERIC(14,2).
 */
export function mapGtr30BillToLines(bill: GTR30Bill): GTR30BillLineInsert[] {
  const billId = bill.id || '';
  return (bill.employees || []).map((e) => {
    const gross = round2(earningsTotal(e));
    const deductions = round2(deductionsTotal(e));
    return {
      bill_id: billId,
      hrpn: readEmployeeHrpn(e),
      employee_name: readEmployeeName(e),
      gross,
      deductions,
      net: round2(gross - deductions),
    };
  });
}

/** Minimal structural type for the 053 line table (absent from generated Database types). */
interface BillLinesTable {
  delete(): { eq(col: string, val: string): PromiseLike<{ error: unknown }> };
  insert(rows: GTR30BillLineInsert[]): PromiseLike<{ error: unknown }>;
}

function gtr30LinesTable(): BillLinesTable {
  return (supabase as unknown as { from(table: string): BillLinesTable }).from('gtr30_bill_lines');
}

/**
 * Best-effort mirror of employee lines. NEVER throws: snapshot JSONB remains
 * the source of truth, and if 053 is unapplied the delete errors and we skip silently.
 */
async function syncGtr30BillLines(billId: string, lines: GTR30BillLineInsert[]): Promise<void> {
  try {
    const { error: deleteError } = await gtr30LinesTable().delete().eq('bill_id', billId);
    if (deleteError) return;
    if (lines.length === 0) return;
    await gtr30LinesTable().insert(lines);
  } catch {
    // Intentionally silent: line items are a derived mirror only.
  }
}

class Gtr30BillRegisterRepository {
  /**
   * Lightweight summary for dashboard aggregates — avoids transferring
   * full JSONB bill payloads when only counts/totals are needed.
   */
  async listSummary(): Promise<Array<{ grossTotal: number; status: GTR30BillStatus }>> {
    try {
      const { data, error } = await supabase
        .from('gtr30_bills')
        .select('gross_total,status');

      if (error) {
        console.warn('[GTR30BillRegister] listSummary failed:', error);
        return [];
      }

      if (!Array.isArray(data)) return [];

      return data.map((r: Record<string, unknown>) => ({
        grossTotal: Number(r.gross_total) || 0,
        status: (r.status as GTR30BillStatus) || 'draft',
      }));
    } catch (err) {
      console.warn('[GTR30BillRegister] listSummary error:', err);
      return [];
    }
  }

  /**
   * Register list: only scalar columns plus the two summary columns. The full
   * JSONB snapshot is fetched by get()/listFull() only when actually needed.
   */
  async list(): Promise<GTR30Bill[]> {
    try {
      const { data, error } = await supabase
        .from('gtr30_bills')
        .select(SUMMARY_COLUMNS)
        .order('created_at', { ascending: false });

      if (error) {
        // 069 not applied yet, or PostgREST rejected a summary column.
        console.warn('[GTR30BillRegister] summary list failed, falling back to full payload:', error);
        return this.listFull();
      }

      if (!Array.isArray(data)) return [];

      return data.map((r) => rowToBillSummary(r as unknown as Record<string, unknown>));
    } catch (err) {
      console.warn('[GTR30BillRegister] list error, falling back to full payload:', err);
      return this.listFull();
    }
  }

  /** Full snapshots. Used by register export and internal maintenance paths. */
  async listFull(): Promise<GTR30Bill[]> {
    try {
      const { data, error } = await supabase
        .from('gtr30_bills')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[GTR30BillRegister] listFull failed:', error);
        return [];
      }

      if (!Array.isArray(data)) return [];

      return data
        .map((r: Record<string, unknown>) => {
          const rawRow: BillRow = {
            id: String(r.id),
            billRegisterNo: String(r.bill_register_no || ''),
            billDate: r.bill_date ? String(r.bill_date) : null,
            monthOf: r.month_of ? String(r.month_of) : null,
            billCode: r.bill_code ? String(r.bill_code) : null,
            status: (r.status as GTR30BillStatus) || 'draft',
            grossTotal: Number(r.gross_total) || 0,
            deductionsTotal: Number(r.deductions_total) || 0,
            netTotal: Number(r.net_total) || 0,
            createdDate: String(r.created_at || ''),
            updatedDate: String(r.updated_at || ''),
            data: (r.data as GTR30FormData) || ({} as GTR30FormData),
          };
          return rawRow;
        })
        .map(validateBillRow)
        .filter((b): b is BillRow => b !== null)
        .map(rowToBill);
    } catch (err) {
      console.warn('[GTR30BillRegister] listFull error:', err);
      return [];
    }
  }

  async get(id: string): Promise<GTR30Bill | null> {
    try {
      const { data: r, error } = await supabase
        .from('gtr30_bills')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !r) return null;

      const rawRow: BillRow = {
        id: String(r.id),
        billRegisterNo: String(r.bill_register_no || ''),
        billDate: r.bill_date ? String(r.bill_date) : null,
        monthOf: r.month_of ? String(r.month_of) : null,
        billCode: r.bill_code ? String(r.bill_code) : null,
        status: (r.status as GTR30BillStatus) || 'draft',
        grossTotal: Number(r.gross_total) || 0,
        deductionsTotal: Number(r.deductions_total) || 0,
        netTotal: Number(r.net_total) || 0,
        createdDate: String(r.created_at || ''),
        updatedDate: String(r.updated_at || ''),
        data: (r.data as unknown as GTR30FormData) || ({} as GTR30FormData),
      };

      const validated = validateBillRow(rawRow);
      if (!validated) return null;
      return rowToBill(validated);
    } catch (err) {
      console.warn('[GTR30BillRegister] get error:', err);
      return null;
    }
  }

  async save(bill: GTR30Bill): Promise<GTR30Bill> {
    const { id, createdDate: _createdDate, updatedDate: _updatedDate, grossTotal, deductionsTotal, netTotal, ...formData } = bill;
    const { data: _legacyData, ...cleanFormData } = formData as Record<string, unknown>;
    void _legacyData;
    void _createdDate;
    void _updatedDate;

    const rowId = id || crypto.randomUUID();
    const payload = {
      id: rowId,
      bill_register_no: bill.billRegisterNo || '',
      bill_date: bill.billDate || null,
      month_of: bill.monthOf || null,
      bill_code: bill.billCode || null,
      status: bill.status || 'draft',
      gross_total: Number(grossTotal) || 0,
      deductions_total: Number(deductionsTotal) || 0,
      net_total: Number(netTotal) || 0,
      data: cleanFormData as unknown as Json,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('gtr30_bills')
      .upsert(payload);

    if (error) {
      console.warn('[GTR30BillRegister] save error:', error);
      throw new Error(error.message);
    }

    // 053 dual-write (best-effort, never throws): replace normalized employee lines.
    await syncGtr30BillLines(rowId, mapGtr30BillToLines({ ...bill, id: rowId }));

    return (await this.get(rowId)) || bill;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('gtr30_bills')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('[GTR30BillRegister] delete error:', error);
      throw new Error(error.message);
    }
  }
}

export const gtr30BillRegisterRepository = new Gtr30BillRegisterRepository();
