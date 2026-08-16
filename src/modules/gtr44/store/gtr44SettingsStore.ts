import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GTR44BudgetHead, GTR44FormData } from '../types';
import { DEFAULT_GTR44_FORM_DATA, EMPTY_GTR44_FORM_DATA, DEFAULT_EXPENDITURE_ITEMS } from './gtr44Defaults';

export type GTR44DefaultSettings = Pick<
  GTR44FormData,
  | 'officeName' | 'treasuryName' | 'district' | 'drawing' | 'ddoCardexCode'
  | 'classOfExpenditure' | 'fund' | 'demandNo' | 'typeOfBudget' | 'schemeNo'
  | 'detailedHead' | 'sector' | 'majorHead' | 'subMajorHead' | 'minorHead' | 'subHead'
  | 'payToDesignation' | 'budgetGrantYearFrom' | 'budgetGrantYearTo'
>;

export const DEFAULT_SETTINGS: GTR44DefaultSettings = {
  officeName: DEFAULT_GTR44_FORM_DATA.officeName,
  treasuryName: DEFAULT_GTR44_FORM_DATA.treasuryName,
  district: DEFAULT_GTR44_FORM_DATA.district,
  drawing: DEFAULT_GTR44_FORM_DATA.drawing,
  ddoCardexCode: DEFAULT_GTR44_FORM_DATA.ddoCardexCode,
  classOfExpenditure: DEFAULT_GTR44_FORM_DATA.classOfExpenditure,
  fund: DEFAULT_GTR44_FORM_DATA.fund,
  demandNo: DEFAULT_GTR44_FORM_DATA.demandNo,
  typeOfBudget: DEFAULT_GTR44_FORM_DATA.typeOfBudget,
  schemeNo: DEFAULT_GTR44_FORM_DATA.schemeNo,
  detailedHead: DEFAULT_GTR44_FORM_DATA.detailedHead,
  sector: DEFAULT_GTR44_FORM_DATA.sector,
  majorHead: DEFAULT_GTR44_FORM_DATA.majorHead,
  subMajorHead: DEFAULT_GTR44_FORM_DATA.subMajorHead,
  minorHead: DEFAULT_GTR44_FORM_DATA.minorHead,
  subHead: DEFAULT_GTR44_FORM_DATA.subHead,
  payToDesignation: DEFAULT_GTR44_FORM_DATA.payToDesignation,
  budgetGrantYearFrom: DEFAULT_GTR44_FORM_DATA.budgetGrantYearFrom,
  budgetGrantYearTo: DEFAULT_GTR44_FORM_DATA.budgetGrantYearTo,
};

export const DEFAULT_BUDGET_HEADS: GTR44BudgetHead[] = [
  {
    id: 'bh-1',
    name: 'ANH-06 Intensive Cattle Development Programme',
    headChargeableCode: '240300102050',
    sector: 'C-Economic Services',
    demandNo: '04',
    demandNoLabel: '004',
    majorHead: '2403 Animal Husbandry',
    subMajorHead: '00',
    minorHead: '102 Cattle and Buffalo Development',
    subHead: '05 ANH-06 Intensive Cattle Development Programme',
    detailedHead: '00',
  },
];

interface GTR44SettingsStoreState {
  settings: GTR44DefaultSettings;
  budgetHeads: GTR44BudgetHead[];
  saveSettings: (fields: Partial<GTR44DefaultSettings>) => void;
  addBudgetHead: (head: Omit<GTR44BudgetHead, 'id'>) => GTR44BudgetHead;
  updateBudgetHead: (id: string, fields: Partial<GTR44BudgetHead>) => void;
  deleteBudgetHead: (id: string) => void;
  resetSettings: () => void;
}

export const useGTR44SettingsStore = create<GTR44SettingsStoreState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      budgetHeads: DEFAULT_BUDGET_HEADS,
      saveSettings: (fields) => set((state) => ({ settings: { ...state.settings, ...fields } })),
      addBudgetHead: (head) => {
        const newHead: GTR44BudgetHead = { id: `bh-${Date.now()}`, ...head };
        set((state) => ({ budgetHeads: [...state.budgetHeads, newHead] }));
        return newHead;
      },
      updateBudgetHead: (id, fields) =>
        set((state) => ({
          budgetHeads: state.budgetHeads.map((h) => (h.id === id ? { ...h, ...fields } : h)),
        })),
      deleteBudgetHead: (id) =>
        set((state) => ({ budgetHeads: state.budgetHeads.filter((h) => h.id !== id) })),
      resetSettings: () => set({ settings: { ...DEFAULT_SETTINGS }, budgetHeads: DEFAULT_BUDGET_HEADS }),
    }),
    { name: 'gtr44-settings-v1' }
  )
);

export function buildNewBillFormData(): GTR44FormData {
  const { settings } = useGTR44SettingsStore.getState();
  return {
    ...EMPTY_GTR44_FORM_DATA,
    ...settings,
    expenditureItems: DEFAULT_EXPENDITURE_ITEMS.map((item) => ({ ...item })),
    partyEntries: [],
  };
}
