import { GTR44FormData, GTR44Entry, GTR44ObjectExpenditureItem, GTR44BudgetHead, GTR44EDPCode, GTR44DeductionTemplate, GTR44NumberingSettings, GTR44PrintSettings } from '../types';

export const DEFAULT_EXPENDITURE_ITEMS: GTR44ObjectExpenditureItem[] = [
  { code: '0200', name: 'Wages', edpCode: '0 2 0 1 +', amount: null, nameGu: '', isActive: true, sortOrder: 0 },
  { code: '1300', name: 'Offices Expenses', edpCode: '1 3 0 1 +', amount: null, nameGu: '', isActive: true, sortOrder: 1 },
  { code: '2800', name: 'Payments for Professional Special Services', edpCode: '2 8 0 1 +', amount: null, nameGu: '', isActive: true, sortOrder: 2 },
  { code: '1400', name: 'Rents, Rates & Taxes', edpCode: '1 4 0 1 +', amount: null, nameGu: '', isActive: true, sortOrder: 3 },
  { code: '1500', name: 'Royalty', edpCode: '1 5 0 1 +', amount: null, nameGu: '', isActive: true, sortOrder: 4 },
  { code: '1600', name: 'Publications', edpCode: '1 6 0 1 +', amount: null, nameGu: '', isActive: true, sortOrder: 5 },
  { code: '2600', name: 'Advertising, Sales and Publicity Expenses', edpCode: '2 6 0 1 +', amount: null, nameGu: '', isActive: true, sortOrder: 6 },
  { code: '2000', name: 'Hospitality Expenses/Entertainment Exps.', edpCode: '2 0 0 1 +', amount: null, nameGu: '', isActive: true, sortOrder: 7 },
  { code: '4100', name: 'Secret Services Expenditure', edpCode: '4 1 0 1 +', amount: null, nameGu: '', isActive: true, sortOrder: 8 },
  { code: '5200', name: 'Machinery and equipment', edpCode: '5 2 0 1 +', amount: null, nameGu: '', isActive: true, sortOrder: 9 },
  { code: '5200', name: 'Tools and Plants', edpCode: '5 2 0 2 +', amount: null, nameGu: '', isActive: true, sortOrder: 10 },
  { code: '5100', name: 'Motor Vehicles', edpCode: '5 1 0 1 +', amount: null, nameGu: '', isActive: true, sortOrder: 11 },
  { code: '5100', name: 'Maintenance', edpCode: '5 1 0 2 +', amount: null, nameGu: '', isActive: true, sortOrder: 12 },
  { code: '5000', name: 'Live Stock', edpCode: '5 0 0 8 +', amount: null, nameGu: '', isActive: true, sortOrder: 13 },
  { code: '2300', name: 'Diet Charges', edpCode: '2 3 0 1 +', amount: null, nameGu: '', isActive: true, sortOrder: 14 },
  { code: '5000', name: 'Other Charges', edpCode: '5 0 0 6 +', amount: null, nameGu: '', isActive: true, sortOrder: 15 },
  { code: '1600', name: 'Library Books', edpCode: '1 6 0 2 +', amount: null, nameGu: '', isActive: true, sortOrder: 16 },
  { code: '0114', name: 'Sumptuary Allowance', edpCode: '0 1 1 4 +', amount: null, nameGu: '', isActive: true, sortOrder: 17 },
  { code: '1300', name: 'Fuel, Oil & Maintenance of Staff Car', edpCode: '1 3 0 6 +', amount: null, nameGu: '', isActive: true, sortOrder: 18 },
  { code: '1300', name: 'On Repairs (of Staff Car)', edpCode: '1 3 0 7 +', amount: null, nameGu: '', isActive: true, sortOrder: 19 },
  { code: '1300', name: 'Electricity Expenses', edpCode: '1 3 0 4 +', amount: null, nameGu: '', isActive: true, sortOrder: 20 },
  { code: '1300', name: 'Telephone Expenses', edpCode: '1 3 0 3 +', amount: null, nameGu: '', isActive: true, sortOrder: 21 },
];

