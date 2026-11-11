import React from 'react';
import { FileWarning } from 'lucide-react';

interface ResolutionPostsToggleProps {
  /** True = Abolished/Cancelled posts stay in the report. */
  checked: boolean;
  onChange: (next: boolean) => void;
  /** How many such posts the OFF state is hiding — surfaced as a live hint. */
  hiddenCount?: number;
  /** Hidden when a view already has no other control it can sit beside. */
  className?: string;
}

/**
 * "Include Abolished / Cancelled posts" toggle.
 * Decides whether terminal administrative posts (kept in abeyance / cancelled by a resolution) count as sanctioned positions.
 */
export const ResolutionPostsToggle: React.FC<ResolutionPostsToggleProps> = ({
  checked,
  onChange,
  hiddenCount = 0,
  className = '',
}) => (
  <label
    title="Abolished and cancelled posts are terminal posts — turn ON to include them in rows, totals and exports"
    className={`inline-flex cursor-pointer select-none items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
      checked
        ? 'border-purple-300 bg-purple-50 text-purple-900'
        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
    } ${className}`}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="h-3.5 w-3.5 rounded border-slate-300 text-purple-700 focus:ring-purple-600"
    />
    <FileWarning className={`h-3.5 w-3.5 shrink-0 ${checked ? 'text-purple-700' : 'text-slate-400'}`} />
    <span className="whitespace-nowrap">
      Include <span className="font-semibold">Abolished / Cancelled</span> posts
    </span>
    {!checked && hiddenCount > 0 && (
      <span className="rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-semibold tabular-nums text-slate-500">
        {hiddenCount} hidden
      </span>
    )}
  </label>
);
