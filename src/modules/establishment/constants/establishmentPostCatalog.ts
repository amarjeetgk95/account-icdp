export interface EstablishmentPostOption {
  name: string;
  payLevel: string;
  minPay: number;
  gujaratiName?: string;
}

/**
 * Cadre/post catalogue supplied from the Establishment sanctioned-strength
 * statement. Keep this order stable because it mirrors the source document.
 */
export const ESTABLISHMENT_POST_OPTIONS: EstablishmentPostOption[] = [
  { name: 'પટાવાળા વર્ગ-૪', payLevel: 'IS, 1', minPay: 14800 },
  { name: 'હવાલદાર', payLevel: 'IS, 3', minPay: 15700 },
  { name: 'નાયક', payLevel: 'IS, 2', minPay: 15000 },
  { name: 'ડ્રેસર', payLevel: 'IS, 3', minPay: 15700 },
  { name: 'દફતરબંધ', payLevel: 'IS, 2', minPay: 15000 },
  { name: 'એટેન્ડન્ટ', payLevel: 'IS, 1', minPay: 14800 },
  { name: 'ભરવાડ', payLevel: 'IS, 1', minPay: 14800 },
  { name: 'ચોકીદાર', payLevel: 'IS, 1', minPay: 14800 },
  { name: 'નંદી સેવક', payLevel: 'IS, 1', minPay: 14800 },
  { name: 'સાયસ', payLevel: 'IS, 1', minPay: 14800 },
  { name: 'મુખ્ય સાયસ', payLevel: 'IS, 3', minPay: 15700 },
  { name: 'બોટ ચાકર', payLevel: 'IS, 1', minPay: 14800 },
  { name: 'લેબોરેટરી એટેન્ડન્ટ', payLevel: 'IS, 1', minPay: 14800 },
  { name: 'સ્વીપર', payLevel: 'IS, 1', minPay: 14800 },
  { name: 'સાથી', payLevel: 'IS, 1', minPay: 14800 },
  { name: 'ગોવાળ', payLevel: 'IS, 1', minPay: 14800 },
  { name: 'કેરિયર', payLevel: 'IS, 1', minPay: 14800 },
  { name: 'ક્લીનર', payLevel: 'IS, 1', minPay: 14800 },
  { name: 'પેકર', payLevel: 'IS, 1', minPay: 14800 },
  { name: 'પટાવાળા કમ હમાલ', payLevel: 'IS, 1', minPay: 14800 },
  { name: 'કોચમેન', payLevel: 'IS, 1', minPay: 14800 },
  { name: 'વિલેજ લેવલ વર્કર', payLevel: 'Level 2', minPay: 19900 },
  { name: 'એક્સરે ટેકનિશિયન', payLevel: 'Level 2', minPay: 19900 },
  { name: 'જુનિયર કારકુન/જુ.કા કમ ટાઇપિસ્ટ/ટાઇપિસ્ટ', payLevel: 'Level 2', minPay: 19900 },
  { name: 'પ્રગતિ મદદનીશ', payLevel: 'Level 2', minPay: 19900 },
  { name: 'ગણક', payLevel: 'Level 2', minPay: 19900 },
  { name: 'ઇન્વેસ્ટિગેટર', payLevel: 'Level 2', minPay: 19900 },
  { name: 'લેબોરેટરી આસીસ્ટન્ટ', payLevel: 'Level 2', minPay: 19900 },
  { name: 'ડ્રાઇવર', payLevel: 'Level 2', minPay: 19900 },
  { name: 'સિનિયર કારકુન/જુનિયર ઓડિટર', payLevel: 'Level 4', minPay: 25500 },
  { name: 'સ્ટેનોગ્રાફર ગ્રેડ-૩', payLevel: 'Level 4', minPay: 25500 },
  { name: 'પ્રદર્શન મદદનીશ', payLevel: 'Level 4', minPay: 25500 },
  { name: 'પ્રોજેક્ટ ઓપરેટર', payLevel: 'Level 4', minPay: 25500 },
  { name: 'પશુધન નિરીક્ષક', payLevel: 'Level 4', minPay: 25500 },
  { name: 'ડેરી આસીસ્ટન્ટ', payLevel: 'Level 4', minPay: 25500 },
  { name: 'રેફ્રિજરેટર ઓપરેટર', payLevel: 'Level 4', minPay: 25500 },
  { name: 'બોઇલર ઓપરેટર', payLevel: 'Level 4', minPay: 25500 },
  { name: 'મદદનીશ કલાકાર (આર્ટિસ્ટ)', payLevel: 'Level 5', minPay: 29200 },
  { name: 'વિસ્તરણ અધિકારી (પશુપાલન)', payLevel: 'Level 5', minPay: 29200 },
  { name: 'આંકડા ઇન્સ્પેકટર', payLevel: 'Level 5', minPay: 29200 },
  { name: 'આંકડા મદદનીશ', payLevel: 'Level 5', minPay: 29200 },
  { name: 'આંકડા નિરીક્ષક', payLevel: 'Level 5', minPay: 29200 },
  { name: 'ઘાસચારા વિકાસ મદદનીશ', payLevel: 'Level 5', minPay: 29200 },
  { name: 'ખેતી નિરીક્ષક', payLevel: 'Level 5', minPay: 29200 },
  { name: 'ડેરી વિકાસ મદદનીશ', payLevel: 'Level 5', minPay: 29200 },
  { name: 'ગ્રેજ્યુએટ આસીસ્ટન્ટ', payLevel: 'Level 5', minPay: 29200 },
  { name: 'લેબોરેટરી ટેકનિશિયન', payLevel: 'Level 5', minPay: 29200 },
  { name: 'ઇલેક્ટ્રિક કમ મિકેનિક', payLevel: 'Level 5', minPay: 29200 },
  { name: 'મુખ્ય કારકુન / હિસાબનીશ', payLevel: 'Level 6', minPay: 29200 },
  { name: 'કચેરી અધિક્ષક/ ઓડિટર', payLevel: 'Level 7', minPay: 39900 },
  { name: 'સ્ટેનોગ્રાફર ગ્રેડ-૨', payLevel: 'Level 7', minPay: 39900 },
  { name: 'સંશોધન મદદનીશ', payLevel: 'Level 7', minPay: 39900 },
  { name: 'તાંત્રિક મદદનીશ', payLevel: 'Level 7', minPay: 39900 },
  { name: 'પશુચિકિત્સા અધિકારી', payLevel: 'Level 8', minPay: 44900 },
  { name: 'મદદનીશ વહીવટી અધિકારી', payLevel: 'Level 8', minPay: 44900 },
  { name: 'હિસાબી અધિકારી', payLevel: 'Level 8', minPay: 44900 },
  { name: 'આંકડા અધિકારી / ફિલ્ડ ઓફિસર / સંશોધન અધિકારી', payLevel: 'Level 8', minPay: 44900 },
  { name: 'મદદનીશ પશુપાલન નિયામક', payLevel: 'Level 9', minPay: 53100 },
  { name: 'વહીવટી અધિકારી', payLevel: 'Level 10', minPay: 56100 },
  { name: 'નાયબ નિયામક (મોજણી)', payLevel: 'Level 11', minPay: 67700 },
  { name: 'નાયબ નિયામક (આંકડા સંવર્ગ)', payLevel: 'Level 11', minPay: 67700 },
  { name: 'નાયબ નિયામક (હિસાબ)', payLevel: 'Level 11', minPay: 67700 },
  { name: 'નાયબ પશુપાલન નિયામક', payLevel: 'Level 11', minPay: 67700 },
  { name: 'સંયુક્ત પશુપાલન નિયામક', payLevel: 'Level 12', minPay: 78800 },
  { name: 'અધિક પશુપાલન નિયામક', payLevel: 'Level 13', minPay: 118500 },
  { name: 'પશુપાલન નિયામક', payLevel: 'Level 13 A', minPay: 131100 },
  { name: 'ઊંટ ચારક', payLevel: 'IS, 1', minPay: 14800 },
  { name: 'હેચરી આસીસ્ટન્ટ', payLevel: 'Level 4', minPay: 25500 },
];

