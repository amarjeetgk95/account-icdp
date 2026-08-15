import { supabase } from '@/core/supabase/client';
import { getOfficeId } from '@/shared/utilities/office';
import type {
  PayBillStoredImport,
  PayBillStoredEarning,
  PayBillAllowanceMatrixReport,
  PayBillParameterMatrixRow,
  PayBillSortField,
  PayBillSortDirection,
} from '../types';

const MONTH_ORDER = [
  'April', 'May', 'June',
  'July', 'August', 'September',
  'October', 'November', 'December',
  'January', 'February', 'March',
];

// Fallback in-memory cache for standalone/offline runs
let localImportsCache: PayBillStoredImport[] = [];
let localEarningsCache: PayBillStoredEarning[] = [];

export const paybillRepository = {
  /**
   * List all imported paybill batches for an office and financial year
   */
  async listImports(financialYear?: number): Promise<PayBillStoredImport[]> {
    const officeId = getOfficeId();
    if (!officeId) return localImportsCache;

    try {
      let q = supabase
        .from('paybill_imports')
        .select('*')
        .eq('office_id', officeId)
        .order('created_at', { ascending: false });

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
      return localImportsCache.filter((i) => i.financialYear === financialYear);
    }
    return localImportsCache;
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
    const officeId = getOfficeId();
    let records: PayBillStoredEarning[] = [];

    try {
      if (officeId) {
        let q = supabase
          .from('paybill_employee_earnings')
          .select('*')
          .eq('office_id', officeId);

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

        if (!error && data) {
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
            specialPay: Number((r as any).special_pay) || 0,
            washingAllowance: Number((r as any).washing_allowance) || 0,
            nppAllowance: Number(r.npp_allowance) || 0,
            grossAmount: Number(r.gross_amount) || 0,
            mappingStatus: r.mapping_status as PayBillStoredEarning['mappingStatus'],
            createdAt: r.created_at,
          }));
        }
      }
    } catch (err) {
      console.warn('[PayBillRepository] listEarnings fallback to cache:', err);
    }

    if (records.length === 0) {
      records = [...localEarningsCache];
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
    const officeId = getOfficeId();
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

    localImportsCache = localImportsCache.filter((i) => i.id !== importId);
    localEarningsCache = localEarningsCache.filter((e) => e.importId !== importId);
  },

  /**
   * Save import and earnings records into database and local cache
   */
  saveToCache(importRecord: PayBillStoredImport, earnings: PayBillStoredEarning[]) {
    localImportsCache = [importRecord, ...localImportsCache.filter((i) => i.id !== importRecord.id)];
    localEarningsCache = [...earnings, ...localEarningsCache.filter((e) => e.importId !== importRecord.id)];
  },

  /**
   * Generate Allowance Parameter Matrix Report (Columns = Months, Rows = Parameters)
   */
  async getAllowanceMatrix(
    financialYear: number,
    hrpn?: string | null
  ): Promise<PayBillAllowanceMatrixReport> {
    const officeId = getOfficeId();
    const cleanHrpn = hrpn ? hrpn.trim() : null;

    // 1. Try DB RPC first
    if (officeId) {
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
};
