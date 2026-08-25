import { supabase } from '@/core/supabase/client';
import { useAuthStore } from '@/core/auth/store';
import { getOfficeId, isAllOfficesMode, resolveOfficeIdForUser } from '@/shared/utilities/office';
import type {
  PayBillStoredImport,
  PayBillStoredEarning,
  PayBillStoredDeduction,
  PayBillAllowanceMatrixReport,
  PayBillParameterMatrixRow,
  PayBillSortField,
  PayBillSortDirection,
  PayBillSheetType,
  PayBillSettings,
  PayBillLedgerVoucher,
  PostToLedgerPayload,
  MappingStatus,
  PayBillValidationFlags,
} from '../types';

const MONTH_ORDER = [
  'March', 'April', 'May',
  'June', 'July', 'August',
  'September', 'October', 'November',
  'December', 'January', 'February',
];

interface PaybillImportDbRow {
  id: string;
  office_id: string;
  bill_no: string;
  month: string;
  financial_year: number;
  sheet_type?: string | null;
  ddo_hrpn?: string | null;
  ddo_name?: string | null;
  major_head?: string | null;
  ddo_code?: string | null;
  department?: string | null;
  office_name?: string | null;
  tan_no?: string | null;
  cardex_no?: string | null;
  total_records?: number | null;
  matched_count?: number | null;
  gross_total?: number | string | null;
  uploaded_file?: string | null;
  status?: string | null;
  file_hash?: string | null;
  source_file_name?: string | null;
  created_at?: string | null;
}

function mapImportRow(r: PaybillImportDbRow): PayBillStoredImport {
  return {
    id: r.id,
    officeId: String(r.office_id),
    billNo: r.bill_no,
    month: r.month,
    financialYear: r.financial_year,
    sheetType: (r.sheet_type as PayBillSheetType) || 'EARNING',
    ddoHrpn: r.ddo_hrpn ?? null,
    ddoName: r.ddo_name ?? null,
    majorHead: r.major_head ?? null,
    ddoCode: r.ddo_code ?? null,
    department: r.department ?? null,
    officeName: r.office_name ?? null,
    tanNo: r.tan_no ?? null,
    cardexNo: r.cardex_no ?? null,
    totalRecords: r.total_records ?? 0,
    matchedCount: r.matched_count ?? 0,
    grossTotal: Number(r.gross_total) || 0,
    uploadedFile: r.uploaded_file ?? null,
    createdAt: r.created_at || new Date().toISOString(),
    status: (r.status as PayBillStoredImport['status']) || 'IMPORTED',
    fileHash: (r.file_hash as string | null) ?? null,
    sourceFileName: (r.source_file_name as string | null) ?? null,
  };
}

/**
 * Escape LIKE wildcards so user-provided values are matched literally.
 */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

const DEFAULT_MANUAL_ALLOWANCES = ['Pay Difference', 'DA Difference'];

const DEFAULT_SETTINGS: PayBillSettings = {
  daRates: [50, 53, 46, 42, 38],
  daHikeThreshold: 50,
  basicPayChangeTolerance: 10,
  manualAllowances: DEFAULT_MANUAL_ALLOWANCES,
  manualDeductions: [],
  earningColumnOrder: [],
  deductionColumnOrder: [],
};

type ManualLedgerValuesMap = Record<string, Record<string, Record<string, number>>>;

interface OfficeCache {
  imports: PayBillStoredImport[];
  earnings: PayBillStoredEarning[];
  deductions: PayBillStoredDeduction[];
  settings: PayBillSettings | null;
  vouchers: PayBillLedgerVoucher[];
  manualValues: ManualLedgerValuesMap | null;
}

function emptyCache(): OfficeCache {
  return {
    imports: [],
    earnings: [],
    deductions: [],
    settings: null,
    vouchers: [],
    manualValues: null,
  };
}

// Per-office in-memory fallback cache for standalone/offline runs.
// Scoped by officeId so that switching offices never leaks another
// office's data through the cache.
const cacheByOffice = new Map<string, OfficeCache>();
const OFFLINE_OFFICE_KEY = '__offline__';

function resolveOfficeCache(officeId: string | null): OfficeCache {
  const key = officeId || OFFLINE_OFFICE_KEY;
  let cache = cacheByOffice.get(key);
  if (!cache) {
    cache = emptyCache();
    cacheByOffice.set(key, cache);
  }
  return cache;
}

/**
 * Resolve the active office id for the current session.
 *
 * Falls back to the user's profile (profiles.office_id) when the stores are not
 * populated yet (e.g. first render after a hard refresh), so office users never
 * silently lose their employee data because of a store timing gap.
 */
async function resolveOfficeId(): Promise<string | null> {
  const existing = getOfficeId();
  if (existing) return existing;

  const userId = useAuthStore.getState().user?.id;
  if (!userId) return null;
  return resolveOfficeIdForUser(userId);
}

/**
 * Like resolveOfficeId(), but throws a descriptive error for signed-in users
 * whose office cannot be determined. Returning an empty cache in that case
 * looks like "no data" in the UI, which hides real configuration problems.
 */
async function requireOfficeId(): Promise<string> {
  const user = useAuthStore.getState().user;
  if (user?.role === 'admin') {
    throw new Error('Admin users cannot perform office-specific data entry. Please use an office account.');
  }

  const officeId = await resolveOfficeId();
  if (officeId) return officeId;

  if (user?.id) {
    throw new Error(
      'No office is assigned to your account, so pay bill / employee data cannot be loaded. ' +
        'Contact an administrator to assign an office to your user profile.'
    );
  }
  throw new Error('No active office selected');
}

