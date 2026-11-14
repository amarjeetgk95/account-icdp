/**
 * Bump when parser behaviour changes. Surfaced in the console and the batch
 * matrix header so a stale cached bundle is immediately obvious.
 */
export const PDF_PARSER_BUILD = 'v2.8';

export const AMOUNT_RE = /\b\d[\d,]*\.\d{2}\b/g;
export const HRPN_RE = /\b(\d{7,10})\b/;
export const SKIP_HRPN_PREFIX = /^(2403|0299)/;
