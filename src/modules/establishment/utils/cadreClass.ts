/**
 * Cadre Class (વર્ગ-૧ .. વર્ગ-૪) Normalization and Auto-Classification Utility
 * 
 * Rules for Cadre Classification:
 * - Class 1 (વર્ગ-૧): 7th Pay Matrix Level 10 and above (>= 10)
 * - Class 2 (વર્ગ-૨): 7th Pay Matrix Level 8 and Level 9
 * - Class 3 (વર્ગ-૩): 7th Pay Matrix Level 1 to Level 7
 * - Class 4 (વર્ગ-૪): Lower than Level 1 (e.g. Level 1S / Sub-Level 1 / < 1)
 */

export const CLASS_DIGITS = ['1', '2', '3', '4'] as const;
export type ClassDigit = typeof CLASS_DIGITS[number];

export const GU_DIGITS = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];

/** Converts English digits to Gujarati digits (e.g. 1 -> ૧). */
export const toGu = (v: number | string): string =>
  String(v).replace(/[0-9]/g, d => GU_DIGITS[Number(d)]);

/**
 * Extracts normalized digit '1'..'4' from an explicit class/cadre string.
 * Supports: 'Class-1', 'વર્ગ-૧', '1', 'CLASS 3', 'વર્ગ-1', etc.
 * Returns '' if unclassified.
 */
export function classDigitOf(v?: string | null): string {
  if (!v) return '';
  const s = String(v).trim();
  if (!s || s === '-') return '';

  const guMap: Record<string, string> = { '૧': '1', '૨': '2', '૩': '3', '૪': '4' };
  // Only treat the value as an explicit class when it looks like one:
  // contains class/varg keywords, or is a bare single digit.
  // This avoids false positives on pay strings like "₹14,800–₹47,100 (IS, 1)"
  // where the old /[1-4]/ match returned '1' (Class-1) for Class-4 posts.
  const looksLikeClass =
    /class/i.test(s) || /varg/i.test(s) || s.includes('વર્ગ') || /^[1-4]$/.test(s) ||
    /^[૧૨૩૪]$/.test(s);
  if (!looksLikeClass) return '';

  for (const [gu, en] of Object.entries(guMap)) {
    if (s.includes(gu)) return en;
  }
  const m = s.match(/[1-4]/);
  return m ? m[0] : '';
}

/**
 * Deduce cadre class ('1'..'4') from 7th Pay Commission Pay Matrix Level:
 * - Class 1: Level 10 and above
 * - Class 2: Level 8 and 9
 * - Class 3: Level 1 to 7
 * - Class 4: Lower than Level 1 (e.g. Level 1S / Sub-level 1 / < 1)
 * 
 * Returns '' if the level string does not specify a recognized pay level.
 */
