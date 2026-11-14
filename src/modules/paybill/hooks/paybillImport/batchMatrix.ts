import { PAYBILL_EARNING_COLUMNS, PAYBILL_DEDUCTION_COLUMNS } from '../../services/paybillReport.service';
import { resolvePaybillFinancialYear, paybillStorageService } from '../../services/paybillStorage.service';
import { isPlaceholderName, splitBundledNameAndDesignation } from '../../services/hrpnMapping.service';
import type {
  BatchFileItem,
  PayBillBatchMatrix,
  PayBillBatchMatrixMonth,
  PayBillMonthlyEmployeeMatrixRow,
} from '../../types';

const CALENDAR_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Compute the previous calendar month + its financial year for "MonthName-YYYY" labels.
 * FY follows the same payment-month rule as stored rows, e.g. "April-2026"
 * -> { month: 'March', financialYear: 2026 }, "February-2026" ->
 * { month: 'January', financialYear: 2025 }.
 */
export function previousMonthOf(monthLabel: string): { month: string; financialYear: number } | null {
  const match = monthLabel.trim().match(/^([A-Za-z]+)[-/ ](\d{4})$/);
  if (!match) return null;
  const name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  const year = parseInt(match[2], 10);
  const idx = CALENDAR_MONTHS.indexOf(name);
  if (idx < 0) return null;
  const prevIdx = (idx + 11) % 12;
  const prevYear = idx === 0 ? year - 1 : year;
  const prevMonth = CALENDAR_MONTHS[prevIdx];
  return { month: prevMonth, financialYear: resolvePaybillFinancialYear(prevMonth, prevYear) };
}

const BATCH_MATRIX_COLUMNS = [...PAYBILL_EARNING_COLUMNS, ...PAYBILL_DEDUCTION_COLUMNS];

/**
 * Build a consolidated batch matrix (month section blocks) from successfully
 * parsed batch items. Earning + deduction files of the same month are merged
 * per employee HRPN.
 */
export function buildBatchMatrix(items: BatchFileItem[]): PayBillBatchMatrix {
  const read = (rec: unknown, key: string): number =>
    Number((rec as Record<string, unknown>)?.[key] ?? 0);

  const monthMap = new Map<
    string,
    {
      monthLabel: string;
      month: string;
      financialYear: number;
      employees: Map<string, PayBillMonthlyEmployeeMatrixRow>;
    }
  >();

  for (const item of items) {
    const parsed = item.parsedResult;
    if (item.status !== 'SUCCESS' || !parsed) continue;

    const { month, financialYear } = paybillStorageService.parseMonthAndFy(parsed.metadata.month);
    const key = `${financialYear}-${month}`;
    let block = monthMap.get(key);
    if (!block) {
      block = { monthLabel: `${month} ${financialYear}`, month, financialYear, employees: new Map() };
      monthMap.set(key, block);
    }

    const upsert = (hrpn: string, employeeName: string, designation: string | null, values: Record<string, number>) => {
      const cleanHrpn = hrpn.trim();
      const existing = block!.employees.get(cleanHrpn);
      if (existing) {
        for (const [k, v] of Object.entries(values)) {
          if (typeof v === 'number') {
            existing.values[k] = (existing.values[k] || 0) + v;
          }
        }
        if (isPlaceholderName(existing.employeeName) && !isPlaceholderName(employeeName)) {
          existing.employeeName = employeeName;
        }
        if ((!existing.designation || existing.designation === 'Staff') && designation) {
          existing.designation = designation;
        }
      } else {
        const emptyRow: Record<string, number> = Object.fromEntries(
          BATCH_MATRIX_COLUMNS.map((c) => [c.key, 0])
        );
        let finalName = employeeName;
        let finalDesignation = designation;
        if (isPlaceholderName(finalName) && finalDesignation) {
          const split = splitBundledNameAndDesignation(finalDesignation);
          if (split) {
            finalName = split.name;
            finalDesignation = split.designation;
          }
        }
        block!.employees.set(cleanHrpn, {
          hrpn: cleanHrpn,
          employeeName: !isPlaceholderName(finalName) ? finalName : (cleanHrpn ? `Employee ${cleanHrpn}` : 'Employee'),
          designation: finalDesignation,
          values: { ...emptyRow, ...values },
        });
      }
    };

    const isDedSide = parsed.sheetType === 'DEDUCTION' || parsed.sheetType === 'COMBINED';
    const isEarnSide = parsed.sheetType === 'EARNING' || parsed.sheetType === 'COMBINED';

    if (isDedSide && parsed.deductionRows && parsed.deductionRows.length > 0) {
      for (const r of parsed.deductionRows) {
        upsert(r.hrpn, r.employeeName, r.designation, {
          incomeTax: r.incomeTax,
          profTax: r.profTax,
          hbaInterest: r.hbaInterest,
          gpfRegular: r.gpfRegular,
          gpfClass4: r.gpfClass4,
          npsRegular: r.npsRegular,
          gisGovtFund: r.gisGovtFund,
          gisGovtSaving: r.gisGovtSaving,
          otherDeductions: read(r, 'otherDeductions'),
          totalDeductions: r.totalDeductions,
          netPay: r.netPay,
        });
      }
    }
    if (isEarnSide && parsed.rows && parsed.rows.length > 0) {
      for (const r of parsed.rows) {
        upsert(r.hrpn, r.employeeName, r.designation, {
          basicPay: r.basicPay,
          da: r.da,
          hra: r.hra,
          cla: r.cla,
          medicalAllowance: r.medicalAllowance,
          transportAllowance: r.transportAllowance,
          specialPay: read(r, 'specialPay'),
          washingAllowance: read(r, 'washingAllowance'),
          nppAllowance: read(r, 'nonPrivatePracticeAllowance'),
          grossAmount: r.grossAmount,
        });
      }
    }
  }

  const fiscalIndex = (month: string) => {
    const i = CALENDAR_MONTHS.indexOf(month);
    return i >= 2 ? i - 2 : i + 10;
  };

  const months: PayBillBatchMatrixMonth[] = Array.from(monthMap.values())
    .sort((a, b) => a.financialYear - b.financialYear || fiscalIndex(a.month) - fiscalIndex(b.month))
    .map((block) => {
      const rows = Array.from(block.employees.values()).sort((a, b) =>
        a.employeeName.localeCompare(b.employeeName)
      );
      const totals: Record<string, number> = {};
      for (const col of BATCH_MATRIX_COLUMNS) {
        totals[col.key] = rows.reduce((s, r) => s + (r.values[col.key] || 0), 0);
      }
      return { monthLabel: block.monthLabel, month: block.month, financialYear: block.financialYear, rows, totals };
    });

  const totalEmployees = months.reduce((s, m) => s + m.rows.length, 0);

  return { months, totalEmployees, totalFiles: items.length };
}
