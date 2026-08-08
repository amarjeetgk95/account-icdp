import type { ParsedSalaryRecord } from '../validation/salary.schema';

export interface SalaryColumnDef {
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
  september: { name: 'September', num: 9 },
  october: { name: 'October', num: 10 },
  november: { name: 'November', num: 11 },
  december: { name: 'December', num: 12 },
};

const MONTH_YEAR_RE = /\b([A-Za-z]{3,9})[-/.\s]?\s*(\d{2,4})\b/;

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
  const financialYear = entry.num >= 4 ? year : year - 1;
  return { month: entry.name, financialYear, monthNum: entry.num };
}

export function classifyColumnType(header: string): 'gross' | 'income_tax' | null {
  const h = header.toLowerCase();
  if (h.includes('income tax') || h === 'it' || h.includes('i.t.') || h.includes('inctax') || h.includes('itax') || /^\s*tax\s*$/.test(h)) return 'income_tax';
  if (h.includes('gross')) return 'gross';
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

export function normalizeRows(values: unknown[][]): string[][] {
  return values.map((row) =>
    (row == null ? [] as unknown[] : row).map((c) => (c == null ? '' : String(c).trim()))
  );
}

const HRPN_KEYWORD_RE = /(?:^|[\s._-])(?:hrpn|health\s*pension|pension\s*no|reg(?:\.)?\s*no|employee\s*code|emp\.?\s*code|pension\s*reg|staff\s*id)(?:[\s._-]|$)/i;
const NAME_KEYWORD_RE = /\bname\b/i;

function isEmptyCell(value: string): boolean {
  const t = (value || '').trim().toLowerCase();
  return t === '' || t === '-' || t === '–' || t === '—' || t === 'na' || t === 'n/a' || t === 'nil' || t === 'none' || t === 'null';
}

const MONTH_NAME_LOOKUP: Record<string, string> = {};
for (const info of Object.values(MONTHS)) {
  MONTH_NAME_LOOKUP[info.name.toLowerCase()] = info.name;
}
for (const [abbr, info] of Object.entries(MONTHS)) {
  if (abbr.length <= 3) MONTH_NAME_LOOKUP[abbr] = info.name;
}

export function normalizeMonth(input: string): string | null {
  if (!input) return null;
  const stripped = input.replace(/^([A-Za-z]{3,9})[-/.\s].*/, '$1');
  const key = stripped.toLowerCase();
  return MONTH_NAME_LOOKUP[key] ?? null;
}

function cellContainsHrpnKeyword(header: string): boolean {
  return HRPN_KEYWORD_RE.test(header);
}

export function parseSalaryExcel(rows: unknown[][]): SalaryParseResult {
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

  // Locate the header row: first row containing a month-year cell.
  let headerRow = -1;
  for (let r = 0; r < Math.min(grid.length, 8); r++) {
    if (grid[r].some((c) => parseMonthYear(c) != null)) {
      headerRow = r;
      break;
    }
  }
  if (headerRow === -1) return emptyResult;

  const header = grid[headerRow];

  // Identify month columns (column index -> {month, financialYear, type})
  const colDef: Record<number, { month: string; financialYear: number; type: 'gross' | 'income_tax' }> = {};
  const monthColumns: SalaryColumnDef[] = [];
  for (let c = 0; c < header.length; c++) {
    const main = header[c] || '';
    const above = headerRow > 0 ? grid[headerRow - 1][c] || '' : '';
    const below = headerRow + 1 < grid.length ? grid[headerRow + 1][c] || '' : '';
    const monthYear = parseMonthYear(main) || parseMonthYear(above);
    if (!monthYear) continue;
    const type = classifyColumnType(main) || classifyColumnType(below) || classifyColumnType(above);
    if (!type) continue;
    colDef[c] = { month: monthYear.month, financialYear: monthYear.financialYear, type };
    monthColumns.push({ label: main, month: monthYear.month, financialYear: monthYear.financialYear, type });
  }

  // Determine HRPN column.
  let hrpnCol = -1;
  for (let c = 0; c < header.length; c++) {
    if (cellContainsHrpnKeyword(header[c])) {
      hrpnCol = c;
      break;
    }
  }
  if (hrpnCol === -1 && monthColumns.length > 0) {
    const earliestMonthCol = Math.min(
      ...monthColumns.map((mc) => header.indexOf(mc.label)),
      header.length
    );
    hrpnCol = Math.max(0, earliestMonthCol - 1);
  }
  if (hrpnCol === -1) hrpnCol = 1;

  // Detect a name column by keyword (optional).
  let nameCol = -1;
  for (let c = 0; c < header.length; c++) {
    if (c !== hrpnCol && NAME_KEYWORD_RE.test(header[c]) && !cellContainsHrpnKeyword(header[c])) {
      nameCol = c;
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

  for (let r = headerRow + 1; r < grid.length; r++) {
    const row = grid[r];
    const hrpn = row[hrpnCol] || '';
    if (!hrpn) continue;
    // Skip obvious total/grand-total rows.
    if (/grand\s*total|net\s*total/i.test(hrpn)) continue;
    dataRowCount += 1;
    distinctHrpn.add(hrpn.toLowerCase());
    const name = nameCol >= 0 ? (row[nameCol] || '').trim() || null : null;

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

      // A month pair must contain both Gross and Income Tax to be valid.
      if (!grossPresent && !taxPresent) continue; // no data for this month
      if (grossPresent && !gross.valid) {
        invalidCount += 1;
        continue;
      }
      if (taxPresent && !tax.valid) {
        invalidCount += 1;
        continue;
      }
      if (!grossPresent || !taxPresent) {
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
        month,
        financialYear,
        grossSalary: gross.value,
        incomeTax: tax.value,
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
