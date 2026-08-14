import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GTR44FormData, GTR44Entry, GTR44ObjectExpenditureItem, GTR44Deductions } from '../types';
import { numberToWordsINR } from '../utils/gtr44Utils';

export const DEFAULT_EXPENDITURE_ITEMS: GTR44ObjectExpenditureItem[] = [
  { code: '0200', name: 'Wages', edpCode: '0 2 0 1 +', amount: null },
  { code: '1300', name: 'Offices Expenses', edpCode: '1 3 0 1 +', amount: 7320 },
  { code: '2800', name: 'Payments for Professional Special Services', edpCode: '2 8 0 1 +', amount: null },
  { code: '1400', name: 'Rents. Rates & Taxes', edpCode: '1 4 0 1 +', amount: null },
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
  { code: '1300', name: 'Electricity Expences', edpCode: '1 3 0 4 +', amount: null },
  { code: '1300', name: 'Telephone Expences', edpCode: '1 3 0 3 +', amount: null },
];

export const INITIAL_PARTY_ENTRIES: GTR44Entry[] = [
  {
    id: 'tx-1',
    srNo: 1,
    subVoucherNo: '1',
    partyName: 'Torrent Power Ltd.',
    billNo: '3003436383',
    date: '2026-07-20',
    details: 'Electricity charges for the month of July 2026 (Consumer No: 501116963)',
    amount: 7320,
  },
];

export const DEFAULT_GTR44_FORM_DATA: GTR44FormData = {
  // Page 1 Header Metadata
  billTransitRegNo1: '',
  billTransitDate1: '',
  tokenNo1: '',
  tokenDate1: '',

  billTransitRegNo2: '',
  billTransitDate2: '',
  tokenNo2: '',
  tokenDate2: '',

  billRegisterNo: '104',
  billRegisterDate: '2026-07-25',

  officeName: 'Intensive Cattle Development Programme (ICDP), Surat',
  monthOf: 'July 2026',
  treasuryName: 'District Treasury Office, Surat',

  // Computer Input Data
  district: '66',
  monthYear: '0726',
  voucherNo: '',

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
  treasuryDate: '',
  treasuryAccountant: '',
  treasuryOfficer: '',

  // 22 EDP Object of Expenditure Items
  expenditureItems: DEFAULT_EXPENDITURE_ITEMS,

  // Deductions
  deductions: {
    tds9510: 0,
    surcharge9520: 0,
    sd9600: 0,
    misc9910: 0,
  },

  // Sub-Vouchers / Party Entries
  partyEntries: INITIAL_PARTY_ENTRIES,

  // Page 3 Details & Certifications
  underRsAmount: 7321,
  cert3Amount: null,
  cert3RecoverableType: 'has been',

  // Page 4 Fields
  payToName: 'Self / Torrent Power Ltd.',
  payToDesignation: 'Junior Clerk',
  messengerSignatureName: '',
  drawingOfficerSignatureName: 'Deputy Director of Animal Husbandry, ICDP Surat',
  billDated: '2026-07-25',
  ddoCardexCode: 'Code No.299 - Cardex No.22',
  passedForAmount: 7320,
  passedForAmountWords: 'Rupees Seven Thousand Three Hundred Twenty Only',
  countersigningOfficerName: '',
  countersigningOffice: '',
  countersigningDate: '',

  // AG's Office Section
  agTotalAmount: 7320,
  agAdmittedAmount: 7320,
  agObjectedAmount: null,
  agAuditorName: '',
  agSuperintendentName: '',
};

interface GTR44StoreState {
  formData: GTR44FormData;
  activeTab: 'entry' | 'preview' | 'pdf' | 'settings';
  viewPage: 'all' | 'p1' | 'p2' | 'p3' | 'p4';
  zoomLevel: number; // 0.7 to 1.5

  // For backward compatibility
  settings: GTR44FormData;
  transactions: GTR44Entry[];
  deductions: GTR44Deductions;

