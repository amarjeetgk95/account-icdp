import { GTR44FormData, GTR44Entry, GTR44ObjectExpenditureItem } from '../types';

export const DEFAULT_EXPENDITURE_ITEMS: GTR44ObjectExpenditureItem[] = [
  { code: '0200', name: 'Wages', edpCode: '0 2 0 1 +', amount: null },
  { code: '1300', name: 'Offices Expenses', edpCode: '1 3 0 1 +', amount: null },
  { code: '2800', name: 'Payments for Professional Special Services', edpCode: '2 8 0 1 +', amount: null },
  { code: '1400', name: 'Rents, Rates & Taxes', edpCode: '1 4 0 1 +', amount: null },
  { code: '1500', name: 'Royalty', edpCode: '1 5 0 1 +', amount: null },
  { code: '1600', name: 'Publications', edpCode: '1 6 0 1 +', amount: null },
  { code: '2600', name: 'Advertising, Sales and Publicity Expenses', edpCode: '2 6 0 1 +', amount: null },
  { code: '2000', name: 'Hospitality Expenses/Entertainment Exps.', edpCode: '2 0 0 1 +', amount: null },
  { code: '4100', name: 'Secret Services Expenditure', edpCode: '4 1 0 1 +', amount: null },
  { code: '5200', name: 'Machinery and equipment', edpCode: '5 2 0 1 +', amount: null },
  { code: '5200', name: 'Tools and Plants', edpCode: '5 2 0 2 +', amount: null },
  { code: '5100', name: 'Motor Vehicles', edpCode: '5 1 0 1 +', amount: null },
  { code: '5100', name: 'Maintenance', edpCode: '5 1 0 2 +', amount: null },
  { code: '5000', name: 'Live Stock', edpCode: '5 0 0 8 +', amount: null },
  { code: '2300', name: 'Diet Charges', edpCode: '2 3 0 1 +', amount: null },
  { code: '5000', name: 'Other Charges', edpCode: '5 0 0 6 +', amount: null },
  { code: '1600', name: 'Library Books', edpCode: '1 6 0 2 +', amount: null },
  { code: '0114', name: 'Sumptuary Allowance', edpCode: '0 1 1 4 +', amount: null },
  { code: '1300', name: 'Fuel, Oil & Maintenance of Staff Car', edpCode: '1 3 0 6 +', amount: null },
  { code: '1300', name: 'On Repairs (of Staff Car)', edpCode: '1 3 0 7 +', amount: null },
  { code: '1300', name: 'Electricity Expenses', edpCode: '1 3 0 4 +', amount: null },
  { code: '1300', name: 'Telephone Expenses', edpCode: '1 3 0 3 +', amount: null },
];

// Normalized EDP codes (spaces stripped) usable as suggestions in the Voucher Entry form
export const EDP_CODE_SUGGESTIONS: string[] = Array.from(
  new Set([
    ...DEFAULT_EXPENDITURE_ITEMS.map((item) => item.edpCode.replace(/\s+/g, '')),
    '040',
    '050',
    '060',
    '070',
    '080',
    '110',
    '150',
    '160',
    '170',
    '280',
  ])
);

const INITIAL_PARTY_ENTRIES: GTR44Entry[] = [
  {
    id: 'tx-1',
    srNo: 1,
    subVoucherNo: '1',
    partyName: 'Torrent Power Ltd.',
    billNo: '3003436383',
    date: '2026-07-20',
    details: 'Electricity charges for the month of July 2026 (Consumer No: 501116963)',
    amount: 7320,
    edpCode: '1304+',
  },
];

const today = () => new Date().toISOString().split('T')[0];
const currentYear = () => new Date().getFullYear().toString();
const currentMonthYear = () =>
  currentYear().slice(-2) + String(new Date().getMonth() + 1).padStart(2, '0');

