import React from 'react';

/**
 * Height of the rotated-header band (`<thead>` row) on both GTR-30 inner
 * sheets. Kept as a single constant so P3/P4 headers stay perfectly level;
 * must match the hardcoded `h-[165px]` on the header `<tr>` (Tailwind cannot
 * generate arbitrary values from interpolated expressions).
 */
export const GTR30_INNER_HEADER_ROW_H = 165;

interface Props {
  children?: React.ReactNode;
}

/**
 * Shared top-of-page slot for the GTR-30 inner sheets.
 *
 * Page 3 renders the Gujarati scheme-resolution strip here; Page 4 has no
 * strip, so it previously used a magic `<div className="h-3.5" />` spacer to
 * stay optically aligned. Routing BOTH pages through this slot means any
 * future change to the strip's outer spacing automatically keeps the two
 * pages' tables vertically aligned.
 */
export const GTR30InnerPageHeaderSlot: React.FC<Props> = ({ children }) =>
  children ? (
    <div className="mb-1">{children}</div>
  ) : (
    <div className="h-3.5" aria-hidden="true" />
  );