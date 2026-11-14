// ============================================================================
// Module-local Excel (.xlsx) export — mirrors csvExport.ts so a report can
// offer a real spreadsheet alongside CSV.
//
// Uses the `xlsx` dependency already present in the project, so no new package
// is added. Values are written as-is; the report views pre-format dates as
// DD-MM-YYYY strings, matching the global date rule.
//
// NO FORMULA NEUTRALISATION IS NEEDED HERE, unlike the CSV path, and that is
// verified rather than assumed: `XLSX.utils.aoa_to_sheet` → `sheet_add_aoa`
// assigns every non-Date/non-array value `t:'s'` (a shared string). `cell.f` —
// the formula field — is assigned in exactly one place, for a cell whose value
// is an ARRAY (`[value, formula]`), which neither exporter ever produces. So a
// clerk-supplied `=HYPERLINK(...)` is written as text, not evaluated. Do not
// "simplify" this into sheet_stubs / {f:...} without re-checking.
// ============================================================================

// Type-only: erased at compile time, so it adds nothing to any bundle. The
// runtime import is deferred per call — see the note above `loadXlsx`.
import type { WorkSheet } from 'xlsx';
import { unionColumnKeys } from './csvExport';

/**
 * `xlsx` is ~250 kB — by far the heaviest dependency here — and it is only
 * needed when an operator clicks an Excel export button, which is a small
 * minority of visits. A static `import * as XLSX` put it in the register route
 * chunk that every register/report page load pulls in. A dynamic import moves it
 * into its own chunk fetched on first export; browsers cache it from then on.
 *
 * Both exporters are therefore async. Call sites must await (or explicitly
 * ignore) the returned promise — see the export buttons in the report views.
 */
type XlsxModule = typeof import('xlsx');
let xlsxPromise: Promise<XlsxModule> | null = null;

/** Load `xlsx` once and reuse the promise, so concurrent exports share a fetch. */
function loadXlsx(): Promise<XlsxModule> {
  if (!xlsxPromise) {
    xlsxPromise = import('xlsx').catch(err => {
      // Clear the memo so a transient network failure can be retried.
      xlsxPromise = null;
      throw err;
    });
  }
  return xlsxPromise;
}

/**
 * Excel sheet names are capped at 31 chars and cannot contain : \ / ? * [ ] or
 * control characters.
 *
 * WHY the extra passes: the argument is an arbitrary DB string
 * (`currentUser.officeNameGu`), not a constant. Control characters are rejected
 * by Excel outright (the whole workbook then fails to open), surrounding
 * whitespace is invisible in a tab bar, and a name that sanitises down to
 * nothing must still yield a legal sheet name instead of `book_append_sheet`
 * throwing.
 */
function safeSheetName(name?: string): string {
  const cleaned = stripSheetNameNoise((name || '').replace(/[:\\/?*[\]]/g, ' '));
  return (cleaned || 'Report').slice(0, 31);
}

/** Drop control characters and collapse runs of whitespace, then trim. */
function stripSheetNameNoise(name: string): string {
  let out = '';
  for (const ch of name) {
    const code = ch.codePointAt(0)!;
    out += code >= 0x20 && code !== 0x7f ? ch : ' ';
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** Widest-cell auto-fit (clamped) so exported columns are readable on open. */
function autofitColumns(sheet: WorkSheet, rows: unknown[][]): void {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, i) => {
      const len = cell === null || cell === undefined ? 0 : String(cell).length;
      widths[i] = Math.max(widths[i] ?? 10, Math.min(60, len + 2));
    });
  }
  sheet['!cols'] = widths.map(w => ({ wch: w }));
}

/**
 * Record-shaped export: header row from the union of every row's keys, then one
 * row per record — the Excel twin of `exportEstablishmentCSV`.
 *
 * `unionColumnKeys` is the SAME helper the CSV exporter uses, so a field that
 * is absent from the first record cannot silently disappear from one format and
 * not the other. Header labels and their order are whatever the caller built
 * them to be.
 */
export async function exportEstablishmentExcel(
  filename: string,
  rows: Record<string, any>[],
  sheetName?: string,
): Promise<void> {
  // `rows[0]` used to be read unguarded: exporting zero rows threw a TypeError
  // instead of producing a file. Callers mostly disable the button, so this
  // only ever fires from a race — say so rather than throwing.
  if (!rows.length) {
    console.warn('[excelExport] exportEstablishmentExcel: no rows to export.');
    return;
  }
  const XLSX = await loadXlsx();
  const keys = unionColumnKeys(rows);
  const matrix: unknown[][] = [keys, ...rows.map(r => keys.map(k => r[k]))];
  const sheet = XLSX.utils.aoa_to_sheet(matrix);
  autofitColumns(sheet, matrix);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, safeSheetName(sheetName));
  XLSX.writeFile(wb, filename);
}

/**
 * Positional matrix export (header row + data rows) — the Excel twin of
 * `exportEstablishmentCSVMatrix`, for wide grids whose labels can collide.
 */
export async function exportEstablishmentExcelMatrix(
  filename: string,
  rows: (string | number)[][],
  sheetName?: string,
): Promise<void> {
  if (!rows.length) {
    console.warn('[excelExport] exportEstablishmentExcelMatrix: no rows to export.');
    return;
  }
  const XLSX = await loadXlsx();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  autofitColumns(sheet, rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, safeSheetName(sheetName));
  XLSX.writeFile(wb, filename);
}
