import type { ParsedSalaryRecord } from '../validation/salary.schema';

interface SalaryColumnDef {
  label: string;
  month: string;
  financialYear: number;
  type: 'gross' | 'income_tax';
}

export interface SalaryParseResult {
  hrpnColumnHeader: string;
  monthColumns: SalaryColumnDef[];
  records: ParsedSalaryRecord[];
  invalidCount: number;
  duplicateCount: number;
  distinctHrpnCount: number;
  dataRowCount: number;
}

const MONTHS: Record<string, { name: string; num: number }> = {
  jan: { name: 'January', num: 1 },
  feb: { name: 'February', num: 2 },
  mar: { name: 'March', num: 3 },
  apr: { name: 'April', num: 4 },
  may: { name: 'May', num: 5 },
  jun: { name: 'June', num: 6 },
  jul: { name: 'July', num: 7 },
  aug: { name: 'August', num: 8 },
  sep: { name: 'September', num: 9 },
  sept: { name: 'September', num: 9 },
  oct: { name: 'October', num: 10 },
  nov: { name: 'November', num: 11 },
  dec: { name: 'December', num: 12 },
  january: { name: 'January', num: 1 },
  february: { name: 'February', num: 2 },
  march: { name: 'March', num: 3 },
  april: { name: 'April', num: 4 },
  june: { name: 'June', num: 6 },
  july: { name: 'July', num: 7 },
  august: { name: 'August', num: 8 },
  september: { name: 'September', num: 9 },
  october: { name: 'October', num: 10 },
  november: { name: 'November', num: 11 },
  december: { name: 'December', num: 12 },
};

const MONTH_NAME_BY_NUM: Record<number, string> = {};
for (const info of Object.values(MONTHS)) {
  MONTH_NAME_BY_NUM[info.num] = info.name;
}

const MONTH_YEAR_RE = /\b([A-Za-z]{3,9})[-/.\s'’`]?\s*(\d{2,4})\b/;

export interface ParsedMonthYear {
  month: string;
  financialYear: number;
  monthNum: number;
}

export function parseMonthYear(header: string): ParsedMonthYear | null {
  const m = header.match(MONTH_YEAR_RE);
  if (!m) return null;
  const entry = MONTHS[m[1].toLowerCase()];
  if (!entry) return null;
  let year = parseInt(m[2], 10);
  if (m[2].length === 2) year = 2000 + year;

  // Excel headers name the WORK month (e.g. "July" = July salary paid in
  // August). The entry slot is the PAYMENT month, i.e. the month AFTER the
  // work month, so shift it forward and derive the slot's financial year.
  const slotMonthNum = (entry.num % 12) + 1;
  const slotYear = entry.num === 12 ? year + 1 : year;
  const financialYear = slotMonthNum >= 4 ? slotYear : slotYear - 1;

  return { month: MONTH_NAME_BY_NUM[slotMonthNum], financialYear, monthNum: slotMonthNum };
}

function classifyColumnType(header: string): 'gross' | 'income_tax' | null {
  const h = header.toLowerCase();
  // NOTE: Karmayogi Excel has only Gross + Income-Tax/TDS columns. There is
  // no DA column — regular DA is part of monthly pay inside Gross. Do NOT
  // detect a DA type here; DA Difference arrears live only in paybill manual
  // values / supplementary bills and payroll pay_diff/da_diff columns.
  // Income-tax / TDS first (more specific than gross).
  // Real Karmayogi/TDS files label this column "TDS", "Tax Deducted",
  // "Tax Deduction", "Income Tax", "I.T.", etc. — none of which the old
  // strict matcher caught, yielding 0 records ("not working at all").
  if (
    h.includes('income tax') ||
    h.includes('income-tax') ||
    h.includes('income_tax') ||
    h.includes('tds') ||
    h.includes('t.d.s') ||
    h.includes('tax deducted') ||
    h.includes('tax deduction') ||
    h.includes('deducted at source') ||
    h.includes('tax withheld') ||
    h.includes('withholding tax') ||
    h === 'it' ||
    h.includes('i.t.') ||
    h.includes('inctax') ||
    h.includes('itax') ||
    /^\s*tax\s*$/.test(h) ||
    /^\s*it\s*$/.test(header.toLowerCase())
  )
    return 'income_tax';
  // Bare "tax" alongside deduct/withheld/income context is also TDS.
  if (h.includes('tax') && (h.includes('deduct') || h.includes('withhold') || h.includes('income') || h.includes('source'))) return 'income_tax';
  if (h.includes('gross')) return 'gross';
  // Single-month payout files often label the pay column just "Salary",
  // "Basic Pay", "Emoluments" or "Pay" without the word "Gross".
  if (h.includes('salary')) return 'gross';
  if (h.includes('emolument')) return 'gross';
  if (h.includes('basic pay') || h.includes('basic-pay') || h.includes('basic_pay')) return 'gross';
  if (h.includes('salary') && h.includes('pay')) return 'gross';
  return null;
}

export function parseCurrencyCell(value: unknown): { value: number; valid: boolean } {
  if (value == null) return { value: 0, valid: false };
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return { value: 0, valid: false };
    return { value, valid: true };
  }
  const str = String(value).trim();
  if (str === '') return { value: 0, valid: false };
  const cleaned = str.replace(/[^\d.-]/g, '');
  if (cleaned === '' || cleaned === '.' || cleaned === '-' || cleaned === '-.') return { value: 0, valid: false };
  const num = Number(cleaned);
  if (Number.isNaN(num)) return { value: 0, valid: false };
  return { value: num, valid: true };
}