export const EMPTY_GTR44_FORM_DATA: GTR44FormData = {
  // Page 1 Header Metadata
  billTransitRegNo1: '',
  billTransitDate1: '',
  tokenNo1: '',
  tokenDate1: '',

  billTransitRegNo2: '',
  billTransitDate2: '',
  tokenNo2: '',
  tokenDate2: '',

  billRegisterNo: '',
  billRegisterDate: today(),
  officeName: '',
  monthOf: '',
  treasuryName: '',

  // Computer Input Data
  district: '66',
  monthYear: currentMonthYear(),
  voucherNo: '',

  // Classifications 4 to 10
  classOfExpenditure: '1',
  fund: '3',
  drawing: '299',
  demandNo: '04',
  typeOfBudget: '1',
  schemeNo: '110263',

  // Head Chargeable
  headChargeableCode: '',
  sector: '',
  demandNoLabel: '',
  majorHead: '',
  subMajorHead: '',
  minorHead: '',
  subHead: '',
  detailedHead: '00',

  budgetHeadId: '',

  // Budget Grant & Expenditure
  budgetGrantYearFrom: currentYear(),
  budgetGrantYearTo: String(new Date().getFullYear() + 1).slice(-2),
  budgetGrant: null,
  expenditureIncludingBill: null,
  balance: null,

  // Treasury Pay Order
  treasuryPayRs: null,
  treasuryPayRsWords: '',
  treasuryByTc: null,
  treasuryTotalRs: null,
  treasuryDate: '',
  treasuryAccountant: '',
  treasuryOfficer: '',

  // 22 EDP Object of Expenditure Items
  expenditureItems: Array(22)
    .fill(null)
    .map(() => ({ code: '', name: '', edpCode: '', amount: null as number | null })),

  // Deductions
  deductions: { incomeTax: 0, gst: 0, gstCgst: 0, gstSgst: 0, gstNo: '' },

  // Sub-Vouchers / Party Entries
  partyEntries: [],

  // Page 3 Details & Certifications
  underRsAmount: null,
  cert3Amount: null,
  cert3RecoverableType: 'has been',

  // Page 4 Fields
  payToName: '',
  payToDesignation: '',
  messengerSignatureName: '',
  drawingOfficerSignatureName: '',
  billDated: today(),
  ddoCardexCode: '',
  passedForAmount: null,
  passedForAmountWords: '',
  countersigningOfficerName: '',
  countersigningOffice: '',
  countersigningDate: '',

  // AG's Office Section
  agTotalAmount: null,
  agAdmittedAmount: null,
  agObjectedAmount: null,
  agAuditorName: '',
  agSuperintendentName: '',
};

export const DEFAULT_GTR44_FORM_DATA: GTR44FormData = {
  ...EMPTY_GTR44_FORM_DATA,
  // Page 1 Header Metadata
  billRegisterNo: '104',
  billRegisterDate: '2026-07-25',

  officeName: 'Intensive Cattle Development Programme (ICDP), Surat',
  monthOf: 'July 2026',
  treasuryName: 'District Treasury Office, Surat',

  // Computer Input Data
  district: '66',
  monthYear: '0726',

  // Classifications 4 to 10
  classOfExpenditure: '1',
  fund: '3',
  drawing: '299',
  demandNo: '04',
  typeOfBudget: '1',
  schemeNo: '110263',

  // Head Chargeable
  headChargeableCode: '240300102050',
  sector: 'C-Economic Services',
  demandNoLabel: '004',
  majorHead: '2403 Animal Husbandry',
  subMajorHead: '00',
  minorHead: '102 Cattle and Buffalo Development',
  subHead: '05 ANH-06 Intensive Cattle Development Programme',
  detailedHead: '00',

  // Budget Grant & Expenditure
  budgetGrantYearFrom: '2026',
  budgetGrantYearTo: '27',
  budgetGrant: 1000000,
  expenditureIncludingBill: 7320,
  balance: 992680,

  // Treasury Pay Order
  treasuryPayRs: 7320,
  treasuryPayRsWords: 'Seven Thousand Three Hundred Twenty Only',
  treasuryByTc: null,
  treasuryTotalRs: 7320,

  // 22 EDP Object of Expenditure Items
  expenditureItems: DEFAULT_EXPENDITURE_ITEMS,

  // Sub-Vouchers / Party Entries
  partyEntries: INITIAL_PARTY_ENTRIES,

  // Page 3 Details & Certifications
  underRsAmount: 7321,

  // Page 4 Fields
  payToName: 'Self / Torrent Power Ltd.',
  payToDesignation: 'Junior Clerk',
  drawingOfficerSignatureName: 'Deputy Director of Animal Husbandry, ICDP Surat',
  billDated: '2026-07-25',
  ddoCardexCode: 'Code No.299 - Cardex No.22',
  passedForAmount: 7320,
  passedForAmountWords: 'Rupees Seven Thousand Three Hundred Twenty Only',

  // AG's Office Section
  agTotalAmount: 7320,
  agAdmittedAmount: 7320,
};
