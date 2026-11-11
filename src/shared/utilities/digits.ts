// ============================================================================
// DIGIT NORMALIZER — English digits only for numeric values.
// WHY: operators often type with a Gujarati / Hindi / other Indic input tool
// active, which emits native-script digits (૦-૯, ०-९, ٠-٩ …). Those break
// date parsing, HRPN lookup, mobile tel: links and Excel round-trips.
// Browsers cannot force a keyboard layout, so every numeric entry point
// converts script digits to ASCII 0-9 on input (typing + paste).
// ============================================================================

/** [blockStart, blockEnd] for every known decimal digit block. */
const DIGIT_BLOCKS: Array<[number, number]> = [
  [0x0030, 0x0039], // ASCII 0-9 (no-op, kept for clarity)
  [0x0ae6, 0x0aef], // Gujarati ૦-૯
  [0x0966, 0x096f], // Devanagari ०-९
  [0x0a66, 0x0a6f], // Gurmukhi ੦-੯
  [0x09e6, 0x09ef], // Bengali ০-৯
  [0x0b66, 0x0b6f], // Oriya ୦-୯
  [0x0be6, 0x0bef], // Tamil ௦-௯
  [0x0c66, 0x0c6f], // Telugu ౦-౯
  [0x0ce6, 0x0cef], // Kannada ೦-೯
  [0x0d66, 0x0d6f], // Malayalam ൦-൯
  [0x0660, 0x0669], // Arabic-Indic ٠-٩
  [0x06f0, 0x06f9], // Extended Arabic-Indic / Persian ۰-۹
  [0xff10, 0xff19], // Fullwidth ０-９
];

/**
 * Convert any Indic / Arabic-Indic / fullwidth digits in `value` to ASCII 0-9.
 */
export function toEnglishDigits(value: string): string {
  if (!value) return value;
  let out = '';
  for (const ch of value) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x0030 && code <= 0x0039) {
      out += ch;
      continue;
    }
    let mapped = false;
    for (const [start, end] of DIGIT_BLOCKS) {
      if (code >= start && code <= end) {
        out += String.fromCharCode(0x0030 + (code - start));
        mapped = true;
        break;
      }
    }
    if (!mapped) out += ch;
  }
  return out;
}

/**
 * True while an IME composition is active (Gujarati transliteration /
 * Windows Gujarati keyboard, Google Input Tools, etc.).
 */
export function isComposingEvent(e: { nativeEvent?: unknown }): boolean {
  const ne = (e as { nativeEvent?: unknown })?.nativeEvent as
    | { isComposing?: boolean }
    | undefined;
  return !!ne?.isComposing;
}
