import { useCountUp } from './hooks/useCountUp';
import { formatInr } from './format';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

/** Ultra-compact inline SVG sparkline for Net Pay trend (screen-only). */
function NetPaySparkline({ values, className = '' }: { values: number[]; className?: string }) {
  const w = 52;
  const h = 16;
  const p = 1.5;
  const safe = values.map((v) => (Number.isFinite(v) ? v : 0));
  const max = Math.max(...safe, 1);
  const min = Math.min(...safe, 0);
  const range = max - min || 1;
  const pts = safe.map(
    (v, i) =>
      `${(p + (i * (w - 2 * p)) / Math.max(safe.length - 1, 1)).toFixed(1)},${(
        h -
        p -
        ((v - min) / range) * (h - 2 * p)
      ).toFixed(1)}`
  );
  const last = pts[pts.length - 1]?.split(',') || [];

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      role="img"
      aria-label="Monthly net pay trend"
    >
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-emerald-500 dark:text-emerald-400"
      />
      {last.length === 2 && (
        <circle cx={last[0]} cy={last[1]} r="2" className="fill-emerald-600 dark:fill-emerald-300" />
      )}
    </svg>
  );
}

interface LedgerSummaryStripProps {
  annualGross: number;
  incomeTax: number;
  totalDeductions: number;
  netPay: number;
  yoyArrow: (current: number, key: 'gross' | 'net') => string | null;
  yoyHint: (current: number, key: 'gross' | 'net') => string | null;
  onJump: (rowKey: string) => void;
  monthlyNetValues: number[];
}

/**
 * Refined Ultra-Compact Financial KPI Strip:
 * - Micro-accent indicators, styled ratio badges, and clean contrast
 * - Preserves ~32px compact height allowing maximum vertical workspace
 * - Smooth jump affordance and count-up number transition
 */
export function LedgerSummaryStrip({
  annualGross,
  incomeTax,
  totalDeductions,
  netPay,
  yoyArrow,
  yoyHint,
  onJump,
  monthlyNetValues,
}: LedgerSummaryStripProps) {
  const animGross = useCountUp(annualGross);
  const animIncomeTax = useCountUp(incomeTax);
  const animTotalDeductions = useCountUp(totalDeductions);
  const animNetPay = useCountUp(netPay);

  const grossYoYArrow = yoyArrow(annualGross, 'gross');
  const netYoYArrow = yoyArrow(netPay, 'net');

  const taxPct = annualGross > 0 ? ((incomeTax / annualGross) * 100).toFixed(1) : '0.0';
  const dedPct = annualGross > 0 ? ((totalDeductions / annualGross) * 100).toFixed(1) : '0.0';
  const netPct = annualGross > 0 ? ((netPay / annualGross) * 100).toFixed(1) : '0.0';

  return (
    <div className="summary-bar shrink-0 bg-slate-100/70 dark:bg-slate-900/70 p-1 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs grid grid-cols-2 lg:grid-cols-4 gap-1">
      {/* 1. Annual Gross */}
      <button
        type="button"
        onClick={() => onJump('grossAmount')}
        title={
          grossYoYArrow
            ? `Annual Gross: ${formatInr(annualGross)} — click to jump (${yoyHint(annualGross, 'gross') || ''})`
            : 'Annual Gross — click to jump to row'
        }
        className="mini-stat keep-in-print group px-2.5 py-1.5 bg-white dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800/80 rounded-lg flex items-center justify-between gap-1.5 hover:border-blue-300 dark:hover:border-blue-700/80 hover:shadow-2xs transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ring-2 ring-blue-500/20 shrink-0" />
          <span className="mini-stat-label text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 truncate">
            Annual Gross
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono shrink-0">
          <span className="mini-stat-value text-xs font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
            {formatInr(animGross)}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
            100%
          </span>
          {grossYoYArrow && (
            <span
              className={`text-[9px] font-bold flex items-center gap-0.5 px-1 py-0.2 rounded ${
                grossYoYArrow === '▲'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
              }`}
            >
              {grossYoYArrow === '▲' ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
              YoY
            </span>
          )}
        </div>
      </button>

      {/* 2. Income Tax */}
      <button
        type="button"
        onClick={() => onJump('incomeTax')}
        title="Income Tax — click to jump to row"
        className="mini-stat keep-in-print group px-2.5 py-1.5 bg-white dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800/80 rounded-lg flex items-center justify-between gap-1.5 hover:border-amber-300 dark:hover:border-amber-700/80 hover:shadow-2xs transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-amber-500/20 shrink-0" />
          <span className="mini-stat-label text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 truncate">
            Income Tax (TDS)
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono shrink-0">
          <span className="mini-stat-value text-xs font-extrabold text-amber-700 dark:text-amber-400 tabular-nums">
            {formatInr(animIncomeTax)}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
            {taxPct}%
          </span>
        </div>
      </button>

      {/* 3. Total Deductions */}
      <button
        type="button"
        onClick={() => onJump('totalDeductions')}
        title="Total Deductions — click to jump to row"
        className="mini-stat keep-in-print group px-2.5 py-1.5 bg-white dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800/80 rounded-lg flex items-center justify-between gap-1.5 hover:border-rose-300 dark:hover:border-rose-700/80 hover:shadow-2xs transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-rose-500/20 shrink-0" />
          <span className="mini-stat-label text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 truncate">
            Total Deductions
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono shrink-0">
          <span className="mini-stat-value text-xs font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">
            {formatInr(animTotalDeductions)}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
            {dedPct}%
          </span>
        </div>
      </button>

      {/* 4. Net Take-Home */}
      <button
        type="button"
        onClick={() => onJump('netPay')}
        title={
          netYoYArrow
            ? `Net Take-Home: ${formatInr(netPay)} — click to jump (${yoyHint(netPay, 'net') || ''})`
            : 'Net Take-Home Pay — click to jump to row'
        }
        className="mini-stat keep-in-print group px-2.5 py-1.5 bg-white dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800/80 rounded-lg flex items-center justify-between gap-1.5 hover:border-emerald-300 dark:hover:border-emerald-700/80 hover:shadow-2xs transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shrink-0" />
          <span className="mini-stat-label text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 truncate">
            Net Take-Home
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono shrink-0">
          <span className="mini-stat-value text-xs font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
            {formatInr(animNetPay)}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
            {netPct}%
          </span>
          {netYoYArrow && (
            <span
              className={`text-[9px] font-bold flex items-center gap-0.5 px-1 py-0.2 rounded ${
                netYoYArrow === '▲'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
              }`}
            >
              {netYoYArrow === '▲' ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
              YoY
            </span>
          )}
          <NetPaySparkline values={monthlyNetValues} className="hidden 2xl:inline-block -my-1 shrink-0 ml-1" />
        </div>
      </button>
    </div>
  );
}




