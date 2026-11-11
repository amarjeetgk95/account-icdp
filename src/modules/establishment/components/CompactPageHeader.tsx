import React from 'react';

export interface HeaderStat {
  label: string;   // English label (top line)
  gu: string;      // Gujarati label (bottom line)
  value: number | string;
  text: string;    // tailwind text color class for the value
  accent: string;  // tailwind border-l color class
  hint?: string;   // optional right-side hint (e.g. fill %)
}

export type HeaderIconTone =
  | 'bg-blue-100 text-blue-800'    // default
  | 'bg-slate-900 text-white'      // report pages
  | 'bg-teal-100 text-teal-800';   // office register

export const CompactPageHeader: React.FC<{
  icon: React.ReactNode;
  iconTone?: HeaderIconTone;
  title: React.ReactNode;
  titleGu?: string;
  meta?: React.ReactNode;
  stats?: HeaderStat[];
  actions?: React.ReactNode;
}> = ({ icon, iconTone = 'bg-blue-100 text-blue-800', title, titleGu, meta, stats, actions }) => (
  <header className="bg-white rounded-xl border border-slate-200 shadow-sm no-print font-gujSans">
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2.5 sm:px-4">
      {/* Title block */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`p-1.5 rounded-lg shrink-0 ${iconTone}`}>{icon}</span>
        <div className="min-w-0">
          <h1 className="text-base font-bold tracking-tight text-slate-900 leading-tight">
            {title}
            {titleGu ? <span className="text-slate-500 font-medium text-xs"> ({titleGu})</span> : null}
          </h1>
          {meta ? (
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">{meta}</p>
          ) : null}
        </div>
      </div>

      {/* Inline stat chips */}
      {stats && stats.length > 0 && (
        <dl className="flex flex-wrap items-center gap-2">
          {stats.map((c, i) => (
            <div
              key={`${c.label}|${c.gu}|${i}`}
              className={`inline-flex items-center gap-2.5 rounded-lg border border-slate-200 border-l-4 ${c.accent} bg-slate-50/60 pl-2.5 pr-3 py-1.5`}
            >
              <dt className="order-2 leading-tight text-left">
                <span className="block text-[11px] font-semibold text-slate-600 whitespace-nowrap">{c.label}</span>
                <span className="block text-[10px] font-medium text-slate-400 whitespace-nowrap">
                  {c.gu}
                  {c.hint ? <span className="ml-1 font-semibold tabular-nums text-slate-400">{c.hint}</span> : null}
                </span>
              </dt>
              <dd className={`order-1 text-lg font-semibold tabular-nums leading-none ${c.text}`}>{c.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Action buttons */}
      {actions ? (
        <div className="flex w-full items-center gap-1.5 sm:w-auto sm:shrink-0 [&>*]:flex [&>*]:flex-wrap [&>*]:gap-1.5">
          {actions}
        </div>
      ) : null}
    </div>
  </header>
);

export const headerBtn = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed';
export const headerBtnPrimary = 'inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-900';
