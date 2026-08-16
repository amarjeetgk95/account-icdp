export interface GTR44Entry {
  id: string;
  srNo: number;
  subVoucherNo?: string;
  partyName: string;
  billNo: string;
  date: string;
  details: string;
  amount: number;
  sanctionOrderNo?: string;
  sanctionDate?: string;
  // EDP Code determines where the voucher amount is placed on Page 1 of GTR-44
  edpCode?: string;
}

export interface GTR44ObjectExpenditureItem {
  code: string;
  name: string;
  edpCode: string;
  amount: number | null;
}

export interface GTR44Deductions {
  // Income Tax deducted directly against the relevant EDP Code (9510)
  incomeTax: number;
  // GST Deduction - details reflected in the checklist on the third page
  gst: number;
  gstCgst: number;
  gstSgst: number;
  gstNo?: string;
  // Legacy fields kept for backward compatibility with previously saved bills
  tds9510?: number;
  surcharge9520?: number;
  sd9600?: number;
  misc9910?: number;
}

export interface GTR44BudgetHead {
  id: string;
  name: string;
  headChargeableCode: string;
  sector: string;
  demandNo: string;
  demandNoLabel: string;
  majorHead: string;
  subMajorHead: string;
  minorHead: string;
  subHead: string;
  detailedHead: string;
}

export interface GTR44FormData {
  // Page 1 Header Metadata
  billTransitRegNo1: string;
  billTransitDate1: string;
  tokenNo1: string;
  tokenDate1: string;

  billTransitRegNo2: string;
  billTransitDate2: string;
  tokenNo2: string;
  tokenDate2: string;

  billRegisterNo: string;
  billRegisterDate: string;

  officeName: string;
  monthOf: string;
  treasuryName: string;

  // Computer Input Data
  district: string; // 2 digits (e.g. "66")
  monthYear: string; // 4 digits (e.g. "0726")
  voucherNo: string; // 4 digits

  // Classifications 4 to 10
  classOfExpenditure: string; // 1 digit (e.g. "1")
  fund: string; // 1 digit (e.g. "3")
  drawing: string; // 3 digits (e.g. "299")
  demandNo: string; // 2-3 digits (e.g. "04")
  typeOfBudget: string; // 1 digit (e.g. "1")
  schemeNo: string; // 4-6 digits (e.g. "110263")

  // Head Chargeable
  headChargeableCode: string; // 10 digits
  sector: string;
  demandNoLabel: string;
  majorHead: string;
  subMajorHead: string;
  minorHead: string;
  subHead: string;
  detailedHead: string; // 2 digits (e.g. "00")

  // Budget Head selected in the second wizard tab
  budgetHeadId: string;

  // Budget Grant & Expenditure
  budgetGrantYearFrom: string; // e.g. "2026"
  budgetGrantYearTo: string; // e.g. "2027"
  budgetGrant: number | null;
  expenditureIncludingBill: number | null;
  balance: number | null;

  // Treasury Pay Order (Page 1 bottom-left)
  treasuryPayRs: number | null;
  treasuryPayRsWords: string;
  treasuryByTc: number | null;
  treasuryTotalRs: number | null;
  treasuryDate: string;
  treasuryAccountant: string;
  treasuryOfficer: string;

  // 22 EDP Object of Expenditure Items (Page 1 right column)
  expenditureItems: GTR44ObjectExpenditureItem[];

  // Deductions
  deductions: GTR44Deductions;

  // Sub-Vouchers / Party Entries (Pages 2 & 3)
  partyEntries: GTR44Entry[];

  // Page 3 Details & Certifications
  underRsAmount: number | null;
  cert3Amount: number | null;
  cert3RecoverableType: 'has been' | 'will be';

  // Page 4 Fields
  payToName: string;
  payToDesignation: string;
  messengerSignatureName: string;
  drawingOfficerSignatureName: string;
  billDated: string;
  ddoCardexCode: string;
  passedForAmount: number | null;
  passedForAmountWords: string;
  countersigningOfficerName: string;
  countersigningOffice: string;
  countersigningDate: string;

  // AG's Office Section (Page 4 bottom)
  agTotalAmount: number | null;
  agAdmittedAmount: number | null;
  agObjectedAmount: number | null;
  agAuditorName: string;
  agSuperintendentName: string;
}

// Sub-Vouchers and Deductions for database persistence and hooks
export interface SubVoucher {
  id: string;
  subVoucherNo: string;
  payeeName: string;
  description: string;
  sanctionOrderNo?: string;
  sanctionDate?: string;
  amount: number;
  attachmentUrl?: string;
  edpCode?: string;
}

export interface Deduction {
  code: string;
  label: string;
  amount: number;
}

export interface EDPCode {
  code: string;
  nameEn: string;
  nameGu: string;
  edpNumber?: string;
}

export interface GTR44Bill {
  id: string;
  billNo: string;
  billDate: string;
  tokenNo?: string;
  tokenDate?: string;
  officeName: string;
  ddoCardexCode: string;
  fy: number;
  month: string;
  district: string;
  sector: string;
  demandNo: string;
  majorHead: string;
  subMajorHead: string;
  minorHead: string;
  subHead: string;
  detailedHead: string;
  edpCode: string;
  budgetAllotment: number;
  ytdExpenditure: number;
  availableBalance: number;
  subVouchers: SubVoucher[];
  deductions: Deduction[];
  grossAmount: number;
  totalDeduction: number;
  netAmount: number;
  status: 'draft' | 'submitted' | 'passed' | 'objected' | 'ac_adjusted';
  acBillNo?: string;
  createdDate: string;
  updatedDate: string;
  formData: GTR44FormData;
}