export function classFromPayLevel(levelStr?: string | null): string {
  if (!levelStr) return '';
  let s = String(levelStr).trim().toLowerCase();
  if (!s || s === '-') return '';

  // Normalize Gujarati numerals to English digits
  const guMap: Record<string, string> = {
    '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
    '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9',
  };
  s = s.replace(/[૦-૯]/g, d => guMap[d] || d);
  // Normalize Gujarati 'એસ' to 's'
  s = s.replace(/એસ/g, 's');

  // Check Class 4 first: Level 1S / Sub-Level 1 / IS (Initial Scale) / < 1.
  // Legacy Gujarat entries use "(IS, 1)", "(IS, 2)", "(IS, 3)" for the
  // Level-1S family (₹14,800–₹47,100 etc.) — all Class-4.
  if (
    /(?:^|\b|\s|-)1\s*s\b/i.test(s) ||
    s.includes('1s') ||
    s.includes('sub-level') ||
    s.includes('sub level') ||
    s.includes('initial scale') ||
    s.includes('initial-scale') ||
    /(^|[\s(\-,])is([\s)\-,]|$)/.test(s)
  ) {
    return '4';
  }

  // Remove thousand separators so "14,800" is not misread as Level 14.
  const sNoComma = s.replace(/,/g, '');

  let num: number | null = null;
  const levelMatch = sNoComma.match(/(?:level|matrix|\bl\b|લેવલ)\s*[-:]?\s*(\d+(?:\.\d+)?)\s*([a-z])?/i);
  if (levelMatch) {
    num = Number(levelMatch[1]);
    // "Level - 1S" (or 1s glued) is Class-4, not Level 1.
    if (num === 1 && (levelMatch[2]?.toLowerCase() === 's' || /1\s*s\b/.test(sNoComma))) {
      return '4';
    }
  } else {
    // Map 7th CPC pay amounts to class when no explicit Level keyword exists.
    // Must run BEFORE the bare-number fallback, otherwise "14800" -> "14" -> Class-1.
    const amounts = sNoComma.match(/\d{4,6}/g);
    if (amounts && amounts.length > 0) {
      const minPay = Math.min(...amounts.map(Number));
      if (minPay >= 56100) return '1';
      if (minPay >= 47600) return '2';
      if (minPay >= 18000) return '3';
      if (minPay >= 4440) return '4';
    }
    // Bare level numbers only ("10", "8", "2"): never take the leading digits
    // of a pay amount (e.g. "14" from "14800").
    const bare = sNoComma.trim().match(/^(\d+(?:\.\d+)?)\s*([a-z])?$/i);
    if (bare) {
      const candidate = Number(bare[1]);
      if (candidate <= 20) {
        if (bare[2]?.toLowerCase() === 's') return '4';
        num = candidate;
      } else {
        return '';
      }
    } else {
      return '';
    }
  }

  if (num === null || isNaN(num)) return '';

  if (num < 1) return '4';              // Lower than Level 1 -> Class 4
  if (num >= 1 && num <= 7) return '3';   // Level 1 to 7 -> Class 3
  if (num === 8 || num === 9) return '2'; // Level 8 and 9 -> Class 2
  if (num >= 10) return '1';            // Level 10 and above -> Class 1

  return '';
}

/**
 * Resolves the final 1-4 class digit for a post or position:
 * 1. Checks explicit cadre class string (from cadres.class_level).
 * 2. If unassigned, automatically deduces class from Pay Matrix Level.
 */
export function resolveCadreClassDigit(
  explicitCadreClass?: string | null,
  payLevelOrScale?: string | null,
): string {
  const explicit = classDigitOf(explicitCadreClass);
  if (explicit) return explicit;
  return classFromPayLevel(payLevelOrScale);
}

/** Table display: વર્ગ-૧ .. વર્ગ-૪ (Gujarati numerals), or fallback when unknown. */
export function formatVarg(digitOrRaw?: string | null, fallback = '—'): string {
  const d = classDigitOf(digitOrRaw) || classFromPayLevel(digitOrRaw);
  return d ? `વર્ગ-${toGu(d)}` : fallback;
}

/** CSV/export display: વર્ગ-1 .. વર્ગ-4 (English numerals for spreadsheet). */
export function formatVargCsv(digitOrRaw?: string | null, fallback = '-'): string {
  const d = classDigitOf(digitOrRaw) || classFromPayLevel(digitOrRaw);
  return d ? `વર્ગ-${d}` : fallback;
}

/**
 * Normalizes input text for pay level parsing:
 * - trims and converts to lowercase
 * - converts Gujarati digits to English digits
 * - converts Gujarati 'એસ' to 's'
 */
function normalizePayString(v?: string | null): string {
  if (!v) return '';
  let s = String(v).trim().toLowerCase();
  const guMap: Record<string, string> = {
    '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
    '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9',
  };
  s = s.replace(/[૦-૯]/g, d => guMap[d] || d);
  s = s.replace(/એસ/g, 's');
  // Strip thousand separators / currency so "₹14,800" parses as 14800.
  s = s.replace(/,/g, '');
  return s;
}