function normalizeRows(values: unknown[][]): string[][] {
  return values.map((row) =>
    (row == null ? [] as unknown[] : row).map((c) => (c == null ? '' : String(c).trim()))
  );
}

const HRPN_PRIMARY_RE = /(hrpn|hprn)/i;
const HRPN_KEYWORD_RE = /(hrpn|hprn|health\s*pension|pension\s*no|pensioner|pension\s*reg|reg(?:\.)?\s*no|employee\s*(code|no|id)|emp\.?\s*(code|no|id)|pension\s*reg|staff\s*(id|no)|service\s*(no|id)|gpf|cps|pran)/i;
const NAME_PRIMARY_RE = /(employee|staff|pensioner|member).*name|name.*(employee|staff|pensioner|member)/i;
const NAME_KEYWORD_RE = /\bname\b/i;
const PAN_KEYWORD_RE = /(?:\bpan\b|p\.a\.n\.|permanent\s*account)/i;

function isEmptyCell(value: string): boolean {
  const t = (value || '').trim().toLowerCase();
  return t === '' || t === '-' || t === '–' || t === '—' || t === 'na' || t === 'n/a' || t === 'nil' || t === 'none' || t === 'null';
}

function cellContainsHrpnKeyword(header: string): boolean {
  return HRPN_KEYWORD_RE.test(header || '');
}

/**
 * Identity-column lookup with priority: an explicit HRPN/HPRN header always
 * beats GPF/CPS/PRAN/employee-code fallbacks. Karmayogi payout sheets often
 * carry BOTH (e.g. "GPF No" in col B, "HRPN No." in col F) — first-match-wins
 * on the broad pattern used to lock onto the GPF column, keying every record
 * by GPF numbers that never match the register (0 matched, 0 applied).
 */
function findHrpnColumn(header: string[]): number {
  for (let c = 0; c < header.length; c++) {
    if (HRPN_PRIMARY_RE.test(header[c] || '')) return c;
  }
  for (let c = 0; c < header.length; c++) {
    if (HRPN_KEYWORD_RE.test(header[c] || '')) return c;
  }
  return -1;
}

