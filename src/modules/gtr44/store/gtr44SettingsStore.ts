import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GTR44BudgetHead, GTR44FormData, GTR44ObjectExpenditureItem, GTR44EDPCode, GTR44DeductionTemplate, GTR44NumberingSettings, GTR44PrintSettings } from '../types';
import {
  DEFAULT_GTR44_FORM_DATA,
  EMPTY_GTR44_FORM_DATA,
  DEFAULT_EXPENDITURE_ITEMS,
  DEFAULT_EDP_CODES,
  DEFAULT_DEDUCTION_TEMPLATES,
  DEFAULT_GTR44_NUMBERING_SETTINGS,
  DEFAULT_GTR44_PRINT_SETTINGS,
  normalizeExpenditureItem,
  normalizeExpenditureItems,
  getActiveExpenditureItems,
  normalizeEDPCodeCatalogEntry,
  normalizeDeductionTemplate,
  normalizeNumberingSettings,
  normalizePrintSettings,
} from './gtr44Defaults';

export type GTR44DefaultSettings = Pick<
  GTR44FormData,
  | 'officeName' | 'treasuryName' | 'district' | 'drawing' | 'ddoCardexCode'
  | 'classOfExpenditure' | 'fund' | 'demandNo' | 'typeOfBudget' | 'schemeNo'
  | 'detailedHead' | 'sector' | 'majorHead' | 'subMajorHead' | 'minorHead' | 'subHead'
  | 'payToDesignation' | 'budgetGrantYearFrom' | 'budgetGrantYearTo'
> & {
  // Office & Treasury Master — Phase 1 extension (all optional for backward compat)
  officeAddress?: string;
  drawingOfficerName?: string;
  drawingOfficerDesignation?: string;
  messengerName?: string;
  countersigningOffice?: string;
  auditorName?: string;
  superintendentName?: string;
  treasuryPayMode?: 'TC' | 'Cheque' | string;
  defaultMonthOf?: string;
};

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
  // Office & Treasury Defaults — Phase 1
  officeAddress: DEFAULT_GTR44_FORM_DATA.officeAddress ?? '',
  drawingOfficerName: DEFAULT_GTR44_FORM_DATA.drawingOfficerName ?? '',
  drawingOfficerDesignation: DEFAULT_GTR44_FORM_DATA.drawingOfficerDesignation ?? '',
  messengerName: DEFAULT_GTR44_FORM_DATA.messengerName ?? '',
  countersigningOffice: DEFAULT_GTR44_FORM_DATA.countersigningOffice ?? '',
  auditorName: DEFAULT_GTR44_FORM_DATA.auditorName ?? '',
  superintendentName: DEFAULT_GTR44_FORM_DATA.superintendentName ?? '',
  treasuryPayMode: (DEFAULT_GTR44_FORM_DATA.treasuryPayMode as 'TC' | 'Cheque') ?? 'Cheque',
  defaultMonthOf: DEFAULT_GTR44_FORM_DATA.defaultMonthOf ?? DEFAULT_GTR44_FORM_DATA.monthOf ?? '',
};

