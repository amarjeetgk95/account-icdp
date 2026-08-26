/**
 * Gujarat Government Pay & Allowance Rules & Presets for GTR-30 Bills
 */

export const DEFAULT_DA_PERCENT = 53;

export interface GISRateInfo {
  groupCode: string;
  gujaratiName: string;
  cadreClass: string;
  insuranceFund: number;
  savingsFund: number;
  total: number;
}

export const GIS_RATES: Record<string, GISRateInfo> = {
  A: {
    groupCode: 'A',
    gujaratiName: 'ક',
    cadreClass: '૧',
    insuranceFund: 480,
    savingsFund: 1120,
    total: 1600,
  },
  B: {
    groupCode: 'B',
    gujaratiName: 'ખ',
    cadreClass: '૨',
    insuranceFund: 240,
    savingsFund: 560,
    total: 800,
  },
  C: {
    groupCode: 'C',
    gujaratiName: 'ગ',
    cadreClass: '૩',
    insuranceFund: 120,
    savingsFund: 280,
    total: 400,
  },
  D: {
    groupCode: 'D',
    gujaratiName: 'ઘ',
    cadreClass: '૪',
    insuranceFund: 60,
    savingsFund: 140,
    total: 200,
  },
};

export interface PayScaleMapping {
  id: string;
  gradePay: string;
  level: string;
  payScale: string;
  entryPay: number;
  cadreClass: string;
  defaultGISGroup: string;
  label: string;
}

/**
 * Standard Gujarat 7th Pay Matrix Scale & 6th CPC Grade Pay Catalog
 */
export const PAY_SCALE_CATALOG: PayScaleMapping[] = [
  {
    id: 'gp-1300',
    gradePay: 'GP:1300',
    level: 'Level 1',
    payScale: '14,800-47,100',
    entryPay: 14800,
    cadreClass: '૪',
    defaultGISGroup: 'ઘ',
    label: '14,800-47,100 · GP:1300 (Level 1)',
  },
  {
    id: 'gp-1400',
    gradePay: 'GP:1400',
    level: 'Level 1',
    payScale: '14,800-47,100',
    entryPay: 14800,
    cadreClass: '૪',
    defaultGISGroup: 'ઘ',
    label: '14,800-47,100 · GP:1400 (Level 1)',
  },
  {
    id: 'gp-1650',
    gradePay: 'GP:1650',
    level: 'Level 1',
    payScale: '14,800-47,100',
    entryPay: 14800,
    cadreClass: '૪',
    defaultGISGroup: 'ઘ',
    label: '14,800-47,100 · GP:1650 (Level 1)',
  },
  {
    id: 'gp-1800',
    gradePay: 'GP:1800',
    level: 'Level 1',
    payScale: '18,000-56,900',
    entryPay: 18000,
    cadreClass: '૪',
    defaultGISGroup: 'ઘ',
    label: '18,000-56,900 · GP:1800 (Level 1)',
  },
  {
    id: 'gp-1900',
    gradePay: 'GP:1900',
    level: 'Level 2',
    payScale: '19,900-63,200',
    entryPay: 19900,
    cadreClass: '૩',
    defaultGISGroup: 'ગ',
    label: '19,900-63,200 · GP:1900 (Level 2)',
  },
  {
    id: 'gp-2000',
    gradePay: 'GP:2000',
    level: 'Level 3',
    payScale: '21,700-69,100',
    entryPay: 21700,
    cadreClass: '૩',
    defaultGISGroup: 'ગ',
    label: '21,700-69,100 · GP:2000 (Level 3)',
  },
  {
    id: 'gp-2400',
    gradePay: 'GP:2400',
    level: 'Level 4',
    payScale: '25,500-81,100',
    entryPay: 25500,
    cadreClass: '૩',
    defaultGISGroup: 'ગ',
    label: '25,500-81,100 · GP:2400 (Level 4)',
  },
  {
    id: 'gp-2800',
    gradePay: 'GP:2800',
    level: 'Level 5',
    payScale: '29,200-92,300',
    entryPay: 29200,
    cadreClass: '૩',
    defaultGISGroup: 'ગ',
    label: '29,200-92,300 · GP:2800 (Level 5)',
  },
  {
    id: 'gp-4200-guj',
    gradePay: 'GP:4200',
    level: 'Level 6',
    payScale: '34,500-1,12,400',
    entryPay: 35400,
    cadreClass: '૩',
    defaultGISGroup: 'ખ',
    label: '34,500-1,12,400 · GP:4200 (Level 6)',
  },
  {
    id: 'gp-4200-cen',
    gradePay: 'GP:4200 (35.4k)',
    level: 'Level 6',
    payScale: '35,400-1,12,400',
    entryPay: 35400,
    cadreClass: '૩',
    defaultGISGroup: 'ખ',
    label: '35,400-1,12,400 · GP:4200 (Level 6)',
  },
  {
    id: 'gp-4400',
    gradePay: 'GP:4400',
    level: 'Level 7',
    payScale: '39,900-1,26,600',
    entryPay: 39900,
    cadreClass: '૨',
    defaultGISGroup: 'ખ',
    label: '39,900-1,26,600 · GP:4400 (Level 7)',
  },
  {
    id: 'gp-4600',
    gradePay: 'GP:4600',
    level: 'Level 7',
    payScale: '44,900-1,42,400',
    entryPay: 44900,
    cadreClass: '૨',
    defaultGISGroup: 'ખ',
    label: '44,900-1,42,400 · GP:4600 (Level 7)',
  },
  {
    id: 'gp-4800',
    gradePay: 'GP:4800',
    level: 'Level 8',
    payScale: '47,600-1,51,100',
    entryPay: 47600,
    cadreClass: '૨',
    defaultGISGroup: 'ખ',
    label: '47,600-1,51,100 · GP:4800 (Level 8)',
  },
  {
    id: 'gp-5400-pb2',
    gradePay: 'GP:5400 (PB-2)',
    level: 'Level 9',
    payScale: '53,100-1,67,800',
    entryPay: 53100,
    cadreClass: '૨',
    defaultGISGroup: 'ખ',
    label: '53,100-1,67,800 · GP:5400 (PB-2 Level 9)',
  },
  {
    id: 'gp-5400-pb3',
    gradePay: 'GP:5400 (PB-3)',
    level: 'Level 10',
    payScale: '56,100-1,77,500',
    entryPay: 56100,
    cadreClass: '૧',
    defaultGISGroup: 'ક',
    label: '56,100-1,77,500 · GP:5400 (PB-3 Level 10 Class 1)',
  },
  {
    id: 'gp-6600',
    gradePay: 'GP:6600',
    level: 'Level 11',
    payScale: '67,700-2,08,700',
    entryPay: 67700,
    cadreClass: '૧',
    defaultGISGroup: 'ક',
    label: '67,700-2,08,700 · GP:6600 (Level 11)',
  },
  {
    id: 'gp-7600',
    gradePay: 'GP:7600',
    level: 'Level 12',
    payScale: '78,800-2,09,200',
    entryPay: 78800,
    cadreClass: '૧',
    defaultGISGroup: 'ક',
    label: '78,800-2,09,200 · GP:7600 (Level 12)',
  },
  {
    id: 'gp-8700',
    gradePay: 'GP:8700',
    level: 'Level 13',
    payScale: '1,18,500-2,14,100',
    entryPay: 118500,
    cadreClass: '૧',
    defaultGISGroup: 'ક',
    label: '1,18,500-2,14,100 · GP:8700 (Level 13)',
  },
  {
    id: 'gp-10000',
    gradePay: 'GP:10000',
    level: 'Level 14',
    payScale: '1,44,200-2,18,200',
    entryPay: 144200,
    cadreClass: '૧',
    defaultGISGroup: 'ક',
    label: '1,44,200-2,18,200 · GP:10000 (Level 14)',
  },
];

