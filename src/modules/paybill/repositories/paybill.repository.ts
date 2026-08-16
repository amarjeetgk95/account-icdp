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
  'April', 'May', 'June',
  'July', 'August', 'September',
  'October', 'November', 'December',
  'January', 'February', 'March',
];

const DEFAULT_SETTINGS: PayBillSettings = {
  daRates: [50, 53, 46, 42, 38],
  daHikeThreshold: 50,
  basicPayChangeTolerance: 10,
  manualAllowances: [],
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

      if (!error && data) {
        return data.map((r) => ({
          id: r.id,
          officeId: String(r.office_id),
          billNo: r.bill_no,
          month: r.month,
          financialYear: r.financial_year,
          sheetType: (r.sheet_type as PayBillSheetType) || 'EARNING',
          ddoHrpn: r.ddo_hrpn,
          ddoName: r.ddo_name,
          majorHead: r.major_head,
          ddoCode: r.ddo_code,
          department: r.department,
          officeName: r.office_name,
          tanNo: r.tan_no,
          cardexNo: r.cardex_no,
          totalRecords: r.total_records,
          matchedCount: r.matched_count,
          grossTotal: Number(r.gross_total) || 0,
          uploadedFile: r.uploaded_file,
          createdAt: r.created_at,
        }));
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
          .ilike('bill_no', `%${cleanBillNo}%`);

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
          const r = data[0];
          return {
            id: r.id,
            officeId: String(r.office_id),
            billNo: r.bill_no,
            month: r.month,
            financialYear: r.financial_year,
            sheetType: (r.sheet_type as PayBillSheetType) || 'EARNING',
            ddoHrpn: r.ddo_hrpn,
            ddoName: r.ddo_name,
            majorHead: r.major_head,
            ddoCode: r.ddo_code,
            department: r.department,
            officeName: r.office_name,
            tanNo: r.tan_no,
            cardexNo: r.cardex_no,
            totalRecords: r.total_records,
            matchedCount: r.matched_count,
            grossTotal: Number(r.gross_total) || 0,
            uploadedFile: r.uploaded_file,
            createdAt: r.created_at,
          };
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
        }
    } catch (err) {
      console.warn('[PayBillRepository] listEarnings fallback to cache:', err);
      if (allOffices) throw err;
    }

    if (records.length === 0) {
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
    if (officeId) {
      try {
        await supabase
          .from('paybill_imports')
          .delete()
          .eq('id', importId)
          .eq('office_id', officeId);
      } catch (err) {
        console.warn('[PayBillRepository] deleteImport db error:', err);
      }
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
        April: 0, May: 0, June: 0,
        July: 0, August: 0, September: 0,
        October: 0, November: 0, December: 0,
        January: 0, February: 0, March: 0,
      };

      for (const d of deductions) {
        if (monthVals[d.month] !== undefined) {
          const val = Number(d[def.key]) || 0;
          monthVals[d.month] = Math.round((monthVals[d.month] + val) * 100) / 100;
        }
      }

      const q1 = Math.round((monthVals.April + monthVals.May + monthVals.June) * 100) / 100;
      const q2 = Math.round((monthVals.July + monthVals.August + monthVals.September) * 100) / 100;
      const q3 = Math.round((monthVals.October + monthVals.November + monthVals.December) * 100) / 100;
      const q4 = Math.round((monthVals.January + monthVals.February + monthVals.March) * 100) / 100;
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
        April: 0, May: 0, June: 0,
        July: 0, August: 0, September: 0,
        October: 0, November: 0, December: 0,
        January: 0, February: 0, March: 0,
      };

      for (const e of earnings) {
        if (monthVals[e.month] !== undefined) {
          const val = Number(e[def.key]) || 0;
          monthVals[e.month] = Math.round((monthVals[e.month] + val) * 100) / 100;
        }
      }

      const q1 = Math.round((monthVals.April + monthVals.May + monthVals.June) * 100) / 100;
      const q2 = Math.round((monthVals.July + monthVals.August + monthVals.September) * 100) / 100;
      const q3 = Math.round((monthVals.October + monthVals.November + monthVals.December) * 100) / 100;
      const q4 = Math.round((monthVals.January + monthVals.February + monthVals.March) * 100) / 100;
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

    return {
      financialYear,
      hrpn: cleanHrpn,
      employeeName: empName,
      monthLabels: MONTH_ORDER,
      rows,
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

      if (!error && data) {
        return {
          id: String(data.id),
          name: data.name,
          hrpn: data.hprn_no || row.hrpn,
        };
      }
    } catch (err) {
      console.warn('[PayBillRepository] createMasterEmployee fallback:', err);
    }

    return {
      id: `local-emp-${row.hrpn}`,
      name: row.employeeName,
      hrpn: row.hrpn,
    };
  },

  /**
   * 1-Click Update Master Employee Designation / Pay Scale
   */
  async syncMasterEmployeePayScale(
    empId: string,
    updates: { designation?: string; payScale?: string }
  ): Promise<boolean> {
    const officeId = await requireOfficeId();

    try {
      const payload: { designation?: string; pay_scale?: string } = {};
      if (updates.designation) payload.designation = updates.designation;
      if (updates.payScale) payload.pay_scale = updates.payScale;

      const { error } = await supabase
        .from('employees')
        .update(payload)
        .eq('id', empId)
        .eq('office_id', officeId);

      return !error;
    } catch (err) {
      console.warn('[PayBillRepository] syncMasterEmployeePayScale fallback:', err);
      return true;
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
      console.warn('[PayBillRepository] postPayBillToLedger db error:', err);
      return { success: false, voucherNo: '' };
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