export const DEFAULT_BUDGET_HEADS: GTR44BudgetHead[] = [
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

function normalizeBudgetHead(head: GTR44BudgetHead): GTR44BudgetHead {
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

// Expenditure defaults — normalized with isActive true and sortOrder
export const DEFAULT_EXPENDITURE_STORE_ITEMS: GTR44ObjectExpenditureItem[] =
  DEFAULT_EXPENDITURE_ITEMS.map((item, idx) => normalizeExpenditureItem(item, idx));

export const DEFAULT_EDP_STORE_CODES: GTR44EDPCode[] =
  DEFAULT_EDP_CODES.map((c) => normalizeEDPCodeCatalogEntry(c));

export const DEFAULT_DEDUCTION_STORE_TEMPLATES: GTR44DeductionTemplate[] =
  DEFAULT_DEDUCTION_TEMPLATES.map((t) => normalizeDeductionTemplate(t));

function normalizeEDPList(codes: GTR44EDPCode[] | undefined): GTR44EDPCode[] {
  if (!codes || !Array.isArray(codes) || codes.length === 0) return DEFAULT_EDP_STORE_CODES.map((c) => ({ ...c }));
  return codes.map((c) => normalizeEDPCodeCatalogEntry(c as GTR44EDPCode));
}

function normalizeDeductionList(templates: GTR44DeductionTemplate[] | undefined): GTR44DeductionTemplate[] {
  if (!templates || !Array.isArray(templates) || templates.length === 0) return DEFAULT_DEDUCTION_STORE_TEMPLATES.map((t) => ({ ...t }));
  return templates.map((t) => normalizeDeductionTemplate(t as GTR44DeductionTemplate));
}

interface GTR44SettingsStoreState {
  settings: GTR44DefaultSettings;
  budgetHeads: GTR44BudgetHead[];
  expenditureItems: GTR44ObjectExpenditureItem[];
  edpCodes: GTR44EDPCode[];
  deductionTemplates: GTR44DeductionTemplate[];
  numbering: GTR44NumberingSettings;
  printSettings: GTR44PrintSettings;
  saveSettings: (fields: Partial<GTR44DefaultSettings>) => void;
  addBudgetHead: (head: Omit<GTR44BudgetHead, 'id'>) => GTR44BudgetHead;
  updateBudgetHead: (id: string, fields: Partial<GTR44BudgetHead>) => void;
  deleteBudgetHead: (id: string) => void;
  resetSettings: () => void;
  upsertBudgetHead: (head: Omit<GTR44BudgetHead, 'id'>) => GTR44BudgetHead;
  bulkUpsertBudgetHeads: (heads: Omit<GTR44BudgetHead, 'id'>[]) => { added: number; updated: number };
  // Expenditure master CRUD (GTR-44 S3)
  addExpenditureItem: (item: Omit<GTR44ObjectExpenditureItem, 'sortOrder'>) => GTR44ObjectExpenditureItem;
  updateExpenditureItem: (index: number, fields: Partial<GTR44ObjectExpenditureItem>) => void;
  deleteExpenditureItem: (index: number) => void;
  reorderExpenditureItems: (fromIndex: number, toIndex: number) => void;
  resetExpenditureItems: () => void;
  setExpenditureItems: (items: GTR44ObjectExpenditureItem[]) => void;
  upsertExpenditureItem: (item: Omit<GTR44ObjectExpenditureItem, 'sortOrder'>) => GTR44ObjectExpenditureItem;
  bulkUpsertExpenditureItems: (items: Omit<GTR44ObjectExpenditureItem, 'sortOrder'>[]) => { added: number; updated: number };
  // EDP Catalog CRUD (GTR-44 S4)
  edpCodesVersion?: number;
  addEdpCode: (code: GTR44EDPCode) => GTR44EDPCode;
  updateEdpCode: (code: string, fields: Partial<GTR44EDPCode>) => void;
  deleteEdpCode: (code: string) => void;
  resetEdpCodes: () => void;
  setEdpCodes: (codes: GTR44EDPCode[]) => void;
  bulkUpsertEdpCodes: (codes: GTR44EDPCode[]) => { added: number; updated: number };
  // Deduction Templates CRUD (GTR-44 S4)
  addDeductionTemplate: (tpl: GTR44DeductionTemplate) => GTR44DeductionTemplate;
  updateDeductionTemplate: (code: string, fields: Partial<GTR44DeductionTemplate>) => void;
  deleteDeductionTemplate: (code: string) => void;
  resetDeductionTemplates: () => void;
  setDeductionTemplates: (templates: GTR44DeductionTemplate[]) => void;
  bulkUpsertDeductionTemplates: (templates: GTR44DeductionTemplate[]) => { added: number; updated: number };
  // Numbering & Series S5
  updateNumbering: (fields: Partial<GTR44NumberingSettings>) => void;
  setNumbering: (numbering: GTR44NumberingSettings) => void;
  resetNumbering: () => void;
  incrementBillSeq: () => number;
  incrementVoucherSeq: () => number;
  // Print & Certificates S6
  updatePrintSettings: (fields: Partial<GTR44PrintSettings>) => void;
  setPrintSettings: (settings: GTR44PrintSettings) => void;
  resetPrintSettings: () => void;
}

export const useGTR44SettingsStore = create<GTR44SettingsStoreState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      budgetHeads: DEFAULT_BUDGET_HEADS,
      expenditureItems: DEFAULT_EXPENDITURE_STORE_ITEMS.map((i) => ({ ...i })),
      edpCodes: DEFAULT_EDP_STORE_CODES.map((c) => ({ ...c })),
      deductionTemplates: DEFAULT_DEDUCTION_STORE_TEMPLATES.map((t) => ({ ...t })),
      numbering: { ...DEFAULT_GTR44_NUMBERING_SETTINGS },
      printSettings: { ...DEFAULT_GTR44_PRINT_SETTINGS, signaturePlaceholders: { ...DEFAULT_GTR44_PRINT_SETTINGS.signaturePlaceholders } },
      saveSettings: (fields) => set((state) => ({ settings: { ...state.settings, ...fields } })),
      addBudgetHead: (head) => {
        const now = new Date().toISOString().split('T')[0];
        const newHead: GTR44BudgetHead = {
          id: `bh-${Date.now()}`,
          ...head,
          isActive: head.isActive ?? true,
          updatedAt: new Date().toISOString(),
          updatedBy: (head as GTR44BudgetHead).updatedBy ?? undefined,
        };
        // Ensure updatedAt is ISO string; fallback to date part if needed
        if (!newHead.updatedAt) newHead.updatedAt = now;
        set((state) => ({ budgetHeads: [...state.budgetHeads, newHead] }));
        return newHead;
      },
      updateBudgetHead: (id, fields) =>
        set((state) => ({
          budgetHeads: state.budgetHeads.map((h) =>
            h.id === id ? { ...h, ...fields, updatedAt: new Date().toISOString() } : h
          ),
        })),
      deleteBudgetHead: (id) =>
        set((state) => ({ budgetHeads: state.budgetHeads.filter((h) => h.id !== id) })),
      resetSettings: () =>
        set({
          settings: { ...DEFAULT_SETTINGS },
          budgetHeads: DEFAULT_BUDGET_HEADS.map(normalizeBudgetHead),
          expenditureItems: DEFAULT_EXPENDITURE_STORE_ITEMS.map((i) => ({ ...i, amount: null })),
          edpCodes: DEFAULT_EDP_STORE_CODES.map((c) => ({ ...c })),
          deductionTemplates: DEFAULT_DEDUCTION_STORE_TEMPLATES.map((t) => ({ ...t })),
          numbering: { ...DEFAULT_GTR44_NUMBERING_SETTINGS },
          printSettings: { ...DEFAULT_GTR44_PRINT_SETTINGS, signaturePlaceholders: { ...DEFAULT_GTR44_PRINT_SETTINGS.signaturePlaceholders } },
        }),
      upsertBudgetHead: (head) => {
        const existing = get().budgetHeads.find((h) => h.headChargeableCode === head.headChargeableCode);
        if (existing) {
          get().updateBudgetHead(existing.id, { ...head, updatedAt: new Date().toISOString() });
          return { ...existing, ...head } as GTR44BudgetHead;
        }
        return get().addBudgetHead(head);
      },
      bulkUpsertBudgetHeads: (heads) => {
        let added = 0;
        let updated = 0;
        heads.forEach((head) => {
          const existing = get().budgetHeads.find((h) => h.headChargeableCode === head.headChargeableCode);
          if (existing) {
            get().updateBudgetHead(existing.id, { ...head, updatedAt: new Date().toISOString() });
            updated += 1;
          } else {
            get().addBudgetHead(head);
            added += 1;
          }
        });
        return { added, updated };
      },
      // Expenditure CRUD
      addExpenditureItem: (item) => {
        const normalizedCode = String(item.code).trim();
        const normalizedEdp = String(item.edpCode).trim();
        const newItem: GTR44ObjectExpenditureItem = {
          code: normalizedCode,
          name: String(item.name).trim(),
          nameGu: item.nameGu ?? '',
          edpCode: normalizedEdp,
          amount: null,
          isActive: item.isActive ?? true,
          sortOrder: get().expenditureItems.length,
        };
        set((state) => ({ expenditureItems: [...state.expenditureItems, newItem] }));
        return newItem;
      },
      updateExpenditureItem: (index, fields) =>
        set((state) => {
          const next = [...state.expenditureItems];
          if (index < 0 || index >= next.length) return state;
          const existing = next[index];
          next[index] = {
            ...existing,
            ...fields,
            // keep normalized trimming for key fields if provided
            code: fields.code !== undefined ? String(fields.code).trim() : existing.code,
            name: fields.name !== undefined ? String(fields.name).trim() : existing.name,
            nameGu: fields.nameGu !== undefined ? String(fields.nameGu) : existing.nameGu,
            edpCode: fields.edpCode !== undefined ? String(fields.edpCode).trim() : existing.edpCode,
            // preserve amount as null for template (amount is per-bill, not stored default)
            amount: null,
          };
          // Re-normalize sortOrder if not explicitly set
          if (fields.sortOrder === undefined) {
            next[index].sortOrder = existing.sortOrder ?? index;
          }
          return { expenditureItems: next };
        }),
      deleteExpenditureItem: (index) =>
        set((state) => {
          if (index < 0 || index >= state.expenditureItems.length) return state;
          const next = state.expenditureItems.filter((_, i) => i !== index);
          // Reassign sortOrder sequentially
          const reindexed = next.map((item, idx) => ({ ...item, sortOrder: idx }));
          return { expenditureItems: reindexed };
        }),
      reorderExpenditureItems: (fromIndex, toIndex) =>
        set((state) => {
          const next = [...state.expenditureItems];
          if (fromIndex < 0 || fromIndex >= next.length) return state;
          if (toIndex < 0 || toIndex >= next.length) return state;
          const [moved] = next.splice(fromIndex, 1);
          next.splice(toIndex, 0, moved);
          const reordered = next.map((item, idx) => ({ ...item, sortOrder: idx }));
          return { expenditureItems: reordered };
        }),
      resetExpenditureItems: () =>
        set({ expenditureItems: DEFAULT_EXPENDITURE_STORE_ITEMS.map((i) => ({ ...i, amount: null })) }),
      setExpenditureItems: (items) =>
        set({ expenditureItems: normalizeExpenditureItems(items).map((it, idx) => ({ ...it, sortOrder: it.sortOrder ?? idx, amount: null })) }),
      upsertExpenditureItem: (item) => {
        const normalizedEdp = String(item.edpCode).replace(/\s+/g, '').toUpperCase();
        const existingIdx = get().expenditureItems.findIndex(
          (it) => it.edpCode.replace(/\s+/g, '').toUpperCase() === normalizedEdp
        );
        if (existingIdx >= 0) {
          get().updateExpenditureItem(existingIdx, { ...item, sortOrder: get().expenditureItems[existingIdx].sortOrder });
          return get().expenditureItems[existingIdx];
        }
        return get().addExpenditureItem(item);
      },
      bulkUpsertExpenditureItems: (items) => {
        let added = 0;
        let updated = 0;
        items.forEach((item) => {
          const normalizedEdp = String(item.edpCode).replace(/\s+/g, '').toUpperCase();
          const existingIdx = get().expenditureItems.findIndex(
            (it) => it.edpCode.replace(/\s+/g, '').toUpperCase() === normalizedEdp
          );
          if (existingIdx >= 0) {
            get().updateExpenditureItem(existingIdx, item);
            updated += 1;
          } else {
            get().addExpenditureItem(item);
            added += 1;
          }
        });
        return { added, updated };
      },
      // EDP Catalog CRUD
      addEdpCode: (code) => {
        const normalized = normalizeEDPCodeCatalogEntry(code);
        const exists = get().edpCodes.find((c) => c.code.replace(/\s+/g, '').toUpperCase() === normalized.code.replace(/\s+/g, '').toUpperCase());
        if (exists) {
          get().updateEdpCode(exists.code, normalized);
          return normalized;
        }
        set((state) => ({ edpCodes: [...state.edpCodes, normalized] }));
        return normalized;
      },
      updateEdpCode: (code, fields) =>
        set((state) => ({
          edpCodes: state.edpCodes.map((c) =>
            c.code.replace(/\s+/g, '').toUpperCase() === String(code).replace(/\s+/g, '').toUpperCase()
              ? normalizeEDPCodeCatalogEntry({ ...c, ...fields, code: fields.code !== undefined ? String(fields.code) : c.code })
              : c
          ),
        })),
      deleteEdpCode: (code) =>
        set((state) => ({
          edpCodes: state.edpCodes.filter((c) => c.code.replace(/\s+/g, '').toUpperCase() !== String(code).replace(/\s+/g, '').toUpperCase()),
        })),
      resetEdpCodes: () => set({ edpCodes: DEFAULT_EDP_STORE_CODES.map((c) => ({ ...c })) }),
      setEdpCodes: (codes) => set({ edpCodes: normalizeEDPList(codes) }),
      bulkUpsertEdpCodes: (codes) => {
        let added = 0;
        let updated = 0;
        codes.forEach((code) => {
          const normalized = normalizeEDPCodeCatalogEntry(code);
          const normalizedKey = normalized.code.replace(/\s+/g, '').toUpperCase();
          const existingIdx = get().edpCodes.findIndex((c) => c.code.replace(/\s+/g, '').toUpperCase() === normalizedKey);
          if (existingIdx >= 0) {
            get().updateEdpCode(get().edpCodes[existingIdx].code, normalized);
            updated += 1;
          } else {
            get().addEdpCode(normalized);
            added += 1;
          }
        });
        return { added, updated };
      },
      // Deduction Templates CRUD
      addDeductionTemplate: (tpl) => {
        const normalized = normalizeDeductionTemplate(tpl);
        set((state) => ({ deductionTemplates: [...state.deductionTemplates, normalized] }));
        return normalized;
      },
      updateDeductionTemplate: (code, fields) =>
        set((state) => ({
          deductionTemplates: state.deductionTemplates.map((t) =>
            t.code.toUpperCase() === String(code).toUpperCase()
              ? normalizeDeductionTemplate({ ...t, ...fields, code: fields.code !== undefined ? String(fields.code) : t.code })
              : t
          ),
        })),
      deleteDeductionTemplate: (code) =>
        set((state) => ({
          deductionTemplates: state.deductionTemplates.filter((t) => t.code.toUpperCase() !== String(code).toUpperCase()),
        })),
      resetDeductionTemplates: () => set({ deductionTemplates: DEFAULT_DEDUCTION_STORE_TEMPLATES.map((t) => ({ ...t })) }),
      setDeductionTemplates: (templates) => set({ deductionTemplates: normalizeDeductionList(templates) }),
      bulkUpsertDeductionTemplates: (templates) => {
        let added = 0;
        let updated = 0;
        templates.forEach((tpl) => {
          const normalized = normalizeDeductionTemplate(tpl);
          const key = normalized.code.toUpperCase();
          const existingIdx = get().deductionTemplates.findIndex((t) => t.code.toUpperCase() === key);
          if (existingIdx >= 0) {
            get().updateDeductionTemplate(get().deductionTemplates[existingIdx].code, normalized);
            updated += 1;
          } else {
            get().addDeductionTemplate(normalized);
            added += 1;
          }
        });
        return { added, updated };
      },
      // Numbering S5
      updateNumbering: (fields) =>
        set((state) => ({ numbering: normalizeNumberingSettings({ ...state.numbering, ...fields }) })),
      setNumbering: (numbering) => set({ numbering: normalizeNumberingSettings(numbering) }),
      resetNumbering: () => set({ numbering: { ...DEFAULT_GTR44_NUMBERING_SETTINGS } }),
      incrementBillSeq: () => {
        const cur = get().numbering.nextBillSeq;
        set((state) => ({ numbering: { ...state.numbering, nextBillSeq: state.numbering.nextBillSeq + 1 } }));
        return cur;
      },
      incrementVoucherSeq: () => {
        const cur = get().numbering.nextVoucherSeq;
        set((state) => ({ numbering: { ...state.numbering, nextVoucherSeq: state.numbering.nextVoucherSeq + 1 } }));
        return cur;
      },
      // Print S6
      updatePrintSettings: (fields) =>
        set((state) => ({
          printSettings: normalizePrintSettings({
            ...state.printSettings,
            ...fields,
            signaturePlaceholders: fields.signaturePlaceholders
              ? { ...state.printSettings.signaturePlaceholders, ...fields.signaturePlaceholders }
              : state.printSettings.signaturePlaceholders,
          }),
        })),
      setPrintSettings: (settings) => set({ printSettings: normalizePrintSettings(settings) }),
      resetPrintSettings: () =>
        set({ printSettings: { ...DEFAULT_GTR44_PRINT_SETTINGS, signaturePlaceholders: { ...DEFAULT_GTR44_PRINT_SETTINGS.signaturePlaceholders } } }),
    }),
    {
      name: 'gtr44-settings-v1',
      version: 5,
      migrate: (persistedState: unknown, _version: number) => {
        const state = persistedState as Partial<GTR44SettingsStoreState> | undefined;
        if (!state) return persistedState as never;
        // Migration for v0 -> v1: fill missing Phase 1 Office & Treasury fields with defaults
        // v1 -> v2: normalize budgetHeads with new optional fields (isActive, effectiveFrom, etc.)
        // v2 -> v3: add expenditureItems with isActive/nameGu/sortOrder support
        // v3 -> v4: add edpCodes and deductionTemplates (EDP & Deduction Master S4)
        // v4 -> v5: add numbering & printSettings (S5/S6)
        const migratedSettings: GTR44DefaultSettings = {
          ...DEFAULT_SETTINGS,
          ...(state.settings as GTR44DefaultSettings),
        };
        // Ensure new optional fields have fallback defaults if still undefined
        if (migratedSettings.officeAddress === undefined) migratedSettings.officeAddress = DEFAULT_SETTINGS.officeAddress;
        if (migratedSettings.drawingOfficerName === undefined) migratedSettings.drawingOfficerName = DEFAULT_SETTINGS.drawingOfficerName;
        if (migratedSettings.drawingOfficerDesignation === undefined) migratedSettings.drawingOfficerDesignation = DEFAULT_SETTINGS.drawingOfficerDesignation;
        if (migratedSettings.messengerName === undefined) migratedSettings.messengerName = DEFAULT_SETTINGS.messengerName;
        if (migratedSettings.countersigningOffice === undefined) migratedSettings.countersigningOffice = DEFAULT_SETTINGS.countersigningOffice;
        if (migratedSettings.auditorName === undefined) migratedSettings.auditorName = DEFAULT_SETTINGS.auditorName;
        if (migratedSettings.superintendentName === undefined) migratedSettings.superintendentName = DEFAULT_SETTINGS.superintendentName;
        if (migratedSettings.treasuryPayMode === undefined) migratedSettings.treasuryPayMode = DEFAULT_SETTINGS.treasuryPayMode;
        if (migratedSettings.defaultMonthOf === undefined) migratedSettings.defaultMonthOf = DEFAULT_SETTINGS.defaultMonthOf;
        const migratedBudgetHeads = (state.budgetHeads ?? DEFAULT_BUDGET_HEADS).map((h) => normalizeBudgetHead(h as GTR44BudgetHead));
        // Expenditure migration
        let migratedExpenditure: GTR44ObjectExpenditureItem[];
        if (!state.expenditureItems || !Array.isArray(state.expenditureItems) || state.expenditureItems.length === 0) {
          migratedExpenditure = DEFAULT_EXPENDITURE_STORE_ITEMS.map((i) => ({ ...i }));
        } else {
          migratedExpenditure = normalizeExpenditureItems(state.expenditureItems as GTR44ObjectExpenditureItem[]);
          // Ensure sortOrder sequential after normalization
          migratedExpenditure = migratedExpenditure
            .map((item, idx) => ({ ...item, sortOrder: item.sortOrder ?? idx }))
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((item, idx) => ({ ...item, sortOrder: idx }));
        }
        // EDP & Deduction migration v4
        const migratedEdpCodes = normalizeEDPList(state.edpCodes as GTR44EDPCode[] | undefined);
        const migratedDeductionTemplates = normalizeDeductionList(state.deductionTemplates as GTR44DeductionTemplate[] | undefined);
        const migratedNumbering = normalizeNumberingSettings(state.numbering as GTR44NumberingSettings | undefined);
        const migratedPrint = normalizePrintSettings(state.printSettings as GTR44PrintSettings | undefined);
        return {
          ...state,
          settings: migratedSettings,
          budgetHeads: migratedBudgetHeads,
          expenditureItems: migratedExpenditure,
          edpCodes: migratedEdpCodes,
          deductionTemplates: migratedDeductionTemplates,
          numbering: migratedNumbering,
          printSettings: migratedPrint,
        } as GTR44SettingsStoreState;
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<GTR44SettingsStoreState> | undefined;
        if (!persisted) return currentState;
        // Deep-merge settings to ensure new defaults are not lost on old persisted data
        // Normalize budgetHeads for backward compat: old persisted heads may lack new optional fields
        const normalizedHeads = ((persisted.budgetHeads as GTR44BudgetHead[]) ?? currentState.budgetHeads).map((h) =>
          normalizeBudgetHead(h)
        );
        // Normalize expenditureItems for backward compat
        const persistedExpenditure = persisted.expenditureItems as GTR44ObjectExpenditureItem[] | undefined;
        let normalizedExpenditure: GTR44ObjectExpenditureItem[];
        if (!persistedExpenditure || persistedExpenditure.length === 0) {
          normalizedExpenditure = currentState.expenditureItems;
        } else {
          normalizedExpenditure = normalizeExpenditureItems(persistedExpenditure);
        }
        // Normalize EDP & Deduction for backward compat (v4)
        const persistedEdp = persisted.edpCodes as GTR44EDPCode[] | undefined;
        const normalizedEdp = persistedEdp && persistedEdp.length > 0 ? normalizeEDPList(persistedEdp) : currentState.edpCodes;
        const persistedDed = persisted.deductionTemplates as GTR44DeductionTemplate[] | undefined;
        const normalizedDed = persistedDed && persistedDed.length > 0 ? normalizeDeductionList(persistedDed) : currentState.deductionTemplates;
        const persistedNumbering = persisted.numbering as GTR44NumberingSettings | undefined;
        const normalizedNumbering = persistedNumbering ? normalizeNumberingSettings(persistedNumbering) : currentState.numbering;
        const persistedPrint = persisted.printSettings as GTR44PrintSettings | undefined;
        const normalizedPrint = persistedPrint ? normalizePrintSettings(persistedPrint) : currentState.printSettings;
        return {
          ...currentState,
          ...persisted,
          settings: { ...DEFAULT_SETTINGS, ...(persisted.settings as object) } as GTR44DefaultSettings,
          budgetHeads: normalizedHeads,
          expenditureItems: normalizedExpenditure,
          edpCodes: normalizedEdp,
          deductionTemplates: normalizedDed,
          numbering: normalizedNumbering,
          printSettings: normalizedPrint,
        };
      },
    }
  )
);