/**
 * Extracts a numeric rank for pay level / pay scale / cadre class.
 * Higher number means higher pay level / higher seniority.
 * 
 * Hierarchy:
 * - Level 18 down to Level 1
 * - Sub-levels / 1S: 0.5
 * - If pay scale amount (e.g. 56100-177500): maps to equivalent 7th CPC Level
 * - If 6th CPC Grade Pay (e.g. GP 5400): maps to equivalent Level
 * - If only Cadre Class: Class 1 -> 10, Class 2 -> 8, Class 3 -> 2, Class 4 -> 0.5
 * - Unassigned: -1
 */
export function parsePayLevelRank(
  payLevel?: string | null,
  payScale?: string | null,
  cadreClass?: string | null,
): number {
  const pl = normalizePayString(payLevel);
  const ps = normalizePayString(payScale);
  const cc = normalizePayString(cadreClass);
  const combined = (pl + ' ' + ps).trim();

  // 1. Check Class 4 / Sub-Level 1 / 1S / IS (Initial Scale) first.
  // Legacy Gujarat entries use "(IS, 1/2/3)" for the Level-1S family.
  if (
    /(?:^|\b|\s|-)1\s*s\b/i.test(combined) ||
    combined.includes('1s') ||
    combined.includes('sub-level') ||
    combined.includes('sub level') ||
    combined.includes('initial scale') ||
    combined.includes('initial-scale') ||
    /(^|[\s(\-,])is([\s)\-,]|$)/.test(combined)
  ) {
    return 0.5;
  }

  // 2. Check for explicit level in payLevel or payScale: e.g. 'Level 13A', 'Level 10', 'L-10', 'લેવલ ૧૦'
  const levelMatch = combined.match(/(?:level|matrix|l|લેવલ)\s*[-:]?\s*(\d+(?:\.\d+)?)\s*([a-z])?/i);
  if (levelMatch) {
    let num = Number(levelMatch[1]);
    if (levelMatch[2] && levelMatch[2].toLowerCase() === 'a') num += 0.5;
    return num;
  }

  // 3. Check if payLevel itself is a simple number or level like '10', '8', '2', '13A'
  if (pl) {
    const plMatch = pl.match(/^(\d+(?:\.\d+)?)\s*([a-z])?/i);
    if (plMatch) {
      let num = Number(plMatch[1]);
      if (num <= 20) {
        if (plMatch[2] && plMatch[2].toLowerCase() === 'a') num += 0.5;
        return num;
      }
    }
  }

  // 4. Check for 6th CPC Grade Pay (GP 5400, etc.)
  const gpMatch = combined.match(/(?:gp|grade\s*pay)\s*[-:]?\s*(\d+)/i);
  if (gpMatch) {
    const gp = Number(gpMatch[1]);
    if (gp >= 8700) return 13;
    if (gp >= 7600) return 12;
    if (gp >= 6600) return 11;
    if (gp >= 5400) return 10;
    if (gp >= 4600) return 7;
    if (gp >= 4200) return 6;
    if (gp >= 2800) return 5;
    if (gp >= 2400) return 4;
    if (gp >= 2000) return 3;
    if (gp >= 1900) return 2;
    if (gp >= 1800) return 1;
    if (gp < 1800) return 0.5;
  }

  // 5. Check for 7th Pay Commission scale amounts (e.g. 56100-177500, 44900-142400)
  const amounts = combined.match(/\d{4,6}/g);
  if (amounts && amounts.length > 0) {
    const minPay = Math.min(...amounts.map(Number));
    if (minPay >= 144200) return 14;
    if (minPay >= 131100) return 13.5;
    if (minPay >= 118500) return 13;
    if (minPay >= 78800) return 12;
    if (minPay >= 67700) return 11;
    if (minPay >= 56100) return 10;
    if (minPay >= 53100) return 9;
    if (minPay >= 47600) return 8;
    if (minPay >= 44900) return 7;
    if (minPay >= 35400) return 6;
    if (minPay >= 29200) return 5;
    if (minPay >= 25500) return 4;
    if (minPay >= 21700) return 3;
    if (minPay >= 19900) return 2;
    if (minPay >= 18000) return 1;
    // 6th CPC bands: 15600, 9300, 5200, 4440
    if (minPay >= 15600) return 10;
    if (minPay >= 9300) return 8;
    if (minPay >= 5200) return 2;
    if (minPay >= 4440) return 0.5;
  }

  // 6. Fallback to cadreClass: Class 1 -> 10, Class 2 -> 8, Class 3 -> 2, Class 4 -> 0.5
  if (cc.includes('1') || cc.includes('૧')) return 10;
  if (cc.includes('2') || cc.includes('૨')) return 8;
  if (cc.includes('3') || cc.includes('૩')) return 2;
  if (cc.includes('4') || cc.includes('૪')) return 0.5;

  return -1;
}