/** English translations for official Gujarat Animal Husbandry designations (used for Form 24Q & Form-16) */
export const GUJARATI_TO_ENGLISH_DESIGNATION: Record<string, string> = {
  'પટાવાળા વર્ગ-૪': 'Peon Class-4',
  'હવાલદાર': 'Havaldar',
  'નાયક': 'Naik',
  'ડ્રેસર': 'Dresser',
  'દફતરબંધ': 'Daftari',
  'એટેન્ડન્ટ': 'Attendant',
  'ભરવાડ': 'Cattle Attendant',
  'ચોકીદાર': 'Chowkidar',
  'નંદી સેવક': 'Nandi Sevak',
  'સાયસ': 'Syce',
  'મુખ્ય સાયસ': 'Head Syce',
  'બોટ ચાકર': 'Boat Attendant',
  'લેબોરેટરી એટેન્ડન્ટ': 'Laboratory Attendant',
  'સ્વીપર': 'Sweeper',
  'સાથી': 'Sathi',
  'ગોવાળ': 'Gowali',
  'કેરિયર': 'Carrier',
  'ક્લીનર': 'Cleaner',
  'પેકર': 'Packer',
  'પટાવાળા કમ હમાલ': 'Peon cum Hamal',
  'કોચમેન': 'Coachman',
  'વિલેજ લેવલ વર્કર': 'Village Level Worker',
  'એક્સરે ટેકનિશિયન': 'X-Ray Technician',
  'જુનિયર કારકુન/જુ.કા કમ ટાઇપિસ્ટ/ટાઇપિસ્ટ': 'Junior Clerk / Typist',
  'જુનિયર કારકુન': 'Junior Clerk',
  'પ્રગતિ મદદનીશ': 'Progress Assistant',
  'ગણક': 'Enumerator',
  'ઇન્વેસ્ટિગેટર': 'Investigator',
  'લેબોરેટરી આસીસ્ટન્ટ': 'Laboratory Assistant',
  'ડ્રાઇવર': 'Driver',
  'સિનિયર કારકુન/જુનિયર ઓડિટર': 'Senior Clerk / Junior Auditor',
  'સિનિયર કારકુન': 'Senior Clerk',
  'સ્ટેનોગ્રાફર ગ્રેડ-૩': 'Stenographer Grade-3',
  'પ્રદર્શન મદદનીશ': 'Exhibition Assistant',
  'પ્રોજેક્ટ ઓપરેટર': 'Project Operator',
  'પશુધન નિરીક્ષક': 'Livestock Inspector',
  'ડેરી આસીસ્ટન્ટ': 'Dairy Assistant',
  'રેફ્રિજરેટર ઓપરેટર': 'Refrigerator Operator',
  'બોઇલર ઓપરેટર': 'Boiler Operator',
  'મદદનીશ કલાકાર (આર્ટિસ્ટ)': 'Assistant Artist',
  'વિસ્તરણ અધિકારી (પશુપાલન)': 'Extension Officer (Animal Husbandry)',
  'આંકડા ઇન્સ્પેકટર': 'Statistical Inspector',
  'આંકડા મદદનીશ': 'Statistical Assistant',
  'આંકડા નિરીક્ષક': 'Statistical Supervisor',
  'ઘાસચારા વિકાસ મદદનીશ': 'Fodder Development Assistant',
  'ખેતી નિરીક્ષક': 'Agriculture Inspector',
  'ડેરી વિકાસ મદદનીશ': 'Dairy Development Assistant',
  'ગ્રેજ્યુએટ આસીસ્ટન્ટ': 'Graduate Assistant',
  'લેબોરેટરી ટેકનિશિયન': 'Laboratory Technician',
  'ઇલેક્ટ્રિક કમ મિકેનિક': 'Electrician cum Mechanic',
  'મુખ્ય કારકુન / હિસાબનીશ': 'Head Clerk / Accountant',
  'મુખ્ય કારકુન': 'Head Clerk',
  'હિસાબનીશ': 'Accountant',
  'કચેરી અધિક્ષક/ ઓડિટર': 'Office Superintendent / Auditor',
  'કચેરી અધિક્ષક': 'Office Superintendent',
  'સ્ટેનોગ્રાફર ગ્રેડ-૨': 'Stenographer Grade-2',
  'સંશોધન મદદનીશ': 'Research Assistant',
  'તાંત્રિક મદદનીશ': 'Technical Assistant',
  'પશુચિકિત્સા અધિકારી': 'Veterinary Officer',
  'મદદનીશ વહીવટી અધિકારી': 'Assistant Administrative Officer',
  'હિસાબી અધિકારી': 'Accounts Officer',
  'આંકડા અધિકારી / ફિલ્ડ ઓફિસર / સંશોધન અધિકારી': 'Statistical Officer / Research Officer',
  'મદદનીશ પશુપાલન નિયામક': 'Assistant Director of Animal Husbandry',
  'વહીવટી અધિકારી': 'Administrative Officer',
  'નાયબ નિયામક (મોજણી)': 'Deputy Director (Survey)',
  'નાયબ નિયામક (આંકડા સંવર્ગ)': 'Deputy Director (Statistics)',
  'નાયબ નિયામક (હિસાબ)': 'Deputy Director (Accounts)',
  'નાયબ પશુપાલન નિયામક': 'Deputy Director of Animal Husbandry',
  'સંયુક્ત પશુપાલન નિયામક': 'Joint Director of Animal Husbandry',
  'અધિક પશુપાલન નિયામક': 'Additional Director of Animal Husbandry',
  'પશુપાલન નિયામક': 'Director of Animal Husbandry',
  'ઊંટ ચારક': 'Camel Attendant',
  'હેચરી આસીસ્ટન્ટ': 'Hatchery Assistant',
};