  // Actions
  setActiveTab: (tab: 'entry' | 'preview' | 'pdf' | 'settings') => void;
  setViewPage: (page: 'all' | 'p1' | 'p2' | 'p3' | 'p4') => void;
  setZoomLevel: (zoom: number) => void;
  updateFormField: <K extends keyof GTR44FormData>(field: K, value: GTR44FormData[K]) => void;
  updateFormFields: (fields: Partial<GTR44FormData>) => void;
  
  // Party entry operations
  addPartyEntry: (entry: Omit<GTR44Entry, 'id' | 'srNo'>) => { success: boolean; error?: string };
  updatePartyEntry: (id: string, entry: Partial<GTR44Entry>) => { success: boolean; error?: string };
  deletePartyEntry: (id: string) => void;
  clearAllPartyEntries: () => void;

  // Expenditure table amount update
  updateExpenditureItemAmount: (index: number, amount: number | null) => void;
  
  // Deductions update
  updateDeductions: (newDeductions: Partial<GTR44Deductions>) => void;

  // Recalculate totals
  recalculateTotals: () => void;
  
  // Reset
  resetToDefault: () => void;

  // Legacy compat functions
  addTransaction: (tx: Omit<GTR44Entry, 'id' | 'srNo'>) => { success: boolean; error?: string };
  updateTransaction: (id: string, tx: Partial<GTR44Entry>) => { success: boolean; error?: string };
  deleteTransaction: (id: string) => void;
  updateSettings: (newSettings: GTR44FormData) => void;
  resetSettings: () => void;
  resetToSampleData: () => void;
}

