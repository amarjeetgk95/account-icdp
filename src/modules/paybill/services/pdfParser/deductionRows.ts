import { componentMasterService } from '../componentMaster.service';
import { splitBundledNameAndDesignation } from '../hrpnMapping.service';
import type {
  PayBillDeductionRow,
  PayBillDeductionTotalRow,
  ComponentMatchResult,
} from '../../types';
import type { RawTextItem } from './types';
import { parseNum } from './numParse';
import { findDesignationInText } from './designationPatterns';
import { buildDeductionComponents, findComponentHeaderX } from './components';

/**
 * Extract Deduction rows using exact 2D canvas coordinates
 */
export function extractDeductionRowsFromItems(
  items: RawTextItem[],
  _warnings?: string[]
): PayBillDeductionRow[] {
  if (!items || items.length === 0) return [];

  const allRows: PayBillDeductionRow[] = [];

  // Group items by page
  const pageMap = new Map<number, RawTextItem[]>();
  for (const item of items) {
    const pageList = pageMap.get(item.page) || [];
    pageList.push(item);
    pageMap.set(item.page, pageList);
  }


  for (const [, pageItems] of pageMap) {
    // 1. Locate Table Header Y position
    let tableHeaderY = 0;
    let hrpnHeaderItem: RawTextItem | undefined;
    let nameHeaderItem: RawTextItem | undefined;
    let desigHeaderItem: RawTextItem | undefined;
    const componentHeaderItems: Array<{ match: ComponentMatchResult; item: RawTextItem }> = [];

    const matcher = componentMasterService.getMatcher();

    for (const item of pageItems) {
      const s = item.str.trim();
      if (/^HRPN$/i.test(s)) {
        hrpnHeaderItem = item;
        tableHeaderY = item.y;
      } else if (
        /Employee\s+Name/i.test(s) ||
        /Name\s+of\s+(?:Govt\s+Servant|Government\s+Servant|Employee)/i.test(s) ||
        /^(?:Emp\.?\s*Name|Employee|Name)$/i.test(s) ||
        /કર્મચારીનું\s*નામ/i.test(s)
      ) {
        nameHeaderItem = item;
        if (!tableHeaderY) tableHeaderY = item.y;
      } else if (
        /Designation/i.test(s) ||
        /^Desig\.?$/i.test(s) ||
        /Designation\s+of\s+Post/i.test(s) ||
        /હોદ્દો/i.test(s)
      ) {
        desigHeaderItem = item;
      } else {
        const match = matcher.findComponent(s);
        if (match.component && match.matchMethod !== 'UNKNOWN') {
          componentHeaderItems.push({ match, item });
        }
      }
    }

    if (!tableHeaderY) {
      const anyHeaderItem = pageItems.find((i) =>
        /PAYBILL\s+INNER\s+SHEET|D\.D\.O|Major\s+Head|TAN\s+No/i.test(i.str)
      );
      tableHeaderY = anyHeaderItem ? anyHeaderItem.y - 25 : 600;
    }

    // Restrict component headers to the table header band (excludes footer "Total")
    const headerBandItems = componentHeaderItems.filter(
      ({ item }) => Math.abs(item.y - tableHeaderY) < 100
    );

    // 2. Locate Total / Footer Y position
    let totalY = 0;
    const totalItem = pageItems.find((i) => /^Total\b/i.test(i.str.trim()) && i.y < tableHeaderY);
    if (totalItem) {
      totalY = totalItem.y;
    } else {
      const certItem = pageItems.find((i) => /I\s+hereby\s+certify|Rupees\s*:/i.test(i.str));
      if (certItem) totalY = certItem.y + 15;
    }

    // 3. Find Employee HRPN items strictly within table body
    const tableBodyItems = pageItems.filter(
      (i) => i.y < tableHeaderY - 10 && (totalY === 0 || i.y > totalY + 2)
    );

    const hrpnX = hrpnHeaderItem?.x || 60;
    const hrpnColumnItems = tableBodyItems
      .filter((i) => {
        const str = i.str.trim();
        const isDigitHrpn = /^\d{7,10}$/.test(str) && !/2403|0299/.test(str);
        const isNearHrpnCol = Math.abs(i.x - hrpnX) < 40;
        return isDigitHrpn && isNearHrpnCol;
      })
      .sort((a, b) => b.y - a.y);

    if (hrpnColumnItems.length === 0) continue;

    // 4. Calculate Column Intervals
    const nameX = nameHeaderItem?.x || hrpnX + 55;
    const desigX = desigHeaderItem?.x || nameX + 110;
    const itHit = findComponentHeaderX(headerBandItems, '9510');
    const ptHit = findComponentHeaderX(headerBandItems, '9570');
    const hbaHit = findComponentHeaderX(headerBandItems, '9591');
    const gpfHit = findComponentHeaderX(headerBandItems, '9670');
    const gpf4Hit = findComponentHeaderX(headerBandItems, '9531');
    const npsHit = findComponentHeaderX(headerBandItems, '9534');
    const gisFundHit = findComponentHeaderX(headerBandItems, '9581');
    const gisSaveHit = findComponentHeaderX(headerBandItems, '9582');
    const totDedHit = findComponentHeaderX(headerBandItems, 'TOTDED');
    const netPayHit = findComponentHeaderX(headerBandItems, 'NETPAY');
    // True when no deduction header was recognised (split/Gujarati headers,
    // scanned PDFs). In that case positional fallback below is used so
    // income-tax is never silently zeroed.
    const hasRealDeductionHeaders =
      itHit > 0 || ptHit > 0 || gpfHit > 0 || npsHit > 0 || totDedHit > 0 || netPayHit > 0;
    const itX = itHit || desigX + 90;
    const ptX = ptHit || itX + 55;
    const hbaX = hbaHit || ptX + 45;
    const gpfX = gpfHit || hbaX + 55;
    const gpf4X = gpf4Hit || gpfX + 60;
    const npsX = npsHit || gpf4X + 60;
    const gisFundX = gisFundHit || npsX + 55;
    const gisSaveX = gisSaveHit || gisFundX + 50;
    const totDedX = totDedHit || gisSaveX + 50;
    const netPayX = netPayHit || totDedX + 55;

    const colBoundHrpnMax = Math.min((hrpnX + nameX) / 2, hrpnX + 25);
    const colBoundNameMax = (nameX + desigX) / 2;
    // Boundary between Designation text and first deduction number uses the
    // leftmost PRESENT header (not a guessed itX), so omitted columns never
    // push IT numbers into the designation band.
    const firstPresentDedX = [itHit, ptHit, hbaHit, gpfHit, gpf4Hit, npsHit, gisFundHit, gisSaveHit]
      .filter((x) => x > 0)
      .sort((a, b) => a - b)[0] || itX;
    const colBoundDesigMax = (desigX + firstPresentDedX) / 2;

    // 5. Extract Each Deduction Row
    for (let r = 0; r < hrpnColumnItems.length; r++) {
      const currentHrpn = hrpnColumnItems[r];
      const nextHrpn = r < hrpnColumnItems.length - 1 ? hrpnColumnItems[r + 1] : null;

      const rowTopY = r === 0 ? tableHeaderY - 10 : (hrpnColumnItems[r - 1].y + currentHrpn.y) / 2;
      const rowBottomY = nextHrpn ? (currentHrpn.y + nextHrpn.y) / 2 : (totalY ? totalY + 2 : currentHrpn.y - 35);

      const rowItems = tableBodyItems.filter((i) => i.y <= rowTopY && i.y > rowBottomY);

      // Sr No
      const srNoItems = rowItems
        .filter((i) => i.x < hrpnX - 5 && /^\d{1,4}$/.test(i.str.trim()))
        .sort((a, b) => b.y - a.y);
      const srNo = srNoItems.length > 0 ? parseInt(srNoItems[0].str.trim(), 10) : r + 1;

      // Employee Name
      const nameItems = rowItems
        .filter((i) => i.x >= colBoundHrpnMax && i.x < colBoundNameMax)
        .sort((a, b) => b.y - a.y || a.x - b.x);

      let employeeName = nameItems
        .map((i) => i.str.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/[0-9/()\\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Designation
      const desigItems = rowItems
        .filter((i) => i.x >= colBoundNameMax && i.x < colBoundDesigMax)
        .sort((a, b) => b.y - a.y || a.x - b.x);

      let designation = desigItems
        .map((i) => i.str.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/^(Designation|Desig)\s+/i, '')
        .trim();

      // Pattern fallback: X bands miss "Assistant Director" when the name
      // column runs wide. Search the row's own text for a known post —
      // same pattern list as the earning side.
      if (!designation || /^staff$/i.test(designation)) {
        const rowTextForDesig = rowItems
          .map((i) => i.str.trim())
          .filter(Boolean)
          .join(' ');
        const found = findDesignationInText(rowTextForDesig);
        if (found) {
          designation = found;
          if (employeeName && employeeName.includes(found)) {
            employeeName = employeeName.replace(found, ' ').replace(/\s+/g, ' ').trim();
          }
        }
      }

      // Fallback for employee name if not captured in the strict column band
      if (!employeeName) {
        const fallbackNameItems = rowItems
          .filter((i) => {
            if (i.x <= hrpnX + 10 || i.x >= colBoundDesigMax) return false;
            if (desigItems.some((d) => d.x === i.x && d.y === i.y)) return false;
            const s = i.str.trim();
            if (/^\d+(?:\.\d+)?$/.test(s)) return false;
            if (designation && designation.includes(s)) return false;
            return true;
          })
          .sort((a, b) => b.y - a.y || a.x - b.x);

        employeeName = fallbackNameItems
          .map((i) => i.str.trim())
          .filter(Boolean)
          .join(' ')
          .replace(/[0-9/()\\-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      // Check if designation accidentally bundled the employee name
      // (handles both "Name Designation" and "Designation Name" orders)
      if (!employeeName && designation) {
        const split = splitBundledNameAndDesignation(designation);
        if (split) {
          employeeName = split.name;
          designation = split.designation;
        }
      }

      // Deduction numeric items (all items to the right of designation boundary)
      const numericItems = rowItems
        .filter((i) => i.x >= colBoundDesigMax)
        .map((i) => ({ str: i.str.trim(), x: i.x, y: i.y }))
        .filter((i) => /\b\d+(?:\.\d{2})?\b/.test(i.str))
        .sort((a, b) => a.x - b.x);

      // Helper to find closest numeric value to a column target X.
      // Two-pass tolerance: try tight window first, widen on a miss so that
      // slightly shifted columns are still captured instead of silently zeroed.
      // Each numeric item can only be claimed once to prevent column bleeding.
      const claimed = new Set<number>();
      const findValNearX = (targetX: number, maxDist = 30): number => {
        const find = (dist: number): { str: string; dist: number; idx: number } | null => {
          let best: { str: string; dist: number; idx: number } | null = null;
          for (let i = 0; i < numericItems.length; i++) {
            if (claimed.has(i)) continue;
            const d = Math.abs(numericItems[i].x - targetX);
            if (d <= dist && (!best || d < best.dist)) {
              best = { str: numericItems[i].str, dist: d, idx: i };
            }
          }
          return best;
        };
        const tight = find(maxDist);
        if (tight !== null) {
          claimed.add(tight.idx);
          return parseNum(tight.str);
        }
        const wide = find(Math.max(maxDist, 80));
        if (wide !== null) {
          claimed.add(wide.idx);
          return parseNum(wide.str);
        }
        return 0;
      };

      // Header-driven mapping (original idea): each value comes from its
      // own header's X position. Headers absent from this sheet (e.g.
      // gazetted March-2026 has no HBA 9591 / Class-4 9531) stay 0 WITHOUT
      // claiming any number — that is what previously shifted IT into the
      // wrong column. Query present headers left-to-right so each number is
      // claimed once by its closest header.
      const presentFields = [
        { code: '9510', x: itHit, key: 'incomeTax' },
        { code: '9570', x: ptHit, key: 'profTax' },
        { code: '9591', x: hbaHit, key: 'hbaInterest' },
        { code: '9670', x: gpfHit, key: 'gpfRegular' },
        { code: '9531', x: gpf4Hit, key: 'gpfClass4' },
        { code: '9534', x: npsHit, key: 'npsRegular' },
        { code: '9581', x: gisFundHit, key: 'gisGovtFund' },
        { code: '9582', x: gisSaveHit, key: 'gisGovtSaving' },
      ]
        .filter((f) => f.x > 0)
        .sort((a, b) => a.x - b.x);
      const fieldByKey: Record<string, number> = {
        incomeTax: 0,
        profTax: 0,
        hbaInterest: 0,
        gpfRegular: 0,
        gpfClass4: 0,
        npsRegular: 0,
        gisGovtFund: 0,
        gisGovtSaving: 0,
      };
      // Claim one number per present header, left-to-right.
      for (const f of presentFields) {
        fieldByKey[f.key] = findValNearX(f.x);
      }
      let incomeTax = fieldByKey.incomeTax;
      let profTax = fieldByKey.profTax;
      let hbaInterest = fieldByKey.hbaInterest;
      let gpfRegular = fieldByKey.gpfRegular;
      let gpfClass4 = fieldByKey.gpfClass4;
      let npsRegular = fieldByKey.npsRegular;
      let gisGovtFund = fieldByKey.gisGovtFund;
      let gisGovtSaving = fieldByKey.gisGovtSaving;
      // Total / Net from their own headers when present; else last numbers.
      let totalDeductions = 0;
      let netPay = 0;
      const numericVals = numericItems.map((n) => parseNum(n.str));
      if (totDedHit > 0) {
        totalDeductions = findValNearX(totDedX);
      } else if (numericVals.length >= 2) {
        totalDeductions = numericVals[numericVals.length - 2] || 0;
      }
      if (netPayHit > 0) {
        netPay = findValNearX(netPayX);
      } else if (numericVals.length >= 1) {
        netPay = numericVals[numericVals.length - 1] || 0;
      }
      // Blank Total column: derive from present fields.
      if (totalDeductions === 0 && netPay !== 0 && presentFields.length > 0) {
        const sum = presentFields.reduce((s, f) => s + (fieldByKey[f.key] || 0), 0);
        if (sum > 0) totalDeductions = sum;
      }

      // Last-resort positional fallback only when NO header was recognised
      // at all (scanned/Gujarati sheets) — never when headers exist.
      const allZero =
        incomeTax === 0 &&
        profTax === 0 &&
        hbaInterest === 0 &&
        gpfRegular === 0 &&
        gpfClass4 === 0 &&
        npsRegular === 0 &&
        gisGovtFund === 0 &&
        gisGovtSaving === 0 &&
        totalDeductions === 0 &&
        netPay === 0;
      if (!hasRealDeductionHeaders && allZero && numericItems.length >= 2) {
        const vals = numericVals;
        const len = vals.length;
        if (len >= 10) {
          incomeTax = vals[0];
          profTax = vals[1];
          hbaInterest = vals[2];
          gpfRegular = vals[3];
          gpfClass4 = vals[4];
          npsRegular = vals[5];
          gisGovtFund = vals[6];
          gisGovtSaving = vals[7];
          totalDeductions = vals[len - 2];
          netPay = vals[len - 1];
        } else if (len === 9) {
          incomeTax = vals[0];
          profTax = vals[1];
          hbaInterest = vals[2];
          gpfRegular = vals[3];
          gpfClass4 = vals[4];
          npsRegular = vals[5];
          gisGovtFund = vals[6];
          gisGovtSaving = vals[7];
          totalDeductions =
            vals[0] + vals[1] + vals[2] + vals[3] + vals[4] + vals[5] + vals[6] + vals[7];
          netPay = vals[8];
        } else if (len >= 8) {
          incomeTax = vals[0] || 0;
          profTax = vals[1] || 0;
          hbaInterest = vals[2] || 0;
          gpfRegular = vals[3] || 0;
          gpfClass4 = vals[4] || 0;
          npsRegular = vals[5] || 0;
          gisGovtFund = vals[6] || 0;
          gisGovtSaving = vals[7] || 0;
          totalDeductions = vals[len - 2] || vals.slice(0, 8).reduce((s, v) => s + v, 0);
          netPay = vals[len - 1] || 0;
        }
      }

      allRows.push({
        srNo,
        hrpn: currentHrpn.str.trim(),
        employeeName: employeeName || `Employee ${currentHrpn.str.trim()}`,
        designation: designation || 'Staff',
        incomeTax,
        profTax,
        hbaInterest,
        gpfRegular,
        gpfClass4,
        npsRegular,
        gisGovtFund,
        gisGovtSaving,
        totalDeductions: totalDeductions || (incomeTax + profTax + hbaInterest + gpfRegular + gpfClass4 + npsRegular + gisGovtFund + gisGovtSaving),
        netPay,
        components: buildDeductionComponents({
          incomeTax,
          profTax,
          hbaInterest,
          gpfRegular,
          gpfClass4,
          npsRegular,
          gisGovtFund,
          gisGovtSaving,
          totalDeductions:
            totalDeductions ||
            (incomeTax + profTax + hbaInterest + gpfRegular + gpfClass4 + npsRegular + gisGovtFund + gisGovtSaving),
          netPay,
        }),
      });
    }
  }

  return allRows;
}

/**
 * Structured text / OCR fallback extraction for Deduction rows
 */
export function extractDeductionRows(text: string, _warnings?: string[]): PayBillDeductionRow[] {
  const rows: PayBillDeductionRow[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);


  // Anchor-based blocks (same as earning side) so multi-line wrapped
  // names / pay-scales don't break income-tax extraction. A row runs from
  // its HRPN line until the next HRPN line (or Total / certify footer).
  const anchors: Array<{ lineIndex: number; hrpn: string }> = [];
  let inTable = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // NOTE: do NOT trigger on "Deduction Side" alone — that line appears
    // before the DDO header and would turn the DDO HRPN into a false row.
    // Table starts at the column header (Sr / HRPN / Employee Name / tax cols).
    if (/^Sr\b|^HRPN\b|Employee\s+Name|Income\s+Tax|Prof\s*Tax|Net\s*Pay/i.test(line)) {
      inTable = true;
      continue;
    }
    if (/^Total\b|Rupees\s*:|I\s+hereby\s+certify/i.test(line)) {
      break;
    }
    if (!inTable) continue;
    const m = line.match(/\b(\d{7,10})\b/);
    if (!m) continue;
    if (/^(2403|0299)/.test(m[1])) continue;
    // Skip header-area phone/DDO fragments: HRPN must be followed by a
    // name or by deduction amounts within the block (checked below).
    anchors.push({ lineIndex: i, hrpn: m[1] });
  }

  // Present deduction columns in header order. Sheets omit irrelevant
  // columns (e.g. gazetted March-2026 has 6: no HBA/Class-4), so amounts
  // must map to present headers — never a fixed 8-slot layout.
  const detectedHeader = componentMasterService.detectHeaderComponents(text, 'DEDUCTION');
  const presentCodes: string[] = detectedHeader
    .filter((c) => c.kind === 'COMPONENT')
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((c) => c.componentCode || '')
    .filter(Boolean);
  // Fallback only when header detection yields nothing at all: assume
  // classic 8. Minimal sheets (e.g. PT-only 2204 with a single 9570
  // column) legitimately have 1-3 present codes and must keep them.
  const effectiveCodes =
    presentCodes.length >= 1
      ? presentCodes
      : ['9510', '9570', '9591', '9670', '9531', '9534', '9581', '9582'];
  const codeToField: Record<string, string> = {
    '9510': 'incomeTax',
    '9570': 'profTax',
    '9591': 'hbaInterest',
    '9670': 'gpfRegular',
    '9531': 'gpfClass4',
    '9534': 'npsRegular',
    '9581': 'gisGovtFund',
    '9582': 'gisGovtSaving',
  };
  const minNumbers = Math.min(8, effectiveCodes.length + 1);

  for (let a = 0; a < anchors.length; a++) {
    const anchor = anchors[a];
    const startLine = anchor.lineIndex;
    const nextAnchorLine = a < anchors.length - 1 ? anchors[a + 1].lineIndex : lines.length;
    let endLine = nextAnchorLine;
    for (let j = startLine; j < nextAnchorLine; j++) {
      if (/^(Total\b|I hereby certify|Rupees\s*:|karmyogi)/i.test(lines[j])) {
        endLine = j;
        break;
      }
    }
    const blockText = lines.slice(startLine, endLine).join(' ');
    const hrpn = anchor.hrpn;
    const numbers = blockText.match(/\b\d[\d,]*\.\d{2}\b/g) || blockText.match(/\b\d[\d,]*(?:\.\d+)?\b/g);

    if (numbers && numbers.length >= minNumbers) {
      const amounts = numbers.map(parseNum);
      const len = amounts.length;

      // Clean name and designation (block may span wrapped lines).
      // Strip HRPN first (leaves a double space), then the leading Sr No,
      // so "1 20110757 Shri.X ..." never yields employeeName "1".
      const firstNumIdx = blockText.indexOf(numbers[0]);
      const textBeforeNums = (firstNumIdx >= 0 ? blockText.substring(0, firstNumIdx) : blockText)
        .replace(hrpn, '')
        .replace(/^\s*\d{1,4}\s+/, '')
        .trim();
      const parts = textBeforeNums.split(/\s{2,}|\t/);
      let employeeName = (parts[0] || 'Employee').trim();
      let designation = parts[1] || 'Staff';
      if (!parts[1] || /^staff$/i.test(designation)) {
        const found = findDesignationInText(textBeforeNums);
        if (found) {
          designation = found;
          employeeName = employeeName.replace(found, ' ').replace(/\s+/g, ' ').trim() || employeeName;
        }
      }

      const fields: Record<string, number> = {
        incomeTax: 0,
        profTax: 0,
        hbaInterest: 0,
        gpfRegular: 0,
        gpfClass4: 0,
        npsRegular: 0,
        gisGovtFund: 0,
        gisGovtSaving: 0,
      };
      // Full row: N fields + Total + Net. Blank-Total row: N fields + Net.
      const hasTotalCol = len >= effectiveCodes.length + 2;
      const fieldCount = hasTotalCol ? effectiveCodes.length : Math.min(effectiveCodes.length, len - 1);
      for (let fi = 0; fi < fieldCount; fi++) {
        const field = codeToField[effectiveCodes[fi]];
        if (field) fields[field] = amounts[fi] || 0;
      }
      const totalDeductions = hasTotalCol
        ? amounts[len - 2] || 0
        : Object.values(fields).reduce((s, v) => s + v, 0);

      rows.push({
        hrpn,
        employeeName,
        designation,
        incomeTax: fields.incomeTax,
        profTax: fields.profTax,
        hbaInterest: fields.hbaInterest,
        gpfRegular: fields.gpfRegular,
        gpfClass4: fields.gpfClass4,
        npsRegular: fields.npsRegular,
        gisGovtFund: fields.gisGovtFund,
        gisGovtSaving: fields.gisGovtSaving,
        totalDeductions,
        netPay: amounts[len - 1] || 0,
        components: buildDeductionComponents({
          incomeTax: fields.incomeTax,
          profTax: fields.profTax,
          hbaInterest: fields.hbaInterest,
          gpfRegular: fields.gpfRegular,
          gpfClass4: fields.gpfClass4,
          npsRegular: fields.npsRegular,
          gisGovtFund: fields.gisGovtFund,
          gisGovtSaving: fields.gisGovtSaving,
          totalDeductions,
          netPay: amounts[len - 1] || 0,
        }),
      });
    }
  }

  return rows;
}

/**
 * Merge coordinate rows (header-X) with text rows (header-order).
 * Coordinate rows keep names/designations; any deduction field that is 0
 * in coordinates but non-zero in text for the same HRPN is filled from
 * text. This keeps the original header-X idea intact while closing single-
 * cell misses (e.g. IT printed off its header X). Text-only HRPNs are
 * appended; coordinates remain the source of truth when both are non-zero.
 */
export function mergeDeductionRows(
  coordRows: PayBillDeductionRow[],
  textRows: PayBillDeductionRow[],
  warnings?: string[]
): PayBillDeductionRow[] {
  const byHrpn = new Map<string, PayBillDeductionRow>();
  for (const t of textRows) {
    byHrpn.set(String(t.hrpn).trim(), t);
  }
  const fields: Array<keyof Pick<PayBillDeductionRow, 'incomeTax' | 'profTax' | 'hbaInterest' | 'gpfRegular' | 'gpfClass4' | 'npsRegular' | 'gisGovtFund' | 'gisGovtSaving' | 'totalDeductions' | 'netPay'>> = [
    'incomeTax', 'profTax', 'hbaInterest', 'gpfRegular', 'gpfClass4',
    'npsRegular', 'gisGovtFund', 'gisGovtSaving', 'totalDeductions', 'netPay',
  ];
  let filled = 0;
  const merged = coordRows.map((c) => {
    const t = byHrpn.get(String(c.hrpn).trim());
    if (!t) return c;
    const next = { ...c };
    let touched = false;
    for (const f of fields) {
      if ((next[f] || 0) === 0 && (t[f] || 0) !== 0) {
        (next[f] as number) = t[f] as number;
        touched = true;
      }
    }
    // Post/designation uses the same rule: header-X first, text fills
    // placeholder "Staff" (or empty) so "Assistant Director" is not lost.
    if ((!next.designation || /^staff$/i.test(next.designation)) && t.designation && !/^staff$/i.test(t.designation)) {
      next.designation = t.designation;
      touched = true;
    }
    if ((!next.employeeName || /^employee/i.test(next.employeeName)) && t.employeeName && !/^employee/i.test(t.employeeName)) {
      next.employeeName = t.employeeName;
      touched = true;
    }
    if (touched) {
      filled++;
      next.components = buildDeductionComponents({
        incomeTax: next.incomeTax,
        profTax: next.profTax,
        hbaInterest: next.hbaInterest,
        gpfRegular: next.gpfRegular,
        gpfClass4: next.gpfClass4,
        npsRegular: next.npsRegular,
        gisGovtFund: next.gisGovtFund,
        gisGovtSaving: next.gisGovtSaving,
        totalDeductions:
          next.totalDeductions ||
          (next.incomeTax + next.profTax + next.hbaInterest + next.gpfRegular + next.gpfClass4 + next.npsRegular + next.gisGovtFund + next.gisGovtSaving),
        netPay: next.netPay,
      });
      if (next.totalDeductions === 0) {
        next.totalDeductions =
          next.incomeTax + next.profTax + next.hbaInterest + next.gpfRegular + next.gpfClass4 + next.npsRegular + next.gisGovtFund + next.gisGovtSaving;
      }
    }
    byHrpn.delete(String(c.hrpn).trim());
    return next;
  });
  // Text-only rows (missed by coordinates) are appended as-is.
  for (const remaining of byHrpn.values()) {
    merged.push(remaining);
  }
  if (filled > 0) {
    warnings?.push(
      `Income-tax cross-check filled ${filled} row(s) from bill text where the table cell was offset from its header.`
    );
  }
  return merged;
}

/**
 * Extract Deduction Totals from footer
 */
export function extractDeductionTotals(
  text: string,
  _rows?: PayBillDeductionRow[]
): PayBillDeductionTotalRow | null {
  const clean = text.replace(/\r\n/g, '\n');
  const totalLineMatch = clean.match(/Total\s+([0-9.,\s]+)/i);


  if (totalLineMatch && totalLineMatch[1]) {
    const numbers =
      totalLineMatch[1].match(/\b\d[\d,]*\.\d{2}\b/g) ||
      totalLineMatch[1].match(/\b\d[\d,]*(?:\.\d+)?\b/g);

    if (numbers && numbers.length >= 3) {
      const amounts = numbers.map(parseNum);
      const len = amounts.length;
      const detectedHeader = componentMasterService.detectHeaderComponents(text, 'DEDUCTION');
      const presentCodes: string[] = detectedHeader
        .filter((c) => c.kind === 'COMPONENT')
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((c) => c.componentCode || '')
        .filter(Boolean);
      const effectiveCodes =
        presentCodes.length >= 1
          ? presentCodes
          : ['9510', '9570', '9591', '9670', '9531', '9534', '9581', '9582'];
      const codeToField: Record<string, string> = {
        '9510': 'incomeTax',
        '9570': 'profTax',
        '9591': 'hbaInterest',
        '9670': 'gpfRegular',
        '9531': 'gpfClass4',
        '9534': 'npsRegular',
        '9581': 'gisGovtFund',
        '9582': 'gisGovtSaving',
      };
      // Variable-column sheets: N fields + Total + Net.
      if (len >= effectiveCodes.length + 2 || len >= 8) {
        const fields: Record<string, number> = {
          incomeTax: 0,
          profTax: 0,
          hbaInterest: 0,
          gpfRegular: 0,
          gpfClass4: 0,
          npsRegular: 0,
          gisGovtFund: 0,
          gisGovtSaving: 0,
        };
        const mapCount = Math.min(effectiveCodes.length, len - 2);
        for (let fi = 0; fi < mapCount; fi++) {
          const field = codeToField[effectiveCodes[fi]];
          if (field) fields[field] = amounts[fi] || 0;
        }
        return {
          incomeTax: fields.incomeTax,
          profTax: fields.profTax,
          hbaInterest: fields.hbaInterest,
          gpfRegular: fields.gpfRegular,
          gpfClass4: fields.gpfClass4,
          npsRegular: fields.npsRegular,
          gisGovtFund: fields.gisGovtFund,
          gisGovtSaving: fields.gisGovtSaving,
          totalDeductions: amounts[len - 2],
          netPay: amounts[len - 1],
        };
      }
    }
  }

  return null;
}