/** Get English designation for Form 24Q from Gujarati title */
export function englishDesignationOf(titleGu?: string | null): string {
  if (!titleGu) return '';
  const trimmed = titleGu.trim();
  return GUJARATI_TO_ENGLISH_DESIGNATION[trimmed] || trimmed;
}

/** Get Cadre Class ('Class-1'..'Class-4') from Pay Matrix Level */
export function cadreClassFromPayLevel(levelStr?: string | null): 'Class-1' | 'Class-2' | 'Class-3' | 'Class-4' {
  if (!levelStr) return 'Class-3';
  const s = levelStr.trim().toLowerCase();
  if (s.startsWith('is') || s.includes('sub') || s === 'class-4' || s === 'વર્ગ-૪') return 'Class-4';
  const m = s.match(/level\s*(\d+)/i);
  if (m) {
    const lvl = parseInt(m[1], 10);
    if (lvl >= 10) return 'Class-1';
    if (lvl >= 8) return 'Class-2';
    if (lvl >= 1) return 'Class-3';
  }
  return 'Class-3';
}

export const STANDARD_LEVEL_DETAILS: Record<
  string,
  { payScale: string; minPay: number; cadreClass: 'Class-1' | 'Class-2' | 'Class-3' | 'Class-4' }
> = {
  'IS, 1': { payScale: '14800-47100', minPay: 14800, cadreClass: 'Class-4' },
  'IS, 2': { payScale: '15000-47600', minPay: 15000, cadreClass: 'Class-4' },
  'IS, 3': { payScale: '15700-50000', minPay: 15700, cadreClass: 'Class-4' },
  'Level 1': { payScale: '18000-56900', minPay: 18000, cadreClass: 'Class-4' },
  'Level 2': { payScale: '19900-63200', minPay: 19900, cadreClass: 'Class-3' },
  'Level 3': { payScale: '21700-69100', minPay: 21700, cadreClass: 'Class-3' },
  'Level 4': { payScale: '25500-81100', minPay: 25500, cadreClass: 'Class-3' },
  'Level 5': { payScale: '29200-92300', minPay: 29200, cadreClass: 'Class-3' },
  'Level 6': { payScale: '35400-112400', minPay: 35400, cadreClass: 'Class-3' },
  'Level 7': { payScale: '39900-126600', minPay: 39900, cadreClass: 'Class-3' },
  'Level 8': { payScale: '44900-142400', minPay: 44900, cadreClass: 'Class-2' },
  'Level 9': { payScale: '53100-167800', minPay: 53100, cadreClass: 'Class-2' },
  'Level 10': { payScale: '56100-177500', minPay: 56100, cadreClass: 'Class-1' },
  'Level 11': { payScale: '67700-208700', minPay: 67700, cadreClass: 'Class-1' },
  'Level 12': { payScale: '78800-209200', minPay: 78800, cadreClass: 'Class-1' },
  'Level 13': { payScale: '118500-214100', minPay: 118500, cadreClass: 'Class-1' },
  'Level 13 A': { payScale: '131100-216600', minPay: 131100, cadreClass: 'Class-1' },
};

