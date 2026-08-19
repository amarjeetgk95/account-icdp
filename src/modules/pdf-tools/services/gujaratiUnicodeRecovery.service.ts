/**
 * Gujarati PDF Font / CMap & Indic Orthography Recovery Service
 *
 * Solves:
 * 1. Indic Pre-base Matra Reordering (e.g. "િવભાગીય" -> "વિભાગીય", "િસ્થતિ" -> "સ્થિતિ")
 * 2. Legacy Non-Unicode 8-bit Font Encodings & Mojibake (e.g. "કÖપાઉÑડ" -> "કમ્પાઉન્ડ", "ઈવેØયુએશન" -> "ઈવેલ્યુએશન")
 * 3. Glyph & Conjunct healing (Reph, Virama, Half-consonants, Anusvara)
 * 4. Extraction Quality Scoring & Decision Engine
 */

import type { ExtractedElement } from '../types/spatial.types';

export interface ExtractionQuality {
  valid: boolean;
  corruptionScore: number; // 0 (clean) to 1 (totally corrupted)
  needsRecovery: boolean;
  issues: string[];
  reorderedMatrasCount: number;
  recoveredGlyphsCount: number;
}

// Gujarati Unicode Ranges
// Consonants: ક (\u0A95) to ળ (\u0AB3), હ (\u0AB9)
const isGujaratiConsonant = (code: number) =>
  (code >= 0x0A95 && code <= 0x0AB9 && code !== 0x0ABA && code !== 0x0ABB) ||
  code === 0x0AB3;

// Virama (Halant): ્ (\u0ACD)
const GUJARATI_VIRAMA_CODE = 0x0ACD;

// Short-i Matra: િ (\u0ABF)
const GUJARATI_SHORT_I_CODE = 0x0ABF;

// Legacy glyph replacement dictionary for common Gujarati 8-bit DTP fonts (LMG Arun, Gopika, Terafont, Saral, Shree-Guj)
const LEGACY_GLYPH_MAP: Record<string, string> = {
  'Ö': '\u0AAE\u0ACD', // મ્ (half-ma) e.g. કÖપાઉ -> કમ્પાઉ
  'Ñ': '\u0A82\u0AA1', // ંડ or ણ્ / ં e.g. પાઉÑડ -> પાઉન્ડ
  'Ø': '\u0AB2\u0ACD\u0AAF', // લ્ય (half-la + ya) e.g. ઈવેØયુએશન -> ઈવેલ્યુએશન
  'Ð': '\u0AA7\u0ACD', // ધ્
  'û': '\u0A95\u0ACD\u0AB7', // ક્ષ
  'ü': '\u0A9C\u0ACD\u0A9E', // જ્ઞ
  'ý': '\u0AA4\u0ACD\u0AB0', // ત્ર
  'þ': '\u0AB6\u0ACD\u0AB0', // શ્ર
  'ÿ': '\u0AA6\u0ACD\u0AB5', // દ્વ
  'Ó': '\u0AA4\u0ACD\u0AA4', // ત્ત
  'Ô': '\u0AA5\u0ACD', // થ્
  'Õ': '\u0AA6\u0ACD', // દ્
  'Ù': '\u0AB0\u0ACD', // ર્ (reph)
  'Ú': '\u0A95\u0ACD\u0AB0', // ક્ર
  'Û': '\u0AB6\u0ACD', // શ્
  'Ü': '\u0AB8\u0ACD', // સ્
  'Ý': '\u0AB9\u0ACD', // હ્
  'Þ': '\u0AB7\u0ACD\u0A9F', // ષ્ટ
  'ß': '\u0A95\u0ACD\u0AB7', // ક્ષ
  'ã': '\u0ABE', // ા (aa matra)
  'ä': '\u0AC8', // ૈ (ai matra)
  'å': '\u0ABE', // ા
  'æ': '\u0A82', // ં (anusvara)
  'ç': '\u0AC3', // ૃ (ru matra)
  'è': '\u0AC7', // ે (e matra)
  'é': '\u0AC7', // ે (e matra)
  'ê': '\u0AC7', // ે
  'ë': '\u0AC8', // ૈ
  'ì': '\u0AC0', // ી (ee matra)
  'í': '\u0AC0', // ી (ee matra)
  'î': '\u0AC0', // ી
  'ï': '\u0AC0', // ી
  'ñ': '\u0A82', // ં (anusvara)
  'ò': '\u0ACB', // ો (o matra)
  'ó': '\u0ACB', // ો (o matra)
  'ô': '\u0ACB', // ો
  'õ': '\u0AC1', // ુ (u matra)
  'ö': '\u0ACC', // ૌ (au matra)
  'ù': '\u0AC2', // ૂ (oo matra)
  'ú': '\u0AC1', // ુ (u matra)
  'á': '\u0ABE', // ા
  'à': '\u0ABE', // ા
};