// Hydrate from backend on load if local empty (like GTR30) — best-effort, no await at module top
if (typeof window !== 'undefined') {
  void (async () => {
    try {
      const raw = localStorage.getItem('gtr44-settings-v1');
      if (raw) return;
      const { gtr44SettingsBackendRepository } = await import('../repositories/gtr44SettingsBackend.repository');
      const remote = await gtr44SettingsBackendRepository.load();
      if (!remote) return;
      useGTR44SettingsStore.setState({
        settings: remote.settings,
        budgetHeads: remote.budgetHeads,
        expenditureItems: remote.expenditureItems,
        edpCodes: remote.edpCodes,
        deductionTemplates: remote.deductionTemplates,
        numbering: remote.numbering,
        printSettings: remote.printSettings,
      });
    } catch {
      // ignore - backend unavailable or not yet configured (tests / local dev without supabase)
    }
  })();
}

export function buildNewBillFormData(): GTR44FormData {
  const { settings, expenditureItems } = useGTR44SettingsStore.getState();
  // Merge settings into form data, mapping Office & Treasury Master aliases to actual form fields
  const mapped: Partial<GTR44FormData> = { ...settings };
  // Alias mappings for fields whose settings name differs from formData canonical name
  if (settings.drawingOfficerName) {
    (mapped as Record<string, unknown>).drawingOfficerSignatureName = settings.drawingOfficerName;
  }
  if (settings.drawingOfficerDesignation) {
    // Keep designation as custom extension; also available via drawingOfficerDesignation on formData
    (mapped as Record<string, unknown>).drawingOfficerDesignation = settings.drawingOfficerDesignation;
  }
  if (settings.messengerName) {
    (mapped as Record<string, unknown>).messengerSignatureName = settings.messengerName;
  }
  if (settings.auditorName) {
    (mapped as Record<string, unknown>).agAuditorName = settings.auditorName;
  }
  if (settings.superintendentName) {
    (mapped as Record<string, unknown>).agSuperintendentName = settings.superintendentName;
  }
  if (settings.defaultMonthOf) {
    (mapped as Record<string, unknown>).monthOf = settings.defaultMonthOf;
  }
  // Build expenditure items from store: only active rows, sorted by sortOrder, cloned with amount null for new bill
  const storeItems = expenditureItems ?? DEFAULT_EXPENDITURE_STORE_ITEMS;
  const activeSorted = getActiveExpenditureItems(storeItems).map((item) => ({ ...item, amount: null as number | null }));
  // Fallback to defaults if for some reason store has no active items (keep at least 1 active guard ensures this rarely happens)
  const finalExpenditureItems =
    activeSorted.length > 0
      ? activeSorted
      : DEFAULT_EXPENDITURE_STORE_ITEMS.filter((i) => i.isActive !== false).map((i) => ({ ...i, amount: null as number | null }));

  // treasuryPayMode and officeAddress map directly (already spread), keep as-is
  return {
    ...EMPTY_GTR44_FORM_DATA,
    ...mapped,
    // Ensure explicit alias fields are also present on the returned form data
    officeAddress: settings.officeAddress ?? EMPTY_GTR44_FORM_DATA.officeAddress,
    drawingOfficerName: settings.drawingOfficerName ?? EMPTY_GTR44_FORM_DATA.drawingOfficerName,
    drawingOfficerDesignation: settings.drawingOfficerDesignation ?? EMPTY_GTR44_FORM_DATA.drawingOfficerDesignation,
    messengerName: settings.messengerName ?? EMPTY_GTR44_FORM_DATA.messengerName,
    treasuryPayMode: settings.treasuryPayMode ?? EMPTY_GTR44_FORM_DATA.treasuryPayMode,
    defaultMonthOf: settings.defaultMonthOf ?? EMPTY_GTR44_FORM_DATA.defaultMonthOf,
    auditorName: settings.auditorName ?? EMPTY_GTR44_FORM_DATA.auditorName,
    superintendentName: settings.superintendentName ?? EMPTY_GTR44_FORM_DATA.superintendentName,
    // Mapped canonical fields
    drawingOfficerSignatureName: (mapped as GTR44FormData).drawingOfficerSignatureName || EMPTY_GTR44_FORM_DATA.drawingOfficerSignatureName,
    messengerSignatureName: (mapped as GTR44FormData).messengerSignatureName || EMPTY_GTR44_FORM_DATA.messengerSignatureName,
    agAuditorName: (mapped as GTR44FormData).agAuditorName || EMPTY_GTR44_FORM_DATA.agAuditorName,
    agSuperintendentName: (mapped as GTR44FormData).agSuperintendentName || EMPTY_GTR44_FORM_DATA.agSuperintendentName,
    monthOf: (mapped as GTR44FormData).monthOf || EMPTY_GTR44_FORM_DATA.monthOf,
    countersigningOffice: settings.countersigningOffice ?? EMPTY_GTR44_FORM_DATA.countersigningOffice,
    expenditureItems: finalExpenditureItems,
    partyEntries: [],
  };
}
