import { componentMasterService } from '../componentMaster.service';
import { splitBundledNameAndDesignation } from '../hrpnMapping.service';
import type { PayBillEmployeeRow, ComponentMatchResult } from '../../types';
import type { RawTextItem, DetectedColumns } from './types';
import { parseNum } from './numParse';
import { mapPositionalEarningAmounts } from './positionalEarningAmounts';
import { buildEarningComponents } from './components';
import { DESIG_PATTERNS } from './designationPatterns';

/**
 * 2D Coordinate Grid Extractor: Parses employee rows using exact (X, Y) canvas coordinates.
 * Isolates table body strictly between Table Header (top) and Total row (bottom).
 * This is 100% immune to header metadata (DDO HRPN, phone numbers) and multi-line cell wrapping.
 */
export function extractEmployeeRowsFromItems(
  items: RawTextItem[],
  detectedCols?: DetectedColumns,
  _warnings?: string[]
): PayBillEmployeeRow[] {
  if (!items || items.length === 0) return [];

  const allRows: PayBillEmployeeRow[] = [];

  // Group items by page
  const pageMap = new Map<number, RawTextItem[]>();
  for (const item of items) {
    const pageList = pageMap.get(item.page) || [];
    pageList.push(item);
    pageMap.set(item.page, pageList);
  }


  for (const [, pageItems] of pageMap) {
    // 1. Locate Table Header Y position
    // Find the header items: "HRPN", "Employee Name", "Designation", "Pay Scale", "Basic Pay"
    let tableHeaderY = 0;
    let hrpnHeaderItem: RawTextItem | undefined;
    let nameHeaderItem: RawTextItem | undefined;
    let desigHeaderItem: RawTextItem | undefined;
    let payScaleHeaderItem: RawTextItem | undefined;
    let phHeaderItem: RawTextItem | undefined;
    let sloHeaderItem: RawTextItem | undefined;
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
      } else if (/Pay\s+Scale/i.test(s) || s === 'Scale') {
        payScaleHeaderItem = item;
      } else if (/^PH$/i.test(s)) {
        phHeaderItem = item;
      } else if (/^SLO$/i.test(s)) {
        sloHeaderItem = item;
      } else {
        const match = matcher.findComponent(s);
        if (match.component && match.matchMethod !== 'UNKNOWN') {
          componentHeaderItems.push({ match, item });
        }
      }
    }

    // If exact table header Y wasn't found, find the lowest header label
    if (!tableHeaderY) {
      const anyHeaderItem = pageItems.find((i) =>
        /PAYBILL\s+INNER\s+SHEET|D\.D\.O|Major\s+Head|TAN\s+No/i.test(i.str)
      );
      if (anyHeaderItem) {
        tableHeaderY = anyHeaderItem.y - 25;
      } else {
        tableHeaderY = 600; // sensible A4 landscape default
      }
    }

    // Basic Pay is the leftmost detected component column (code 0101 / Basic Pay),
    // restricted to the table header band (excludes footer "Total" and DDO metadata lines).
    const basicCandidate = componentHeaderItems.find(
      ({ match, item }) =>
        (match.component?.componentName === 'Basic Pay' ||
          match.component?.componentCode === '0101' ||
          /Basic/i.test(item.str)) &&
        Math.abs(item.y - tableHeaderY) < 100
    );
    const basicHeaderItem = basicCandidate?.item;

    // 2. Locate Table Total / Footer Y position
    let totalY = 0;
    const totalItem = pageItems.find((i) => /^Total\b/i.test(i.str.trim()) && i.y < tableHeaderY);
    if (totalItem) {
      totalY = totalItem.y;
    } else {
      const certItem = pageItems.find((i) => /I\s+hereby\s+certify|Rupees\s*:/i.test(i.str));
      if (certItem) totalY = certItem.y + 15;
    }

    // 3. Find Employee HRPN items strictly WITHIN table body:
    // Y < tableHeaderY - 10 (STRICTLY BELOW header line) AND Y > totalY (STRICTLY ABOVE Total line)
    const tableBodyItems = pageItems.filter(
      (i) => i.y < tableHeaderY - 10 && (totalY === 0 || i.y > totalY + 2)
    );

    // Find HRPN column X from header or landmark
    const hrpnX = hrpnHeaderItem?.x || 60;

    // Filter HRPNs in table body (7-10 digits, within HRPN column X)
    const hrpnColumnItems = tableBodyItems
      .filter((i) => {
        const str = i.str.trim();
        const isDigitHrpn = /^\d{7,10}$/.test(str) && !/2403|0299/.test(str);
        const isNearHrpnCol = Math.abs(i.x - hrpnX) < 40;
        return isDigitHrpn && isNearHrpnCol;
      })
      .sort((a, b) => b.y - a.y); // Top to bottom

    if (hrpnColumnItems.length === 0) continue;

    // 4. Calculate Column X Boundaries
    const nameX = nameHeaderItem?.x || hrpnX + 55;
    const desigX = desigHeaderItem?.x || nameX + 100;
    const payScaleX = payScaleHeaderItem?.x || desigX + 90;
    const phX = phHeaderItem?.x || payScaleX + 80;
    const sloX = sloHeaderItem?.x || phX + 25;

    const minBasicX = Math.max(payScaleX + 60, phX + 40, sloX + 20);
    const basicX = Math.max(basicHeaderItem?.x || minBasicX, minBasicX);

    const colBoundHrpnMax = Math.min((hrpnX + nameX) / 2, hrpnX + 25);
    const colBoundNameMax = (nameX + desigX) / 2;
    const colBoundDesigMax = (desigX + payScaleX) / 2;
    const colBoundPayScaleMax = (payScaleX + phX) / 2;
    const colBoundPhMax = (phX + sloX) / 2;
    const colBoundSloMax = Math.max(basicX - 35, (sloX + basicX) / 2);

    // 5. Extract each Employee Row
    for (let r = 0; r < hrpnColumnItems.length; r++) {
      const currentHrpn = hrpnColumnItems[r];
      const nextHrpn = r < hrpnColumnItems.length - 1 ? hrpnColumnItems[r + 1] : null;

      // Row Y range
      const rowTopY = r === 0 ? tableHeaderY - 10 : (hrpnColumnItems[r - 1].y + currentHrpn.y) / 2;
      const rowBottomY = nextHrpn ? (currentHrpn.y + nextHrpn.y) / 2 : (totalY ? totalY + 2 : currentHrpn.y - 35);

      // Get all items belonging to this employee's horizontal row band
      const rowItems = tableBodyItems.filter((i) => i.y <= rowTopY && i.y > rowBottomY);

      // Extract Sr No (items to left of HRPN column)
      const srNoItems = rowItems
        .filter((i) => i.x < hrpnX - 5 && /^\d{1,4}$/.test(i.str.trim()))
        .sort((a, b) => b.y - a.y);
      const srNo = srNoItems.length > 0 ? parseInt(srNoItems[0].str.trim(), 10) : r + 1;

      // Extract Employee Name (items strictly between HRPN and Designation columns)
      const nameItems = rowItems
        .filter((i) => i.x >= colBoundHrpnMax && i.x < colBoundNameMax)
        .sort((a, b) => b.y - a.y || a.x - b.x);

      let employeeName = nameItems
        .map((i) => i.str.trim())
        .filter(Boolean)
        .join(' ');

      employeeName = employeeName
        .replace(/Shri\.?\s*Dr\.?/gi, 'Shri.Dr ')
        .replace(/[0-9/()\\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Extract Designation (items strictly between Name and PayScale columns)
      const desigItems = rowItems
        .filter((i) => i.x >= colBoundNameMax && i.x < colBoundDesigMax)
        .sort((a, b) => b.y - a.y || a.x - b.x);

      let designation = desigItems
        .map((i) => i.str.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/^(Designation|Desig)\s+/i, '')
        .trim();

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
          .replace(/Shri\.?\s*Dr\.?/gi, 'Shri.Dr ')
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

      // Extract Pay Scale (items strictly between Designation and PH columns, or containing pay scale patterns)
      const payScaleItems = rowItems
        .filter(
          (i) =>
            (i.x >= colBoundDesigMax && i.x < colBoundPayScaleMax) ||
            /PB-?\d|Level|\/\d{3,5}|\(\s*\d{3,5}\s*-\s*\d{3,5}\s*\)/i.test(i.str.trim())
        )
        .sort((a, b) => b.y - a.y || a.x - b.x);

      const payScale = payScaleItems
        .map((i) => i.str.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/^(Pay\s*Scale|Scale)\s+/i, '')
        .replace(/\s+/g, ' ')
        .replace(/-\s+/g, '-')
        .replace(/\s+-/g, '-')
        .replace(/\s*\/\s*/g, '/')
        .trim();

      // Extract PH (items between PayScale and SLO columns)
      const phItems = rowItems.filter((i) => i.x >= colBoundPayScaleMax && i.x < colBoundPhMax);
      const ph = phItems.map((i) => i.str.trim()).filter((s) => /^(Yes|No)$/i.test(s))[0] || 'No';

      // Extract SLO (items between PH and Basic columns)
      const sloItems = rowItems.filter((i) => i.x >= colBoundPhMax && i.x < colBoundSloMax);
      const slo = sloItems.map((i) => i.str.trim()).filter((s) => /^[PTN]$/i.test(s))[0] || 'P';

      // Extract Monetary Amounts:
      // In Gujarat paybills, all salary numbers in table columns are strictly formatted with 2 decimal places (e.g. 105600.00, 270.00, 0.00).
      // Pay scales (e.g. "PB-3 (15600-", "39100)/6600") and PH/SLO codes MUST NEVER be included in amounts.
      const amountItems = rowItems
        .filter((i) => {
          const s = i.str.trim();
          // Reject any item containing pay scale patterns or non-numeric characters
          if (/PB|Level|Fixed|\/|\(|\)|[a-zA-Z]/i.test(s)) return false;
          // Reject if item is to the left of the allowances area
          if (i.x < colBoundSloMax) return false;
          // Must strictly match decimal currency format (e.g. "105600.00", "0.00")
          return /^\d[\d,]*\.\d{2}$/.test(s) || /^\d+\.\d{2}$/.test(s);
        })
        .sort((a, b) => a.x - b.x);

      let amounts = amountItems
        .map((i) => parseNum(i.str.trim()))
        .filter((v) => !isNaN(v));

      // Fallback for non-decimal formats if strict match found insufficient columns
      if (amounts.length < 7) {
        const fallbackItems = rowItems
          .filter((i) => {
            const s = i.str.trim();
            if (/PB|Level|Fixed|\/|\(|\)|[a-zA-Z]/.test(s)) return false;
            if (i.x < colBoundSloMax) return false;
            return /^\d{2,}(?:\.\d{2})?$/.test(s);
          })
          .sort((a, b) => a.x - b.x);
        if (fallbackItems.length >= 7) {
          amounts = fallbackItems.map((i) => parseNum(i.str.trim())).filter((v) => !isNaN(v));
        }
      }

      let basicPay = 0;
      let da = 0;
      let hra = 0;
      let cla = 0;
      let medicalAllowance = 0;
      let transportAllowance = 0;
      let specialPay = 0;
      let washingAllowance = 0;
      let nonPrivatePracticeAllowance = 0;
      let otherAllowance = 0;
      let grossAmount = 0;

      {
        const mapped = mapPositionalEarningAmounts(amounts, detectedCols);
        basicPay = mapped.basicPay;
        da = mapped.da;
        hra = mapped.hra;
        cla = mapped.cla;
        medicalAllowance = mapped.medicalAllowance;
        transportAllowance = mapped.transportAllowance;
        specialPay = mapped.specialPay;
        washingAllowance = mapped.washingAllowance;
        nonPrivatePracticeAllowance = mapped.nonPrivatePracticeAllowance;
        otherAllowance = mapped.otherAllowance;
        grossAmount = mapped.grossAmount;
      }

      allRows.push({
        srNo,
        hrpn: currentHrpn.str.trim(),
        employeeName: employeeName || 'Employee',
        designation: designation || 'Staff',
        payScale: payScale || '',
        ph: ph || 'No',
        slo: slo || '',
        basicPay,
        da,
        hra,
        cla,
        medicalAllowance,
        transportAllowance,
        specialPay,
        washingAllowance,
        nonPrivatePracticeAllowance,
        otherAllowance,
        grossAmount,
        components: buildEarningComponents(amounts, detectedCols),
      });
    }
  }

  return allRows;
}

