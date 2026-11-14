import type { TransactionInput } from '../types';

/** FY bounds as [from, to) YYYY-MM-DD strings. */
export function fyBounds(fy: number): { from: string; to: string } {
  return { from: `${fy}-04-01`, to: `${fy + 1}-04-01` };
}

/** Quarter -> [from, to) date range. Returns null for unknown quarter. */
export function quarterBounds(fy: number, quarter: string): { from: string; to: string } | null {
  switch (quarter) {
    case 'Q1':
      return { from: `${fy}-04-01`, to: `${fy}-07-01` };
    case 'Q2':
      return { from: `${fy}-07-01`, to: `${fy}-10-01` };
    case 'Q3':
      return { from: `${fy}-10-01`, to: `${fy + 1}-01-01` };
    case 'Q4':
      return { from: `${fy + 1}-01-01`, to: `${fy + 1}-04-01` };
    default:
      return null;
  }
}

/** Merge a partial GST edit over the stored row — never default missing legs to 0. */
export function mergeGstEdit(
  current: { cgst: number; sgst: number; igst: number },
  updates: { cgst?: number; sgst?: number; igst?: number }
): { cgst: number; sgst: number; igst: number; totalGst: number } {
  const cgst = updates.cgst !== undefined ? updates.cgst : current.cgst;
  const sgst = updates.sgst !== undefined ? updates.sgst : current.sgst;
  const igst = updates.igst !== undefined ? updates.igst : current.igst;
  const round = (v: number) => Math.round(v * 100) / 100;
  return { cgst: round(cgst), sgst: round(sgst), igst: round(igst), totalGst: round(cgst + sgst + igst) };
}

/** Quote-aware CSV line splitter (handles "a, b",c and "" escapes). */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
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
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out.map((c) => c.replace(/^"|"$/g, '').trim());
}

export interface ParsedCsv {
  entries: TransactionInput[];
  skipped: string[];
}

/**
 * Parse party bulk CSV.
 * Supports:
 * 1. New format: Party Name, DDO Bill No, Bill No (Invoice No), Invoice Date, Settlement Date, Amount, CGST, SGST, IGST, Income Tax [, CPIN, GST, PAN]
 * 2. Legacy format: Party Name, Bill No, Date, Amount, CGST, SGST, IGST, Income Tax [, CPIN, GST, PAN]
 */