function parseMonthNameOnly(header: string): { month: string; monthNum: number } | null {
  // Month name without a year, e.g. "August Gross", "Gross (July)", "Sep TDS".
  // Year is resolved later via the fallback financial year.
  const m = header.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i);
  if (!m) return null;
  const entry = MONTHS[m[1].toLowerCase().slice(0, 3)] || MONTHS[m[1].toLowerCase()];
  // Handle full names: MONTHS is keyed by 3-letter + full names.
  const key = m[1].toLowerCase();
  const resolved =
    MONTHS[key] ||
    MONTHS[key.slice(0, 3)] ||
    Object.values(MONTHS).find((v) => v.name.toLowerCase() === key);
  if (!resolved && !entry) return null;
  const info = resolved || entry;
  if (!info) return null;
  return { month: info.name, monthNum: info.num };
}

export interface SalaryParseOptions {
  /** Active FY from the UI store — used when headers carry a month but no year. */
  fallbackFinancialYear?: number;
  /** Selected entry month (payment slot) — used for single-month files with no month in headers. */
  fallbackMonth?: string;
}

export function parseSalaryExcel(rows: unknown[][], options?: SalaryParseOptions): SalaryParseResult {
  const grid = normalizeRows(rows);
  const emptyResult: SalaryParseResult = {
    hrpnColumnHeader: '',
    monthColumns: [],
    records: [],
    invalidCount: 0,
    duplicateCount: 0,
    distinctHrpnCount: 0,
    dataRowCount: 0,
  };
  if (grid.length === 0) return emptyResult;

  // Locate the header row:
  // 1) first row containing a month-year cell (existing behaviour), else
  // 2) first row containing a month name + a gross/TDS keyword, else
  // 3) first row containing gross/TDS keywords + an HRPN/name keyword
  //    (single-month files like [HPRN, Name, Gross, TDS] carry no month at all).
  let headerRow = -1;
  const scanRows = Math.min(grid.length, 10);
  for (let r = 0; r < scanRows; r++) {
    if (grid[r].some((c) => parseMonthYear(c) != null)) {
      headerRow = r;
      break;
    }
  }
  if (headerRow === -1) {
    for (let r = 0; r < scanRows; r++) {
      const hasMonth = grid[r].some((c) => parseMonthNameOnly(c) != null);
      const hasType = grid[r].some((c) => classifyColumnType(c) != null);
      if (hasMonth && hasType) {
        headerRow = r;
        break;
      }
    }
  }
  if (headerRow === -1) {
    for (let r = 0; r < scanRows; r++) {
      const hasHrpn = grid[r].some((c) => cellContainsHrpnKeyword(c));
      const hasType = grid[r].some((c) => classifyColumnType(c) != null);
      if (hasHrpn && hasType) {
        headerRow = r;
        break;
      }
    }
  }
  if (headerRow === -1) return emptyResult;

  const header = grid[headerRow];

  // Identify month columns (column index -> {month, financialYear, type}).
  // Supports: "Aug-25 GROSS" (month+year+type in one cell), split headers
  // (month in row above, type in row below), month-only ("August Gross",
  // year filled from fallback FY), and bare type headers ("Gross", "TDS",
  // month filled from fallbackMonth).
  const colDef: Record<number, { month: string; financialYear: number; type: 'gross' | 'income_tax' }> = {};
  const monthColumns: SalaryColumnDef[] = [];
  const fallbackFy = options?.fallbackFinancialYear;
  const fallbackMonth = options?.fallbackMonth;
  for (let c = 0; c < header.length; c++) {
    const main = header[c] || '';
    const above = headerRow > 0 ? grid[headerRow - 1][c] || '' : '';
    const below = headerRow + 1 < grid.length ? grid[headerRow + 1][c] || '' : '';
    const monthYear =
      parseMonthYear(main) || parseMonthYear(above) || parseMonthYear(below);
    const type =
      classifyColumnType(main) || classifyColumnType(below) || classifyColumnType(above);
    if (!type) continue;
    if (monthYear) {
      colDef[c] = { month: monthYear.month, financialYear: monthYear.financialYear, type };
      monthColumns.push({ label: main || above || below, month: monthYear.month, financialYear: monthYear.financialYear, type });
      continue;
    }
    // Month name without year — resolve FY from fallback.
    const monthOnly =
      parseMonthNameOnly(main) || parseMonthNameOnly(above) || parseMonthNameOnly(below);
    if (monthOnly && fallbackFy != null) {
      colDef[c] = { month: monthOnly.month, financialYear: fallbackFy, type };
      monthColumns.push({ label: main || above || below, month: monthOnly.month, financialYear: fallbackFy, type });
      continue;
    }
    if (monthOnly && fallbackFy == null) {
      // No FY to attach — still record the column; FY resolved per-record
      // below only when a fallback arrives. Skip for now to avoid FY NaN.
      continue;
    }
    // Bare "Gross"/"TDS" with no month anywhere — single-month file.
    // Defer: collected in the fallback pass below.
  }

  // Fallback pass: bare type columns with no month detected anywhere.
  // Assign them the selected entry month + active FY so files like
  // [HPRN | Name | Gross | TDS] import instead of yielding 0 records.
  if (monthColumns.length === 0 && fallbackMonth && fallbackFy != null) {
    for (let c = 0; c < header.length; c++) {
      const type = classifyColumnType(header[c] || '');
      if (!type) continue;
      // Skip HRPN/name columns even if they coincidentally match (e.g. "Name" never matches, but guard anyway).
      if (cellContainsHrpnKeyword(header[c] || '')) continue;
      colDef[c] = { month: fallbackMonth, financialYear: fallbackFy, type };
      monthColumns.push({ label: header[c], month: fallbackMonth, financialYear: fallbackFy, type });
    }
  }

  if (monthColumns.length === 0) {
    // Nothing classifiable — return empty but keep the detected header label
    // so the UI can explain what was seen.
    const hrpnHeaderIdx = findHrpnColumn(header);
    return { ...emptyResult, hrpnColumnHeader: hrpnHeaderIdx >= 0 ? header[hrpnHeaderIdx] : '' };
  }

  // Determine HRPN column (explicit HRPN/HPRN header wins over GPF/CPS/PRAN).
  let hrpnCol = findHrpnColumn(header);
  if (hrpnCol === -1 && monthColumns.length > 0) {
    const earliestMonthCol = Math.min(
      ...monthColumns.map((mc) => header.indexOf(mc.label)),
      header.length
    );
    hrpnCol = Math.max(0, earliestMonthCol - 1);
  }
  if (hrpnCol === -1) hrpnCol = 1;

  // Detect a name column by keyword (optional). Prefer an explicit
  // "Employee Name"-style header over a bare "Name" (a "DDO Name"/"Office
  // Name" column earlier in the sheet must not win).
  let nameCol = -1;
  for (let c = 0; c < header.length; c++) {
    if (c !== hrpnCol && NAME_PRIMARY_RE.test(header[c]) && !cellContainsHrpnKeyword(header[c])) {
      nameCol = c;
      break;
    }
  }
  if (nameCol === -1) {
    for (let c = 0; c < header.length; c++) {
      if (c !== hrpnCol && NAME_KEYWORD_RE.test(header[c]) && !cellContainsHrpnKeyword(header[c])) {
        nameCol = c;
        break;
      }
    }
  }

  // Detect a PAN column by keyword (optional) — used as the HRPN-fallback
  // match key, mirroring migration 051 (HRPN first, PAN second).
  let panCol = -1;
  for (let c = 0; c < header.length; c++) {
    if (c !== hrpnCol && c !== nameCol && PAN_KEYWORD_RE.test(header[c] || '')) {
      panCol = c;
      break;
    }
  }

  // Pair gross + income_tax columns by (month, financialYear).
  const byKey: Record<string, { gross?: number; incomeTax?: number }> = {};
  for (const c in colDef) {
    const { month, financialYear, type } = colDef[Number(c)];
    const key = `${month}|${financialYear}`;
    if (!byKey[key]) byKey[key] = {};
    if (type === 'gross') byKey[key].gross = Number(c);
    else byKey[key].incomeTax = Number(c);
  }

  const records: ParsedSalaryRecord[] = [];
  let invalidCount = 0;
  let duplicateCount = 0;
  let dataRowCount = 0;
  const seenKeys = new Set<string>();
  const distinctHrpn = new Set<string>();

  // When the file carries BOTH gross and tax columns, a month pair needs
  // both cells (legacy strict rule — preserves existing invalid counting).
  // When it carries only ONE side (e.g. TDS-only or Gross-only payout
  // files), the missing side defaults to 0 instead of invalidating every row.
  const hasGrossCols = monthColumns.some((mc) => mc.type === 'gross');
  const hasTaxCols = monthColumns.some((mc) => mc.type === 'income_tax');
  const requireBoth = hasGrossCols && hasTaxCols;

  for (let r = headerRow + 1; r < grid.length; r++) {
    const row = grid[r];
    const hrpnRaw = row[hrpnCol] || '';
    const hrpn = hrpnRaw.trim();
    if (!hrpn) continue;
    // Skip obvious total/grand-total/summary rows and repeated header rows.
    if (/grand\s*total|^total$/i.test(hrpn)) continue;
    if (/^net\s*total/i.test(hrpn)) continue;
    if (cellContainsHrpnKeyword(hrpn)) continue;
    dataRowCount += 1;
    distinctHrpn.add(hrpn.toLowerCase());
    const name = nameCol >= 0 ? (row[nameCol] || '').trim() || null : null;
    const pan = panCol >= 0 ? (row[panCol] || '').trim().toUpperCase() || undefined : undefined;

    const keys = Object.keys(byKey);
    for (const key of keys) {
      const { month, financialYear } = keyToMonth(key);
      const pair = byKey[key];
      const grossIdx = pair.gross;
      const itIdx = pair.incomeTax;
      const grossCell = grossIdx != null ? row[grossIdx] || '' : '';
      const itCell = itIdx != null ? row[itIdx] || '' : '';

      const gross = parseCurrencyCell(grossCell);
      const tax = parseCurrencyCell(itCell);

      const grossPresent = !isEmptyCell(grossCell);
      const taxPresent = !isEmptyCell(itCell);

      if (!grossPresent && !taxPresent) continue; // no data for this month
      if (grossPresent && !gross.valid) {
        invalidCount += 1;
        continue;
      }
      if (taxPresent && !tax.valid) {
        invalidCount += 1;
        continue;
      }
      if (requireBoth && (!grossPresent || !taxPresent)) {
        invalidCount += 1;
        continue;
      }

      const recKey = `${hrpn.toLowerCase()}|${month}|${financialYear}`;
      if (seenKeys.has(recKey)) {
        duplicateCount += 1;
        continue;
      }
      seenKeys.add(recKey);

      records.push({
        hprnNo: hrpn,
        name: name ?? undefined,
        pan,
        month,
        financialYear,
        grossSalary: grossPresent ? gross.value : 0,
        incomeTax: taxPresent ? tax.value : 0,
      });
    }
  }

  return {
    hrpnColumnHeader: header[hrpnCol] || '',
    monthColumns,
    records,
    invalidCount,
    duplicateCount,
    distinctHrpnCount: distinctHrpn.size,
    dataRowCount,
  };
}

function keyToMonth(key: string): { month: string; financialYear: number } {
  const idx = key.lastIndexOf('|');
  return { month: key.slice(0, idx), financialYear: Number(key.slice(idx + 1)) };
}
