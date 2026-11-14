import type { PayBillEmployeeComponent } from '../../types';
import type { V2Column } from './types';

export function extractPayScale(text: string): string {
  const m =
    text.match(
      /\b(PB-?\d+\s*\(\s*\d{3,5}\s*-\s*\d{3,5}\s*\)\/\d{3,5}|\d{4,5}-\d{4,5}\/\d{3,4}|Level-?\d+[^(]*(\([^)]*\))?|Fixed\s+Pay)\b/i
    ) || text.match(/\b(PB-?\d+\s*\(\s*\d{3,5}\s*-?)/i);
  return (m?.[1] || '').replace(/\s+/g, ' ').trim();
}

export function extractSlo(text: string): string {
  const m = text.match(/\b(No|Yes)\s+([PTN])\b/i);
  return m ? m[2].toUpperCase() : 'P';
}

export function buildComponents(valueCols: V2Column[], amounts: number[]): PayBillEmployeeComponent[] {
  const out: PayBillEmployeeComponent[] = [];
  const nValue = Math.max(0, amounts.length - 1);
  for (let k = 0; k < Math.min(valueCols.length, nValue); k++) {
    out.push({
      componentCode: valueCols[k].code,
      componentName: valueCols[k].label,
      amount: amounts[k],
      isTotalField: false,
    });
  }
  out.push({
    componentCode: 'GROSS',
    componentName: 'Gross Amount',
    type: 'TOTAL',
    amount: amounts[amounts.length - 1] || 0,
    isTotalField: true,
  });
  return out;
}

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