export function findPayScaleMappingByGradePay(gpStr?: string): PayScaleMapping | null {
  if (!gpStr) return null;
  const num = gpStr.replace(/[^0-9]/g, '');
  if (!num) return null;
  return PAY_SCALE_CATALOG.find((p) => p.gradePay.includes(num)) ?? null;
}

export function findPayScaleMappingByScale(scaleStr?: string): PayScaleMapping | null {
  if (!scaleStr) return null;
  const cleaned = scaleStr.replace(/[^0-9]/g, '');
  if (!cleaned) return null;

  return (
    PAY_SCALE_CATALOG.find((p) => {
      const pClean = p.payScale.replace(/[^0-9]/g, '');
      return pClean === cleaned || pClean.includes(cleaned) || cleaned.includes(pClean);
    }) ?? null
  );
}

export const HRA_PRESETS = [
  { label: '0% — Govt. Quarter Allotted', value: 0 },
  { label: '9% — Rural / Non-metro', value: 9 },
  { label: '18% — Surat, Vadodara, Rajkot (Y-Category)', value: 18 },
  { label: '27% — Ahmedabad (X-Category)', value: 27 },
] as const;

export function getGISRatesForGroup(group?: string): GISRateInfo | null {
  if (!group) return null;
  const g = group.trim().toUpperCase();
  if (g === 'A' || g === 'ક' || g === '1' || g === '૧') return GIS_RATES.A;
  if (g === 'B' || g === 'ખ' || g === '2' || g === '૨') return GIS_RATES.B;
  if (g === 'C' || g === 'ગ' || g === '3' || g === '૩') return GIS_RATES.C;
  if (g === 'D' || g === 'ઘ' || g === '4' || g === '૪') return GIS_RATES.D;
  return null;
}

export function calculateDA(currentPay: number, daPercent: number = DEFAULT_DA_PERCENT): number {
  if (!currentPay || currentPay <= 0) return 0;
  return Math.round(currentPay * (daPercent / 100));
}

