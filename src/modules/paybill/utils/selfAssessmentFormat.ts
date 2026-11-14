/**
 * Shared formatting helpers for the self-assessment memo — used by BOTH the
 * PDF generator (`services/selfAssessmentPdf.service.ts`) and the
 * printable document preview (`components/self-assessment/SelfAssessmentDocument.tsx`).
 * Previously copy-pasted verbatim in both files.
 */
import { formatINRInteger } from '@/shared/domain/currency';

/** en-IN grouped whole-rupee format used by the self-assessment memo. */
export const inr = formatINRInteger;

/**
 * Same as `inr`, but a rounded zero renders as an em dash (used for nil
 * deduction rows).
 */
export const inrOrDash = (n: number | undefined | null): string => {
  const val = Math.round(Number(n) || 0);
  return val > 0 ? inr(val) : '—';
};

/** Fix a legacy typo found in source designation data. */
export const formatDesignation = (d?: string): string =>
  (d || '').replace(/HUSBANDARY/gi, 'HUSBANDRY');
