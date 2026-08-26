import { GTR44Bill, GTR44Entry, GTR44FormData, SubVoucher } from '../types';
import { getGrossAmount, getIncomeTax, getNetAmount, getTotalDeductions } from './gtr44Calc.service';

export function entryToSubVoucher(entry: GTR44Entry, index: number): SubVoucher {
  return {
    id: entry.id,
    subVoucherNo: entry.subVoucherNo || String(index + 1),
    payeeName: entry.partyName,
    description: entry.details,
    sanctionOrderNo: entry.sanctionOrderNo,
    sanctionDate: entry.sanctionDate,
    amount: entry.amount,
    edpCode: entry.edpCode,
  };
}

export function subVoucherToEntry(sv: SubVoucher, index: number): GTR44Entry {
  return {
    id: sv.id || `sv-${index + 1}`,
    srNo: index + 1,
    subVoucherNo: sv.subVoucherNo || String(index + 1),
    partyName: sv.payeeName,
    billNo: sv.sanctionOrderNo || `BILL-${index + 1}`,
    date: sv.sanctionDate || new Date().toISOString().split('T')[0],
    details: sv.description,
    amount: sv.amount,
    sanctionOrderNo: sv.sanctionOrderNo,
    sanctionDate: sv.sanctionDate,
    edpCode: sv.edpCode,
  };
}

export function formDataToBill(formData: GTR44FormData, existingStatus?: GTR44Bill['status']): Partial<GTR44Bill> {
  const grossAmount = getGrossAmount(formData);
  const totalDeduction = getTotalDeductions(formData.deductions);
  const netAmount = getNetAmount(grossAmount, totalDeduction);

  const d = formData.deductions;
  const gstTotal = (d?.gst || 0) + (d?.gstCgst || 0) + (d?.gstSgst || 0);
  const deductions = [
    { code: '9510', label: 'Income Tax', amount: getIncomeTax(d) },
    { code: 'GST', label: 'GST', amount: gstTotal },
  ];
  if (d?.surcharge9520) deductions.push({ code: '9520', label: 'Surcharge', amount: d.surcharge9520 });
  if (d?.sd9600) deductions.push({ code: '9600', label: 'Security Deposit', amount: d.sd9600 });
  if (d?.misc9910) deductions.push({ code: '9910', label: 'Misc Recoveries', amount: d.misc9910 });

  return {
    billNo: formData.billRegisterNo || `GTR44-${Date.now()}`,
    billDate: formData.billRegisterDate || new Date().toISOString().split('T')[0],
    tokenNo: formData.tokenNo1,
    tokenDate: formData.tokenDate1,
    officeName: formData.officeName,
    ddoCardexCode: formData.ddoCardexCode,
    fy: parseInt(formData.budgetGrantYearFrom) || new Date().getFullYear(),
    month: formData.monthOf,
    district: formData.district,
    sector: formData.sector,
    demandNo: formData.demandNo,
    majorHead: formData.majorHead,
    subMajorHead: formData.subMajorHead,
    minorHead: formData.minorHead,
    subHead: formData.subHead,
    detailedHead: formData.detailedHead,
    edpCode: formData.partyEntries?.[0]?.edpCode || formData.expenditureItems[0]?.edpCode || '',
    budgetAllotment: formData.budgetGrant || 0,
    ytdExpenditure: formData.expenditureIncludingBill || 0,
    availableBalance: formData.balance || 0,
    subVouchers: (formData.partyEntries || []).map(entryToSubVoucher),
    deductions,
    grossAmount,
    totalDeduction,
    netAmount,
    status: existingStatus || 'draft',
    formData,
  };
}

