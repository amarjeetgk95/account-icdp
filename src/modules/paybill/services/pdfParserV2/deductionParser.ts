import type {
  PayBillDeductionRow,
  PayBillDeductionTotalRow,
} from '../../types';
import type { V2TextItem, V2Section } from './types';
import { AMOUNT_RE } from './constants';
import { parseNum } from './numParse';
import { valueColumns, pageValueColumns } from './cells';
import { splitBodyBlocks, splitIdentity } from './bodyBlocks';
import { buildDeductionComponents } from './rowText';
import { totalsFor } from './totals';

export function parseDeductionRowsFromItems(
  section: V2Section
): { rows: PayBillDeductionRow[]; totals: PayBillDeductionTotalRow | null } | null {
  if (!section.bodyItems || section.bodyItems.length === 0) return null;

  const byPage = new Map<number, V2TextItem[]>();
  for (const it of section.bodyItems) {
    if (!it.str || !it.str.trim()) continue;
    const list = byPage.get(it.page) || [];
    list.push(it);
    byPage.set(it.page, list);
  }

  const rows: PayBillDeductionRow[] = [];
  let detectedTotals: PayBillDeductionTotalRow | null = null;
  let lastHrpnX = 35;
  let lastNameX = 120;
  let lastDesigX = 240;

  const sortedPages = [...byPage.keys()].sort((a, b) => a - b);
  for (const pageNum of sortedPages) {
    const pageItems = byPage.get(pageNum)!;

    // Filter to deduction-page check if combined document
    const hasEarningHeader = pageItems.some(
      (i) => /Basic\s*Pay|\(0101\)|\(0102\)/i.test(i.str) && i.y > 200
    );
    if (
      hasEarningHeader &&
      !pageItems.some((i) => /Income\s*Tax|Prof\s*Tax|\(9510\)|\(9570\)/i.test(i.str) && i.y > 200)
    ) {
      continue;
    }

    // Same wrapped-header override as the earning path (pageValueColumns
    // falls back to the section columns when coordinates add nothing).
    const valueCols = pageValueColumns(pageItems, section, 'DEDUCTION');

    const hrpnHeader = pageItems.find((i) => /^HRPN$/i.test(i.str.trim()));
    const nameHeader = pageItems.find((i) => /Employee\s*Name/i.test(i.str.trim()));
    const desigHeader = pageItems.find((i) => /Designation/i.test(i.str.trim()));
    const totalItem = pageItems.find(
      (i) => /^Total$/i.test(i.str.trim()) || /I\s+hereby\s+certify/i.test(i.str.trim())
    );

    if (hrpnHeader) lastHrpnX = hrpnHeader.x;
    if (nameHeader) lastNameX = nameHeader.x;
    if (desigHeader) lastDesigX = desigHeader.x;

    const hrpnX = hrpnHeader?.x ?? lastHrpnX;
    const nameX = nameHeader?.x ?? lastNameX;
    const desigX = desigHeader?.x ?? lastDesigX;
    const tableHeaderY = hrpnHeader ? hrpnHeader.y : 800;
    const totalY = totalItem ? totalItem.y : 40;

    const valueHeaders = pageItems
      .filter(
        (i) =>
          /Income\s*Tax|Prof\s*Tax|\(9510\)|\(9570\)/i.test(i.str.trim()) &&
          i.y >= tableHeaderY - 20
      )
      .sort((a, b) => a.x - b.x);
    const firstValHeader = valueHeaders[0];

    const colBoundHrpnMax = Math.min((hrpnX + nameX) / 2, hrpnX + 22);
    const colBoundNameMax = (nameX + desigX) / 2;
    const colBoundDesigMax = firstValHeader
      ? (desigX + firstValHeader.x) / 2
      : desigX + 80;
    const valueBoundaryX = firstValHeader ? firstValHeader.x - 30 : desigX + 120;

    const hrpnItems = pageItems
      .filter(
        (i) =>
          /^\d{7,10}$/.test(i.str.trim()) &&
          !/2403|0299/.test(i.str.trim()) &&
          Math.abs(i.x - hrpnX) < 25 &&
          i.y < tableHeaderY - 5 &&
          i.y > totalY + 2
      )
      .sort((a, b) => b.y - a.y);

    for (let r = 0; r < hrpnItems.length; r++) {
      const cur = hrpnItems[r];
      const prev = r > 0 ? hrpnItems[r - 1] : null;
      const next = r < hrpnItems.length - 1 ? hrpnItems[r + 1] : null;

      const rowTopY = prev ? (prev.y + cur.y) / 2 : tableHeaderY - 5;
      const rowBottomY = next ? (cur.y + next.y) / 2 : totalY + 2;

      const rowItems = pageItems.filter(
        (i) => i.y <= rowTopY && i.y > rowBottomY && i.str.trim()
      );

      const nameItems = rowItems
        .filter((i) => i.x >= colBoundHrpnMax && i.x < colBoundNameMax)
        .sort((a, b) => b.y - a.y || a.x - b.x);
      let employeeName = nameItems
        .map((i) => i.str.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/Shri\.?\s*Dr\.?/gi, 'Shri.Dr ')
        .replace(/[0-9/()\\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const desigItems = rowItems
        .filter((i) => i.x >= colBoundNameMax && i.x < colBoundDesigMax)
        .sort((a, b) => b.y - a.y || a.x - b.x);
      let designation = desigItems
        .map((i) => i.str.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/^(Designation|Desig)\s+/i, '')
        .replace(/\b\d+\.\d{2}\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!designation) designation = 'Staff';

      const amountItems = rowItems
        .filter(
          (i) =>
            i.x >= valueBoundaryX && /^\d[\d,]*\.\d{2}$/.test(i.str.trim())
        )
        .sort((a, b) => a.x - b.x);
      const amounts = amountItems.map((i) => parseNum(i.str));

      const hasTotalCol = amounts.length >= valueCols.length + 2;
      const fieldCount = hasTotalCol
        ? valueCols.length
        : Math.min(valueCols.length, Math.max(0, amounts.length - 1));
      const byCode = new Map<string, number>();
      for (let k = 0; k < fieldCount; k++) {
        const code = valueCols[k]?.code || `C${k}`;
        // GPF Regular + GPF Advance share treasury code 9670 — SUM duplicates
        // instead of overwriting so Total Deductions reconciles.
        byCode.set(code, (byCode.get(code) || 0) + (amounts[k] || 0));
      }
      const total = hasTotalCol ? amounts[amounts.length - 2] ?? 0 : 0;
      const net = amounts[amounts.length - 1] ?? 0;
      const derivedTotal = hasTotalCol
        ? total
        : [...byCode.values()].reduce((s, v) => s + v, 0);

      const get = (code: string) => byCode.get(code) || 0;

      const srNoItem = rowItems.find(
        (i) => i.x < hrpnX - 5 && /^\d{1,4}$/.test(i.str.trim())
      );
      const srNo = srNoItem
        ? parseInt(srNoItem.str.trim(), 10)
        : rows.length + 1;

      rows.push({
        srNo,
        hrpn: cur.str.trim(),
        employeeName: employeeName || `Employee ${cur.str.trim()}`,
        designation,
        incomeTax: get('9510'),
        profTax: get('9570'),
        hbaInterest: get('9591'),
        gpfRegular: get('9670'),
        gpfClass4: get('9531'),
        npsRegular: get('9534'),
        gisGovtFund: get('9581'),
        gisGovtSaving: get('9582'),
        totalDeductions: derivedTotal,
        netPay: net,
        components: buildDeductionComponents({
          incomeTax: get('9510'),
          profTax: get('9570'),
          hbaInterest: get('9591'),
          gpfRegular: get('9670'),
          gpfClass4: get('9531'),
          npsRegular: get('9534'),
          gisGovtFund: get('9581'),
          gisGovtSaving: get('9582'),
          totalDeductions: derivedTotal,
          netPay: net,
        }),
      });
    }

    if (totalItem && !detectedTotals) {
      const totalAmountItems = pageItems
        .filter(
          (i) =>
            Math.abs(i.y - totalItem.y) <= 8 &&
            i.x >= valueBoundaryX &&
            /^\d[\d,]*\.\d{2}$/.test(i.str.trim())
        )
        .sort((a, b) => a.x - b.x);
      if (totalAmountItems.length > 0) {
        const amounts = totalAmountItems.map((i) => parseNum(i.str));
        const hasTotalCol = amounts.length >= valueCols.length + 2;
        const fieldCount = hasTotalCol
          ? valueCols.length
          : Math.min(valueCols.length, Math.max(0, amounts.length - 1));
        const byCode = new Map<string, number>();
        for (let k = 0; k < fieldCount; k++) {
          const bc = valueCols[k]?.code || `C${k}`;
          byCode.set(bc, (byCode.get(bc) || 0) + (amounts[k] || 0));
        }
        const get = (c: string) => byCode.get(c) || 0;
        detectedTotals = {
          incomeTax: get('9510'),
          profTax: get('9570'),
          hbaInterest: get('9591'),
          gpfRegular: get('9670'),
          gpfClass4: get('9531'),
          npsRegular: get('9534'),
          gisGovtFund: get('9581'),
          gisGovtSaving: get('9582'),
          totalDeductions: hasTotalCol
            ? amounts[amounts.length - 2] || 0
            : 0,
          netPay: amounts[amounts.length - 1] || 0,
        } as PayBillDeductionTotalRow;
      }
    }
  }

  if (rows.length === 0) return null;
  return {
    rows,
    totals:
      detectedTotals ??
      (totalsFor(section, 'DEDUCTION') as PayBillDeductionTotalRow | null),
  };
}

export function parseDeductionSection(
  section: V2Section,
  warnings?: string[]
): { rows: PayBillDeductionRow[]; totals: PayBillDeductionTotalRow | null } {
  void warnings;
  if (section.bodyItems && section.bodyItems.length > 0) {
    try {
      const coordRes = parseDeductionRowsFromItems(section);
      if (coordRes && coordRes.rows.length > 0) {
        return coordRes;
      }
    } catch (err) {
      console.warn('[PdfParserV2] Coordinate deduction extraction fallback to text:', err);
    }
  }

  const valueCols = valueColumns(section);
  const blocks = splitBodyBlocks(section.bodyLines);
  const rows: PayBillDeductionRow[] = [];
  blocks.forEach((b, i) => {
    const numbers = b.text.match(AMOUNT_RE) || [];
    if (numbers.length === 0) return;
    const amounts = numbers.map(parseNum);
    const hasTotalCol = amounts.length >= valueCols.length + 2;
    const fieldCount = hasTotalCol
      ? valueCols.length
      : Math.min(valueCols.length, Math.max(0, amounts.length - 1));
    const byCode = new Map<string, number>();
    for (let k = 0; k < fieldCount; k++) {
      const code = valueCols[k]?.code || `C${k}`;
      byCode.set(code, (byCode.get(code) || 0) + (amounts[k] || 0));
    }
    const total = hasTotalCol ? amounts[amounts.length - 2] ?? 0 : 0;
    const net = amounts[amounts.length - 1] ?? 0;
    const derivedTotal = hasTotalCol
      ? total
      : [...byCode.values()].reduce((s, v) => s + v, 0);
    const firstTok = numbers[0] as string;
    const firstNumIdx = b.text.indexOf(firstTok);
    const { name, designation } = splitIdentity(
      firstNumIdx >= 0 ? b.text.substring(0, firstNumIdx) : b.text,
      b.hrpn
    );
    const get = (code: string) => byCode.get(code) || 0;
    rows.push({
      srNo: i + 1,
      hrpn: b.hrpn,
      employeeName: name,
      designation,
      incomeTax: get('9510'),
      profTax: get('9570'),
      hbaInterest: get('9591'),
      gpfRegular: get('9670'),
      gpfClass4: get('9531'),
      npsRegular: get('9534'),
      gisGovtFund: get('9581'),
      gisGovtSaving: get('9582'),
      totalDeductions: derivedTotal,
      netPay: net,
      components: buildDeductionComponents({
        incomeTax: get('9510'),
        profTax: get('9570'),
        hbaInterest: get('9591'),
        gpfRegular: get('9670'),
        gpfClass4: get('9531'),
        npsRegular: get('9534'),
        gisGovtFund: get('9581'),
        gisGovtSaving: get('9582'),
        totalDeductions: derivedTotal,
        netPay: net,
      }),
    });
  });
  return { rows, totals: totalsFor(section, 'DEDUCTION') as PayBillDeductionTotalRow | null };
}
