export * from './postCatalog';

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
  nameGu?: string;
  mobileNo?: string;
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
  /** Manual sequence for directory + reports. NULL = never arranged, sorts last. */
  displayOrder?: number | null;
  active: boolean;
  quartersAddress?: string;
  gisGroup?: string;
  allowances: EstablishmentAllowances;
  deductions: EstablishmentDeductions;
  payEntries: EstablishmentPayEntry[];
}

export interface EstablishmentState {
  employees: EstablishmentEmployee[];
  lastSyncedAt?: string | null;
}

/**
 * Rank inside the office's manual establishment sequence.
 * NULL/undefined = legacy row never arranged -> after every arranged row,
 * name breaks the tie so the order is always deterministic.
 */
export function establishmentOrderRank(e: Pick<EstablishmentEmployee, 'displayOrder'>): number {
  return typeof e.displayOrder === 'number' && Number.isFinite(e.displayOrder)
    ? e.displayOrder
    : Number.MAX_SAFE_INTEGER;
}

/** Sort helper: manual sequence first, then name, then HRPN. Shared by list + reports. */
export function compareEstablishmentOrder(
  a: EstablishmentEmployee,
  b: EstablishmentEmployee
): number {
  return (
    establishmentOrderRank(a) - establishmentOrderRank(b) ||
    (a.name || '').localeCompare(b.name || '') ||
    (a.hrpnNo || '').localeCompare(b.hrpnNo || '')
  );
}

export function latestPayOf(employee: EstablishmentEmployee): EstablishmentPayEntry | undefined {
  if (employee.payEntries.length === 0) return undefined;
  return [...employee.payEntries].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
}

