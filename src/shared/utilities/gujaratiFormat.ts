/**
 * Gujarati Government Document Formatting Utilities
 * 
 * Provides helpers for:
 * - Gujarati numeral conversion & parsing
 * - Boxed character, date, pin, and phone markup generation
 * - Date formatting in standard Gujarati government formats
 */

export const GUJARATI_DIGITS_MAP: Record<string, string> = {
  '0': '૦',
  '1': '૧',
  '2': '૨',
  '3': '૩',
  '4': '૪',
  '5': '૫',
  '6': '૬',
  '7': '૭',
  '8': '૮',
  '9': '૯',
};

export const ARABIC_DIGITS_MAP: Record<string, string> = {
  '૦': '0',
  '૧': '1',
  '૨': '2',
  '૩': '3',
  '૪': '4',
  '૫': '5',
  '૬': '6',
  '૭': '7',
  '૮': '8',
  '૯': '9',
};

/**
 * Converts English/Arabic digits in a string or number to Gujarati numerals.
 */
export function toGujaratiNumerals(input: string | number | null | undefined): string {
  if (input === null || input === undefined || input === '') return '';
  return String(input).replace(/[0-9]/g, (d) => GUJARATI_DIGITS_MAP[d] ?? d);
}

/**
 * Parses a Gujarati numeral string back to standard JavaScript number.
 */
export function parseGujaratiNumerals(input: string | null | undefined): number {
  if (!input) return 0;
  let arabicStr = String(input).replace(/[૦-૯]/g, (d) => ARABIC_DIGITS_MAP[d] ?? d);
  arabicStr = arabicStr.replace(/,/g, '');
  const match = /[+-]?(?:\d+\.?\d*|\.\d+)/.exec(arabicStr);
  if (!match) return 0;
  const val = parseFloat(match[0]);
  return isNaN(val) ? 0 : val;
}

/**
 * Formats a Date object or date string into DD-MM-YYYY.
 */
export function formatDateForBox(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    // If it's already in DD-MM-YYYY or similar string
    if (typeof date === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(date)) {
      return date;
    }
    return '';
  }
  const day = ('0' + d.getDate()).slice(-2);
  const month = ('0' + (d.getMonth() + 1)).slice(-2);
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Formats a Date into DD-MM-YYYY with Gujarati numerals.
 */
export function formatDateStandardGujarati(date: string | Date | null | undefined): string {
  if (!date) return '';
  const standard = formatDateForBox(date);
  if (!standard) return '';
  return toGujaratiNumerals(standard);
}

/**
 * Generates boxed HTML for individual PIN code digits.
 */
export function createPinBoxesHTML(pin: string | number | null | undefined, boxCount = 6): string {
  const pinStr = String(pin || '').replace(/\D/g, '').slice(0, boxCount);
  let html = '<div class="box-container inline-flex gap-1">';
  for (let i = 0; i < boxCount; i++) {
    const char = pinStr[i] || '&nbsp;';
    const gujChar = char !== '&nbsp;' ? toGujaratiNumerals(char) : '&nbsp;';
    html += `<span class="box-cell border border-black inline-flex items-center justify-center text-center font-bold text-xs" style="width:16px;height:20px;border:1px solid #000;display:inline-block;line-height:20px;text-align:center;">${gujChar}</span>`;
  }
  html += '</div>';
  return html;
}

/**
 * Generates boxed HTML for Phone numbers.
 */
export function createPhoneBoxesHTML(phone: string | number | null | undefined, boxCount = 10): string {
  const phoneStr = String(phone || '').replace(/\D/g, '').slice(0, boxCount);
  let html = '<div class="box-container inline-flex gap-1">';
  for (let i = 0; i < boxCount; i++) {
    const char = phoneStr[i] || '&nbsp;';
    const gujChar = char !== '&nbsp;' ? toGujaratiNumerals(char) : '&nbsp;';
    html += `<span class="box-cell border border-black inline-flex items-center justify-center text-center font-bold text-xs" style="width:16px;height:20px;border:1px solid #000;display:inline-block;line-height:20px;text-align:center;">${gujChar}</span>`;
  }
  html += '</div>';
  return html;
}

/**
 * Generates boxed HTML for DD-MM-YYYY dates with visual separator dashes.
 */
export function createDateBoxesHTML(dateFormatted: string | Date | null | undefined): string {
  const formatted = formatDateForBox(dateFormatted);
  if (!formatted) {
    return createEmptyDateBoxesHTML();
  }

  const parts = formatted.split('-');
  const dd = parts[0] || '  ';
  const mm = parts[1] || '  ';
  const yyyy = parts[2] || '    ';

  const makeBox = (char: string) =>
    `<span class="box-cell" style="width:16px;height:20px;border:1px solid #000;display:inline-block;line-height:20px;text-align:center;font-weight:bold;font-size:11px;">${char ? toGujaratiNumerals(char) : '&nbsp;'}</span>`;

  return (
    `<div class="date-box-row" style="display:inline-flex;align-items:center;gap:2px;">` +
    makeBox(dd[0] || '') +
    makeBox(dd[1] || '') +
    `<span style="margin:0 1px;font-weight:bold;">-</span>` +
    makeBox(mm[0] || '') +
    makeBox(mm[1] || '') +
    `<span style="margin:0 1px;font-weight:bold;">-</span>` +
    makeBox(yyyy[0] || '') +
    makeBox(yyyy[1] || '') +
    makeBox(yyyy[2] || '') +
    makeBox(yyyy[3] || '') +
    `</div>`
  );
}

