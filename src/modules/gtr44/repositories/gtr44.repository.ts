import { GTR44Bill, EDPCode, GTR44FormData } from '../types';
import { DEFAULT_GTR44_FORM_DATA, DEFAULT_EDP_CODES, DEFAULT_EXPENDITURE_ITEMS } from '../store/gtr44Defaults';
import { normalizeExpenditureItem } from '../store/gtr44Defaults';

const STORAGE_KEY = 'gtr44-bills-v1';

function normalizeFormData(formData: GTR44FormData): GTR44FormData {
  let items = (formData.expenditureItems || []).map((item, idx) => {
    const normalized = normalizeExpenditureItem(item as import('../types').GTR44ObjectExpenditureItem, idx);
    return { ...normalized, amount: item?.amount ?? normalized.amount };
  });
  // Fix for old bills created before expenditure master (had 22 empty items with code '' / name '')
  // If first item's code is empty, the whole array is from the buggy EMPTY template — replace with canonical defaults
  const hasEmptyTemplate = items.length === 0 || !String(items[0]?.code ?? '').trim() || !String(items[0]?.edpCode ?? '').trim();
  if (hasEmptyTemplate) {
    items = DEFAULT_EXPENDITURE_ITEMS.map((def, idx) => ({ ...normalizeExpenditureItem(def, idx), amount: null }));
  }
  // Head Chargeable: old bills had 12-digit code (240300102050) — pad to 13-digit canonical form (2403001020500)
  let headCode = String(formData.headChargeableCode ?? '').trim();
  if (headCode && /^\d{12}$/.test(headCode)) {
    headCode = headCode + '0';
  }
  return { ...formData, expenditureItems: items, headChargeableCode: headCode || formData.headChargeableCode };
}

function loadBills(): GTR44Bill[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const bills: GTR44Bill[] = stored ? JSON.parse(stored) : [];
    return bills.map((bill) => ({
      ...bill,
      formData: bill.formData ? normalizeFormData(bill.formData) : bill.formData,
    }));
  } catch {
    return [];
  }
}

