export interface EstablishmentPayEntry {
  id: string;
  effectiveDate: string;
  basicPay: number;
  payScale?: string;
  levelCell?: string;
  notes?: string;
}

export interface EstablishmentAllowances {
  hraPercent?: number;
  transportAllowance?: number;
  medicalAllowance?: number;
  claAllowance?: number;
  otherAllowance?: number;
}

export interface EstablishmentDeductions {
  societyDeduction?: number;
  gisSavings?: number;
  gisInsurance?: number;
  professionalTax?: number;
  rentOfBuilding?: number;
}

export interface EstablishmentEmployee {
  id: string;
  hrpnNo?: string;
  name: string;
  designation?: string;
  designationGu?: string;
  cadreClass?: string;
  pan?: string;
  payScale?: string;
  gradePay?: string;
  payLevel?: string;
  payCell?: string;
  ppaNo?: string;
  joinDate?: string;
  transferDate?: string;
  headquarter?: string;
  budgetHeadId?: string;
  active: boolean;
  quartersAddress?: string;
  gisGroup?: string;
  allowances: EstablishmentAllowances;
  deductions: EstablishmentDeductions;
  payEntries: EstablishmentPayEntry[];
}

export interface EstablishmentPost {
  id: string;
  srNo: number;
  designation: string;
  cadreClass?: string;
  sanctioned: number;
  filled: number;
}

export interface EstablishmentState {
  employees: EstablishmentEmployee[];
  posts: EstablishmentPost[];
  lastSyncedAt?: string | null;
}

export interface EstablishmentBackfillResult {
  inserted: number;
  updated: number;
  total: number;
}

export function vacantFor(post: Pick<EstablishmentPost, 'sanctioned' | 'filled'>): number {
  return Math.max(0, post.sanctioned - post.filled);
}

export function latestPayOf(employee: EstablishmentEmployee): EstablishmentPayEntry | undefined {
  if (employee.payEntries.length === 0) return undefined;
  return [...employee.payEntries].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
}

/**
 * An establishment employee belongs to a financial year (March–February) if
 * their service period overlaps it: joined on or before FY end and not
 * transferred out before FY start.
 */
export function servesInFinancialYear(emp: EstablishmentEmployee, fy: number): boolean {
  const fyStart = `${fy}-03-01`;
  const fyEnd = `${fy + 1}-02-28`;
  if (emp.joinDate && emp.joinDate > fyEnd) return false;
  if (emp.transferDate && emp.transferDate < fyStart) return false;
  return true;
}
