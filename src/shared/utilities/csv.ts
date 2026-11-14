// ============================================================================
// SHARED CSV HELPERS — RFC 4180-style escaping & line parsing
// Canonical home for the "escape a cell / parse one line / parse a file"
// logic that used to be copy-pasted across gtr44 (budget heads, expenditure
// items, EDP catalogue) and gtr30 (employee master import/export).
// ============================================================================

/**
 * Encode ONE cell for output. Quotes when the value contains a comma, quote,
 * newline or carriage return; embedded quotes are doubled. Null/undefined
 * become the empty string.
 */
export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Parse ONE CSV line: comma-separated, double-quoted fields with `""` as an
 * escaped quote, fields trimmed of surrounding whitespace.
 */
export function parseCsvLine(line: string): string[] {
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

/**
 * Parse a whole CSV document. Handles `\n` and `\r\n` record endings and
 * quoted fields (quotes are treated as syntax, never literal content).
 * Blank rows are discarded.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((field) => field.length > 0));
}
