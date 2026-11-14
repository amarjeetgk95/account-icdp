import type {
  PayBillEmployeeComponent,
  ComponentMatchResult,
} from '../../types';
import type { DetectedColumns, RawTextItem } from './types';

/**
 * Build the dynamic earning components array for a row.
 *
 * Amounts are positional (0..5 = the six standard IFMS columns, last = gross),
 * matching the existing coordinate/text extractors. When the PDF header was
 * detected, the intermediate columns (between index 6 and len - 2) are mapped
 * to their detected components in PDF order; otherwise they are surfaced with
 * placeholder names so data is never dropped.
 */
export function buildEarningComponents(
  amounts: number[],
  detectedCols?: DetectedColumns
): PayBillEmployeeComponent[] {
  if (!amounts || amounts.length === 0) return [];

  const detected = detectedCols?.components || [];
  const regular = detected.filter((c) => c.kind === 'COMPONENT');
  const gross = detected.find((c) => c.kind === 'TOTAL' || c.kind === 'NET_PAY');

  const components: PayBillEmployeeComponent[] = [];
  const len = amounts.length;

  const standardCount = Math.min(6, regular.length, len);
  for (let i = 0; i < standardCount; i++) {
    const comp = regular[i];
    components.push({
      componentCode: comp.componentCode,
      componentName: comp.componentName,
      type: comp.type,
      amount: amounts[i],
      isTotalField: false,
    });
  }

  // Intermediates (between the 6 standard columns and the gross total)
  const intermediateComps = regular.slice(6);
  let idx = standardCount;
  for (const comp of intermediateComps) {
    if (idx >= len - 1) break;
    components.push({
      componentCode: comp.componentCode,
      componentName: comp.componentName,
      type: comp.type,
      amount: amounts[idx],
      isTotalField: false,
    });
    idx++;
  }
  // Amounts that were present but not represented by a detected component
  while (idx < len - 1) {
    components.push({
      componentCode: null,
      componentName: `Component ${idx + 1}`,
      amount: amounts[idx],
      isTotalField: false,
    });
    idx++;
  }

  components.push({
    componentCode: gross?.componentCode || 'GROSS',
    componentName: gross?.componentName || 'Gross Amount',
    type: 'TOTAL',
    amount: amounts[len - 1],
    isTotalField: true,
  });

  return components;
}

/**
 * Build the dynamic deduction components array for a row from the legacy
 * field values (fixed 8 deduction columns + totals).
 */
export function buildDeductionComponents(values: {
  incomeTax: number;
  profTax: number;
  hbaInterest: number;
  gpfRegular: number;
  gpfClass4: number;
  npsRegular: number;
  gisGovtFund: number;
  gisGovtSaving: number;
  totalDeductions: number;
  netPay: number;
}): PayBillEmployeeComponent[] {
  return [
    { componentCode: '9510', componentName: 'Income Tax', type: 'DEDUCTION', amount: values.incomeTax },
    { componentCode: '9570', componentName: 'Professional Tax', type: 'DEDUCTION', amount: values.profTax },
    { componentCode: '9591', componentName: 'HBA Interest', type: 'DEDUCTION', amount: values.hbaInterest },
    { componentCode: '9670', componentName: 'GPF Regular', type: 'DEDUCTION', amount: values.gpfRegular },
    { componentCode: '9531', componentName: 'GPF Regular Class 4', type: 'DEDUCTION', amount: values.gpfClass4 },
    { componentCode: '9534', componentName: 'NPS Regular', type: 'DEDUCTION', amount: values.npsRegular },
    { componentCode: '9581', componentName: 'Govt Fund', type: 'DEDUCTION', amount: values.gisGovtFund },
    { componentCode: '9582', componentName: 'Govt Saving', type: 'DEDUCTION', amount: values.gisGovtSaving },
    { componentCode: 'TOTDED', componentName: 'Total Deductions', type: 'TOTAL', amount: values.totalDeductions, isTotalField: true },
    { componentCode: 'NETPAY', componentName: 'Net Pay', type: 'NET_PAY', amount: values.netPay, isTotalField: true },
  ];
}

/**
 * Find the X coordinate of a component column header by component code.
 * Returns 0 when the column was not present in the (header-band) items so the
 * caller can fall back to the standard column layout.
 */
export function findComponentHeaderX(
  headerBandItems: Array<{ match: ComponentMatchResult; item: RawTextItem }>,
  code: string
): number {
  const hits = headerBandItems.filter(({ match }) => {
    const comp = match.component;
    if (!comp) return false;
    return comp.componentCode === code || comp.pdfCodeAliases.includes(code);
  });
  if (hits.length === 0) return 0;
  hits.sort((a, b) => a.item.x - b.item.x);
  return hits[0].item.x;
}