export function parsePartyCsv(text: string, today: string): ParsedCsv {
  const entries: TransactionInput[] = [];
  const skipped: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { entries, skipped: ['File appears to be empty or has no data rows.'] };

  const rawHeaders = splitCsvLine(lines[0] as string);
  const headers = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const hasHeader =
    headers.some((h) => h.includes('party') || h.includes('name')) ||
    headers.some((h) => h.includes('amount')) ||
    headers.some((h) => h.includes('bill'));

  const dataLines = hasHeader ? lines.slice(1) : lines;

  // Header column index finder: exact matches first, then partials
  const findCol = (exacts: string[], partials: string[] = []): number => {
    if (!hasHeader) return -1;
    const exactIdx = headers.findIndex((h) => exacts.includes(h));
    if (exactIdx >= 0) return exactIdx;
    if (partials.length === 0) return -1;
    return headers.findIndex((h) => partials.some((p) => h.includes(p)));
  };

  const colParty = findCol(['partyname', 'party', 'vendor', 'name'], ['party', 'vendor']);
  const colDdo = findCol(['ddobillno', 'ddobill', 'ddono', 'ddo'], ['ddo']);
  const colBill = findCol(
    ['invoiceno', 'billno', 'invoicenumber', 'billnumber', 'bill', 'invoice'],
    ['invoiceno', 'invoice', 'billno']
  );
  const colInvDate = findCol(['invoicedate', 'billdate', 'invdate'], ['invoicedate', 'invdate']);
  const colSetDate = findCol(['settlementdate', 'paymentdate', 'cleardate', 'settledate'], ['settlement', 'paymentdate']);
  const colGenericDate = findCol(['date', 'txndate', 'transactiondate'], ['date']);
  const colAmount = findCol(['amount', 'grossamount', 'totalamount', 'gross'], ['amount']);
  const colCgst = findCol(['cgst', 'centraltax', 'cgstamount'], ['cgst']);
  const colSgst = findCol(['sgst', 'statetax', 'sgstamount'], ['sgst']);
  const colIgst = findCol(['igst', 'integratedtax', 'igstamount'], ['igst']);
  const colIT = findCol(['incometax', 'tds', 'it', 'tax', 'incometaxamount'], ['incometax', 'tds']);
  const colCpin = findCol(['cpinno', 'cpin', 'cpinno.'], ['cpin']);
  const colGst = findCol(['gstno', 'gstin', 'gst', 'gstno.'], ['gstin', 'gstno']);
  const colPan = findCol(['panno', 'pan', 'panno.'], ['pan']);

  const isNamedHeader = hasHeader && colParty >= 0 && colBill >= 0 && colAmount >= 0;

  dataLines.forEach((line, idx) => {
    const rowNo = idx + (hasHeader ? 2 : 1);
    const cols = splitCsvLine(line);
    if (cols.length < 3) {
      skipped.push(`Row ${rowNo}: needs at least Party, Bill No, Date`);
      return;
    }

    let partyName = '';
    let ddoBillNo: string | undefined = undefined;
    let billNo = '';
    let invoiceDate = '';
    let settlementDate = '';
    let amountStr = '0';
    let cgstStr: string | undefined;
    let sgstStr: string | undefined;
    let igstStr: string | undefined;
    let incomeTaxStr: string | undefined;
    let cpinNo: string | undefined;
    let gstNo: string | undefined;
    let panNo: string | undefined;

    if (isNamedHeader) {
      partyName = (cols[colParty] || '').trim();
      if (colDdo >= 0 && cols[colDdo]) ddoBillNo = cols[colDdo].trim();
      billNo = (cols[colBill] || '').trim();
      
      const invDateVal = colInvDate >= 0 ? (cols[colInvDate] || '').trim() : '';
      const setDateVal = colSetDate >= 0 ? (cols[colSetDate] || '').trim() : '';
      const genDateVal = colGenericDate >= 0 ? (cols[colGenericDate] || '').trim() : '';

      settlementDate = setDateVal || genDateVal || invDateVal;
      invoiceDate = invDateVal || genDateVal || settlementDate;

      amountStr = cols[colAmount] || '0';
      cgstStr = colCgst >= 0 ? cols[colCgst] : undefined;
      sgstStr = colSgst >= 0 ? cols[colSgst] : undefined;
      igstStr = colIgst >= 0 ? cols[colIgst] : undefined;
      incomeTaxStr = colIT >= 0 ? cols[colIT] : undefined;
      cpinNo = colCpin >= 0 ? (cols[colCpin] || '').trim() || undefined : undefined;
      gstNo = colGst >= 0 ? (cols[colGst] || '').trim() || undefined : undefined;
      panNo = colPan >= 0 ? (cols[colPan] || '').trim() || undefined : undefined;
    } else {
      // Positional parsing
      // If 10+ columns and cols[3] & cols[4] both look like dates:
      // [Party, DDO Bill, Invoice No, Invoice Date, Settlement Date, Amount, CGST, SGST, IGST, IT, CPIN, GST, PAN]
      const col3IsDate = /^\d{4}-\d{2}-\d{2}$/.test((cols[3] || '').trim());
      const col4IsDate = /^\d{4}-\d{2}-\d{2}$/.test((cols[4] || '').trim());

      if (col3IsDate && col4IsDate) {
        partyName = (cols[0] || '').trim();
        ddoBillNo = (cols[1] || '').trim() || undefined;
        billNo = (cols[2] || '').trim();
        invoiceDate = (cols[3] || '').trim();
        settlementDate = (cols[4] || '').trim();
        amountStr = cols[5] || '0';
        cgstStr = cols[6];
        sgstStr = cols[7];
        igstStr = cols[8];
        incomeTaxStr = cols[9];
        cpinNo = (cols[10] || '').trim() || undefined;
        gstNo = (cols[11] || '').trim() || undefined;
        panNo = (cols[12] || '').trim() || undefined;
      } else {
        // Legacy positional:
        // [Party, Bill No, Date, Amount, CGST, SGST, IGST, IT, CPIN, GST, PAN]
        partyName = (cols[0] || '').trim();
        billNo = (cols[1] || '').trim();
        const date = (cols[2] || '').trim();
        invoiceDate = date;
        settlementDate = date;
        amountStr = cols[3] || '0';
        cgstStr = cols[4];
        sgstStr = cols[5];
        igstStr = cols[6];
        incomeTaxStr = cols[7];
        cpinNo = (cols[8] || '').trim() || undefined;
        gstNo = (cols[9] || '').trim() || undefined;
        panNo = (cols[10] || '').trim() || undefined;
      }
    }

    if (!partyName || !billNo) {
      skipped.push(`Row ${rowNo}: Party name and Bill No are required`);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(settlementDate)) {
      skipped.push(`Row ${rowNo}: Settlement Date "${settlementDate || '(blank)'}" must be YYYY-MM-DD`);
      return;
    }
    if (invoiceDate && !/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate)) {
      skipped.push(`Row ${rowNo}: Invoice Date "${invoiceDate}" must be YYYY-MM-DD`);
      return;
    }

    const amount = parseFloat(amountStr || '0');
    if (!(amount > 0)) {
      skipped.push(`Row ${rowNo}: Amount must be greater than 0`);
      return;
    }
    const num = (v: string | undefined) => {
      if (v === undefined || v === '') return 0;
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : NaN;
    };
    const cgst = num(cgstStr);
    const sgst = num(sgstStr);
    const igst = num(igstStr);
    const incomeTax = num(incomeTaxStr);
    if ([cgst, sgst, igst, incomeTax].some((n) => !Number.isFinite(n) || n < 0)) {
      skipped.push(`Row ${rowNo}: tax amounts must be numbers >= 0`);
      return;
    }

    entries.push({
      partyName,
      ddoBillNo,
      billNo,
      invoiceDate: invoiceDate || settlementDate,
      settlementDate,
      date: settlementDate, // backward compatibility
      amount,
      cgst,
      sgst,
      igst,
      incomeTax,
      cpinNo,
      gstNo,
      panNo,
    });
  });

  void today;
  return { entries, skipped };
}