export interface PayLevelSortableItem {
  payLevel?: string | null;
  payScale?: string | null;
  cadreClass?: string | null;
  title?: string | null;
  titleGu?: string | null;
  postName?: string | null;
  code?: string | null;
}

/**
 * Comparator to sort items from higher pay level to lower (descending pay level).
 * Tie-breaker: post name / title in Gujarati or English.
 */
export function comparePayLevelDesc(
  a: PayLevelSortableItem,
  b: PayLevelSortableItem,
): number {
  const rankA = parsePayLevelRank(a.payLevel, a.payScale, a.cadreClass);
  const rankB = parsePayLevelRank(b.payLevel, b.payScale, b.cadreClass);
  if (rankA !== rankB) {
    return rankB - rankA; // Higher pay level first
  }
  const nameA = a.titleGu || a.postName || a.title || a.code || '';
  const nameB = b.titleGu || b.postName || b.title || b.code || '';
  return nameA.localeCompare(nameB, 'gu');
}

export interface PayMatrixLevelOption {
  level: string;
  scale: string;
  label: string;
  classDigit: '1' | '2' | '3' | '4';
  classLabelGu: string;
}

/**
 * 7th CPC (Pay Commission) Pay Matrix Levels
 * Matched with corresponding Cadre Class:
 * - Level 10 to 14: Class 1 (વર્ગ - ૧)
 * - Level 8 to 9:   Class 2 (વર્ગ - ૨)
 * - Level 1 to 7:   Class 3 (વર્ગ - ૩)
 * - Level 1S:       Class 4 (વર્ગ - ૪)
 */
