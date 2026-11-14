import type {
  PayBillEmployeeRow,
  PayBillTotalRow,
} from '../../types';
import type { V2TextItem, V2Section } from './types';
import { AMOUNT_RE } from './constants';
import { parseNum } from './numParse';
import { valueColumns, pageValueColumns } from './cells';
import { splitBodyBlocks, splitIdentity } from './bodyBlocks';
import { extractPayScale, extractSlo, buildComponents } from './rowText';
import { totalsFor } from './totals';

export function parseEarningRowsFromItems(
  section: V2Section
): { rows: PayBillEmployeeRow[]; totals: PayBillTotalRow | null } | null {
  if (!section.bodyItems || section.bodyItems.length === 0) return null;

  const byPage = new Map<number, V2TextItem[]>();
  for (const it of section.bodyItems) {
    if (!it.str || !it.str.trim()) continue;
    const list = byPage.get(it.page) || [];
    list.push(it);
    byPage.set(it.page, list);
  }

  const rows: PayBillEmployeeRow[] = [];
  let detectedTotals: PayBillTotalRow | null = null;
  let lastHrpnX = 35;
  let lastNameX = 120;
  let lastDesigX = 240;
  let lastPayScaleX: number | undefined;

  const sortedPages = [...byPage.keys()].sort((a, b) => a - b);
  for (const pageNum of sortedPages) {
    const pageItems = byPage.get(pageNum)!;

    // Filter to earning-page check if combined document
    const hasDeductionHeader = pageItems.some(
      (i) => /Income\s*Tax|Prof\s*Tax|\(9510\)|\(9570\)/i.test(i.str) && i.y > 200
    );
    if (
      hasDeductionHeader &&
      !pageItems.some((i) => /Basic\s*Pay|\(0101\)|\(0102\)/i.test(i.str) && i.y > 200)
    ) {
      continue;
    }

    // Column layout comes from item coordinates when they reveal more
    // wrapped columns than text detection (e.g. Special Additional Pay
    // hidden on the second header row); otherwise the section columns.
    // pageValueColumns already falls back to the section columns, so this
    // is a single call (no double work).
    const valueCols = pageValueColumns(pageItems, section, 'EARNING');

    const hrpnHeader = pageItems.find((i) => /^HRPN$/i.test(i.str.trim()));
    const nameHeader = pageItems.find((i) => /Employee\s*Name/i.test(i.str.trim()));
    const desigHeader = pageItems.find((i) => /Designation/i.test(i.str.trim()));
    const payScaleHeader = pageItems.find((i) => /Pay\s*Scale/i.test(i.str.trim()));
    const phHeader = pageItems.find((i) => /^PH$/i.test(i.str.trim()));
    const totalItem = pageItems.find(
      (i) => /^Total$/i.test(i.str.trim()) || /I\s+hereby\s+certify/i.test(i.str.trim())
    );

    if (hrpnHeader) lastHrpnX = hrpnHeader.x;
    if (nameHeader) lastNameX = nameHeader.x;
    if (desigHeader) lastDesigX = desigHeader.x;
    if (payScaleHeader) lastPayScaleX = payScaleHeader.x;

    const hrpnX = hrpnHeader?.x ?? lastHrpnX;
    const nameX = nameHeader?.x ?? lastNameX;
    const desigX = desigHeader?.x ?? lastDesigX;
    const payScaleX = payScaleHeader?.x ?? lastPayScaleX;
    const tableHeaderY = hrpnHeader ? hrpnHeader.y : 800;
    const totalY = totalItem ? totalItem.y : 40;

    const valueHeaders = pageItems
      .filter(
        (i) =>
          /Basic\s*Pay|\(0101\)|\(0102\)/i.test(i.str.trim()) &&
          i.y >= tableHeaderY - 20
      )
      .sort((a, b) => a.x - b.x);
    const firstValHeader = valueHeaders[0];

    const colBoundHrpnMax = Math.min((hrpnX + nameX) / 2, hrpnX + 22);
    const colBoundNameMax = (nameX + desigX) / 2;
    const colBoundDesigMax = payScaleX
      ? (desigX + payScaleX) / 2
      : firstValHeader
        ? (desigX + firstValHeader.x) / 2
        : desigX + 80;
    const colBoundPayScaleMax =
      phHeader && payScaleX
        ? (payScaleX + phHeader.x) / 2
        : payScaleX
          ? payScaleX + 80
          : 0;
    const valueBoundaryX = firstValHeader
      ? firstValHeader.x - 30
      : payScaleX
        ? payScaleX + 100
        : desigX + 150;

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

      const payScaleItems = rowItems
        .filter(
          (i) =>
            (payScaleX && i.x >= colBoundDesigMax && i.x < colBoundPayScaleMax) ||
            /PB-?\d|Level|\/\d{3,5}/i.test(i.str)
        )
        .sort((a, b) => b.y - a.y || a.x - b.x);
      const payScale = payScaleItems
        .map((i) => i.str.trim())
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      const phItem = rowItems.find(
        (i) =>
          i.x >= (payScaleX ? colBoundPayScaleMax : colBoundDesigMax) &&
          /^(Yes|No)$/i.test(i.str.trim())
      );
      const ph = phItem
        ? phItem.str.trim().toLowerCase() === 'yes'
          ? 'Yes'
          : 'No'
        : 'No';

      const sloItem = rowItems.find(
        (i) => i.x < valueBoundaryX && /^[PTN]$/i.test(i.str.trim())
      );
      const slo = sloItem ? sloItem.str.trim().toUpperCase() : 'P';

      const amountItems = rowItems
        .filter(
          (i) =>
            i.x >= valueBoundaryX && /^\d[\d,]*\.\d{2}$/.test(i.str.trim())
        )
        .sort((a, b) => a.x - b.x);
      const amounts = amountItems.map((i) => parseNum(i.str));

      const byCode = new Map<string, number>();
      const nValue = Math.max(0, amounts.length - 1);
      for (let k = 0; k < Math.min(valueCols.length, nValue); k++) {
        const code = valueCols[k]?.code || `C${k}`;
        byCode.set(code, amounts[k] ?? 0);
      }
      let other = 0;
      if (nValue > valueCols.length) {
        other = amounts
          .slice(valueCols.length, nValue)
          .reduce((s, v) => s + v, 0);
      }
      const gross = amounts[amounts.length - 1] ?? 0;
      const get = (code: string) => byCode.get(code) || 0;
      const basicIdx = valueCols.findIndex(
        (c) =>
          (c.code === '0101' || c.code === '0102') && !/special|spl/i.test(c.label)
      );
      const specialIdx = valueCols.findIndex(
        (c, idx) =>
          idx !== basicIdx && (/special|spl/i.test(c.label) || c.code === 'SPECIAL_PAY')
      );
      const basicPay =
        basicIdx >= 0 && basicIdx < nValue
          ? amounts[basicIdx] ?? 0
          : get('0101') || get('0102');
      const specialPay =
        specialIdx >= 0 && specialIdx < nValue
          ? amounts[specialIdx] ?? 0
          : 0;

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
        payScale,
        ph,
        slo,
        basicPay,
        da: get('0103'),
        hra: get('0110'),
        cla: get('0111'),
        medicalAllowance: get('0107'),
        transportAllowance: get('0113'),
        specialPay,
        washingAllowance: get('0132'),
        nonPrivatePracticeAllowance: get('0128'),
        otherAllowance: other,
        grossAmount: gross,
        components: buildComponents(valueCols, amounts),
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
        const byCode = new Map<string, number>();
        const nValue = Math.max(0, amounts.length - 1);
        for (let k = 0; k < Math.min(valueCols.length, nValue); k++) {
          byCode.set(valueCols[k]?.code || `C${k}`, amounts[k] ?? 0);
        }
        const get = (c: string) => byCode.get(c) || 0;
        const basicIdx = valueCols.findIndex(
          (c) =>
            (c.code === '0101' || c.code === '0102') && !/special|spl/i.test(c.label)
        );
        const specialIdx = valueCols.findIndex(
          (c, idx) =>
            idx !== basicIdx && (/special|spl/i.test(c.label) || c.code === 'SPECIAL_PAY')
        );
        const basicPay =
          basicIdx >= 0 && basicIdx < nValue
            ? amounts[basicIdx] ?? 0
            : get('0101') || get('0102');
        const specialPay =
          specialIdx >= 0 && specialIdx < nValue
            ? amounts[specialIdx] ?? 0
            : 0;
        detectedTotals = {
          basicPay,
          da: get('0103'),
          hra: get('0110'),
          cla: get('0111'),
          medicalAllowance: get('0107'),
          transportAllowance: get('0113'),
          specialPay,
          washingAllowance: get('0132'),
          nonPrivatePracticeAllowance: get('0128'),
          otherAllowance: 0,
          grossAmount: amounts[amounts.length - 1] ?? 0,
        } as PayBillTotalRow;
      }
    }
  }

  if (rows.length === 0) return null;
  return {
    rows,
    totals:
      detectedTotals ??
      (totalsFor(section, 'EARNING') as PayBillTotalRow | null),
  };
}