// ── DA Rate history with effective-from date ────────────────────────────────
export interface DARateEntry {
  id: string;
  effectiveFrom: string; // ISO YYYY-MM-DD
  rate: number;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DMY_DATE_REGEX = /^(\d{2})-(\d{2})-(\d{4})$/;
const DMY_SLASH_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function isValidIsoDate(iso: string): boolean {
  if (!ISO_DATE_REGEX.test(iso)) return false;
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

export function parseFlexibleDateToISO(input: string): string | null {
  const trimmed = input.trim();
  if (isValidIsoDate(trimmed)) return trimmed;
  let m = DMY_DATE_REGEX.exec(trimmed);
  if (!m) m = DMY_SLASH_REGEX.exec(trimmed);
  if (m) {
    const dd = m[1];
    const mm = m[2];
    const yyyy = m[3];
    const iso = `${yyyy}-${mm}-${dd}`;
    if (isValidIsoDate(iso)) return iso;
  }
  // Also accept YYYY/MM/DD
  const ymdSlash = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(trimmed);
  if (ymdSlash) {
    const iso = `${ymdSlash[1]}-${ymdSlash[2]}-${ymdSlash[3]}`;
    if (isValidIsoDate(iso)) return iso;
  }
  return null;
}

export function normalizeDARates(rates: DARateEntry[] | null | undefined): DARateEntry[] {
  const valid = (rates ?? [])
    .map((r) => {
      if (!r) return null;
      const iso = parseFlexibleDateToISO(String(r.effectiveFrom || '').trim());
      if (!iso) return null;
      if (typeof r.rate !== 'number' || r.rate < 0 || r.rate > 100) return null;
      return {
        id: r.id || crypto.randomUUID(),
        effectiveFrom: iso,
        rate: Math.round(r.rate * 100) / 100,
      };
    })
    .filter((r): r is DARateEntry => r !== null)
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) || a.id.localeCompare(b.id));
  // Deduplicate by effectiveFrom, keep last
  const deduped: DARateEntry[] = [];
  for (const entry of valid) {
    const last = deduped[deduped.length - 1];
    if (last && last.effectiveFrom === entry.effectiveFrom) {
      deduped[deduped.length - 1] = entry;
    } else {
      deduped.push(entry);
    }
  }
  return deduped;
}

/**
 * Resolve the applicable DA percent for a given ISO date (YYYY-MM-DD).
 * Returns the rate of the latest entry with effectiveFrom <= targetDate.
 * If no entry matches (target before all entries), returns the earliest rate or DEFAULT.
 */
export function resolveDARateForDate(
  rates: DARateEntry[] | null | undefined,
  targetIso: string
): number {
  const norm = normalizeDARates(rates);
  if (norm.length === 0) return DEFAULT_DA_PERCENT;
  if (!isValidIsoDate(targetIso)) return norm[norm.length - 1].rate;
  let best: DARateEntry | null = null;
  for (const entry of norm) {
    if (entry.effectiveFrom <= targetIso) {
      if (!best || entry.effectiveFrom >= best.effectiveFrom) best = entry;
    }
  }
  if (best) return best.rate;
  // Target before earliest entry -> use earliest rate
  return norm[0].rate;
}

/**
 * Resolve DA percent for a month key like "August-2026" or ISO month start "2026-08-01".
 * Uses monthStartFromKey internally when monthKey format is detected.
 */
export function resolveDARateForMonthKey(
  rates: DARateEntry[] | null | undefined,
  monthKeyOrIso: string | null | undefined
): number {
  if (!monthKeyOrIso || typeof monthKeyOrIso !== 'string') return normalizeDARates(rates)[0]?.rate ?? DEFAULT_DA_PERCENT;
  const trimmed = monthKeyOrIso.trim();
  // Try ISO date directly
  if (isValidIsoDate(trimmed)) return resolveDARateForDate(rates, trimmed);
  // Try Month-Year format via dynamic import to avoid circular dep - inline parse
  const match = /^([A-Za-z]+)-(\d{4})$/.exec(trimmed);
  if (match) {
    const MONTHS = ['April','May','June','July','August','September','October','November','December','January','February','March'];
    const name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    const idx = MONTHS.indexOf(name);
    if (idx >= 0) {
      const year = Number(match[2]);
      const monthNum = ((idx + 3) % 12) + 1;
      const iso = `${year}-${String(monthNum).padStart(2, '0')}-01`;
      return resolveDARateForDate(rates, iso);
    }
  }
  // Fallback: try to parse as month start via split
  return normalizeDARates(rates)[0]?.rate ?? DEFAULT_DA_PERCENT;
}

export function calculateNPS(currentPay: number, da: number): number {
  if (!currentPay || currentPay <= 0) return 0;
  return Math.round((currentPay + (da || 0)) * 0.1);
}

/**
 * Standard Gujarat Professional Tax Slab:
 * Monthly pay < ₹12,000 -> ₹0
 * Monthly pay >= ₹12,000 -> ₹200
 */
export function calculateGujaratPT(currentPayOrGross: number): number {
  if (!currentPayOrGross || currentPayOrGross < 12000) return 0;
  return 200;
}