export const paybillRepository = {
  /**
   * List all imported paybill batches for an office and financial year
   */
  async listImports(financialYear?: number): Promise<PayBillStoredImport[]> {
    const allOffices = isAllOfficesMode();
    const officeId = await resolveOfficeId();
    const cache = resolveOfficeCache(officeId);
    if (!allOffices && !officeId) return cache.imports;

    try {
      let q = supabase
        .from('paybill_imports')
        .select('*')
        .order('created_at', { ascending: false });

      if (!allOffices && officeId) {
        q = q.eq('office_id', officeId!);
      }

      if (financialYear != null) {
        q = q.eq('financial_year', financialYear);
      }

      const { data, error } = await q;

      if (error) throw error;

      if (data) {
        // An empty result is a valid answer - only fall back to the local
        // cache when the DB itself could not be reached.
        return data.map((r) => mapImportRow(r as PaybillImportDbRow));
      }
    } catch (err) {
      console.warn('[PayBillRepository] listImports fallback to local cache:', err);
    }

    if (financialYear != null) {
      return cache.imports.filter((i) => i.financialYear === financialYear);
    }
    return cache.imports;
  },

  /**
   * Check whether a bill was already imported for the same month + sheet side.
   * Used as a guard against duplicate imports before saving.
   */
  async findImportByBillNo(
    billNo: string,
    params?: { month?: string; financialYear?: number; sheetType?: PayBillSheetType }
  ): Promise<PayBillStoredImport | null> {
    if (!billNo) return null;
    const allOffices = isAllOfficesMode();
    const officeId = await resolveOfficeId();
    const cleanBillNo = billNo.trim();

    if (allOffices || officeId) {
      try {
        let q = supabase
          .from('paybill_imports')
          .select('*')
          // Exact (case-insensitive) bill number match. A substring ilike here
          // caused false duplicate positives (e.g. "Srt02990022" matching an
          // already-imported "Srt0299002201") and let unescaped % / _ through.
          .ilike('bill_no', escapeLikePattern(cleanBillNo));

        if (!allOffices && officeId) {
          q = q.eq('office_id', officeId!);
        }

        if (params?.month) {
          q = q.eq('month', params.month);
        }
        if (params?.financialYear != null) {
          q = q.eq('financial_year', params.financialYear);
        }
        if (params?.sheetType) {
          q = q.eq('sheet_type', params.sheetType);
        }

        const { data, error } = await q;
        if (!error && data && data.length > 0) {
          return mapImportRow(data[0] as PaybillImportDbRow);
        }
      } catch (err) {
        console.warn('[PayBillRepository] findImportByBillNo db error:', err);
      }
    }

    const cleanMonth = params?.month?.toLowerCase();
    const cache = resolveOfficeCache(officeId);
    const match = cache.imports.find((i) => {
      if (i.billNo.toLowerCase() !== cleanBillNo.toLowerCase()) return false;
      if (cleanMonth && i.month.toLowerCase() !== cleanMonth) return false;
      if (params?.financialYear != null && i.financialYear !== params.financialYear) return false;
      if (params?.sheetType && i.sheetType !== params.sheetType) return false;
      return true;
    });
    return match || null;
  },

  /**
   * List individual employee earnings records with filtering and sorting
   */
  async listEarnings(params?: {
    financialYear?: number;
    month?: string;
    hrpn?: string;
    importId?: string;
    sortField?: PayBillSortField;
    sortDir?: PayBillSortDirection;
  }): Promise<PayBillStoredEarning[]> {
    const allOffices = isAllOfficesMode();
    const officeId = await resolveOfficeId();
    let records: PayBillStoredEarning[] = [];
    let dbLoaded = false;

    try {
      let q = supabase
        .from('paybill_employee_earnings')
        .select('*');

      if (!allOffices && officeId) {
        q = q.eq('office_id', officeId!);
      }

        if (params?.financialYear != null) {
          q = q.eq('financial_year', params.financialYear);
        }
        if (params?.month) {
          q = q.eq('month', params.month);
        }
        if (params?.hrpn) {
          q = q.eq('hrpn', params.hrpn.trim());
        }
        if (params?.importId) {
          q = q.eq('import_id', params.importId);
        }

        const { data, error } = await q;
        if (error) throw error;

        if (data) {
          records = data.map((r) => ({
            id: r.id,
            importId: r.import_id,
            officeId: String(r.office_id),
            employeeId: r.employee_id,
            hrpn: r.hrpn,
            employeeName: r.employee_name,
            designation: r.designation,
            payScale: r.pay_scale,
            ph: r.ph,
            slo: r.slo,
            month: r.month,
            financialYear: r.financial_year,
            basicPay: Number(r.basic_pay) || 0,
            da: Number(r.da) || 0,
            hra: Number(r.hra) || 0,
            cla: Number(r.cla) || 0,
            medicalAllowance: Number(r.medical_allowance) || 0,
            transportAllowance: Number(r.transport_allowance) || 0,
            specialPay: Number((r as unknown as { special_pay?: unknown }).special_pay) || 0,
            washingAllowance: Number((r as unknown as { washing_allowance?: unknown }).washing_allowance) || 0,
            nppAllowance: Number(r.npp_allowance) || 0,
            grossAmount: Number(r.gross_amount) || 0,
            mappingStatus: r.mapping_status as PayBillStoredEarning['mappingStatus'],
            validationStatus: (r as unknown as { validation_status?: string }).validation_status as
              | PayBillStoredEarning['validationStatus']
              | undefined,
            mappingMessage: (r as unknown as { mapping_message?: string | null }).mapping_message,
            nameMismatch: Boolean((r as unknown as { name_mismatch?: boolean }).name_mismatch),
            errors: Array.isArray((r as unknown as { errors?: unknown }).errors)
              ? ((r as unknown as { errors: string[] }).errors)
              : undefined,
            warnings: Array.isArray((r as unknown as { warnings?: unknown }).warnings)
              ? ((r as unknown as { warnings: string[] }).warnings)
              : undefined,
            validationFlags: (r as unknown as { validation_flags?: PayBillValidationFlags | null })
              .validation_flags || undefined,
            createdAt: r.created_at,
          }));
          dbLoaded = true;
        }
    } catch (err) {
      console.warn('[PayBillRepository] listEarnings fallback to cache:', err);
      if (allOffices) throw err;
    }

    if (!dbLoaded) {
      // DB unreachable (offline) - serve the in-memory cache instead.
      // A successful-but-empty query is a valid answer and must not be
      // replaced by stale local data.
      const cache = resolveOfficeCache(officeId);
      records = [...cache.earnings];
      if (params?.financialYear != null) {
        records = records.filter((r) => r.financialYear === params.financialYear);
      }
      if (params?.month) {
        records = records.filter((r) => r.month.toLowerCase() === params.month?.toLowerCase());
      }
      if (params?.hrpn) {
        records = records.filter((r) => r.hrpn.toLowerCase() === params.hrpn?.toLowerCase());
      }
      if (params?.importId) {
        records = records.filter((r) => r.importId === params.importId);
      }
    }

    // Apply sorting
    const sortField = params?.sortField || 'hrpn';
    const sortDir = params?.sortDir || 'asc';
    const multiplier = sortDir === 'asc' ? 1 : -1;

    records.sort((a, b) => {
      if (sortField === 'month') {
        return (MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month)) * multiplier;
      }
      if (sortField === 'basicPay' || sortField === 'da' || sortField === 'hra' || sortField === 'grossAmount') {
        return ((a[sortField] || 0) - (b[sortField] || 0)) * multiplier;
      }
      const valA = String(a[sortField] || '').toLowerCase();
      const valB = String(b[sortField] || '').toLowerCase();
      return valA.localeCompare(valB) * multiplier;
    });

    return records;
  },

  /**
   * Delete an imported paybill batch and all its employee earnings
   */
  async deleteImport(importId: string): Promise<void> {
    const officeId = await requireOfficeId();

    const { error } = await supabase
      .from('paybill_imports')
      .delete()
      .eq('id', importId)
      .eq('office_id', officeId);

    if (error) {
      // Never report success while the rows still exist in the database.
      throw new Error(`Failed to delete imported bill: ${error.message}`);
    }

    const cache = resolveOfficeCache(officeId);
    cache.imports = cache.imports.filter((i) => i.id !== importId);
    cache.earnings = cache.earnings.filter((e) => e.importId !== importId);
    cache.deductions = cache.deductions.filter((d) => d.importId !== importId);
  },

  /**
   * Save import and earnings records into database and local cache
   */
  saveToCache(importRecord: PayBillStoredImport, earnings: PayBillStoredEarning[]) {
    const officeId = getOfficeId();
    const cache = resolveOfficeCache(officeId);
    cache.imports = [importRecord, ...cache.imports.filter((i) => i.id !== importRecord.id)];
    cache.earnings = [...earnings, ...cache.earnings.filter((e) => e.importId !== importRecord.id)];
  },

  /**
   * Save import and deduction records into local cache
   */
  saveDeductionsToCache(importRecord: PayBillStoredImport, deductions: PayBillStoredDeduction[]) {
    const officeId = getOfficeId();
    const cache = resolveOfficeCache(officeId);
    cache.imports = [importRecord, ...cache.imports.filter((i) => i.id !== importRecord.id)];
    cache.deductions = [...deductions, ...cache.deductions.filter((d) => d.importId !== importRecord.id)];
  },

  /**
   * List individual employee deduction records with filtering
   */
  async listDeductions(params?: {
    financialYear?: number;
    month?: string;
    hrpn?: string;
    importId?: string;
  }): Promise<PayBillStoredDeduction[]> {
    const allOffices = isAllOfficesMode();
    const officeId = await resolveOfficeId();
    let records: PayBillStoredDeduction[] = [];

    try {
      let q = supabase
        .from('paybill_employee_deductions')
        .select('*');

      if (!allOffices && officeId) {
        q = q.eq('office_id', officeId!);
      }

      if (params?.financialYear != null) {
        q = q.eq('financial_year', params.financialYear);
      }
      if (params?.month) {
        q = q.eq('month', params.month);
      }
      if (params?.hrpn) {
        q = q.eq('hrpn', params.hrpn.trim());
      }
      if (params?.importId) {
        q = q.eq('import_id', params.importId);
      }

      const { data, error } = await q;
      if (error) throw error;
      if (data) {
        records = data.map((r) => ({
            id: r.id,
            importId: r.import_id,
            officeId: String(r.office_id),
            employeeId: r.employee_id,
            hrpn: r.hrpn,
            employeeName: r.employee_name,
            designation: r.designation,
            month: r.month,
            financialYear: r.financial_year,
            incomeTax: Number(r.income_tax) || 0,
            profTax: Number(r.prof_tax) || 0,
            hbaInterest: Number(r.hba_interest) || 0,
            gpfRegular: Number(r.gpf_regular) || 0,
            gpfClass4: Number(r.gpf_class4) || 0,
            npsRegular: Number(r.nps_regular) || 0,
            gisGovtFund: Number(r.gis_govt_fund) || 0,
            gisGovtSaving: Number(r.gis_govt_saving) || 0,
            otherDeductions: Number(r.other_deductions) || 0,
            totalDeductions: Number(r.total_deductions) || 0,
            netPay: Number(r.net_pay) || 0,
            mappingStatus: (r.mapping_status as MappingStatus) || 'MATCHED',
            validationStatus: (r as unknown as { validation_status?: string }).validation_status as
              | PayBillStoredDeduction['validationStatus']
              | undefined,
            mappingMessage: (r as unknown as { mapping_message?: string | null }).mapping_message,
            nameMismatch: Boolean((r as unknown as { name_mismatch?: boolean }).name_mismatch),
            errors: Array.isArray((r as unknown as { errors?: unknown }).errors)
              ? ((r as unknown as { errors: string[] }).errors)
              : undefined,
            warnings: Array.isArray((r as unknown as { warnings?: unknown }).warnings)
              ? ((r as unknown as { warnings: string[] }).warnings)
              : undefined,
            validationFlags: (r as unknown as { validation_flags?: PayBillValidationFlags | null })
              .validation_flags || undefined,
            createdAt: r.created_at || new Date().toISOString(),
          }));
          return records;
        }
    } catch (err) {
      console.warn('[PayBillRepository] listDeductions fallback to cache:', err);
      if (allOffices) throw err;
    }

    const cache = resolveOfficeCache(officeId);
    let filtered = [...cache.deductions];
    if (params?.financialYear != null) {
      filtered = filtered.filter((r) => r.financialYear === params.financialYear);
    }
    if (params?.month) {
      filtered = filtered.filter((r) => r.month === params.month);
    }
    if (params?.hrpn) {
      filtered = filtered.filter((r) => r.hrpn === params.hrpn!.trim());
    }
    return filtered;
  },

  /**
   * Generate Deduction Parameter Matrix Report (Columns = Months, Rows = Deduction items + Total Ded + Net Pay)
   */
  async getDeductionMatrix(
    financialYear: number,
    hrpn?: string | null
  ): Promise<PayBillAllowanceMatrixReport> {
    const cleanHrpn = hrpn ? hrpn.trim() : null;
    const deductions = await this.listDeductions({ financialYear, hrpn: cleanHrpn || undefined });

    const parameterDefs: Array<{ label: string; key: keyof PayBillStoredDeduction }> = [
      { label: 'Income Tax (9510)', key: 'incomeTax' },
      { label: 'Prof Tax (9570)', key: 'profTax' },
      { label: 'HBA Interest (9591)', key: 'hbaInterest' },
      { label: 'GPF Regular (9670)', key: 'gpfRegular' },
      { label: 'GPF Class 4 (9531)', key: 'gpfClass4' },
      { label: 'NPS Regular (9534)', key: 'npsRegular' },
      { label: 'Govt Fund (9581)', key: 'gisGovtFund' },
      { label: 'Govt Saving (9582)', key: 'gisGovtSaving' },
      { label: 'Total Deductions', key: 'totalDeductions' },
      { label: 'Net Pay', key: 'netPay' },
    ];

    const rows: PayBillParameterMatrixRow[] = parameterDefs.map((def) => {
      const monthVals: Record<string, number> = {
        March: 0, April: 0, May: 0,
        June: 0, July: 0, August: 0,
        September: 0, October: 0, November: 0,
        December: 0, January: 0, February: 0,
      };

      for (const d of deductions) {
        if (monthVals[d.month] !== undefined) {
          const val = Number(d[def.key]) || 0;
          monthVals[d.month] = Math.round((monthVals[d.month] + val) * 100) / 100;
        }
      }

      const q1 = Math.round((monthVals.March + monthVals.April + monthVals.May) * 100) / 100;
      const q2 = Math.round((monthVals.June + monthVals.July + monthVals.August) * 100) / 100;
      const q3 = Math.round((monthVals.September + monthVals.October + monthVals.November) * 100) / 100;
      const q4 = Math.round((monthVals.December + monthVals.January + monthVals.February) * 100) / 100;
      const total = Math.round((q1 + q2 + q3 + q4) * 100) / 100;

      return {
        parameter: def.label,
        key: String(def.key),
        months: monthVals as PayBillParameterMatrixRow['months'],
        q1,
        q2,
        q3,
        q4,
        total,
      };
    });

    const netRow = rows.find((r) => r.key === 'netPay');
    let empName: string | null = null;
    if (cleanHrpn && deductions.length > 0) {
      empName = deductions[0].employeeName;
    }

    return {
      financialYear,
      hrpn: cleanHrpn,
      employeeName: empName,
      monthLabels: MONTH_ORDER,
      rows,
      totalGross: netRow ? netRow.total : 0,
    };
  },

  /**
   * Generate Allowance Parameter Matrix Report (Columns = Months, Rows = Parameters)
   */
  async getAllowanceMatrix(
    financialYear: number,
    hrpn?: string | null
  ): Promise<PayBillAllowanceMatrixReport> {
    const allOffices = isAllOfficesMode();
    const officeId = await resolveOfficeId();
    const cleanHrpn = hrpn ? hrpn.trim() : null;

    // 1. Try DB RPC first (requires a concrete office)
    if (!allOffices && officeId) {
      try {
        const { data, error } = await supabase.rpc('get_paybill_parameter_matrix', {
          p_office_id: officeId,
          p_financial_year: financialYear,
          p_hrpn: cleanHrpn,
        });

      if (!error && data) {
        const parsed = data as unknown as {
          financial_year: number;
          hrpn: string | null;
          month_labels: string[];
          rows: PayBillParameterMatrixRow[];
        };

        const grossRow = parsed.rows.find((r) => r.key === 'gross_amount');
        return {
          financialYear: parsed.financial_year || financialYear,
          hrpn: cleanHrpn,
          monthLabels: parsed.month_labels || MONTH_ORDER,
          rows: parsed.rows || [],
          totalGross: grossRow ? grossRow.total : 0,
        };
      }
      } catch (err) {
        console.warn('[PayBillRepository] RPC get_paybill_parameter_matrix fallback to client compute:', err);
      }
    }

    // 2. Client-side aggregation fallback
    const earnings = await this.listEarnings({ financialYear, hrpn: cleanHrpn || undefined });

    const parameterDefs: Array<{ label: string; key: keyof PayBillStoredEarning }> = [
      { label: 'Basic Pay', key: 'basicPay' },
      { label: 'DA (0103)', key: 'da' },
      { label: 'HRA (0110)', key: 'hra' },
      { label: 'CLA (0111)', key: 'cla' },
      { label: 'Medical Allowance (0107)', key: 'medicalAllowance' },
      { label: 'Transport Allowance (0113)', key: 'transportAllowance' },
      { label: 'Special Additional Pay (0101)', key: 'specialPay' },
      { label: 'Washing Allowance (0132)', key: 'washingAllowance' },
      { label: 'Non Private Practice (0128)', key: 'nppAllowance' },
      { label: 'Gross Amount', key: 'grossAmount' },
    ];

    const rows: PayBillParameterMatrixRow[] = parameterDefs.map((def) => {
      const monthVals: Record<string, number> = {
        March: 0, April: 0, May: 0,
        June: 0, July: 0, August: 0,
        September: 0, October: 0, November: 0,
        December: 0, January: 0, February: 0,
      };

      for (const e of earnings) {
        if (monthVals[e.month] !== undefined) {
          const val = Number(e[def.key]) || 0;
          monthVals[e.month] = Math.round((monthVals[e.month] + val) * 100) / 100;
        }
      }

      const q1 = Math.round((monthVals.March + monthVals.April + monthVals.May) * 100) / 100;
      const q2 = Math.round((monthVals.June + monthVals.July + monthVals.August) * 100) / 100;
      const q3 = Math.round((monthVals.September + monthVals.October + monthVals.November) * 100) / 100;
      const q4 = Math.round((monthVals.December + monthVals.January + monthVals.February) * 100) / 100;
      const total = Math.round((q1 + q2 + q3 + q4) * 100) / 100;

      return {
        parameter: def.label,
        key: String(def.key),
        months: monthVals as PayBillParameterMatrixRow['months'],
        q1,
        q2,
        q3,
        q4,
        total,
      };
    });

    const grossRow = rows.find((r) => r.key === 'grossAmount');
    let empName: string | null = null;
    if (cleanHrpn && earnings.length > 0) {
      empName = earnings[0].employeeName;
    }

    // Load manual allowances & manual values to include in matrix
    let allRows = rows;
    try {
      const [settings, manualVals] = await Promise.all([
        this.getSettings(),
        this.getManualLedgerValues(),
      ]);
      const manualAllowances = settings.manualAllowances || [];
      if (manualAllowances.length > 0) {
        const manualRows: PayBillParameterMatrixRow[] = manualAllowances.map((label) => {
          const monthVals: Record<string, number> = {
            March: 0, April: 0, May: 0,
            June: 0, July: 0, August: 0,
            September: 0, October: 0, November: 0,
            December: 0, January: 0, February: 0,
          };

          if (cleanHrpn) {
            const empParams = manualVals[cleanHrpn]?.[label] || {};
            for (const m of MONTH_ORDER) {
              monthVals[m] = Number(empParams[m]) || 0;
            }
          } else {
            for (const hrpnKey of Object.keys(manualVals)) {
              const empParams = manualVals[hrpnKey]?.[label] || {};
              for (const m of MONTH_ORDER) {
                monthVals[m] += Number(empParams[m]) || 0;
              }
            }
          }

          const q1 = Math.round((monthVals.March + monthVals.April + monthVals.May) * 100) / 100;
          const q2 = Math.round((monthVals.June + monthVals.July + monthVals.August) * 100) / 100;
          const q3 = Math.round((monthVals.September + monthVals.October + monthVals.November) * 100) / 100;
          const q4 = Math.round((monthVals.December + monthVals.January + monthVals.February) * 100) / 100;
          const total = Math.round((q1 + q2 + q3 + q4) * 100) / 100;

          return {
            parameter: label,
            key: `manual::${label}`,
            months: monthVals as PayBillParameterMatrixRow['months'],
            q1,
            q2,
            q3,
            q4,
            total,
          };
        });

        if (grossRow) {
          for (const mr of manualRows) {
            for (const m of MONTH_ORDER) {
              grossRow.months[m] = Math.round((grossRow.months[m] + mr.months[m]) * 100) / 100;
            }
            grossRow.q1 = Math.round((grossRow.q1 + mr.q1) * 100) / 100;
            grossRow.q2 = Math.round((grossRow.q2 + mr.q2) * 100) / 100;
            grossRow.q3 = Math.round((grossRow.q3 + mr.q3) * 100) / 100;
            grossRow.q4 = Math.round((grossRow.q4 + mr.q4) * 100) / 100;
            grossRow.total = Math.round((grossRow.total + mr.total) * 100) / 100;
          }
          const nonGrossRows = rows.filter((r) => r.key !== 'grossAmount');
          allRows = [...nonGrossRows, ...manualRows, grossRow];
        } else {
          allRows = [...rows, ...manualRows];
        }
      }
    } catch (err) {
      console.warn('[PayBillRepository] Error folding manual allowances into matrix:', err);
    }

    return {
      financialYear,
      hrpn: cleanHrpn,
      employeeName: empName,
      monthLabels: MONTH_ORDER,
      rows: allRows,
      totalGross: grossRow ? grossRow.total : 0,
    };
  },

  /**
   * 1-Click Auto-Create Master Employee from Pay Bill row
   */
  async createMasterEmployeeFromPayBill(
    row: { hrpn: string; employeeName: string; designation?: string; payScale?: string },
    pan?: string
  ): Promise<{ id: string; name: string; hrpn: string }> {
    const officeId = await requireOfficeId();

    // Generate dummy PAN if not provided e.g. "HRPN20105536"
    const panVal = pan || `PAN${row.hrpn}`.slice(0, 10).toUpperCase();

    try {
      const { data, error } = await supabase
        .from('employees')
        .insert({
          office_id: officeId,
          hprn_no: row.hrpn,
          name: row.employeeName,
          designation: row.designation || null,
          pay_scale: row.payScale || null,
          pan: panVal,
        })
        .select()
        .single();

      if (error) {
        throw new Error(
          `Failed to add ${row.employeeName} (HRPN ${row.hrpn}) to master employees: ${error.message}`
        );
      }
      if (!data) {
        throw new Error(`Failed to add ${row.employeeName} to master employees: no data returned.`);
      }

      return {
        id: String(data.id),
        name: data.name,
        hrpn: data.hprn_no || row.hrpn,
      };
    } catch (err) {
      // Surface the real failure - a fake local id here silently pretended the
      // employee was created while nothing was persisted.
      console.warn('[PayBillRepository] createMasterEmployeeFromPayBill error:', err);
      throw err instanceof Error ? err : new Error('Failed to add employee to master.');
    }
  },

  /**
   * 1-Click Update Master Employee Designation / Pay Scale
   */
  async syncMasterEmployeePayScale(
    empId: string,
    updates: { designation?: string; payScale?: string }
  ): Promise<boolean> {
    const officeId = await requireOfficeId();

    const payload: { designation?: string; pay_scale?: string } = {};
    if (updates.designation) payload.designation = updates.designation;
    if (updates.payScale) payload.pay_scale = updates.payScale;

    if (Object.keys(payload).length === 0) return true;

    try {
      const { error } = await supabase
        .from('employees')
        .update(payload)
        .eq('id', empId)
        .eq('office_id', officeId);

      if (error) {
        // Returning true here silently pretended the master record was synced.
        throw new Error(`Failed to sync designation/pay scale to master employee: ${error.message}`);
      }
      return true;
    } catch (err) {
      console.warn('[PayBillRepository] syncMasterEmployeePayScale error:', err);
      throw err instanceof Error ? err : new Error('Failed to sync designation/pay scale.');
    }
  },

  /**
   * Post Salary Expenditure to Ledger / Budget Voucher
   * Creates a real `paybill_vouchers` row (salary journal entry). If the office
   * already has a voucher for the same month, the existing voucher is returned
   * instead of creating a duplicate.
   */
  async postPayBillToLedger(payload: PostToLedgerPayload): Promise<{ success: boolean; voucherNo: string }> {
    const officeId = await requireOfficeId();
    const voucherNo = `SAL/${payload.month.toUpperCase().slice(0, 3)}/${payload.billNo || '001'}`;

    try {
      const existing = await this.getPostedVoucher(payload.month, payload.financialYear);
      if (existing) {
        return { success: true, voucherNo: existing.voucherNo };
      }

      const { data, error } = await supabase
        .from('paybill_vouchers')
        .insert({
          office_id: officeId,
          voucher_no: voucherNo,
          bill_no: payload.billNo,
          month: payload.month,
          financial_year: payload.financialYear,
          voucher_date: payload.voucherDate || new Date().toISOString().slice(0, 10),
          major_head: payload.majorHead || null,
          gross_total: payload.grossTotal || 0,
          basic_pay_total: payload.basicPayTotal || 0,
          da_total: payload.daTotal || 0,
          hra_total: payload.hraTotal || 0,
          cla_total: payload.claTotal || 0,
          med_total: payload.medTotal || 0,
          trans_total: payload.transTotal || 0,
          special_pay_total: payload.specialPayTotal || 0,
          washing_total: payload.washingTotal || 0,
          npp_total: payload.nppTotal || 0,
          gpf_total: payload.gpfTotal || 0,
          nps_total: payload.npsTotal || 0,
          income_tax_total: payload.incomeTaxTotal || 0,
          pt_total: payload.ptTotal || 0,
          gis_total: payload.gisTotal || 0,
          net_total: payload.netTotal || 0,
          remarks: payload.remarks || null,
          status: 'POSTED',
        })
        .select()
        .single();

      if (error) {
        // Unique month+office constraint hit - another tab/user posted already
        const already = await this.getPostedVoucher(payload.month, payload.financialYear);
        if (already) return { success: true, voucherNo: already.voucherNo };
        throw error;
      }

      if (data) {
        const voucher: PayBillLedgerVoucher = {
          id: data.id,
          voucherNo: data.voucher_no,
          billNo: data.bill_no,
          month: data.month,
          financialYear: data.financial_year,
          voucherDate: data.voucher_date,
          majorHead: data.major_head,
          grossTotal: Number(data.gross_total) || 0,
          status: data.status,
          createdAt: data.created_at,
        };
        const cache = resolveOfficeCache(officeId);
        cache.vouchers = [voucher, ...cache.vouchers.filter((v) => v.voucherNo !== voucher.voucherNo)];
      }

      return { success: true, voucherNo };
    } catch (err) {
      // Surface the real failure - swallowing it made callers report a
      // successful posting that never reached the database.
      console.warn('[PayBillRepository] postPayBillToLedger db error:', err);
      throw err instanceof Error ? err : new Error('Failed to post pay bill to ledger.');
    }
  },

  /**
   * Fetch the posted ledger voucher for a month (if any)
   */
  async getPostedVoucher(month: string, financialYear: number): Promise<PayBillLedgerVoucher | null> {
    const allOffices = isAllOfficesMode();
    const officeId = await resolveOfficeId();
    if (allOffices || officeId) {
      try {
        let q = supabase
          .from('paybill_vouchers')
          .select('*')
          .eq('month', month)
          .eq('financial_year', financialYear)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!allOffices && officeId) {
          q = q.eq('office_id', officeId!);
        }

        const { data, error } = await q.maybeSingle();

        if (!error && data) {
          return {
            id: data.id,
            voucherNo: data.voucher_no,
            billNo: data.bill_no,
            month: data.month,
            financialYear: data.financial_year,
            voucherDate: data.voucher_date,
            majorHead: data.major_head,
            grossTotal: Number(data.gross_total) || 0,
            status: data.status,
            createdAt: data.created_at,
          };
        }
      } catch (err) {
        console.warn('[PayBillRepository] getPostedVoucher db error:', err);
      }
    }
    const cache = resolveOfficeCache(officeId);
    return cache.vouchers.find((v) => v.month === month && v.financialYear === financialYear) || null;
  },

  /**
   * Load office-level paybill settings (DA rates, bill metadata defaults, audit tolerances)
   */
  async getSettings(): Promise<PayBillSettings> {
    const officeId = await resolveOfficeId();
    const cache = resolveOfficeCache(officeId);
    if (cache.settings) return cache.settings;

    const stored = officeId
      ? (() => {
          try {
            const raw = localStorage.getItem(`paybill_settings_${officeId}`);
            return raw ? (JSON.parse(raw) as PayBillSettings) : null;
          } catch {
            return null;
          }
        })()
      : null;

    if (officeId) {
      try {
        const { data, error } = await supabase
          .from('paybill_settings')
          .select('*')
          .eq('office_id', officeId);

        if (!error && data && data.length > 0) {
          const merged = { ...DEFAULT_SETTINGS };
          for (const row of data) {
            if (row.settings_key !== 'defaults') continue;
            const val = row.settings_value as Partial<PayBillSettings>;
            if (val && typeof val === 'object') {
              Object.assign(merged, val);
            }
          }
          cache.settings = merged;
          return merged;
        }
      } catch (err) {
        console.warn('[PayBillRepository] getSettings db error:', err);
      }
    }

    const fallback: PayBillSettings = { ...DEFAULT_SETTINGS, ...(stored || {}) };
    cache.settings = fallback;
    return fallback;
  },

  /**
   * Persist office-level paybill settings
   */
  async saveSettings(patch: Partial<PayBillSettings>): Promise<PayBillSettings> {
    const current = await this.getSettings();
    const next: PayBillSettings = {
      ...current,
      ...patch,
      daRates: Array.isArray(patch.daRates) && patch.daRates.length > 0
        ? patch.daRates.map((n) => Number(n)).filter((n) => !Number.isNaN(n))
        : current.daRates,
    };
    const officeId = await requireOfficeId();
    const cache = resolveOfficeCache(officeId);
    cache.settings = next;

    const toStore: Partial<PayBillSettings> = {
      ddoHrpn: next.ddoHrpn,
      ddoName: next.ddoName,
      officeName: next.officeName,
      billNo: next.billNo,
      majorHead: next.majorHead,
      ddoCode: next.ddoCode,
      department: next.department,
      tanNo: next.tanNo,
      cardexNo: next.cardexNo,
      address: next.address,
      mobileNo: next.mobileNo,
      daRates: next.daRates,
      daHikeThreshold: next.daHikeThreshold,
      basicPayChangeTolerance: next.basicPayChangeTolerance,
      manualAllowances: next.manualAllowances,
      manualDeductions: next.manualDeductions,
      earningColumnOrder: next.earningColumnOrder,
      deductionColumnOrder: next.deductionColumnOrder,
    };

    try {
      localStorage.setItem(`paybill_settings_${officeId}`, JSON.stringify(toStore));
    } catch {
      // storage may be unavailable - non-fatal
    }

    try {
      const { error } = await supabase
        .from('paybill_settings')
        .upsert(
          { office_id: officeId, settings_key: 'defaults', settings_value: toStore },
          { onConflict: 'office_id,settings_key' }
        );
      if (error) {
        console.warn('[PayBillRepository] saveSettings db error:', error);
      }
    } catch (err) {
      console.warn('[PayBillRepository] saveSettings db error:', err);
    }

    return next;
  },

  /**
   * Load manually entered ledger values: { [hrpn]: { [paramKey]: { [month]: number } } }
   */
  async getManualLedgerValues(): Promise<ManualLedgerValuesMap> {
    const officeId = await resolveOfficeId();
    const cache = resolveOfficeCache(officeId);
    if (cache.manualValues) return cache.manualValues;

    const stored = officeId
      ? (() => {
          try {
            const raw = localStorage.getItem(`paybill_manual_values_${officeId}`);
            return raw ? (JSON.parse(raw) as ManualLedgerValuesMap) : null;
          } catch {
            return null;
          }
        })()
      : null;

    if (officeId) {
      try {
        const { data, error } = await supabase
          .from('paybill_settings')
          .select('*')
          .eq('office_id', officeId)
          .eq('settings_key', 'manual_values');

        if (!error && data && data.length > 0) {
          const remote = data[data.length - 1].settings_value as ManualLedgerValuesMap;
          if (remote && typeof remote === 'object') {
             cache.manualValues = remote;
            return remote;
          }
        }
      } catch (err) {
        console.warn('[PayBillRepository] getManualLedgerValues db error:', err);
      }
    }

    const fallback = stored || {};
    cache.manualValues = fallback;
    return fallback;
  },

  /**
   * Persist a single manual ledger cell value for an employee, parameter and month
   */
  async saveManualLedgerValue(
    hrpn: string,
    paramKey: string,
    month: string,
    value: number
  ): Promise<void> {
    const current = (await this.getManualLedgerValues()) || {};
    const next: ManualLedgerValuesMap = {
      ...current,
      [hrpn]: {
        ...(current[hrpn] || {}),
        [paramKey]: {
          ...(current[hrpn]?.[paramKey] || {}),
          [month]: value,
        },
      },
    };
    const officeId = await requireOfficeId();
    const cache = resolveOfficeCache(officeId);
    cache.manualValues = next;

    try {
      localStorage.setItem(`paybill_manual_values_${officeId}`, JSON.stringify(next));
    } catch {
      // storage may be unavailable - non-fatal
    }

    try {
      const { error } = await supabase
        .from('paybill_settings')
        .upsert(
          { office_id: officeId, settings_key: 'manual_values', settings_value: next },
          { onConflict: 'office_id,settings_key' }
        );
      if (error) {
        console.warn('[PayBillRepository] saveManualLedgerValue db error:', error);
      }
    } catch (err) {
      console.warn('[PayBillRepository] saveManualLedgerValue db error:', err);
    }
  },

  /**
   * Persist multiple manual ledger month values for an employee and parameter
   */
  async saveBulkManualLedgerValues(
    hrpn: string,
    paramKey: string,
    monthValueMap: Record<string, number>
  ): Promise<void> {
    const current = (await this.getManualLedgerValues()) || {};
    const next: ManualLedgerValuesMap = {
      ...current,
      [hrpn]: {
        ...(current[hrpn] || {}),
        [paramKey]: {
          ...(current[hrpn]?.[paramKey] || {}),
          ...monthValueMap,
        },
      },
    };
    const officeId = await requireOfficeId();
    const cache = resolveOfficeCache(officeId);
    cache.manualValues = next;

    try {
      localStorage.setItem(`paybill_manual_values_${officeId}`, JSON.stringify(next));
    } catch {
      // storage may be unavailable - non-fatal
    }

    try {
      const { error } = await supabase
        .from('paybill_settings')
        .upsert(
          { office_id: officeId, settings_key: 'manual_values', settings_value: next },
          { onConflict: 'office_id,settings_key' }
        );
      if (error) {
        console.warn('[PayBillRepository] saveBulkManualLedgerValues db error:', error);
      }
    } catch (err) {
      console.warn('[PayBillRepository] saveBulkManualLedgerValues db error:', err);
    }
  },

  /**
   * Fetch a single import by id (for history detail view)
   */
  async getImportById(importId: string): Promise<PayBillStoredImport | null> {
    const officeId = await resolveOfficeId();
    const allOffices = isAllOfficesMode();
    if (!officeId && !allOffices) {
      const cache = resolveOfficeCache(officeId);
      return cache.imports.find((i) => i.id === importId) || null;
    }
    try {
      let q = supabase.from('paybill_imports').select('*').eq('id', importId).limit(1);
      if (!allOffices && officeId) q = q.eq('office_id', officeId);
      const { data, error } = await q.maybeSingle();
      if (!error && data) return mapImportRow(data as PaybillImportDbRow);
    } catch (err) {
      console.warn('[PayBillRepository] getImportById db error:', err);
    }
    const cache = resolveOfficeCache(officeId);
    return cache.imports.find((i) => i.id === importId) || null;
  },

  /** Update import status lifecycle — audited via trigger/audit table elsewhere */
  async updateImportStatus(importId: string, status: PayBillStoredImport['status']): Promise<void> {
    const officeId = await requireOfficeId();
    const { error } = await supabase
      .from('paybill_imports')
      .update({ status })
      .eq('id', importId)
      .eq('office_id', officeId);
    if (error) throw new Error(error.message);
    const cache = resolveOfficeCache(officeId);
    cache.imports = cache.imports.map((i) => (i.id === importId ? { ...i, status } : i));
  },

  /** List manual adjustments from the new auditable table, with fallback to legacy settings */
  async listManualAdjustments(params?: { hrpn?: string; financialYear?: number; month?: string }): Promise<
    Array<{
      id: string;
      hrpn: string;
      paramKey: string;
      paramLabel: string;
      month: string;
      financialYear: number;
      amount: number;
      groupType: 'EARNING' | 'DEDUCTION';
    }>
  > {
    const officeId = await resolveOfficeId();
    if (!officeId) return [];
    try {
      let q = supabase.from('paybill_manual_adjustments').select('*').eq('office_id', officeId);
      if (params?.hrpn) q = q.eq('hrpn', params.hrpn.trim());
      if (params?.financialYear != null) q = q.eq('financial_year', params.financialYear);
      if (params?.month) q = q.eq('month', params.month);
      const { data, error } = await q;
      if (!error && data) {
        return data.map((r: Record<string, unknown>) => ({
          id: String(r.id),
          hrpn: String(r.hrpn),
          paramKey: String(r.param_key),
          paramLabel: String(r.param_label),
          month: String(r.month),
          financialYear: Number(r.financial_year),
          amount: Number(r.amount) || 0,
          groupType: (r.group_type as 'EARNING' | 'DEDUCTION') || 'EARNING',
        }));
      }
    } catch (err) {
      console.warn('[PayBillRepository] listManualAdjustments db error:', err);
    }
    // Fallback: derive from legacy manualValues map for backward compat
    const legacy = await this.getManualLedgerValues();
    const out: Array<{
      id: string;
      hrpn: string;
      paramKey: string;
      paramLabel: string;
      month: string;
      financialYear: number;
      amount: number;
      groupType: 'EARNING' | 'DEDUCTION';
    }> = [];
    for (const [hrpn, byParam] of Object.entries(legacy)) {
      for (const [paramLabel, byMonth] of Object.entries(byParam as Record<string, Record<string, number>>)) {
        for (const [month, amount] of Object.entries(byMonth as Record<string, number>)) {
          if (params?.hrpn && hrpn !== params.hrpn) continue;
          if (params?.month && month !== params.month) continue;
          out.push({
            id: `${hrpn}:${paramLabel}:${month}`,
            hrpn,
            paramKey: `manual::${paramLabel}`,
            paramLabel,
            month,
            financialYear: params?.financialYear || 0,
            amount: Number(amount) || 0,
            groupType: 'EARNING',
          });
        }
      }
    }
    return out;
  },

  /**
   * Update a single imported paybill earning row (legacy data manual correction).
   */
  async updateEarningRecord(
    id: string,
    payload: Partial<
      Pick<
        PayBillStoredEarning,
        | 'basicPay'
        | 'da'
        | 'hra'
        | 'cla'
        | 'medicalAllowance'
        | 'transportAllowance'
        | 'specialPay'
        | 'washingAllowance'
        | 'nppAllowance'
        | 'grossAmount'
      >
    >
  ): Promise<void> {
    const officeId = await requireOfficeId();
    const dbPayload: {
      basic_pay?: number;
      da?: number;
      hra?: number;
      cla?: number;
      medical_allowance?: number;
      transport_allowance?: number;
      special_pay?: number;
      washing_allowance?: number;
      npp_allowance?: number;
      gross_amount?: number;
    } = {};
    if (payload.basicPay !== undefined) dbPayload.basic_pay = payload.basicPay;
    if (payload.da !== undefined) dbPayload.da = payload.da;
    if (payload.hra !== undefined) dbPayload.hra = payload.hra;
    if (payload.cla !== undefined) dbPayload.cla = payload.cla;
    if (payload.medicalAllowance !== undefined) dbPayload.medical_allowance = payload.medicalAllowance;
    if (payload.transportAllowance !== undefined) dbPayload.transport_allowance = payload.transportAllowance;
    if (payload.specialPay !== undefined) dbPayload.special_pay = payload.specialPay;
    if (payload.washingAllowance !== undefined) dbPayload.washing_allowance = payload.washingAllowance;
    if (payload.nppAllowance !== undefined) dbPayload.npp_allowance = payload.nppAllowance;
    if (payload.grossAmount !== undefined) dbPayload.gross_amount = payload.grossAmount;

    const { error } = await supabase
      .from('paybill_employee_earnings')
      .update(dbPayload)
      .eq('id', id)
      .eq('office_id', officeId);
    if (error) throw new Error(`Failed to update earning record: ${error.message}`);

    const cache = resolveOfficeCache(officeId);
    cache.earnings = cache.earnings.map((e) =>
      e.id === id ? { ...e, ...payload } : e
    );
  },

  /**
   * Update a single imported paybill deduction row (legacy data manual correction).
   */
  async updateDeductionRecord(
    id: string,
    payload: Partial<
      Pick<
        PayBillStoredDeduction,
        | 'incomeTax'
        | 'profTax'
        | 'hbaInterest'
        | 'gpfRegular'
        | 'gpfClass4'
        | 'npsRegular'
        | 'gisGovtFund'
        | 'gisGovtSaving'
        | 'otherDeductions'
        | 'totalDeductions'
        | 'netPay'
      >
    >
  ): Promise<void> {
    const officeId = await requireOfficeId();
    const dbPayload: {
      income_tax?: number;
      prof_tax?: number;
      hba_interest?: number;
      gpf_regular?: number;
      gpf_class4?: number;
      nps_regular?: number;
      gis_govt_fund?: number;
      gis_govt_saving?: number;
      other_deductions?: number;
      total_deductions?: number;
      net_pay?: number;
    } = {};
    if (payload.incomeTax !== undefined) dbPayload.income_tax = payload.incomeTax;
    if (payload.profTax !== undefined) dbPayload.prof_tax = payload.profTax;
    if (payload.hbaInterest !== undefined) dbPayload.hba_interest = payload.hbaInterest;
    if (payload.gpfRegular !== undefined) dbPayload.gpf_regular = payload.gpfRegular;
    if (payload.gpfClass4 !== undefined) dbPayload.gpf_class4 = payload.gpfClass4;
    if (payload.npsRegular !== undefined) dbPayload.nps_regular = payload.npsRegular;
    if (payload.gisGovtFund !== undefined) dbPayload.gis_govt_fund = payload.gisGovtFund;
    if (payload.gisGovtSaving !== undefined) dbPayload.gis_govt_saving = payload.gisGovtSaving;
    if (payload.otherDeductions !== undefined) dbPayload.other_deductions = payload.otherDeductions;
    if (payload.totalDeductions !== undefined) dbPayload.total_deductions = payload.totalDeductions;
    if (payload.netPay !== undefined) dbPayload.net_pay = payload.netPay;

    const { error } = await supabase
      .from('paybill_employee_deductions')
      .update(dbPayload)
      .eq('id', id)
      .eq('office_id', officeId);
    if (error) throw new Error(`Failed to update deduction record: ${error.message}`);

    const cache = resolveOfficeCache(officeId);
    cache.deductions = cache.deductions.map((d) =>
      d.id === id ? { ...d, ...payload } : d
    );
  },

  /**
   * Upsert a full earning row for legacy editor. Creates or overwrites the row
   * keyed by (office_id, hrpn, month, financial_year).
   */
  async upsertEarningRecord(record: PayBillStoredEarning): Promise<void> {
    const officeId = await requireOfficeId();
    const dbPayload = {
      import_id: record.importId,
      office_id: officeId,
      employee_id: record.employeeId,
      hrpn: record.hrpn,
      employee_name: record.employeeName,
      designation: record.designation,
      pay_scale: record.payScale,
      ph: record.ph,
      slo: record.slo,
      month: record.month,
      financial_year: record.financialYear,
      basic_pay: record.basicPay,
      da: record.da,
      hra: record.hra,
      cla: record.cla,
      medical_allowance: record.medicalAllowance,
      transport_allowance: record.transportAllowance,
      special_pay: record.specialPay,
      washing_allowance: record.washingAllowance,
      npp_allowance: record.nppAllowance,
      gross_amount: record.grossAmount,
      mapping_status: record.mappingStatus,
    };
    const { error } = await supabase
      .from('paybill_employee_earnings')
      .upsert(dbPayload, { onConflict: 'office_id,hrpn,month,financial_year' });
    if (error) throw new Error(`Failed to upsert earning record: ${error.message}`);

    const cache = resolveOfficeCache(officeId);
    const idx = cache.earnings.findIndex(
      (e) =>
        e.hrpn === record.hrpn &&
        e.month === record.month &&
        e.financialYear === record.financialYear &&
        e.officeId === officeId
    );
    if (idx >= 0) {
      cache.earnings[idx] = { ...cache.earnings[idx], ...record };
    } else {
      cache.earnings.push(record);
    }
  },

  /**
   * Upsert a full deduction row for legacy editor. Creates or overwrites the row
   * keyed by (office_id, hrpn, month, financial_year).
   */
  async upsertDeductionRecord(record: PayBillStoredDeduction): Promise<void> {
    const officeId = await requireOfficeId();
    const dbPayload = {
      import_id: record.importId,
      office_id: officeId,
      employee_id: record.employeeId,
      hrpn: record.hrpn,
      employee_name: record.employeeName,
      designation: record.designation,
      month: record.month,
      financial_year: record.financialYear,
      income_tax: record.incomeTax,
      prof_tax: record.profTax,
      hba_interest: record.hbaInterest,
      gpf_regular: record.gpfRegular,
      gpf_class4: record.gpfClass4,
      nps_regular: record.npsRegular,
      gis_govt_fund: record.gisGovtFund,
      gis_govt_saving: record.gisGovtSaving,
      other_deductions: record.otherDeductions,
      total_deductions: record.totalDeductions,
      net_pay: record.netPay,
      mapping_status: record.mappingStatus,
    };
    const { error } = await supabase
      .from('paybill_employee_deductions')
      .upsert(dbPayload, { onConflict: 'office_id,hrpn,month,financial_year' });
    if (error) throw new Error(`Failed to upsert deduction record: ${error.message}`);

    const cache = resolveOfficeCache(officeId);
    const idx = cache.deductions.findIndex(
      (d) =>
        d.hrpn === record.hrpn &&
        d.month === record.month &&
        d.financialYear === record.financialYear &&
        d.officeId === officeId
    );
    if (idx >= 0) {
      cache.deductions[idx] = { ...cache.deductions[idx], ...record };
    } else {
      cache.deductions.push(record);
    }
  },

  /**
   * Find or create a manual adjustment import header for legacy editor entries.
   */
  async getOrCreateManualImport(financialYear: number): Promise<string> {
    const officeId = await requireOfficeId();
    const { data: existing } = await supabase
      .from('paybill_imports')
      .select('id')
      .eq('office_id', officeId)
      .eq('financial_year', financialYear)
      .eq('sheet_type', 'MANUAL')
      .maybeSingle();
    if (existing?.id) return existing.id;

    const { data: created, error } = await supabase
      .from('paybill_imports')
      .insert({
        office_id: officeId,
        bill_no: 'MANUAL-ADJUSTMENT',
        month: 'March',
        financial_year: financialYear,
        sheet_type: 'MANUAL',
        total_records: 0,
        matched_count: 0,
        gross_total: 0,
      })
      .select('id')
      .single();
    if (error || !created) throw new Error(`Failed to create manual import: ${error?.message}`);
    return created.id;
  },

  /**
   * Invalidate the in-memory cache for the given office (or all offices).
   * Call this when the active office changes so data never bleeds across offices.
   */
  invalidateCache(officeId?: string | null) {
    if (officeId === undefined) {
      // Clear everything (e.g. on logout / full reset)
      cacheByOffice.clear();
    } else {
      cacheByOffice.delete(officeId || OFFLINE_OFFICE_KEY);
    }
  },
};