export class GujaratiUnicodeRecoveryService {
  /**
   * Assess the quality of extracted text and detect Unicode / font corruption
   */
  assessTextQuality(text: string): ExtractionQuality {
    if (!text || text.trim().length === 0) {
      return {
        valid: true,
        corruptionScore: 0,
        needsRecovery: false,
        issues: [],
        reorderedMatrasCount: 0,
        recoveredGlyphsCount: 0,
      };
    }

    const issues: string[] = [];
    const totalChars = text.length;

    // 1. Check for Misplaced Pre-base Short-i Matra: િ (\u0ABF) appearing without a preceding base consonant
    let misplacedMatras = 0;
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) === GUJARATI_SHORT_I_CODE) {
        const prevCode = i > 0 ? text.charCodeAt(i - 1) : 0;
        // In valid Unicode, \u0ABF must be immediately preceded by a consonant or virama
        const hasPrecedingConsonant = isGujaratiConsonant(prevCode) || prevCode === GUJARATI_VIRAMA_CODE;
        if (!hasPrecedingConsonant) {
          misplacedMatras++;
        }
      }
    }

    if (misplacedMatras > 0) {
      issues.push(`Detected ${misplacedMatras} misplaced pre-base short-i matra(s) ('\u0ABF')`);
    }

    // 2. Check for legacy Latin-1 / 8-bit glyph artifacts (Ö, Ø, Ñ, Ð, û, etc.)
    let legacyGlyphHits = 0;
    for (const char of Object.keys(LEGACY_GLYPH_MAP)) {
      const count = text.split(char).length - 1;
      if (count > 0) legacyGlyphHits += count;
    }
    if (legacyGlyphHits > 0) {
      issues.push(`Detected ${legacyGlyphHits} legacy font glyph artifact(s) (e.g. Ö, Ø, Ñ, Ð)`);
    }

    // 3. Check for replacement character \uFFFD
    const replacementChars = (text.match(/\uFFFD/g) || []).length;
    if (replacementChars > 0) {
      issues.push(`Detected ${replacementChars} Unicode replacement character(s) ()`);
    }

    // 4. Check for orphan virama or unattached combining marks at word starts
    const orphanViramas = (text.match(/(^|[\s])\u0ACD/g) || []).length;
    if (orphanViramas > 0) {
      issues.push(`Detected ${orphanViramas} orphan virama mark(s)`);
    }

    // Compute composite corruption score (0 to 1)
    const totalIssues = misplacedMatras * 2 + legacyGlyphHits * 2 + replacementChars * 3 + orphanViramas * 2;
    const corruptionScore = Math.min(1.0, totalIssues / Math.max(20, totalChars));
    const needsRecovery = totalIssues > 0;
    const valid = !needsRecovery && corruptionScore === 0;

    return {
      valid,
      corruptionScore: parseFloat(corruptionScore.toFixed(3)),
      needsRecovery,
      issues,
      reorderedMatrasCount: misplacedMatras,
      recoveredGlyphsCount: legacyGlyphHits,
    };
  }

  /**
   * Reorder Indic Pre-base Short-i Matra (િ / \u0ABF) to logical Unicode order
   * e.g. "િવભાગીય" -> "વિભાગીય", "િસ્થતિ" -> "સ્થિતિ"
   */
  reorderIndicMatras(text: string): string {
    if (!text || !text.includes('\u0ABF')) return text;

    const chars = Array.from(text);
    const result: string[] = [];

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const charCode = char.charCodeAt(0);

      // If we find an unattached short-i matra (\u0ABF) that is NOT preceded by a consonant
      if (charCode === GUJARATI_SHORT_I_CODE) {
        const prevCode = result.length > 0 ? result[result.length - 1].charCodeAt(0) : 0;
        const isAlreadyAttached = isGujaratiConsonant(prevCode) || prevCode === GUJARATI_VIRAMA_CODE;

        if (!isAlreadyAttached) {
          // Find the entire consonant cluster / conjunct that follows this matra
          let conjunctCluster = '';
          let j = i + 1;

          while (j < chars.length) {
            const nextCode = chars[j].charCodeAt(0);
            if (isGujaratiConsonant(nextCode)) {
              conjunctCluster += chars[j];
              j++;
              // If followed by Virama (\u0ACD), consume virama and next consonant (conjunct)
              if (j < chars.length && chars[j].charCodeAt(0) === GUJARATI_VIRAMA_CODE) {
                conjunctCluster += chars[j];
                j++;
                // Continue loop to consume next consonant in conjunct
                continue;
              }
              break;
            } else {
              break;
            }
          }

          if (conjunctCluster.length > 0) {
            // Push conjunct cluster FIRST, then the short-i matra AFTER it
            result.push(conjunctCluster);
            result.push('\u0ABF');
            i = j - 1; // Advance outer loop past the consumed conjunct
            continue;
          }
        }
      }

      result.push(char);
    }

    return result.join('');
  }

  /**
   * Decode legacy 8-bit font glyphs (LMG Arun / Terafont / Gopika / Saral)
   * e.g. "કÖપાઉÑડ" -> "કમ્પાઉન્ડ", "ઈવેØયુએશન" -> "ઈવેલ્યુએશન"
   */
  decodeLegacyFontGlyphs(text: string): string {
    if (!text) return text;

    let recovered = text;

    // Direct multi-char context replacements
    recovered = recovered
      .replace(/Ö/g, '\u0AAE\u0ACD') // મ્
      .replace(/Øયુ/g, '\u0AB2\u0ACD\u0AAF\u0AC1') // લ્યુ
      .replace(/Øય/g, '\u0AB2\u0ACD\u0AAF') // લ્ય
      .replace(/Ø/g, '\u0AB2\u0ACD') // લ્
      .replace(/ઉÑડ/g, '\u0A89\u0AA8\u0ACD\u0AA1') // ઉન્ડ
      .replace(/Ñડ/g, '\u0AA8\u0ACD\u0AA1') // ન્ડ
      .replace(/Ñ/g, '\u0A82'); // ં

    // Single character map replacements
    for (const [legacyChar, unicodeChar] of Object.entries(LEGACY_GLYPH_MAP)) {
      if (recovered.includes(legacyChar)) {
        recovered = recovered.split(legacyChar).join(unicodeChar);
      }
    }

    return recovered;
  }

  /**
   * Normalize and heal canonical Gujarati Unicode combinations
   */
  healGujaratiUnicode(text: string): string {
    if (!text) return text;

    return text
      // Normalize duplicate viramas
      .replace(/\u0ACD\u0ACD+/g, '\u0ACD')
      // Normalize duplicate anusvaras
      .replace(/\u0A82\u0A82+/g, '\u0A82')
      // Standard Unicode NFC Normalization
      .normalize('NFC');
  }

  /**
   * Complete recovery pipeline on a single string
   */
  recoverText(text: string): { text: string; wasRecovered: boolean; quality: ExtractionQuality } {
    const initialQuality = this.assessTextQuality(text);
    if (!initialQuality.needsRecovery) {
      return { text, wasRecovered: false, quality: initialQuality };
    }

    // Step 1: Decode legacy font glyphs
    let processed = this.decodeLegacyFontGlyphs(text);

    // Step 2: Reorder Indic matras
    processed = this.reorderIndicMatras(processed);

    // Step 3: Heal Unicode normalization & conjuncts
    processed = this.healGujaratiUnicode(processed);

    const finalQuality = this.assessTextQuality(processed);

    return {
      text: processed,
      wasRecovered: true,
      quality: finalQuality,
    };
  }

  /**
   * Apply recovery across an array of ExtractedElement objects, preserving exact geometry
   */
  recoverElements(elements: ExtractedElement[]): {
    elements: ExtractedElement[];
    recoveredCount: number;
    overallQuality: ExtractionQuality;
  } {
    let recoveredCount = 0;

    const recoveredElements = elements.map((element) => {
      const res = this.recoverText(element.text);
      if (res.wasRecovered) {
        recoveredCount++;
        return {
          ...element,
          text: res.text,
          source: 'font-recovered' as const,
          confidence: 95,
        };
      }
      return element;
    });

    const combinedRecovered = recoveredElements.map((e) => e.text).join(' ');
    const finalOverallQuality = this.assessTextQuality(combinedRecovered);

    return {
      elements: recoveredElements,
      recoveredCount,
      overallQuality: finalOverallQuality,
    };
  }
}

export const gujaratiUnicodeRecoveryService = new GujaratiUnicodeRecoveryService();