function createEmptyDateBoxesHTML(): string {
  const makeBox = () =>
    `<span class="box-cell" style="width:16px;height:20px;border:1px solid #000;display:inline-block;line-height:20px;text-align:center;font-size:11px;">&nbsp;</span>`;

  return (
    `<div class="date-box-row" style="display:inline-flex;align-items:center;gap:2px;">` +
    makeBox() +
    makeBox() +
    `<span style="margin:0 1px;font-weight:bold;">-</span>` +
    makeBox() +
    makeBox() +
    `<span style="margin:0 1px;font-weight:bold;">-</span>` +
    makeBox() +
    makeBox() +
    makeBox() +
    makeBox() +
    `</div>`
  );
}

/**
 * Generates character boxes for English text (e.g. DDO codes, employee names).
 */
export function createCharBoxesHTML(text: string | null | undefined, boxCount = 15, uppercase = true): string {
  let str = (text || '').trim();
  if (uppercase) str = str.toUpperCase();
  let html = '<div class="char-box-row" style="display:inline-flex;gap:1px;">';
  for (let i = 0; i < boxCount; i++) {
    const char = str[i] || '&nbsp;';
    html += `<span class="char-cell" style="width:15px;height:18px;border:1px solid #000;display:inline-block;line-height:18px;text-align:center;font-weight:600;font-size:10px;font-family:monospace;">${char}</span>`;
  }
  html += '</div>';
  return html;
}

const GUJARATI_NUM_WORDS: string[] = [
  'શૂન્ય', 'એક', 'બે', 'ત્રણ', 'ચાર', 'પાંચ', 'છ', 'સાત', 'આઠ', 'નવ', 'દસ',
  'અગિયાર', 'બાર', 'તેર', 'ચૌદ', 'પંદર', 'સોળ', 'સત્તર', 'અઢાર', 'ઓગણીસ', 'વીસ',
  'એકવીસ', 'બાવીસ', 'ત્રેવીસ', 'ચોવીસ', 'પચ્ચીસ', 'છવ્વીસ', 'સત્તાવીસ', 'અઠ્ઠાવીસ', 'ઓગણત્રીસ', 'ત્રીસ',
  'એકત્રીસ', 'બત્રીસ', 'તેત્રીસ', 'ચોત્રીસ', 'પાંત્રીસ', 'છત્રીસ', 'સાડત્રીસ', 'આડત્રીસ', 'ઓગણચાલીસ', 'ચાલીસ',
  'એકતાલીસ', 'બેતાલીસ', 'તેતાલીસ', 'ચુમ્માલીસ', 'પિસ્તાલીસ', 'છેતાલીસ', 'સુડતાલીસ', 'અડતાલીસ', 'ઓગણપચાસ', 'પચાસ',
  'એકાવન', 'બાવન', 'ત્રેપન', 'ચોપન', 'પંચાવન', 'છપ્પન', 'સત્તાવન', 'અઠ્ઠાવન', 'ઓગણસાઠ', 'સાઠ',
  'એકસઠ', 'બાસઠ', 'ત્રેસઠ', 'ચોસઠ', 'પાંસઠ', 'છાસઠ', 'સડસઠ', 'અડસઠ', 'અગણોસિત્તેર', 'સિત્તેર',
  'એકોતેર', 'બોતેર', 'ત્રેતેર', 'ચોમોતેર', 'પંચોતેર', 'છોતેર', 'સીંતોતેર', 'ઈઠોતેર', 'ઓગણાએંસી', 'એંસી',
  'એક્યાસી', 'બ્યાસી', 'ત્યાસી', 'ચોર્યાસી', 'પંચાસી', 'છ્યાસી', 'સત્યાસી', 'અઠ્યાસી', 'નેવ્યાસી', 'નેવું',
  'એકાણું', 'બાણું', 'ત્રાણું', 'ચોરાણું', 'પંચાણું', 'છન્નું', 'સત્તાણું', 'અઠ્ઠાણું', 'નવાણું',
];

export function numberToWordsGujarati(num: number): string {
  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'શૂન્ય';

  const parts: string[] = [];

  const crore = Math.floor(n / 10000000);
  let rem = n % 10000000;

  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;

  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;

  const hundred = Math.floor(rem / 100);
  const tens = rem % 100;

  if (crore > 0) {
    parts.push(`${numberToWordsGujarati(crore)} કરોડ`);
  }
  if (lakh > 0) {
    parts.push(`${GUJARATI_NUM_WORDS[lakh] || String(lakh)} લાખ`);
  }
  if (thousand > 0) {
    parts.push(`${GUJARATI_NUM_WORDS[thousand] || String(thousand)} હજાર`);
  }
  if (hundred > 0) {
    parts.push(`${GUJARATI_NUM_WORDS[hundred] || String(hundred)} સો`);
  }
  if (tens > 0) {
    parts.push(GUJARATI_NUM_WORDS[tens] || String(tens));
  }

  return parts.join(' ').trim();
}

export function formatWordsCertificateGujarati(num: number): string {
  if (!num || num <= 0) return '';
  return `${numberToWordsGujarati(num)}`;
}

