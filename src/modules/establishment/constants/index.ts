import type {
  EstablishmentAllowances,
  EstablishmentDeductions,
  EstablishmentEmployee,
  EstablishmentPayEntry,
  EstablishmentPost,
} from '../types';

export const ESTABLISHMENT_STORAGE_KEY = 'establishment-v1';

export function createBlankPayEntry(): EstablishmentPayEntry {
  return {
    id: crypto.randomUUID(),
    effectiveDate: new Date().toISOString().split('T')[0],
    basicPay: 0,
    payScale: '',
    levelCell: '',
    notes: '',
  };
}

export function createBlankEstablishmentEmployee(): EstablishmentEmployee {
  return {
    id: crypto.randomUUID(),
    hrpnNo: '',
    name: '',
    designation: '',
    designationGu: '',
    cadreClass: '',
    pan: '',
    payScale: '',
    gradePay: '',
    payLevel: '',
    payCell: '',
    ppaNo: '',
    joinDate: '',
    transferDate: '',
    headquarter: '',
    budgetHeadId: '',
    active: true,
    quartersAddress: '',
    gisGroup: '',
    allowances: {},
    deductions: {},
    payEntries: [],
  };
}

export function createBlankEstablishmentPost(srNo: number): EstablishmentPost {
  return {
    id: crypto.randomUUID(),
    srNo,
    designation: '',
    cadreClass: '૩',
    sanctioned: 1,
    filled: 0,
  };
}

export interface MoneyFieldConfig {
  key: keyof EstablishmentAllowances | keyof EstablishmentDeductions;
  label: string;
  hint?: string;
}

export const ALLOWANCE_FIELDS: MoneyFieldConfig[] = [
  { key: 'hraPercent', label: 'HRA %' },
  { key: 'transportAllowance', label: 'Transport Allowance' },
  { key: 'medicalAllowance', label: 'Medical Allowance' },
  { key: 'claAllowance', label: 'C.L.A.' },
  { key: 'otherAllowance', label: 'Other Allowance' },
];

export const DEDUCTION_FIELDS: MoneyFieldConfig[] = [
  { key: 'societyDeduction', label: 'Credit Society' },
  { key: 'gisSavings', label: 'GIS Savings (9582)' },
  { key: 'gisInsurance', label: 'GIS Insurance (9581)' },
  { key: 'professionalTax', label: 'Professional Tax' },
  { key: 'rentOfBuilding', label: 'Rent of Building' },
];
