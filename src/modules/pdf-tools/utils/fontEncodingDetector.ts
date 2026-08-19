/**
 * Utility to detect corrupted, legacy 8-bit non-Unicode Indic font encodings (mojibake)
 * commonly found in Indian government PDFs (e.g. Gopika, Shree-Guj, Saral, Terafont, Avantika).
 *
 * When such PDFs are parsed by PDF.js vector extraction, they produce ASCII mojibake
 * (such as "~lijJfl~oll", "(\f~ ()f~", "8?1Slfi", "E.RC\flSI") instead of proper Unicode Gujarati.
 */

export interface FontEncodingAnalysis {
  isGarbled: boolean;
  reason?: string;
  mojibakeRatio: number;
  gujaratiUnicodeCount: number;
  totalChars: number;
}

export function analyzeTextEncoding(text: string): FontEncodingAnalysis {
  if (!text || text.trim().length === 0) {
    return {
      isGarbled: false,
      mojibakeRatio: 0,
      gujaratiUnicodeCount: 0,
      totalChars: 0,
    };
  }

  const cleanText = text.trim();
  const totalChars = cleanText.length;

  // 1. Count valid Gujarati Unicode characters (\u0A80-\u0AFF)
  const gujaratiChars = (cleanText.match(/[\u0A80-\u0AFF]/g) || []).length;

  // 2. Count typical legacy 8-bit Indic font mapping artifacts:
  // - High density of tildes '~' (used for vowel signs/matras in Gopika/Terafont)
  // - Form feeds '\f' or backslashes '\'
  // - Question marks inside alphanumeric strings ('8?1Slfi', '?ISSJfi', 'Clf?~IEJ')
  // - Accented/special symbol clusters
  const tildes = (cleanText.match(/~/g) || []).length;
  const backslashes = (cleanText.match(/\\/g) || []).length;
  const formFeeds = (cleanText.match(/\f/g) || []).length;
  const questionInWord = (cleanText.match(/[a-zA-Z0-9]\?[a-zA-Z0-9]|\?[a-zA-Z0-9]/g) || []).length;
  const symbolClusters = (cleanText.match(/(\(\f~|\(\)f~|~\?|\?\.\.\.i|~[a-zA-Z]+~)/g) || []).length;

  const weightedMojibakeCount =
    tildes * 1.5 + backslashes * 1.5 + formFeeds * 3 + questionInWord * 2 + symbolClusters * 3;

  const mojibakeRatio = weightedMojibakeCount / totalChars;

  // If high mojibake ratio or multiple severe symbols present:
  if (tildes >= 4 || formFeeds >= 1 || mojibakeRatio > 0.02 || (tildes >= 2 && totalChars < 300)) {
    return {
      isGarbled: true,
      reason: `Detected legacy Indic font encoding with high symbol noise (${tildes} '~', ${formFeeds} form-feeds, ratio ${(mojibakeRatio * 100).toFixed(1)}%)`,
      mojibakeRatio,
      gujaratiUnicodeCount: gujaratiChars,
      totalChars,
    };
  }

  // 3. Check for pseudo-ASCII strings in Indic documents
  // If 0 Gujarati Unicode characters, but document contains jumbled case sequences
  const words = cleanText
    .split(/\s+/)
    .map((w) => w.replace(/^[^\w]+|[^\w]+$/g, ''))
    .filter((w) => w.length >= 2);

  if (words.length >= 4 && gujaratiChars === 0) {
    const commonEnglishRegex =
      /^(the|and|for|with|total|date|month|year|name|amount|bill|pay|salary|office|department|gujarat|surat|expenditure|grant|head|code|sub|major|minor|scheme|icdp|page|no|sr|item|description|particulars|rs|inr|rupees|net|gross|deduction|balance|budget|order|copy|from|to|gov|govt|government|bill|account|bank|branch|allowance|medical|travel|contingency|fodder|feed|medicine|district|animal|husbandry|shri|basic|hra|da|ta|cla|gpf|nps|gis|pt|it|lic|cpf)$/i;

    const recognizableEnglish = words.filter((w) => commonEnglishRegex.test(w)).length;
    const numericWords = words.filter((w) => /^[0-9.,/-]+$/.test(w)).length;
    const nonNumericWords = words.length - numericWords;

    if (nonNumericWords >= 4) {
      const englishRatio = recognizableEnglish / nonNumericWords;
      if (englishRatio >= 0.25 || recognizableEnglish >= 4) {
        // High confidence standard English document
        return {
          isGarbled: false,
          mojibakeRatio,
          gujaratiUnicodeCount: gujaratiChars,
          totalChars,
        };
      }

      // Pseudo-Indic tokens have internal uppercase/lowercase flips (e.g. "lijJfl", "E.RC\flSI", "CIO'lC1") or non-ASCII symbols
      const pseudoIndicTokens = words.filter((w) =>
        /[a-z]+[A-Z]+[a-z]+|[A-Z]+[a-z]+[A-Z]+|~|\\|\?/.test(w)
      ).length;

      const pseudoRatio = pseudoIndicTokens / nonNumericWords;

      if (pseudoRatio >= 0.25 || (englishRatio < 0.1 && pseudoIndicTokens >= 2)) {
        return {
          isGarbled: true,
          reason: `Detected pseudo-ASCII tokens typical of legacy Indic 8-bit fonts (${pseudoIndicTokens}/${nonNumericWords} tokens)`,
          mojibakeRatio,
          gujaratiUnicodeCount: gujaratiChars,
          totalChars,
        };
      }
    }
  }

  return {
    isGarbled: false,
    mojibakeRatio,
    gujaratiUnicodeCount: gujaratiChars,
    totalChars,
  };
}
