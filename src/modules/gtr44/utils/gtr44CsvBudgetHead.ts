import { GTR44BudgetHead } from '../types';
import { headChargeableCodeSchema } from '../services/gtr44Settings.schema';

export const BUDGET_HEAD_CSV_HEADERS = [
  'name',
  'headChargeableCode',
  'sector',
  'demandNo',
  'demandNoLabel',
  'majorHead',
  'subMajorHead',
  'minorHead',
  'subHead',
  'detailedHead',
  'isActive',
  'effectiveFrom',
  'effectiveTo',
  'grantRef',
  'updatedAt',
  'updatedBy',
] as const;

export type BudgetHeadCsvHeaders = typeof BUDGET_HEAD_CSV_HEADERS[number];

function escapeCsvValue(value: string): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCsvLine(line: string): string[] {
  // Simple split, but handle quoted values with commas
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
    // Remove surrounding quotes if present
    if (v.startsWith('"') && v.endsWith('"')) {
      return v.slice(1, -1).replace(/""/g, '"');
    }
    return v;
  });
}

export function exportBudgetHeadsToCsv(heads: GTR44BudgetHead[]): string {
  const headers = BUDGET_HEAD_CSV_HEADERS.join(',');
  const rows = heads.map((h) => {
    const values = BUDGET_HEAD_CSV_HEADERS.map((key) => {
      const val = (h as unknown as Record<string, unknown>)[key];
      if (val === undefined || val === null) return '';
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      return escapeCsvValue(String(val));
    });
    return values.join(',');
  });
  return [headers, ...rows].join('\n');
}

export function downloadBudgetHeadsCsv(heads: GTR44BudgetHead[], fileName = 'budget-heads.csv'): void {
  const csv = exportBudgetHeadsToCsv(heads);
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

export interface ParseResult {
  heads: Omit<GTR44BudgetHead, 'id'>[];
  errors: string[];
}

const headChargeableRegex = /^\d{13}$/;

function isValidHeadChargeable(code: string): boolean {
  // Use zod schema if available, fallback to regex
  try {
    const result = headChargeableCodeSchema.safeParse(code);
    return result.success;
  } catch {
    return headChargeableRegex.test(code);
  }
}

export function parseBudgetHeadsFromCsv(csvText: string): ParseResult {
  const heads: Omit<GTR44BudgetHead, 'id'>[] = [];
  const errors: string[] = [];

  if (!csvText || !csvText.trim()) {
    errors.push('CSV is empty');
    return { heads, errors };
  }

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    errors.push('CSV is empty');
    return { heads, errors };
  }

  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map((h) => h.trim());

  const requiredHeaders = ['name', 'headChargeableCode'];
  for (const req of requiredHeaders) {
    if (!headers.includes(req)) {
      errors.push(`Missing required header: ${req}`);
    }
  }
  if (errors.length > 0) {
    return { heads, errors };
  }

  const headerIndex: Record<string, number> = {};
  headers.forEach((h, idx) => {
    headerIndex[h] = idx;
  });

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = parseCsvLine(line);
    // Helper to get column value by header name
    const get = (key: string): string => {
      const idx = headerIndex[key];
      if (idx === undefined || idx >= cols.length) return '';
      return cols[idx]?.trim() ?? '';
    };

    const name = get('name');
    const headChargeableCode = get('headChargeableCode');
    const rowNum = i + 1;

    if (!name) {
      errors.push(`Row ${rowNum}: name is required`);
      continue;
    }
    if (!headChargeableCode) {
      errors.push(`Row ${rowNum}: headChargeableCode is required`);
      continue;
    }
    if (!headChargeableRegex.test(headChargeableCode)) {
      // also try zod validation message
      if (!isValidHeadChargeable(headChargeableCode)) {
        errors.push(`Row ${rowNum}: headChargeableCode must be exactly 13 digits (got "${headChargeableCode}")`);
        continue;
      }
    }

    const isActiveRaw = get('isActive');
    let isActive: boolean | undefined = undefined;
    if (isActiveRaw !== '') {
      const lower = isActiveRaw.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') isActive = true;
      else if (lower === 'false' || lower === '0' || lower === 'no') isActive = false;
      else if (lower === '') isActive = undefined;
      else {
        // invalid, treat as true but warn
        isActive = true;
      }
    }

    const effectiveFrom = get('effectiveFrom') || undefined;
    const effectiveTo = get('effectiveTo') || undefined;
    const grantRef = get('grantRef') || undefined;
    const updatedAt = get('updatedAt') || undefined;
    const updatedBy = get('updatedBy') || undefined;

    // Basic date validation for effectiveFrom/To if present (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (effectiveFrom && !dateRegex.test(effectiveFrom)) {
      errors.push(`Row ${rowNum}: effectiveFrom must be YYYY-MM-DD (got "${effectiveFrom}")`);
      continue;
    }
    if (effectiveTo && !dateRegex.test(effectiveTo)) {
      errors.push(`Row ${rowNum}: effectiveTo must be YYYY-MM-DD (got "${effectiveTo}")`);
      continue;
    }

    const head: Omit<GTR44BudgetHead, 'id'> = {
      name,
      headChargeableCode,
      sector: get('sector'),
      demandNo: get('demandNo'),
      demandNoLabel: get('demandNoLabel'),
      majorHead: get('majorHead'),
      subMajorHead: get('subMajorHead'),
      minorHead: get('minorHead'),
      subHead: get('subHead'),
      detailedHead: get('detailedHead'),
      isActive: isActive ?? true,
      effectiveFrom,
      effectiveTo,
      grantRef,
      updatedAt: updatedAt || new Date().toISOString(),
      updatedBy,
    };

    heads.push(head);
  }

  return { heads, errors };
}