/**
 * Normalize a single expenditure item: fill missing optional fields for backward compat.
 * Keep amount as-is, default isActive to true, nameGu to empty string, sortOrder by index fallback.
 */
export function normalizeExpenditureItem(
  item: GTR44ObjectExpenditureItem,
  index: number
): GTR44ObjectExpenditureItem {
  return {
    code: String(item.code ?? '').trim(),
    name: String(item.name ?? '').trim(),
    edpCode: String(item.edpCode ?? '').trim(),
    amount: item.amount ?? null,
    nameGu: item.nameGu ?? '',
    isActive: item.isActive ?? true,
    sortOrder: item.sortOrder ?? index,
  };
}

export function normalizeExpenditureItems(
  items: GTR44ObjectExpenditureItem[]
): GTR44ObjectExpenditureItem[] {
  return (items ?? []).map((item, idx) => normalizeExpenditureItem(item, idx));
}

export function getActiveExpenditureItems(
  items: GTR44ObjectExpenditureItem[]
): GTR44ObjectExpenditureItem[] {
  return normalizeExpenditureItems(items)
    .filter((i) => i.isActive !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/**
 * GTR-44 EDP Master — 10 canonical EDP codes (GTR-44 S4)
 * Mirrors the previously hard-coded list in gtr44.repository.ts:41
 * Each entry carries English + Gujarati labels, type and active flag.
 */
export const DEFAULT_EDP_CODES: GTR44EDPCode[] = [
  { code: '040', nameEn: 'Office Expenses', nameGu: 'કચેરી ખર્ચ', type: 'expenditure', isActive: true },
  { code: '050', nameEn: 'Professional Services', nameGu: 'વ્યાવસાયિક ખાસ સેવાઓ', type: 'expenditure', isActive: true },
  { code: '060', nameEn: 'Rent, Rates & Taxes', nameGu: 'ભાડાં, દર અને કર', type: 'expenditure', isActive: true },
  { code: '070', nameEn: 'Publications', nameGu: 'પ્રકાશન', type: 'expenditure', isActive: true },
  { code: '080', nameEn: 'Advertising & Publicity', nameGu: 'જાહેરાત અને પ્રચાર ખર્ચ', type: 'expenditure', isActive: true },
  { code: '110', nameEn: 'Hospitality & Entertainment', nameGu: 'આતિથ્ય અને મનોરંજન', type: 'expenditure', isActive: true },
  { code: '150', nameEn: 'Machinery & Equipment', nameGu: 'યંત્રસામગ્રી અને સાધનસામગ્રી', type: 'expenditure', isActive: true },
  { code: '160', nameEn: 'Motor Vehicles', nameGu: 'મોટર વાહનો', type: 'expenditure', isActive: true },
  { code: '170', nameEn: 'Maintenance', nameGu: 'નિભાવ', type: 'expenditure', isActive: true },
  { code: '280', nameEn: 'Other Charges', nameGu: 'અન્ય ખર્ચ', type: 'expenditure', isActive: true },
];

/**
 * Deduction templates — canonical list for Page 1 deduction rows (GTR-44 S4)
 * 9510 Income Tax, 9520 Surcharge, 9600 Security, 9910 Misc, GST
 * GST entry is marked isGst=true and may be split into CGST/SGST.
 */
export const DEFAULT_DEDUCTION_TEMPLATES: GTR44DeductionTemplate[] = [
  { code: '9510', label: 'Income Tax', rateDefault: 2, isGst: false },
  { code: '9520', label: 'Surcharge', isGst: false },
  { code: '9600', label: 'Security Deposit', isGst: false },
  { code: '9910', label: 'Misc Recoveries', isGst: false },
  { code: 'GST', label: 'GST', isGst: true },
];

// Normalized EDP codes (spaces stripped) usable as suggestions in the Voucher Entry form
// Derived from DEFAULT_EDP_CODES + DEFAULT_EXPENDITURE_ITEMS for backward compat
export const EDP_CODE_SUGGESTIONS: string[] = Array.from(
  new Set([
    ...DEFAULT_EDP_CODES.map((c) => c.code.replace(/\s+/g, '').toUpperCase()),
    ...DEFAULT_EXPENDITURE_ITEMS.map((item) => item.edpCode.replace(/\s+/g, '').toUpperCase()),
    ...DEFAULT_DEDUCTION_TEMPLATES.filter((t) => !t.isGst).map((t) => `${t.code}-`.toUpperCase()),
    // GST deduction does not have a fixed EDP minus code — GST is handled separately on Page 3
  ])
);

export function normalizeEDPCodeEntry(code: string): string {
  return String(code ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

export function normalizeDeductionTemplate(template: GTR44DeductionTemplate): GTR44DeductionTemplate {
  return {
    code: String(template.code ?? '').trim().toUpperCase(),
    label: String(template.label ?? '').trim(),
    rateDefault: template.rateDefault ?? undefined,
    isGst: template.isGst ?? false,
  };
}

export function normalizeEDPCodeCatalogEntry(entry: GTR44EDPCode): GTR44EDPCode {
  return {
    code: String(entry.code ?? '').trim().toUpperCase().replace(/\s+/g, ''),
    nameEn: String(entry.nameEn ?? '').trim(),
    nameGu: String(entry.nameGu ?? '').trim(),
    type: entry.type === 'deduction' ? 'deduction' : 'expenditure',
    isActive: entry.isActive ?? true,
  };
}

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
  String(new Date().getMonth() + 1).padStart(2, '0') + currentYear().slice(-2);

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
  // Office & Treasury Master — Phase 1 optional defaults
  officeAddress: '',
  drawingOfficerName: '',
  drawingOfficerDesignation: '',
  messengerName: '',
  treasuryPayMode: 'Cheque',
  defaultMonthOf: '',
  auditorName: '',
  superintendentName: '',

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

  // 22 EDP Object of Expenditure Items — always pre-printed with budget codes as on GTR-44 paper form
  expenditureItems: DEFAULT_EXPENDITURE_ITEMS.map((item) => ({ ...item, amount: null as number | null })),

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
  officeAddress: 'Cattle Breeding Farm Campus, Sumul Dairy Road, Surat - 395008',
  drawingOfficerName: 'Deputy Director of Animal Husbandry',
  drawingOfficerDesignation: 'Deputy Director, ICDP Surat',
  messengerName: 'Junior Clerk',
  countersigningOffice: 'Director, Animal Husbandry, Gujarat State, Gandhinagar',
  auditorName: '',
  superintendentName: '',
  treasuryPayMode: 'Cheque',
  defaultMonthOf: 'July 2026',
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

  // Head Chargeable — 13 boxes on paper form (plus 2 for Detailed Head)
  headChargeableCode: '2403001020500',
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

// Budget Head defaults — extended with versioned fields (isActive, effectiveFrom/To, grantRef, updatedAt/By)
// Kept for backward compat: existing bills with old heads (without new fields) still load via store normalization
export const DEFAULT_BUDGET_HEADS_EXTENDED: GTR44BudgetHead[] = [
  {
    id: 'bh-1',
    name: 'ANH-06 Intensive Cattle Development Programme',
    headChargeableCode: '2403001020500',
    sector: 'C-Economic Services',
    demandNo: '04',
    demandNoLabel: '004',
    majorHead: '2403 Animal Husbandry',
    subMajorHead: '00',
    minorHead: '102 Cattle and Buffalo Development',
    subHead: '05 ANH-06 Intensive Cattle Development Programme',
    detailedHead: '00',
    isActive: true,
    effectiveFrom: undefined,
    effectiveTo: undefined,
    grantRef: undefined,
    updatedAt: new Date().toISOString().split('T')[0],
    updatedBy: undefined,
  },
];

export function normalizeBudgetHeadDefaults(head: GTR44BudgetHead): GTR44BudgetHead {
  return {
    ...head,
    isActive: head.isActive ?? true,
    effectiveFrom: head.effectiveFrom ?? undefined,
    effectiveTo: head.effectiveTo ?? undefined,
    grantRef: head.grantRef ?? undefined,
    updatedAt: head.updatedAt ?? undefined,
    updatedBy: head.updatedBy ?? undefined,
  };
}

// S5 Numbering & Series defaults
export const DEFAULT_GTR44_NUMBERING_SETTINGS: GTR44NumberingSettings = {
  billPrefix: 'GTR44',
  voucherPrefix: 'GTR44V',
  financialYearReset: true,
  nextBillSeq: 1,
  nextVoucherSeq: 1,
};

export function normalizeNumberingSettings(
  input?: Partial<GTR44NumberingSettings> | null
): GTR44NumberingSettings {
  return {
    billPrefix: String(input?.billPrefix ?? DEFAULT_GTR44_NUMBERING_SETTINGS.billPrefix).trim() || DEFAULT_GTR44_NUMBERING_SETTINGS.billPrefix,
    voucherPrefix: String(input?.voucherPrefix ?? DEFAULT_GTR44_NUMBERING_SETTINGS.voucherPrefix).trim() || DEFAULT_GTR44_NUMBERING_SETTINGS.voucherPrefix,
    financialYearReset: input?.financialYearReset ?? DEFAULT_GTR44_NUMBERING_SETTINGS.financialYearReset,
    nextBillSeq: Number.isFinite(input?.nextBillSeq) && (input!.nextBillSeq as number) > 0 ? Math.floor(input!.nextBillSeq as number) : DEFAULT_GTR44_NUMBERING_SETTINGS.nextBillSeq,
    nextVoucherSeq: Number.isFinite(input?.nextVoucherSeq) && (input!.nextVoucherSeq as number) > 0 ? Math.floor(input!.nextVoucherSeq as number) : DEFAULT_GTR44_NUMBERING_SETTINGS.nextVoucherSeq,
  };
}

// S6 Print & Certificates defaults — mirror GTR44Certification.tsx hard-coded certs 1-9
export const DEFAULT_GTR44_PRINT_SETTINGS: GTR44PrintSettings = {
  cert1Text: 'I certify that the expenditure charged in this Bill could not, with due regard to the interest of the public service be avoided. I certify that, to the best of my knowledge and belief the payments entered in the Bill have been duly made to the parties entitled to receive them, with the exceptions noted below which exceed the balance of the Permanent Advance, and will be paid on receipt of the money drawn on this Bill, Vouchers for all sums above Rs. 1000 in amount are attached to the Bill, save those noted, below, which will be forwarded as soon as the amounts have been paid. I have as far as possible obtained vouchers for others sums, and I am responsible that they have been destroyed or so defected, or multilated that they cannot be used again. All works bills are annexed.',
  cert2Text: 'Certified that I have personally checked the progressive total in the Bill with that in the contingent registeres and found to agree.',
  cert3Text: 'Certified that this bill does not include charges to Rs. {{amount}} on account of Municipal sanitary and water taxes for hired or Government residential quarters which are recoverable from the occupants. The amount so recoverable has been / will be recovered by deductions from contingent bill',
  cert4Text: 'I certify that the coolies engaged on manual labour and paid at daily or monthly rate for whom charges have been included in this bill were actually enterained and paid.',
  cert5Text: 'I certify that the purchases billed for have been received in good order, that quantities are correct and their quality good that the rates paid are not in excess or the accepted and the market rates and that suitable notes of payment have been recorded against the original indents and invoices concerned to prevent double payments.',
  cert6Text: 'Certified that the expenditure on conveyance hire included in this bill was actually incurred was unavoidable and is within the scheduled scale of charges for the conveyance used.',
  cert7Text: 'Certified that all bhatta to witnesses has been paid strictly in accordance with the scale laid down by Government.',
  cert8Text: 'Certify that the monetary or quantitative limits prescribed by the Government in respect of items of contingencies included in the bill have not been exceeded.',
  cert9Text: 'I certify that in suport of every charges upto Rs. 1000 made in this bill a receipt or other voucher has been given to me and now in my Possession duly cancelled. The receipt and voucher for items in excess of Rs. 1000/- are attached to the bill duly cancelled that they cannot be again used to support claims against the Government. A work bill are also appended.',
  showPaperTypos: true,
  signaturePlaceholders: {
    drawingOfficer: 'Signature of Drawing Officer',
    messenger: 'Signature of Messenger',
    countersigning: 'Signature of countersigning officer',
  },
  stampImageUrl: '',
  footerNote: '',
  gujaratiFontEnabled: false,
};

export function normalizePrintSettings(
  input?: Partial<GTR44PrintSettings> | null
): GTR44PrintSettings {
  const defaults = DEFAULT_GTR44_PRINT_SETTINGS;
  const sig = input?.signaturePlaceholders as GTR44PrintSettings['signaturePlaceholders'] | undefined;
  return {
    cert1Text: String(input?.cert1Text ?? defaults.cert1Text),
    cert2Text: String(input?.cert2Text ?? defaults.cert2Text),
    cert3Text: String(input?.cert3Text ?? defaults.cert3Text),
    cert4Text: String(input?.cert4Text ?? defaults.cert4Text),
    cert5Text: String(input?.cert5Text ?? defaults.cert5Text),
    cert6Text: String(input?.cert6Text ?? defaults.cert6Text),
    cert7Text: String(input?.cert7Text ?? defaults.cert7Text),
    cert8Text: String(input?.cert8Text ?? defaults.cert8Text),
    cert9Text: String(input?.cert9Text ?? defaults.cert9Text),
    showPaperTypos: input?.showPaperTypos ?? defaults.showPaperTypos,
    signaturePlaceholders: {
      drawingOfficer: String(sig?.drawingOfficer ?? defaults.signaturePlaceholders.drawingOfficer),
      messenger: String(sig?.messenger ?? defaults.signaturePlaceholders.messenger),
      countersigning: String(sig?.countersigning ?? defaults.signaturePlaceholders.countersigning),
    },
    stampImageUrl: input?.stampImageUrl ?? defaults.stampImageUrl,
    footerNote: input?.footerNote ?? defaults.footerNote,
    gujaratiFontEnabled: input?.gujaratiFontEnabled ?? defaults.gujaratiFontEnabled,
  };
}

// Numbering helpers — S5
export function getFinancialYearLabel(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const fyStart = month >= 4 ? year : year - 1;
  const fyEndShort = String((fyStart + 1) % 100).padStart(2, '0');
  return `${fyStart}-${fyEndShort}`;
}

export function formatGTR44BillNo(numbering: GTR44NumberingSettings, date: Date = new Date()): string {
  const prefix = (numbering.billPrefix || 'GTR44').trim() || 'GTR44';
  const seq = String(numbering.nextBillSeq).padStart(4, '0');
  if (numbering.financialYearReset) {
    const fy = getFinancialYearLabel(date);
    return `${prefix}-${fy}-${seq}`;
  }
  return `${prefix}-${seq}`;
}

export function formatGTR44VoucherNo(numbering: GTR44NumberingSettings): string {
  const prefix = (numbering.voucherPrefix || 'GTR44V').trim() || 'GTR44V';
  const seq = String(numbering.nextVoucherSeq).padStart(3, '0');
  return `${prefix}-${seq}`;
}
