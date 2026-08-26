import { GTR44FormData, GTR44Entry } from '../types';
import { getGrossAmount, getNetDifference, getTotalDeductions, normalizeEDPCode } from './gtr44Calc.service';
import { EDP_CODE_SUGGESTIONS } from '../store/gtr44Defaults';
import { useGTR44SettingsStore } from '../store/gtr44SettingsStore';

export type GTR44WizardStepId = 'vouchers' | 'budgetHead' | 'deductions' | 'preview';

export interface GTR44ValidationResult {
  success: boolean;
  error?: string;
}

export function validatePartyEntry(entry: Omit<GTR44Entry, 'id' | 'srNo'>): GTR44ValidationResult {
  if (!entry.partyName || !entry.partyName.trim()) {
    return { success: false, error: 'Party Name cannot be empty.' };
  }
  if (!entry.billNo || !entry.billNo.trim()) {
    return { success: false, error: 'Bill No cannot be empty.' };
  }
  if (!entry.amount || entry.amount <= 0) {
    return { success: false, error: 'Amount must be greater than 0.' };
  }
  if (!entry.edpCode || !entry.edpCode.trim()) {
    return { success: false, error: 'EDP Code is required to place the amount on Page 1.' };
  }
  return { success: true };
}

export function validateStep(
  formData: GTR44FormData,
  stepId: GTR44WizardStepId
): Record<string, string> {
  const errors: Record<string, string> = {};

  switch (stepId) {
    case 'vouchers': {
      if (formData.partyEntries.length === 0) {
        errors['partyEntries'] = 'At least one voucher entry is required';
      }
      formData.partyEntries.forEach((entry, idx) => {
        if (!entry.edpCode || !entry.edpCode.trim()) {
          errors[`partyEntries.${idx}.edpCode`] = 'EDP Code is required for every voucher';
        } else {
          const normalized = normalizeEDPCode(entry.edpCode);
          // Format check: allow 3-4 digits + optional +/- (legacy 040 without operator, or 0201+)
          if (!/^\d{3,4}[+-]?$/.test(normalized)) {
            errors[`partyEntries.${idx}.edpCode`] = `Invalid EDP Code format "${entry.edpCode}" — expected e.g. "0201+" or "0 2 0 1 +"`;
          } else {
            // Check against default suggestions + active expenditure items + EDP catalog + deduction templates from store (S4)
            let dynamicEdps: string[] = [];
            let catalogEdps: string[] = [];
            let dedEdps: string[] = [];
            try {
              const state = useGTR44SettingsStore.getState();
              const storeItems = state?.expenditureItems;
              if (storeItems && Array.isArray(storeItems)) {
                dynamicEdps = storeItems
                  .filter((it) => it.isActive !== false)
                  .map((it) => normalizeEDPCode(it.edpCode));
              }
              const storeEdps = state?.edpCodes;
              if (storeEdps && Array.isArray(storeEdps)) {
                catalogEdps = storeEdps.filter((c) => c.isActive !== false).map((c) => normalizeEDPCode(c.code));
              }
              const storeDeds = state?.deductionTemplates;
              if (storeDeds && Array.isArray(storeDeds)) {
                dedEdps = storeDeds.filter((t) => !t.isGst).map((t) => normalizeEDPCode(`${t.code}-`));
              }
            } catch {
              dynamicEdps = [];
              catalogEdps = [];
              dedEdps = [];
            }
            const combined = [
              ...EDP_CODE_SUGGESTIONS.map((s) => normalizeEDPCode(s)),
              ...dynamicEdps,
              ...catalogEdps,
              ...dedEdps,
            ];
            const exists = combined.includes(normalized);
            if (!exists) {
              errors[`partyEntries.${idx}.edpCode`] = `Invalid EDP Code "${entry.edpCode}" — not in approved list`;
            }
          }
        }
        if (entry.amount !== undefined && entry.amount < 0) {
          errors[`partyEntries.${idx}.amount`] = 'Voucher amount cannot be negative';
        }
      });

      // Global net >=0 check (also in deductions step) — surface early if deductions already make net negative
      {
        const gross = getGrossAmount(formData);
        const net = getNetDifference(gross, getTotalDeductions(formData.deductions));
        if (net < 0) errors['netAmount'] = 'Net amount cannot be negative — check deductions';
        if (formData.budgetGrant !== null && formData.budgetGrant !== undefined && gross > formData.budgetGrant) {
          errors['budgetGrant'] = `Gross amount (${gross}) exceeds budget grant (${formData.budgetGrant})`;
        }
      }
      break;
    }

    case 'budgetHead': {
      if (!formData.budgetHeadId && !formData.headChargeableCode) {
        errors['budgetHeadId'] = 'Select a Budget Head';
      }
      // Validate headChargeable 13-digit format if provided (allow 12-digit legacy codes for backward compat)
      if (formData.headChargeableCode) {
        const code = String(formData.headChargeableCode).trim();
        if (code && !/^\d{12,13}$/.test(code)) {
          errors['headChargeableCode'] = 'Head Chargeable must be 12-13 digits';
        }
      }
      // Validate detailedHead 2-digit format
      if (formData.detailedHead && !/^\d{2}$/.test(String(formData.detailedHead).trim())) {
        errors['detailedHead'] = 'Detailed Head must be exactly 2 digits';
      }
      // Validate district 2-digit format
      if (formData.district && !/^\d{2}$/.test(String(formData.district).trim())) {
        errors['district'] = 'District must be exactly 2 digits';
      }
      break;
    }

    case 'deductions': {
      const gross = getGrossAmount(formData);
      const totalDed = getTotalDeductions(formData.deductions);
      const net = getNetDifference(gross, totalDed);
      if (net < 0) errors['netAmount'] = 'Net amount cannot be negative — check deductions';
      // Gross <= grant warning (treated as error for validation purposes)
      if (formData.budgetGrant !== null && formData.budgetGrant !== undefined && gross > formData.budgetGrant) {
        errors['budgetGrant'] = `Gross amount (${gross}) exceeds budget grant (${formData.budgetGrant})`;
      }
      // Also validate each deduction's EDP existence? Deductions are global, but ensure net logic
      if (totalDed > gross) {
        errors['totalDeduction'] = 'Total deductions exceed gross amount';
      }
      break;
    }

    default:
      break;
  }

  return errors;
}

export function validateBill(formData: GTR44FormData): Record<string, string> {
  const steps: GTR44WizardStepId[] = ['vouchers', 'budgetHead', 'deductions'];
  const errors: Record<string, string> = {};
  for (const step of steps) {
    Object.assign(errors, validateStep(formData, step));
  }
  return errors;
}