function saveBills(bills: GTR44Bill[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
}

class GTR44Repository {
  private bills: GTR44Bill[] = loadBills();
  private edpCodes: EDPCode[] = [
    { code: '040', nameEn: 'Office Expenses', nameGu: 'કચેરી ખર્ચ' },
    { code: '050', nameEn: 'Professional Services', nameGu: 'વ્યાવસાયિક ખાસ સેવાઓ' },
    { code: '060', nameEn: 'Rent, Rates & Taxes', nameGu: 'ભાડાં, દર અને કર' },
    { code: '070', nameEn: 'Publications', nameGu: 'પ્રકાશન' },
    { code: '080', nameEn: 'Advertising & Publicity', nameGu: 'જાહેરાત અને પ્રચાર ખર્ચ' },
    { code: '110', nameEn: 'Hospitality & Entertainment', nameGu: 'આતિથ્ય અને મનોરંજન' },
    { code: '150', nameEn: 'Machinery & Equipment', nameGu: 'યંત્રસામગ્રી અને સાધનસામગ્રી' },
    { code: '160', nameEn: 'Motor Vehicles', nameGu: 'મોટર વાહનો' },
    { code: '170', nameEn: 'Maintenance', nameGu: 'નિભાવ' },
    { code: '280', nameEn: 'Other Charges', nameGu: 'અન્ય ખર્ચ' }
  ];

  // private standardDeductions = [
  //   { code: '9510', label: 'Income Tax' },
  //   { code: '9520', label: 'Surcharge' },
  //   { code: '9600', label: 'Security Deposit' },
  //   { code: '9910', label: 'Misc Recoveries' }
  // ];

  constructor() {
    if (this.bills.length > 0) return;
    const seedFormData = {
      ...DEFAULT_GTR44_FORM_DATA,
      officeName: 'Director of Accounts',
      billRegisterNo: 'GTR44-2024-001',
      billRegisterDate: '2024-04-10',
      tokenNo1: 'TKN-001',
      tokenDate1: '2024-04-11',
      monthOf: 'April',
      district: 'Gandhinagar',
      sector: 'General Services',
      demandNo: '020',
      majorHead: '2054',
      subMajorHead: '00',
      minorHead: '095',
      subHead: '01',
      detailedHead: '00',
      budgetGrant: 500000,
      ddoCardexCode: '001',
      partyEntries: [
        {
          id: 'sv-1',
          srNo: 1,
          subVoucherNo: 'SV-001',
          partyName: 'Stationery Supplier A',
          billNo: 'SV-001',
          date: '2024-04-10',
          details: 'Office Stationery',
          amount: 15000,
        },
      ],
    };

    this.bills = [
      {
        id: '1',
        billNo: 'GTR44-2024-001',
        billDate: '2024-04-10',
        tokenNo: 'TKN-001',
        tokenDate: '2024-04-11',
        officeName: 'Director of Accounts',
        ddoCardexCode: '001',
        fy: 2024,
        month: 'April',
        district: 'Gandhinagar',
        sector: 'General Services',
        demandNo: '020',
        majorHead: '2054',
        subMajorHead: '00',
        minorHead: '095',
        subHead: '01',
        detailedHead: '00',
        edpCode: '040',
        budgetAllotment: 500000,
        ytdExpenditure: 0,
        availableBalance: 500000,
        subVouchers: [
          {
            id: 'sv-1',
            subVoucherNo: 'SV-001',
            payeeName: 'Stationery Supplier A',
            description: 'Office Stationery',
            amount: 15000,
          },
        ],
        deductions: [],
        grossAmount: 15000,
        totalDeduction: 0,
        netAmount: 15000,
        status: 'draft',
        createdDate: '2024-04-10T10:00:00Z',
        updatedDate: '2024-04-10T10:00:00Z',
        formData: seedFormData,
      },
    ];
  }

  async getBills(): Promise<GTR44Bill[]> {
    return Promise.resolve([...this.bills]);
  }

  async getBillById(id: string): Promise<GTR44Bill | undefined> {
    return Promise.resolve(this.bills.find(bill => bill.id === id));
  }

  async createBill(bill: GTR44Bill): Promise<GTR44Bill> {
    this.bills.push(bill);
    saveBills(this.bills);
    return Promise.resolve(bill);
  }

  async updateBill(id: string, updatedBill: Partial<GTR44Bill>): Promise<GTR44Bill | undefined> {
    const index = this.bills.findIndex(bill => bill.id === id);
    if (index !== -1) {
      this.bills[index] = { ...this.bills[index], ...updatedBill, updatedDate: new Date().toISOString() };
      saveBills(this.bills);
      return Promise.resolve(this.bills[index]);
    }
    return Promise.resolve(undefined);
  }

  async deleteBill(id: string): Promise<boolean> {
    const initialLength = this.bills.length;
    this.bills = this.bills.filter(bill => bill.id !== id);
    saveBills(this.bills);
    return Promise.resolve(this.bills.length !== initialLength);
  }

  async getEDPCodes(): Promise<EDPCode[]> {
    // S4: Prefer EDP codes from the settings store (persisted & editable) — fallback to hard-coded 10
    try {
      // Dynamic import to avoid hard circular at module init; store persists in 'gtr44-settings-v1'
      const mod = await import('../store/gtr44SettingsStore');
      const state = (mod as unknown as { useGTR44SettingsStore: { getState: () => { edpCodes?: import('../types').GTR44EDPCode[] } } }).useGTR44SettingsStore?.getState?.();
      const storeCodes = state?.edpCodes;
      if (storeCodes && Array.isArray(storeCodes) && storeCodes.length > 0) {
        const active = storeCodes.filter((c) => c.isActive !== false);
        if (active.length > 0) {
          const mapped: EDPCode[] = active.map((c) => ({ code: c.code, nameEn: c.nameEn, nameGu: c.nameGu }));
          return mapped;
        }
      }
      // Also consider DEFAULT_EDP_CODES as fallback source if store empty but defaults present
      if (DEFAULT_EDP_CODES && DEFAULT_EDP_CODES.length > 0) {
        // Use defaults if store returned empty — they are already the 10 hard-coded values
        // Return mapped defaults as EDPCode for consistency
        const defaultsMapped: EDPCode[] = DEFAULT_EDP_CODES.map((c) => ({ code: c.code, nameEn: c.nameEn, nameGu: c.nameGu }));
        if (defaultsMapped.length > 0 && (!storeCodes || storeCodes.length === 0)) {
          return defaultsMapped;
        }
      }
    } catch {
      // ignore and fall back to hard-coded list
    }
    return Promise.resolve([...this.edpCodes]);
  }
}

export const gtr44Repository = new GTR44Repository();