export function standardPayScaleForLevel(levelStr?: string | null): {
  payScale: string;
  minPay: number;
  cadreClass: 'Class-1' | 'Class-2' | 'Class-3' | 'Class-4';
} {
  if (!levelStr) {
    return { payScale: '25500-81100', minPay: 25500, cadreClass: 'Class-3' };
  }
  const exact = STANDARD_LEVEL_DETAILS[levelStr.trim()];
  if (exact) return exact;

  const cadre = cadreClassFromPayLevel(levelStr);
  return {
    payScale: '25500-81100',
    minPay: 25500,
    cadreClass: cadre,
  };
}

export function comparePostCatalogHigherToLower(
  a: { minPay?: number; cadreClass?: string; nameGu?: string; name?: string },
  b: { minPay?: number; cadreClass?: string; nameGu?: string; name?: string }
): number {
  // 1. Higher minPay first (Higher Pay to Lower)
  const payDiff = (b.minPay || 0) - (a.minPay || 0);
  if (payDiff !== 0) return payDiff;

  // 2. Class rank: Class-1 (1) -> Class-2 (2) -> Class-3 (3) -> Class-4 (4)
  const classRank = (c?: string) => {
    if (c === 'Class-1' || c === 'વર્ગ-૧' || c === '1') return 1;
    if (c === 'Class-2' || c === 'વર્ગ-૨' || c === '2') return 2;
    if (c === 'Class-3' || c === 'વર્ગ-૩' || c === '3') return 3;
    if (c === 'Class-4' || c === 'વર્ગ-૪' || c === '4') return 4;
    return 5;
  };

  const rankDiff = classRank(a.cadreClass) - classRank(b.cadreClass);
  if (rankDiff !== 0) return rankDiff;

  // 3. Alphabetical tie-break
  const nameA = a.nameGu || a.name || '';
  const nameB = b.nameGu || b.name || '';
  return nameA.localeCompare(nameB, 'gu');
}

export function buildDefaultPostCatalog(): import('../types/postCatalog').PostCatalogItem[] {
  const items = ESTABLISHMENT_POST_OPTIONS.map((opt, idx) => {
    const std = standardPayScaleForLevel(opt.payLevel);
    const enName = GUJARATI_TO_ENGLISH_DESIGNATION[opt.name] || opt.name;
    return {
      id: `post-${idx + 1}`,
      nameGu: opt.name,
      nameEn: enName,
      cadreClass: std.cadreClass,
      payLevel: opt.payLevel,
      payScale: std.payScale,
      minPay: opt.minPay || std.minPay,
      isActive: true,
      displayOrder: idx + 1,
    };
  });

  // Always order sequence from higher pay to lower
  items.sort(comparePostCatalogHigherToLower);

  return items.map((item, idx) => ({
    ...item,
    displayOrder: idx + 1,
  }));
}

export const DEFAULT_POST_CATALOG = buildDefaultPostCatalog();


