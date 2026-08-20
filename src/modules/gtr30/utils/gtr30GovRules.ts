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

export function findPayScaleMappingByGradePay(gradePayStr?: string): PayScaleMapping | null {
  if (!gradePayStr) return null;
  const cleaned = gradePayStr.replace(/\s+/g, '').toUpperCase();
  // Extract number from GP string (e.g. "GP:4200" or "4200" or "GP4200")
  const match = cleaned.match(/(\d{4,5})/);
  if (!match) return null;
  const num = match[1];

  // Specific check for 5400 PB-3 vs PB-2
  if (num === '5400') {
    if (cleaned.includes('PB3') || cleaned.includes('PB-3') || cleaned.includes('10')) {
      return PAY_SCALE_CATALOG.find((p) => p.id === 'gp-5400-pb3') ?? null;
    }
    return PAY_SCALE_CATALOG.find((p) => p.id === 'gp-5400-pb2') ?? null;
  }

  return (
    PAY_SCALE_CATALOG.find(
      (p) =>
        p.gradePay.replace(/\s+/g, '').toUpperCase().includes(num) ||
        p.id.includes(num)
    ) ?? null
  );
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