export const useGTR44Store = create<GTR44StoreState>()(
  persist(
    (set, get) => ({
      formData: DEFAULT_GTR44_FORM_DATA,
      activeTab: 'entry',
      viewPage: 'all',
      zoomLevel: 1,

      // Legacy getters for backward compatibility
      settings: DEFAULT_GTR44_FORM_DATA,
      transactions: INITIAL_PARTY_ENTRIES,
      deductions: DEFAULT_GTR44_FORM_DATA.deductions,

      setActiveTab: (tab) => set({ activeTab: tab }),
      setViewPage: (page) => set({ viewPage: page }),
      setZoomLevel: (zoom) => set({ zoomLevel: Math.max(0.5, Math.min(1.5, zoom)) }),

      updateFormField: (field, value) => {
        set((state) => {
          const updated = { ...state.formData, [field]: value };
          return {
            formData: updated,
            settings: updated,
          };
        });
        get().recalculateTotals();
      },

      updateFormFields: (fields) => {
        set((state) => {
          const updated = { ...state.formData, ...fields };
          return {
            formData: updated,
            settings: updated,
          };
        });
        get().recalculateTotals();
      },

      addPartyEntry: (entryData) => {
        const state = get();
        if (!entryData.partyName || !entryData.partyName.trim()) {
          return { success: false, error: 'Party Name cannot be empty.' };
        }
        if (!entryData.billNo || !entryData.billNo.trim()) {
          return { success: false, error: 'Bill No cannot be empty.' };
        }
        if (!entryData.amount || entryData.amount <= 0) {
          return { success: false, error: 'Amount must be greater than 0.' };
        }

        const newSrNo = state.formData.partyEntries.length + 1;
        const newRecord: GTR44Entry = {
          ...entryData,
          id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          srNo: newSrNo,
          subVoucherNo: entryData.subVoucherNo || String(newSrNo),
        };

        const updatedEntries = [...state.formData.partyEntries, newRecord];
        set((s) => ({
          formData: { ...s.formData, partyEntries: updatedEntries },
          transactions: updatedEntries,
        }));

        get().recalculateTotals();
        return { success: true };
      },

      updatePartyEntry: (id, entryData) => {
        const state = get();
        const index = state.formData.partyEntries.findIndex((e) => e.id === id);
        if (index === -1) return { success: false, error: 'Entry not found.' };

        const updatedEntries = [...state.formData.partyEntries];
        updatedEntries[index] = { ...updatedEntries[index], ...entryData };

        const reindexed = updatedEntries.map((item, idx) => ({
          ...item,
          srNo: idx + 1,
          subVoucherNo: item.subVoucherNo || String(idx + 1),
        }));

        set((s) => ({
          formData: { ...s.formData, partyEntries: reindexed },
          transactions: reindexed,
        }));

        get().recalculateTotals();
        return { success: true };
      },

      deletePartyEntry: (id) => {
        set((state) => {
          const filtered = state.formData.partyEntries.filter((e) => e.id !== id);
          const reindexed = filtered.map((item, idx) => ({
            ...item,
            srNo: idx + 1,
            subVoucherNo: item.subVoucherNo || String(idx + 1),
          }));
          return {
            formData: { ...state.formData, partyEntries: reindexed },
            transactions: reindexed,
          };
        });
        get().recalculateTotals();
      },

      clearAllPartyEntries: () => {
        set((state) => ({
          formData: { ...state.formData, partyEntries: [] },
          transactions: [],
        }));
        get().recalculateTotals();
      },

      updateExpenditureItemAmount: (index, amount) => {
        set((state) => {
          const items = [...state.formData.expenditureItems];
          if (items[index]) {
            items[index] = { ...items[index], amount };
          }
          return {
            formData: { ...state.formData, expenditureItems: items },
          };
        });
        get().recalculateTotals();
      },

      updateDeductions: (newDeductions) => {
        set((state) => {
          const updatedDeductions = { ...state.formData.deductions, ...newDeductions };
          return {
            formData: { ...state.formData, deductions: updatedDeductions },
            deductions: updatedDeductions,
          };
        });
        get().recalculateTotals();
      },

      recalculateTotals: () => {
        const state = get();
        const partyTotal = state.formData.partyEntries.reduce((sum, e) => sum + (e.amount || 0), 0);

        // Sum up expenditure items if any are explicitly set, else use partyTotal
        const expItemsTotal = state.formData.expenditureItems.reduce((sum, item) => sum + (item.amount || 0), 0);
        const grossTotal = partyTotal > 0 ? partyTotal : expItemsTotal;

        const totalDeductions =
          (state.formData.deductions.tds9510 || 0) +
          (state.formData.deductions.surcharge9520 || 0) +
          (state.formData.deductions.sd9600 || 0) +
          (state.formData.deductions.misc9910 || 0);

        const netAmount = Math.max(0, grossTotal - totalDeductions);
        const grant = state.formData.budgetGrant || 0;
        const balance = Math.max(0, grant - grossTotal);
        const passedWordsINR = numberToWordsINR(grossTotal);

        set((s) => ({
          formData: {
            ...s.formData,
            expenditureIncludingBill: grossTotal,
            balance,
            treasuryTotalRs: grossTotal,
            treasuryPayRs: netAmount,
            treasuryPayRsWords: numberToWordsINR(netAmount),
            underRsAmount: Math.ceil(grossTotal + 1),
            passedForAmount: grossTotal,
            passedForAmountWords: passedWordsINR,
            agTotalAmount: grossTotal,
            agAdmittedAmount: grossTotal,
          },
          settings: {
            ...s.settings,
            budgetGrant: grant,
            grossTotal,
            netAmount,
            totalDeductions,
          },
        }));
      },

      resetToDefault: () =>
        set({
          formData: DEFAULT_GTR44_FORM_DATA,
          settings: DEFAULT_GTR44_FORM_DATA,
          transactions: INITIAL_PARTY_ENTRIES,
          deductions: DEFAULT_GTR44_FORM_DATA.deductions,
          viewPage: 'all',
          zoomLevel: 1,
        }),

      // Legacy compat functions
      addTransaction: (tx) => get().addPartyEntry(tx),
      updateTransaction: (id, tx) => get().updatePartyEntry(id, tx),
      deleteTransaction: (id) => get().deletePartyEntry(id),
      updateSettings: (newSettings) => get().updateFormFields(newSettings),
      resetSettings: () => get().resetToDefault(),
      resetToSampleData: () => get().resetToDefault(),
    }),
    {
      name: 'gtr44-management-storage-v2',
    }
  )
);
