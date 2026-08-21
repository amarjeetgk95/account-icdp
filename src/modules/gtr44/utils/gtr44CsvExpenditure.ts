import { GTR44ObjectExpenditureItem } from '../types';
import { normalizeEDPCode } from '../services/gtr44Calc.service';

export const EXPENDITURE_CSV_HEADERS = [
  'code',
  'name',
  'nameGu',
  'edpCode',
  'isActive',
  'sortOrder',
] as const;

export type ExpenditureCsvHeader = typeof EXPENDITURE_CSV_HEADERS[number];

function escapeCsvValue(value: string): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result.map((v) => {
    if (v.startsWith('"') && v.endsWith('"')) {
      return v.slice(1, -1).replace(/""/g, '"');
    }
    return v;
  });
}

export function exportExpenditureItemsToCsv(items: GTR44ObjectExpenditureItem[]): string {
  const headers = EXPENDITURE_CSV_HEADERS.join(',');
  const rows = items.map((item) => {
    const values = EXPENDITURE_CSV_HEADERS.map((key) => {
      const val = (item as unknown as Record<string, unknown>)[key];
      if (val === undefined || val === null) return '';
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      if (typeof val === 'number') return String(val);
      return escapeCsvValue(String(val));
    });
    return values.join(',');
  });
  return [headers, ...rows].join('\n');
}

export function downloadExpenditureItemsCsv(
  items: GTR44ObjectExpenditureItem[],
  fileName = 'expenditure-items.csv'
): void {
  const csv = exportExpenditureItemsToCsv(items);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ExpenditureParseResult {
  items: GTR44ObjectExpenditureItem[];
  errors: string[];
}

const codeRegex = /^\d{4}$/;
// EDP codes like "0 2 0 1 +" normalized to "0201+" — allow 3-4 digits plus optional +/- (must have operator for expenditure per GTR-44)
const edpNormalizedRegex = /^\d{3,4}[+-]$/;

export function normalizeEDPForStorage(edp: string): string {
  const normalized = normalizeEDPCode(edp);
  // Convert "0201+" back to spaced form "0 2 0 1 +" for storage consistency with defaults
  if (!normalized) return edp.trim();
  const op = normalized.slice(-1);
  const hasOp = op === '+' || op === '-';
  const digits = hasOp ? normalized.slice(0, -1) : normalized;
  const spacedDigits = digits.split('').join(' ');
  return hasOp ? `${spacedDigits} ${op}` : spacedDigits;
}

function isValidEDPCode(edp: string): boolean {
  const normalized = normalizeEDPCode(edp);
  return edpNormalizedRegex.test(normalized);
}

export function parseExpenditureItemsFromCsv(csvText: string): ExpenditureParseResult {
  const items: GTR44ObjectExpenditureItem[] = [];
  const errors: string[] = [];

  if (!csvText || !csvText.trim()) {
    errors.push('CSV is empty');
    return { items, errors };
  }

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    errors.push('CSV is empty');
    return { items, errors };
  }

  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map((h) => h.trim());

  const requiredHeaders = ['code', 'name', 'edpCode'];
  for (const req of requiredHeaders) {
    if (!headers.includes(req)) {
      errors.push(`Missing required header: ${req}`);
    }
  }
  if (errors.length > 0) {
    return { items, errors };
  }

  const headerIndex: Record<string, number> = {};
  headers.forEach((h, idx) => {
    headerIndex[h] = idx;
  });

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = parseCsvLine(line);
    const get = (key: string): string => {
      const idx = headerIndex[key];
      if (idx === undefined || idx >= cols.length) return '';
      return cols[idx]?.trim() ?? '';
    };

    const code = get('code');
    const name = get('name');
    const edpCodeRaw = get('edpCode');
    const rowNum = i + 1;

    if (!code) {
      errors.push(`Row ${rowNum}: code is required (4 digits)`);
      continue;
    }
    if (!codeRegex.test(code)) {
      errors.push(`Row ${rowNum}: code must be exactly 4 digits (got "${code}")`);
      continue;
    }
    if (!name) {
      errors.push(`Row ${rowNum}: name is required`);
      continue;
    }
    if (!edpCodeRaw) {
      errors.push(`Row ${rowNum}: edpCode is required`);
      continue;
    }
    if (!isValidEDPCode(edpCodeRaw)) {
      errors.push(
        `Row ${rowNum}: edpCode must be like "0 2 0 1 +" or "0201+" (4 digits + +/-) (got "${edpCodeRaw}")`
      );
      continue;
    }

    const nameGu = get('nameGu') || '';
    const isActiveRaw = get('isActive');
    let isActive: boolean = true;
    if (isActiveRaw !== '') {
      const lower = isActiveRaw.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') isActive = true;
      else if (lower === 'false' || lower === '0' || lower === 'no') isActive = false;
      else isActive = true;
    }
    const sortOrderRaw = get('sortOrder');
    let sortOrder: number | undefined = undefined;
    if (sortOrderRaw !== '') {
      const n = Number(sortOrderRaw);
      if (!Number.isNaN(n) && Number.isFinite(n)) sortOrder = Math.floor(n);
    }
    if (sortOrder === undefined) sortOrder = items.length;

    const edpCode = normalizeEDPForStorage(edpCodeRaw);

    const item: GTR44ObjectExpenditureItem = {
      code,
      name,
      nameGu: nameGu || '',
      edpCode,
      amount: null,
      isActive,
      sortOrder,
    };

    items.push(item);
  }

  return { items, errors };
}
