import React from 'react';
import type { GTR30FormData } from '../types';
import { GTR30SingleForm } from './GTR30SingleForm';
import { GTR30DeductionsOuterBack } from './GTR30DeductionsOuterBack';

interface Props {
  data: GTR30FormData;
}

/**
 * GTR-30 Page 1 / Outer
 *
 * Print target:
 *   A4 Landscape (297mm × 210mm)
 *
 * Layout:
 *   ┌────────────────────────┬────────────────────────┐
 *   │ GTR-30 FRONT           │ DEDUCTIONS / BACK      │
 *   │ GTR30SingleForm        │ GTR30Deductions...     │
 *   └────────────────────────┴────────────────────────┘
 *
 * Important:
 * - No column gap: both halves use the full printable width.
 * - Each child is allowed to scale/shrink only inside its own half.
 * - The central divider is visual only and does not participate in layout.
 * - The page itself is fixed-size for reliable A4 printing.
 */
export const GTR30Page1Outer: React.FC<Props> = ({ data }) => {
  return (
    <div
      id="gtr30-page-1"
      className="gtr30-page gtr30-landscape gtr30-page-1-outer"
      aria-label="GTR-30 A4 landscape page"
    >
      <div className="gtr30-page-inner">
        {/* LEFT HALF: GTR-30 FRONT */}
        <section
          id="gtr30-form-front-column"
          className="gtr30-half gtr30-front-half"
          aria-label="GTR-30 Front"
        >
          <div className="gtr30-half-content">
            <GTR30SingleForm
              data={data}
              instanceId="front"
            />
          </div>
        </section>

        {/* RIGHT HALF: DEDUCTIONS / BACK */}
        <section
          id="gtr30-form-back-column"
          className="gtr30-half gtr30-back-half"
          aria-label="GTR-30 Deductions / Back"
        >
          <div className="gtr30-half-content">
            <GTR30DeductionsOuterBack
              data={data}
              instanceId="back"
            />
          </div>
        </section>
      </div>
    </div>
  );
};