export function parseEarningSection(
  section: V2Section,
  warnings?: string[]
): { rows: PayBillEmployeeRow[]; totals: PayBillTotalRow | null } {
  void warnings;
  if (section.bodyItems && section.bodyItems.length > 0) {
    try {
      const coordRes = parseEarningRowsFromItems(section);
      if (coordRes && coordRes.rows.length > 0) {
        return coordRes;
      }
    } catch (err) {
      console.warn('[PdfParserV2] Coordinate earning extraction fallback to text:', err);
    }
  }

  const valueCols = valueColumns(section);
  const blocks = splitBodyBlocks(section.bodyLines);
  const rows: PayBillEmployeeRow[] = [];
  blocks.forEach((b, i) => {
    const numbers = b.text.match(AMOUNT_RE) || [];
    if (numbers.length === 0) return;
    const firstToken = numbers[0] as string;
    const amounts = numbers.map(parseNum);
    // Map amounts to value columns in order; last amount is the total field.
    const byCode = new Map<string, number>();
    const nValue = Math.max(0, amounts.length - 1);
    for (let k = 0; k < Math.min(valueCols.length, nValue); k++) {
      const code = valueCols[k]?.code || `C${k}`;
      byCode.set(code, amounts[k] ?? 0);
    }
    // Overflow amounts (unknown columns) summed as other.
    let other = 0;
    if (nValue > valueCols.length) {
      other = amounts.slice(valueCols.length, nValue).reduce((s, v) => s + v, 0);
    }
    const gross = amounts[amounts.length - 1] ?? 0;
    const firstNumIdx = b.text.indexOf(firstToken);
    const { name, designation } = splitIdentity(
      firstNumIdx >= 0 ? b.text.substring(0, firstNumIdx) : b.text,
      b.hrpn
    );
    const get = (code: string) => byCode.get(code) || 0;
    // Basic Pay and Special Additional Pay share codes 0101/0102 — resolve
    // by POSITION (first 0101-ish column is Basic), never by code dict
    // (which collapses both into one key and shifts everything).
    const basicIdx = valueCols.findIndex(
      (c) => (c.code === '0101' || c.code === '0102') && !/special|spl/i.test(c.label)
    );
    const specialIdx = valueCols.findIndex(
      (c, idx) =>
        idx !== basicIdx && (/special|spl/i.test(c.label) || c.code === 'SPECIAL_PAY')
    );
    const basicPay =
      basicIdx >= 0 && basicIdx < nValue
        ? amounts[basicIdx] ?? 0
        : get('0101') || get('0102');
    const specialPay =
      specialIdx >= 0 && specialIdx < nValue
        ? amounts[specialIdx] ?? 0
        : 0;
    rows.push({
      srNo: i + 1,
      hrpn: b.hrpn,
      employeeName: name,
      designation,
      payScale: extractPayScale(b.text),
      ph: /\bYes\b/i.test(b.text) ? 'Yes' : 'No',
      slo: extractSlo(b.text),
      basicPay,
      da: get('0103'),
      hra: get('0110'),
      cla: get('0111'),
      medicalAllowance: get('0107'),
      transportAllowance: get('0113'),
      specialPay,
      washingAllowance: get('0132'),
      nonPrivatePracticeAllowance: get('0128'),
      otherAllowance: other,
      grossAmount: gross,
      components: buildComponents(valueCols, amounts),
    });
  });
  return { rows, totals: totalsFor(section, 'EARNING') as PayBillTotalRow | null };
}