export const GUJARAT_7TH_PAY_MATRIX_LEVELS: PayMatrixLevelOption[] = [
  // Class 1 (Levels 10 and above)
  { level: '14', scale: '₹1,44,200–₹2,18,200', label: '₹1,44,200–₹2,18,200 (Level - 14)', classDigit: '1', classLabelGu: 'વર્ગ - ૧' },
  { level: '13A', scale: '₹1,31,100–₹2,16,600', label: '₹1,31,100–₹2,16,600 (Level - 13A)', classDigit: '1', classLabelGu: 'વર્ગ - ૧' },
  { level: '13', scale: '₹1,18,500–₹2,14,100', label: '₹1,18,500–₹2,14,100 (Level - 13)', classDigit: '1', classLabelGu: 'વર્ગ - ૧' },
  { level: '12', scale: '₹78,800–₹2,09,200', label: '₹78,800–₹2,09,200 (Level - 12)', classDigit: '1', classLabelGu: 'વર્ગ - ૧' },
  { level: '11', scale: '₹67,700–₹2,08,700', label: '₹67,700–₹2,08,700 (Level - 11)', classDigit: '1', classLabelGu: 'વર્ગ - ૧' },
  { level: '10', scale: '₹56,100–₹1,77,500', label: '₹56,100–₹1,77,500 (Level - 10)', classDigit: '1', classLabelGu: 'વર્ગ - ૧' },

  // Class 2 (Levels 8 and 9)
  { level: '9', scale: '₹53,100–₹1,67,800', label: '₹53,100–₹1,67,800 (Level - 9)', classDigit: '2', classLabelGu: 'વર્ગ - ૨' },
  { level: '8', scale: '₹47,600–₹1,51,100', label: '₹47,600–₹1,51,100 (Level - 8)', classDigit: '2', classLabelGu: 'વર્ગ - ૨' },

  // Class 3 (Levels 1 to 7)
  { level: '7', scale: '₹44,900–₹1,42,400', label: '₹44,900–₹1,42,400 (Level - 7)', classDigit: '3', classLabelGu: 'વર્ગ - ૩' },
  { level: '6', scale: '₹35,400–₹1,12,400', label: '₹35,400–₹1,12,400 (Level - 6)', classDigit: '3', classLabelGu: 'વર્ગ - ૩' },
  { level: '5', scale: '₹29,200–₹92,300', label: '₹29,200–₹92,300 (Level - 5)', classDigit: '3', classLabelGu: 'વર્ગ - ૩' },
  { level: '4', scale: '₹25,500–₹81,100', label: '₹25,500–₹81,100 (Level - 4)', classDigit: '3', classLabelGu: 'વર્ગ - ૩' },
  { level: '3', scale: '₹21,700–₹69,100', label: '₹21,700–₹69,100 (Level - 3)', classDigit: '3', classLabelGu: 'વર્ગ - ૩' },
  { level: '2', scale: '₹19,900–₹63,200', label: '₹19,900–₹63,200 (Level - 2)', classDigit: '3', classLabelGu: 'વર્ગ - ૩' },
  { level: '1', scale: '₹18,000–₹56,900', label: '₹18,000–₹56,900 (Level - 1)', classDigit: '3', classLabelGu: 'વર્ગ - ૩' },

  // Class 4 (Lower than Level 1 / Level 1S)
  { level: '1S', scale: '₹14,800–₹47,100', label: '₹14,800–₹47,100 (Level - 1S)', classDigit: '4', classLabelGu: 'વર્ગ - ૪' },
];

/** Converts position status to official Gujarati text.
 *
 * Accepts either vocabulary through a single normalised comparison: the legacy
 * UPPER_SNAKE form (`UNDER_CHARGE`, `UNDER CHARGE`) and the register's Title Case
 * (`Under Charge`) both upper-case to the same key.
 *
 * Under charge is its own legal state — an officer holds the post on additional
 * charge, with no regular appointee — so it must NOT collapse into plain vacant
 * (`ખાલી`); it is `ખાલી/ચાર્જમાં`. The `ઈ/ચા` marker on the name column
 * (see CHARGE_PREFIX) is a separate signal and is not repeated here.
 *
 * Filled -> ભરેલ, Vacant -> ખાલી, Under Charge -> ખાલી/ચાર્જમાં,
 * Abolished -> અબેયન્સ, Cancelled -> રદ. Unrecognised values pass through unchanged. */
export const statusGu = (s: string | null | undefined): string => {
  if (!s) return '';
  const val = String(s).trim().toUpperCase();
  if (val === 'FILLED') return 'ભરેલ';
  if (val === 'VACANT') return 'ખાલી';
  if (val === 'UNDER_CHARGE' || val === 'UNDER CHARGE') return 'ખાલી/ચાર્જમાં';
  if (val === 'ABOLISHED' || val === 'ABEYANCE') return 'અબેયન્સ';
  if (val === 'CANCELLED' || val === 'CANCELED') return 'રદ';
  return String(s);
};

/** Prefix used for additional-charge holders in the name column (e.g. ઈ/ચા Name). */
export const CHARGE_PREFIX = 'ઈ/ચા';

/** Formats a charge-holder name with the official ઈ/ચા prefix. */
export const formatChargeName = (name?: string | null): string => {
  const n = (name ?? '').toString().trim();
  if (!n || n === '-') return '';
  return `${CHARGE_PREFIX} ${n}`;
};