export function toIsoDateString(val: string | null | undefined): string | null {
  if (!val) return null;
  const trimmed = String(val).trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getMonthDateRange(fy: number, monthName: string): { start: string; end: string } {
  const norm = monthName.trim().toLowerCase();
  const map: Record<string, { m: string; yearOffset: number; days: number }> = {
    march: { m: '03', yearOffset: 0, days: 31 },
    april: { m: '04', yearOffset: 0, days: 30 },
    may: { m: '05', yearOffset: 0, days: 31 },
    june: { m: '06', yearOffset: 0, days: 30 },
    july: { m: '07', yearOffset: 0, days: 31 },
    august: { m: '08', yearOffset: 0, days: 31 },
    september: { m: '09', yearOffset: 0, days: 30 },
    october: { m: '10', yearOffset: 0, days: 31 },
    november: { m: '11', yearOffset: 0, days: 30 },
    december: { m: '12', yearOffset: 0, days: 31 },
    january: { m: '01', yearOffset: 1, days: 31 },
    february: { m: '02', yearOffset: 1, days: 28 },
  };
  const info = map[norm] || { m: '03', yearOffset: 0, days: 31 };
  const yr = fy + info.yearOffset;
  let days = info.days;
  if (info.m === '02') {
    const isLeap = (yr % 4 === 0 && yr % 100 !== 0) || yr % 400 === 0;
    days = isLeap ? 29 : 28;
  }
  const start = `${yr}-${info.m}-01`;
  const end = `${yr}-${info.m}-${String(days).padStart(2, '0')}`;
  return { start, end };
}

/**
 * An employee serves in a specific month of a financial year if their service
 * overlaps that month: joined on or before the month's last day, and not
 * transferred out before the month's first day.
 */
export function servesInMonth(
  emp: { joinDate?: string | null; transferDate?: string | null },
  fy: number,
  monthName: string
): boolean {
  const join = toIsoDateString(emp.joinDate);
  const transfer = toIsoDateString(emp.transferDate);
  const { start, end } = getMonthDateRange(fy, monthName);

  if (join && join > end) return false;
  if (transfer && transfer < start) return false;
  return true;
}

/**
 * An establishment employee belongs to a financial year (March–February) if
 * their service period overlaps it: joined on or before FY end and not
 * transferred out before FY start.
 */
export function servesInFinancialYear(
  emp: { joinDate?: string | null; transferDate?: string | null },
  fy: number
): boolean {
  const join = toIsoDateString(emp.joinDate);
  const transfer = toIsoDateString(emp.transferDate);
  const fyStart = `${fy}-03-01`;
  const nextYr = fy + 1;
  const isLeap = (nextYr % 4 === 0 && nextYr % 100 !== 0) || nextYr % 400 === 0;
  const fyEnd = `${nextYr}-02-${isLeap ? '29' : '28'}`;

  if (join && join > fyEnd) return false;
  if (transfer && transfer < fyStart) return false;
  return true;
}

// ============================================================================
// DISCRETE POSITION & CANONICAL 9-FIELD GUJARATI ESTABLISHMENT REGISTER TYPES
// ============================================================================

export type PositionStatus =
  | 'Filled'
  | 'Vacant'
  | 'Under Charge'
  | 'Abolished'
  | 'Cancelled';

export const RESOLUTION_STATUSES: readonly PositionStatus[] = ['Abolished', 'Cancelled'];
export const isResolutionStatus = (s: PositionStatus | string | null | undefined): boolean =>
  s === 'Abolished' || s === 'Cancelled';

export interface EstablishmentOfficeRef {
  id: string;
  districtId: string;
  code: string;
  name: string;
  nameGu: string;
  officeType: string;
  address: string;
  contactNo: string;
  email: string;
  sanctionedStrength: number;
  reportHeaderGu?: string;
  reportHeaderEn?: string;
  reportHeaderAddress?: string;
  reportFooterNote?: string;
}

export interface EstablishmentDistrictRef {
  id: string;
  regionalOfficeId: string;
  code: string;
  name: string;
  nameGu: string;
  headquarters: string;
}

export interface EstablishmentDesignationRef {
  id: string;
  code: string;
  title: string;
  titleGu: string;
  cadreId?: string;
  classLevel?: string;
  payScale?: string;
  payMatrixLevel?: string;
}

export interface EstablishmentPostInput {
  code: string;
  title: string;
  titleGu: string;
  cadreId?: string | null;
  payScale?: string | null;
  payMatrixLevel?: string | null;
}

export interface EstablishmentBudgetHead {
  id: string;
  officeId?: string;
  headCode: string;
  title: string;
  titleGu: string;
  description?: string;
  isActive: boolean;
}

export interface EstablishmentBudgetHeadInput {
  headCode: string;
  title: string;
  titleGu: string;
  description?: string | null;
  isActive?: boolean;
}

export interface EstablishmentAuditLogRef {
  id: string;
  entityName: string;
  entityId: string;
  action: string;
  performedBy: string;
  performedByName: string;
  details: string;
  timestamp: string;
  oldValues?: any;
  newValues?: any;
}

export interface EstablishmentChargeArrangementRef {
  id: string;
  positionId: string;
  positionNo: string;
  designationTitleGu: string;
  officeId?: string;
  officeNameGu?: string;
  chargeEmployeeId: string;
  chargeEmployeeNameGu: string;
  chargeHrpnNo: string;
  orderNo?: string;
  orderDate?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  status: 'ACTIVE' | 'TERMINATED' | 'EXPIRED';
  remarks?: string;
}

export interface EstablishmentAuthRef {
  id: string;
  fullNameGu: string;
  officeId?: string;
}

/**
 * The 9 Canonical Fields of the Gujarat Establishment Register:
 * 1. Sr. No. (Serial Number)
 * 2. Post Name (Name of the Post / Position - Gujarati)
 * 3. Status (Position Status: Filled / Vacant / Under Charge / Abolished / Cancelled)
 * 4. Vacant/Filled Date (Vacancy / Filled Date)
 * 5. Officer/Employee Name (Officer / Employee Name - Gujarati)
 * 6. HRPN No. (HRPN Number)
 * 7. Position No. (Departmental Allotted Unique Position Number)
 * 8. Mobile Number (Mobile Number)
 * 9. Charge Holder HRPN No. (Charge Holder HRPN Number)
 */
export interface EstablishmentRecord {
  // --- THE 9 MANDATORY FIELDS ---
  srNo: number;            // 1. Sr. No.
  postName: string;        // 2. Post Name (Gujarati)
  status: PositionStatus;  // 3. Status
  statusDate: string;      // 4. Vacant/Filled Date (DD-MM-YYYY)
  employeeName: string;    // 5. Officer/Employee Name (Gujarati)
  hrpnNo: string;          // 6. HRPN No.
  positionNo: string;      // 7. Position No. (Official Departmental Number)
  mobileNo: string;        // 8. Mobile Number
  chargeHrpnNo: string;    // 9. Charge Holder HRPN No.

  // --- MODULE-INTERNAL METADATA ---
  id: string;
  currentEmployeeId?: string | null;
  chargeEmployeeId?: string | null;
  officeId?: string;
  officeNameGu?: string;
  districtId?: string;
  districtNameGu?: string;
  designationId?: string;
  designationTitleEn?: string;
  designationTitleGu?: string;
  cadreId?: string;
  cadreClass?: string;
  headquarter?: string;
  displayOrder?: number | null;
  remarks?: string;

  // --- ABOLITION / CANCELLATION RESOLUTION (Abolished / Cancelled) ---
  resolutionNote?: string;
  resolutionPdfUrl?: string;

  // --- GOVERNMENT RESOLUTION THAT SANCTIONED THIS POST (deduped via gr_repository) ---
  grId?: string | null;
  grNumber?: string | null;
  grTitle?: string | null;
  grIssueDate?: string | null;
  grStoragePath?: string | null;

  // --- CHARGE HOLDER IDENTITY ---
  chargeNameGu?: string;
  chargeMobileNo?: string;

  // --- BUDGET HEAD LINK ---
  budgetHeadId?: string | null;
  budgetHeadCode?: string;
  budgetHeadNameGu?: string;

  // --- LETTERS / ORDERS ---
  letterNo?: string;
  letterDate?: string;
  orderNo?: string;
  orderDate?: string;
}

/** Directory label: designation-headquarter. Reports must keep using postName only. */
export function establishmentPostDisplayName(
  postName: string,
  headquarter?: string | null
): string {
  const hq = (headquarter || '').trim();
  return hq ? `${postName}-${hq}` : postName;
}

export interface EstablishmentSubmission {
  id: string;
  recordId: string;
  positionNo: string;
  officeId?: string;
  officeNameGu?: string;
  submittedBy: string;
  submittedByName: string;
  submittedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  updatedFields: Partial<EstablishmentRecord>;
  previousFields: Partial<EstablishmentRecord>;
  remarks?: string;
  reviewerRemarks?: string;
}

export interface PositionHistoryEntry {
  id: string;
  positionId: string;
  employeeId: string;
  assignmentType: string;
  startDate: string;
  endDate: string | null;
  orderNo: string | null;
  orderDate: string | null;
  relieveReason: string | null;
  remarks: string | null;
  createdAt: string;
  positionNo?: string;
  designationTitleGu?: string;
  cadreClass?: string;
  budgetHeadName?: string;
  employeeName?: string;
  employeeNameGu?: string;
  hrpnNo?: string;
  mobileNo?: string;
}


