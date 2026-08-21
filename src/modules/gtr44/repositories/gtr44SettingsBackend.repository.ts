import { supabase } from '@/core/supabase/client';
import { useAuthStore } from '@/core/auth/store';
import { getOfficeId, isAllOfficesMode, resolveOfficeIdForUser } from '@/shared/utilities/office';
import type { Json } from '@/shared/json.types';
import type { GTR44BudgetHead, GTR44ObjectExpenditureItem, GTR44EDPCode, GTR44DeductionTemplate, GTR44NumberingSettings, GTR44PrintSettings } from '../types';
import type { GTR44DefaultSettings } from '../store/gtr44SettingsStore';
import {
  DEFAULT_SETTINGS,
  DEFAULT_BUDGET_HEADS,
} from '../store/gtr44SettingsStore';
import {
  DEFAULT_GTR44_NUMBERING_SETTINGS,
  DEFAULT_GTR44_PRINT_SETTINGS,
  DEFAULT_EXPENDITURE_ITEMS,
  DEFAULT_EDP_CODES,
  DEFAULT_DEDUCTION_TEMPLATES,
  normalizeExpenditureItem,
  normalizeEDPCodeCatalogEntry,
  normalizeDeductionTemplate,
  normalizeNumberingSettings,
  normalizePrintSettings,
} from '../store/gtr44Defaults';

const SETTINGS_KEY = 'gtr44_defaults';

export interface Gtr44SettingsPayload {
  settings: GTR44DefaultSettings;
  budgetHeads: GTR44BudgetHead[];
  expenditureItems: GTR44ObjectExpenditureItem[];
  edpCodes: GTR44EDPCode[];
  deductionTemplates: GTR44DeductionTemplate[];
  numbering: GTR44NumberingSettings;
  printSettings: GTR44PrintSettings;
}

function normalizeBudgetHead(h: GTR44BudgetHead): GTR44BudgetHead {
  return {
    ...h,
    isActive: h.isActive ?? true,
    effectiveFrom: h.effectiveFrom ?? undefined,
    effectiveTo: h.effectiveTo ?? undefined,
    grantRef: h.grantRef ?? undefined,
    updatedAt: h.updatedAt ?? undefined,
    updatedBy: h.updatedBy ?? undefined,
  };
}

function mergePayload(partial: Partial<Gtr44SettingsPayload> | null | undefined): Gtr44SettingsPayload {
  const settings = { ...DEFAULT_SETTINGS, ...(partial?.settings ?? {}) } as GTR44DefaultSettings;
  const budgetHeads = Array.isArray(partial?.budgetHeads) && partial!.budgetHeads.length > 0
    ? (partial!.budgetHeads as GTR44BudgetHead[]).map(normalizeBudgetHead)
    : DEFAULT_BUDGET_HEADS.map(normalizeBudgetHead);
  const expenditureItems = Array.isArray(partial?.expenditureItems) && (partial!.expenditureItems as unknown[]).length > 0
    ? (partial!.expenditureItems as GTR44ObjectExpenditureItem[]).map((it, idx) => normalizeExpenditureItem(it as GTR44ObjectExpenditureItem, idx))
    : DEFAULT_EXPENDITURE_ITEMS.map((it, idx) => normalizeExpenditureItem(it, idx));
  const edpCodes = Array.isArray(partial?.edpCodes) && (partial!.edpCodes as unknown[]).length > 0
    ? (partial!.edpCodes as GTR44EDPCode[]).map((c) => normalizeEDPCodeCatalogEntry(c as GTR44EDPCode))
    : DEFAULT_EDP_CODES.map((c) => normalizeEDPCodeCatalogEntry(c));
  const deductionTemplates = Array.isArray(partial?.deductionTemplates) && (partial!.deductionTemplates as unknown[]).length > 0
    ? (partial!.deductionTemplates as GTR44DeductionTemplate[]).map((t) => normalizeDeductionTemplate(t as GTR44DeductionTemplate))
    : DEFAULT_DEDUCTION_TEMPLATES.map((t) => normalizeDeductionTemplate(t));
  const numbering = partial?.numbering ? normalizeNumberingSettings(partial.numbering) : { ...DEFAULT_GTR44_NUMBERING_SETTINGS };
  const printSettings = partial?.printSettings ? normalizePrintSettings(partial.printSettings) : { ...DEFAULT_GTR44_PRINT_SETTINGS, signaturePlaceholders: { ...DEFAULT_GTR44_PRINT_SETTINGS.signaturePlaceholders } };
  return {
    settings,
    budgetHeads,
    expenditureItems,
    edpCodes,
    deductionTemplates,
    numbering,
    printSettings,
  };
}

async function resolveOfficeId(): Promise<string | null> {
  if (isAllOfficesMode()) return null;
  const existing = getOfficeId();
  if (existing) return existing;
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return null;
  return resolveOfficeIdForUser(userId);
}

class Gtr44SettingsBackendRepository {
  async load(): Promise<Gtr44SettingsPayload | null> {
    const officeId = await resolveOfficeId();
    if (!officeId) return null;
    try {
      const { data, error } = await supabase
        .from('paybill_settings')
        .select('settings_value')
        .eq('office_id', officeId)
        .eq('settings_key', SETTINGS_KEY)
        .maybeSingle();
      if (error) {
        console.warn('[GTR44SettingsBackend] load failed:', error);
        return null;
      }
      if (!data?.settings_value || typeof data.settings_value !== 'object') return null;
      return mergePayload(data.settings_value as Partial<Gtr44SettingsPayload>);
    } catch (err) {
      console.warn('[GTR44SettingsBackend] load error:', err);
      return null;
    }
  }

  async save(payload: Gtr44SettingsPayload): Promise<boolean | null> {
    const officeId = await resolveOfficeId();
    if (!officeId) return null;
    try {
      const { error } = await supabase
        .from('paybill_settings')
        .upsert(
          {
            office_id: officeId,
            settings_key: SETTINGS_KEY,
            settings_value: payload as unknown as Json,
          },
          { onConflict: 'office_id,settings_key' }
        );
      if (error) {
        console.warn('[GTR44SettingsBackend] save failed:', error);
        return null;
      }
      return true;
    } catch (err) {
      console.warn('[GTR44SettingsBackend] save error:', err);
      return null;
    }
  }

  async clear(): Promise<void> {
    const officeId = await resolveOfficeId();
    if (!officeId) return;
    try {
      const { error } = await supabase
        .from('paybill_settings')
        .delete()
        .eq('office_id', officeId)
        .eq('settings_key', SETTINGS_KEY);
      if (error) {
        console.warn('[GTR44SettingsBackend] clear failed:', error);
      }
    } catch (err) {
      console.warn('[GTR44SettingsBackend] clear error:', err);
    }
  }
}

export const gtr44SettingsBackendRepository = new Gtr44SettingsBackendRepository();
