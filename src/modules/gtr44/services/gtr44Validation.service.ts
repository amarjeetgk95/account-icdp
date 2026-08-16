import { GTR44FormData, GTR44Entry } from '../types';
import { getGrossAmount, getNetDifference, getTotalDeductions } from './gtr44Calc.service';

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
        }
      });
      break;
    }

    case 'budgetHead':
      if (!formData.budgetHeadId && !formData.headChargeableCode) {
        errors['budgetHeadId'] = 'Select a Budget Head';
      }
      break;

    case 'deductions': {
      const gross = getGrossAmount(formData);
      const net = getNetDifference(gross, getTotalDeductions(formData.deductions));
      if (net < 0) errors['netAmount'] = 'Net amount cannot be negative — check deductions';
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
