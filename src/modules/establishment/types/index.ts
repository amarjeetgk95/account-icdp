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

export function vacantFor(post: Pick<EstablishmentPost, 'sanctioned' | 'filled'>): number {
  return Math.max(0, post.sanctioned - post.filled);
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
