import React from 'react';
import { cn } from '@/utils/cn';

interface RotatedHeaderProps {
  children: React.ReactNode;
  height?: number;
  bold?: boolean;
  className?: string;
}

/**
 * RotatedHeader — vertical column head for GTR-30 inner sheets.
 *
 * Design philosophy:
 * - Uses Tailwind utilities for layout, typography and transform.
 * - `rotate(-90deg)` via CSS transform keeps html2canvas/print faithful
 *   (avoids `writing-mode: vertical-rl` stacking bug).
 * - Typography: Plus Jakarta Sans (app sans) via `font-sans`, tabular
 *   tracking tightened (-0.1px) for dense A4 landscape fit.
 * - Two weights only: 600 (regular rotated head) / 700 (gross/total).
 * - Default height matches the inner sheets' header row (`h-[165px]`, see
 *   GTR30_INNER_HEADER_ROW_H in GTR30InnerPageHeaderSlot.tsx) so rotated
 *   text uses the full band and long heads are less likely to clip.
 * - Screen-only affordance: a native `title` tooltip lets users read the
 *   rotated heads on hover without affecting print output.
 */
export const RotatedHeader: React.FC<RotatedHeaderProps> = ({
  children,
  height = 165,
  bold = false,
  className = '',
}) => {
  const tooltip =
    typeof children === 'string' ? children : React.Children.toArray(children).filter((c): c is string => typeof c === 'string').join(' ');

  return (
    <div
      title={tooltip || undefined}
      className={cn(
        'relative flex w-full items-end justify-center overflow-hidden box-border',
        className,
      )}
      style={{ height: `${height}px`, maxHeight: `${height}px` }}
    >
      <div
        className={cn(
          'absolute left-1/2 bottom-1 -ml-[5.5px] -rotate-90 origin-[0%_100%]',
          'text-left whitespace-normal break-words',
          'font-sans tracking-[-0.1px] leading-[1.15] text-[6.7pt]',
          bold ? 'font-bold' : 'font-semibold',
        )}
        style={{ width: `${height - 12}px` }}
      >
        {children}
      </div>
    </div>
  );
};
