export interface GTR30PayEntry {
  id: string;
  startDate: string;
  endDate?: string;
  basicPay: number;
}

export interface GTR30EmployeeMaster {
  id: string;
  srNo: number;
  billCode?: string;
  hrpnNo?: string;
  name: string;
  designation: string;
  designationGujarati?: string;
  cadreClass?: string;
  payScale: string;
  gradePay?: string;
  payLevelCell?: string;
  ppaNo?: string;
  currentPay: number;
  currentPayDate?: string;
  payEntries?: GTR30PayEntry[];
  quarterAddress?: string;
  insuranceGroup?: string;
  insuranceType?: 'savings_and_insurance' | 'insurance_only';
  hraPercent: number;
  da?: number;
  transportAllowance: number;
  medicalAllowance: number;
  claAllowance: number;
  rentOfBuilding?: number;
  professionalTax?: number;
  gis1981Insurance?: number;
  gis1981Savings?: number;
  npsPension?: number;
  societyDeduction?: number;
  remarks?: string;
}

export interface GTR30BillCodeMapping {
  id: string;
  billCode: string;
  description: string;
  monthKey?: string;
  // Link to the saved budget head this bill code uses
  budgetHeadId?: string;
  // Per-bill-code Budget Head & Classification
  controllingOfficer?: string;
  classOfExpenditure?: string;
  fund?: string;
  drawingOfficer?: string;
  demandNo?: string;
  demandNoLabel?: string;
  typeOfBudget?: string;
  schemeNo?: string;
  headChargeable?: string;
  sector?: string;
  majorHead?: string;
  subMajorHead?: string;
  minorHead?: string;
  subHead?: string;
  budgetYear?: string;
}

export interface GTR30MasterGroup {
  monthKey: string;
  billCode: string;
  employees: GTR30EmployeeMaster[];
}

/**
 * Classification fields of a budget head that are copied onto a bill code
 * (and later onto bills) when the head is selected.
 */
export const BUDGET_HEAD_MAPPING_FIELDS = [
  'headChargeable',
  'controllingOfficer',
  'classOfExpenditure',
  'fund',
  'drawingOfficer',
  'demandNo',
  'typeOfBudget',
  'schemeNo',
  'sector',
  'majorHead',
  'subMajorHead',
  'minorHead',
  'subHead',
  'budgetYear',
] as const;

export type GTR30BudgetHeadMappingField = (typeof BUDGET_HEAD_MAPPING_FIELDS)[number];

/** A saved budget head in the office's master list. */
export interface GTR30BudgetHead {
  id: string;
  name: string;
  headChargeable?: string;
  controllingOfficer?: string;
  classOfExpenditure?: string;
  fund?: string;
  drawingOfficer?: string;
  demandNo?: string;
  typeOfBudget?: string;
  schemeNo?: string;
  sector?: string;
  majorHead?: string;
  subMajorHead?: string;
  minorHead?: string;
  subHead?: string;
  budgetYear?: string;
}