/**
 * Extract individual employee rows from the table body (text fallback)
 */
export function extractEmployeeRows(
  text: string,
  detectedCols?: DetectedColumns,
  _warnings?: string[]
): PayBillEmployeeRow[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const rows: PayBillEmployeeRow[] = [];


  // Find lines where HRPN appears (7 to 10 digits)
  const rowAnchors: Array<{ lineIndex: number; hrpn: string; srNo?: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip header lines or total lines
    if (/PAYBILL|INNER SHEET|D\.D\.O|Major Head|TAN No|Cardex|Total\b|Rupees/i.test(line)) {
      continue;
    }

    // Check for SrNo + HRPN e.g. "1 20013826" or "1 20105536 Shri.Amarjeet..." or isolated "20105536"
    const srHrpnMatch = line.match(/^(\d{1,4})\s+(\d{7,10})\b/);
    if (srHrpnMatch) {
      rowAnchors.push({
        lineIndex: i,
        srNo: parseInt(srHrpnMatch[1], 10),
        hrpn: srHrpnMatch[2],
      });
      continue;
    }

    const isolatedHrpnMatch = line.match(/^(\d{7,10})\b/);
    if (isolatedHrpnMatch) {
      rowAnchors.push({
        lineIndex: i,
        hrpn: isolatedHrpnMatch[1],
      });
    }
  }

  // Process each anchor block
  for (let a = 0; a < rowAnchors.length; a++) {
    const anchor = rowAnchors[a];
    const startLine = anchor.lineIndex;
    const nextAnchorLine = a < rowAnchors.length - 1 ? rowAnchors[a + 1].lineIndex : lines.length;

    // Determine end of this employee's block (either next anchor, or 'Total', or 'I hereby certify', etc.)
    let endLine = nextAnchorLine;
    for (let j = startLine; j < nextAnchorLine; j++) {
      if (/^(Total\b|I hereby certify|Rupees\s*:|karmyogi)/i.test(lines[j])) {
        endLine = j;
        break;
      }
    }

    const blockLines = lines.slice(startLine, endLine);
    const blockText = blockLines.join(' ');

    // Extract monetary numbers in this block:
    // Monetary amounts in Gujarat paybills are strictly formatted with decimals (.00)
    // E.g. "37600.00 22560.00 6016.00 270.00 1000.00 3600.00 0.00 0.00 71046.00"
    let numberMatches = blockText.match(/\b\d[\d,]*\.\d{2}\b/g);

    // If no decimal numbers found, fallback to parsing numbers after PH/SLO landmark
    if (!numberMatches || numberMatches.length < 3) {
      const afterPhSloMatch = blockText.match(/\b(?:No|Yes)\s+[PTN]\s+([\d.\s]+)$/i);
      if (afterPhSloMatch) {
        numberMatches = afterPhSloMatch[1].match(/\b\d+(?:\.\d+)?\b/g);
      } else {
        numberMatches = blockText.match(/\b\d{3,}(?:\.\d+)?\b/g);
      }
    }

    let basicPay = 0;
    let da = 0;
    let hra = 0;
    let cla = 0;
    let medicalAllowance = 0;
    let transportAllowance = 0;
    let specialPay = 0;
    let washingAllowance = 0;
    let nonPrivatePracticeAllowance = 0;
    let otherAllowance = 0;
    let grossAmount = 0;

    if (numberMatches && numberMatches.length >= 7) {
      const amounts = numberMatches.map(parseNum);
      const len = amounts.length;

      // Position 0..5 are ALWAYS the 6 standard IFMS columns:
      // 0: Basic Pay
      // 1: DA
      // 2: HRA
      // 3: CLA
      // 4: Med Allow
      // 5: Trans Allow
      basicPay = amounts[0];
      da = amounts[1];
      hra = amounts[2];
      cla = amounts[3];
      medicalAllowance = amounts[4];
      transportAllowance = amounts[5];

      // The LAST amount is ALWAYS the Gross Amount
      grossAmount = amounts[len - 1];

      // Intermediate columns (between index 6 and len - 2)
      const intermediateCount = len - 7;

      if (intermediateCount === 1) {
        // 8 total columns: Basic, DA, HRA, CLA, Med, Trans, [Extra], Gross
        const extraVal = amounts[6];
        if (detectedCols?.hasSpecialPay) {
          specialPay = extraVal;
        } else if (detectedCols?.hasWashing) {
          washingAllowance = extraVal;
        } else {
          // Default to NPP
          nonPrivatePracticeAllowance = extraVal;
        }
      } else if (intermediateCount === 2) {
        // 9 total columns (e.g. Clerks/Drivers/Peons):
        // Basic, DA, HRA, CLA, Med, Trans, Special Addl Pay, Washing Allow, Gross
        specialPay = amounts[6];
        washingAllowance = amounts[7];
      } else if (intermediateCount >= 3) {
        // 10+ columns
        specialPay = amounts[6];
        washingAllowance = amounts[7];
        nonPrivatePracticeAllowance = amounts[8];
        if (intermediateCount > 3) {
          otherAllowance = amounts.slice(9, len - 1).reduce((s, v) => s + v, 0);
        }
      }
    } else if (numberMatches && numberMatches.length >= 2) {
      // Fallback for minimal columns
      grossAmount = parseNum(numberMatches[numberMatches.length - 1]);
      basicPay = parseNum(numberMatches[0]);
      if (numberMatches.length >= 3) da = parseNum(numberMatches[1]);
      if (numberMatches.length >= 4) hra = parseNum(numberMatches[2]);
      if (numberMatches.length >= 5) cla = parseNum(numberMatches[3]);
      if (numberMatches.length >= 6) medicalAllowance = parseNum(numberMatches[4]);
    }

    // Extract text details: Employee Name, Designation, Pay Scale, PH, SLO
    // Handle multi-line table cells where name spans 3 lines and payscale spans 2 lines across numbers.

    // 1. Remove Sr No and HRPN from blockText
    let text = blockText
      .replace(new RegExp(`^${anchor.srNo || ''}\\s*`), '')
      .replace(new RegExp(`\\b${anchor.hrpn}\\b`), '')
      .trim();

    // 2. Remove all monetary decimal amounts (e.g. 37600.00, 22560.00)
    text = text.replace(/\b\d[\d,]*\.\d{2}\b/g, ' ').trim();

    // 3. Extract PH (No / Yes) and SLO (P / T / N / etc.)
    let ph = 'No';
    let slo = 'P';
    const phSloMatch = text.match(/\b(No|Yes)\s+([PTN])\b/i);
    if (phSloMatch) {
      ph = phSloMatch[1];
      slo = phSloMatch[2].toUpperCase();
      text = text.replace(phSloMatch[0], ' ').trim();
    }

    // 4. Extract Pay Scale (including multi-line / split pay scale fragments)
    // Handles contiguous ("PB-2 (9300-34800)/4200", "4440-7440/1400")
    // and split fragments across line wraps ("PB-2 (9300-" ... "34800)/4200")
    let payScale = '';

    const fullPayScaleMatch = text.match(
      /\b(PB-?\d+\s*\(\s*\d{3,5}\s*-\s*\d{3,5}\s*\)\/\d{3,5}|PB-?\d+\s*\(\s*\d{3,5}\s*-\s*\d{3,5}\s*\)|\d{4,5}-\d{4,5}\/\d{3,4}|Level-?\d+\s*\(\s*\d{3,5}\s*-\s*\d{3,5}\s*\)|Level-?\d+|Fixed\s+Pay)\b/i
    );

    if (fullPayScaleMatch) {
      payScale = fullPayScaleMatch[1];
      text = text.replace(fullPayScaleMatch[0], ' ').trim();
    } else {
      // Check for split pay scale fragments (e.g. "PB-2 (9300-" and "34800)/4200")
      const prefixMatch = text.match(/\b(PB-?\d+\s*\(\s*\d{3,5}\s*-?)/i);
      const suffixMatch = text.match(/\b(\d{3,5}\s*\)\s*\/\s*\d{3,5})\b/);
      if (prefixMatch && suffixMatch) {
        const rawJoined = `${prefixMatch[1]} ${suffixMatch[1]}`;
        payScale = rawJoined
          .replace(/\s+/g, '')
          .replace(/PB-(\d+)/, 'PB-$1 ')
          .replace(/\((\d+)-(\d+)\)/, '($1-$2)')
          .trim();
        text = text.replace(prefixMatch[0], ' ').replace(suffixMatch[0], ' ').trim();
      } else if (prefixMatch) {
        payScale = prefixMatch[1].trim();
        text = text.replace(prefixMatch[0], ' ').trim();
      } else if (suffixMatch) {
        payScale = suffixMatch[1].trim();
        text = text.replace(suffixMatch[0], ' ').trim();
      }
    }

    if (payScale) {
      payScale = payScale
        .replace(/\s+/g, ' ')
        .replace(/-\s+/g, '-')
        .replace(/\s+-/g, '-')
        .replace(/\s*\/\s*/g, '/')
        .trim();
    }

    // 5. Extract Designation

    let designation = '';
    for (const dPattern of DESIG_PATTERNS) {
      const dMatch = text.match(dPattern);
      if (dMatch) {
        designation = dMatch[1].trim();
        text = text.replace(dMatch[0], ' ').trim();
        break;
      }
    }

    // 6. Clean Employee Name
    // Ensure zero residual pay scale numbers, brackets, slashes, or grade pays remain in name
    let employeeName = text
      .replace(/PB-?\d+/gi, '')
      .replace(/\(\d{4,5}-\d{4,5}\)/g, '')
      .replace(/\/?\b\d{3,4}\b/g, '')
      .replace(/[0-9/()\\-]/g, ' ')
      .replace(/Shri\.?\s*Dr\.?/gi, 'Shri.Dr ')
      .replace(/\s+/g, ' ')
      .trim();

    employeeName = employeeName.replace(/^[^A-Za-z.]+/, '').trim();

    rows.push({
      srNo: anchor.srNo || rows.length + 1,
      hrpn: anchor.hrpn,
      employeeName: employeeName || 'Employee',
      designation: designation || 'Staff',
      payScale: payScale || '',
      ph: ph || 'No',
      slo: slo || '',
      basicPay,
      da,
      hra,
      cla,
      medicalAllowance,
      transportAllowance,
      specialPay,
      washingAllowance,
      nonPrivatePracticeAllowance,
      otherAllowance,
      grossAmount,
      components: buildEarningComponents(
        (numberMatches || []).map(parseNum),
        detectedCols
      ),
    });
  }

  return rows;
}
