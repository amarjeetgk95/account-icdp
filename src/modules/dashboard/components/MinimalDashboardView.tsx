import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '@/shared/utilities';
import { derivePayrollPacing } from '../utils/derive';
import type { ActionItem, PayrollSummary, TreasurySummary, VendorTdsSummary } from '../types';

interface MinimalDashboardViewProps {
  officeName: string;
  fy: number;
  payroll?: PayrollSummary;
  treasury?: TreasurySummary;
  vendor?: VendorTdsSummary;
  actions: ActionItem[];
  isFetching: boolean;
  updatedAt: number;
  onRefresh: () => void;
  onNavigate: (to: string) => void;
}

export function MinimalDashboardView({
  officeName,
  fy,
  payroll,
  treasury,
  vendor,
  actions,
  isFetching,
  updatedAt,
  onRefresh,
  onNavigate,
}: MinimalDashboardViewProps) {
  const pacing = payroll ? derivePayrollPacing(payroll.monthlyRoadmap) : null;
  const currentMonthPacing = pacing?.current ?? null;
  const filing = payroll?.statutoryDeadlines;
  const daysUntilFiling = filing?.daysUntilFiling ?? 0;

  const criticalActions = actions.filter((a) => a.severity === 'danger');
  const warningActions = actions.filter((a) => a.severity === 'warning');

  const totalTreasuryGross =
    (treasury?.gtr30GrossTotal ?? 0) + (treasury?.gtr44GrossTotal ?? 0);
  const totalTreasuryBills = (treasury?.gtr30Count ?? 0) + (treasury?.gtr44Count ?? 0);
  const totalTreasuryPending =
    (treasury?.gtr30PendingCount ?? 0) + (treasury?.gtr44DraftCount ?? 0);

  const totalVendorTds = vendor ? vendor.totalVendorIncomeTax + vendor.totalGstTds : 0;

  return (
    <div className="flex h-full w-full flex-1 flex-col justify-between overflow-hidden gap-2 text-slate-900 select-none min-h-0 dark:text-slate-100">
      {/* ── 1. Top Executive Status Ribbon (Fixed: ~28px) ── */}
      <div className="flex shrink-0 items-center justify-between rounded-lg border border-slate-200/80 bg-white/80 px-3 py-1.5 shadow-xs dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              criticalActions.length > 0
                ? 'bg-rose-500 ring-2 ring-rose-500/20'
                : warningActions.length > 0
                  ? 'bg-amber-500 ring-2 ring-amber-500/20'
                  : 'bg-emerald-500 ring-2 ring-emerald-500/20'
            }`}
          />
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {payroll ? (
              <>
                <strong className="font-semibold text-slate-900 dark:text-white">
                  {payroll.entryMonthName} Cycle
                </strong>{' '}
                reconciled at {currentMonthPacing?.pct ?? 100}%.{' '}
                {actions.length > 0 ? (
                  <span>
                    {criticalActions.length > 0 && `${criticalActions.length} urgent `}
                    {warningActions.length > 0 &&
                      `${criticalActions.length > 0 ? 'and ' : ''}${warningActions.length} pending `}
                    action items.
                  </span>
                ) : (
                  <span>All registers in balance.</span>
                )}
              </>
            ) : (
              <span>Connecting to {officeName || 'Account Office'}...</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2.5 text-[11px] text-slate-400 dark:text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Clock size={11} />
            {updatedAt > 0 ? 'Live data' : 'Connecting...'}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            className="inline-flex items-center gap-1 text-slate-500 transition hover:text-slate-900 disabled:opacity-40 dark:text-slate-400 dark:hover:text-white"
            title="Refresh dashboard metrics"
          >
            <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* ── 2. Core Numbers Ribbon (Hairline Divided Grid, Fixed: ~64px) ── */}
      <div className="shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800">
          {/* Tile 1: Disbursements */}
          <div className="flex flex-col justify-center px-4 py-2">
            <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
              Disbursements (YTD Gross)
            </div>
            <div className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 tabular-nums sm:text-xl dark:text-white">
              {payroll ? formatCurrency(payroll.ytdSalary) : '₹0'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Tax: {payroll ? formatCurrency(payroll.ytdTax) : '₹0'}
            </div>
          </div>

          {/* Tile 2: Monthly Payroll */}
          <button
            type="button"
            onClick={() => onNavigate('/payroll/entry')}
            className="group flex flex-col justify-center px-4 py-2 text-left transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
          >
            <div className="flex items-center justify-between text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
              <span>{payroll?.entryMonthName || 'Monthly'} Payroll</span>
              <ArrowRight size={11} className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
            </div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-900 tabular-nums sm:text-xl dark:text-white">
                {currentMonthPacing ? `${currentMonthPacing.pct}%` : '—'}
              </span>
              <span className="text-[11px] text-slate-400">
                ({currentMonthPacing ? `${currentMonthPacing.processed}/${currentMonthPacing.active}` : '0'})
              </span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-slate-900 transition-all dark:bg-slate-200"
                style={{ width: `${currentMonthPacing?.pct ?? 0}%` }}
              />
            </div>
          </button>

          {/* Tile 3: Treasury Outlay */}
          <button
            type="button"
            onClick={() => onNavigate('/gtr30')}
            className="group flex flex-col justify-center px-4 py-2 text-left transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
          >
            <div className="flex items-center justify-between text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
              <span>Treasury Outlay (GTR)</span>
              <ArrowRight size={11} className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
            </div>
            <div className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 tabular-nums sm:text-xl dark:text-white">
              {formatCurrency(totalTreasuryGross)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {totalTreasuryBills} bills ·{' '}
              <span className={totalTreasuryPending > 0 ? 'font-medium text-amber-600 dark:text-amber-400' : ''}>
                {totalTreasuryPending > 0 ? `${totalTreasuryPending} pending` : 'All cleared'}
              </span>
            </div>
          </button>

          {/* Tile 4: Statutory Filing */}
          <div className="flex flex-col justify-center px-4 py-2">
            <div className="flex items-center justify-between text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
              <span>Filing ({filing?.nextQuarterName ?? '24Q'})</span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  daysUntilFiling <= 15 ? 'bg-rose-500' : daysUntilFiling <= 45 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
            </div>
            <div className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 tabular-nums sm:text-xl dark:text-white">
              {daysUntilFiling < 0 ? `${Math.abs(daysUntilFiling)}d overdue` : `${daysUntilFiling} days`}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Due {filing?.nextQuarterFilingDate ?? '—'}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Main Body Grid: 65% Operations (Left) + 35% Action Desk (Right) ── */}
      <div className="grid flex-1 min-h-0 grid-cols-12 gap-2">
        {/* Left 8 Columns: Operations Engine */}
        <div className="col-span-8 flex flex-col gap-2 min-h-0">
          {/* Upper Section: Fiscal Year Roadmap & Quarterly Readiness (Compact) */}
          <section className="shrink-0 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 uppercase tracking-wider dark:text-white">
                FY {fy}-{String(fy + 1).slice(-2)} Pacing & 24Q Runway
              </span>
              <span className="text-[11px] text-slate-400">
                Active: <strong className="text-slate-800 dark:text-slate-200">{payroll?.currentQuarter || 'Q2'}</strong>
              </span>
            </div>

            {/* 12-Month Linear Strip */}
            <div className="mt-2 grid grid-cols-12 gap-1">
              {payroll?.monthlyRoadmap.map((m) => {
                const isComplete = m.status === 'complete';
                const isPartial = m.status === 'partial';
                return (
                  <div
                    key={m.month}
                    className={`flex flex-col items-center justify-center rounded border py-1 text-center transition ${
                      m.isCurrent
                        ? 'border-indigo-500 bg-indigo-50/60 font-semibold text-indigo-900 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-200'
                        : isComplete
                          ? 'border-emerald-200 bg-emerald-50/30 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'
                          : isPartial
                            ? 'border-amber-200 bg-amber-50/30 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300'
                            : 'border-slate-100 bg-slate-50/40 text-slate-400 dark:border-slate-800 dark:bg-slate-800/30'
                    }`}
                    title={`${m.month}: ${m.processed}/${m.active} (${m.pct}%)`}
                  >
                    <span className="text-[10px] uppercase font-medium">{m.month.slice(0, 3)}</span>
                    <span className="text-[10px] font-bold tabular-nums leading-none mt-0.5">
                      {m.future ? '—' : `${m.pct}%`}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Form 24Q Readiness */}
            <div className="mt-2.5 grid grid-cols-4 gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
              {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => {
                const qData = payroll?.quarterReadiness?.[q];
                const pct = qData?.pct ?? 0;
                const isCurrentQ = payroll?.currentQuarter === q;
                return (
                  <div key={q} className="flex flex-col justify-center">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-slate-600 dark:text-slate-400">
                        {q} {isCurrentQ && <span className="text-indigo-600 font-bold dark:text-indigo-400">●</span>}
                      </span>
                      <span className="tabular-nums font-semibold text-slate-800 dark:text-slate-200">{pct}%</span>
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 100
                            ? 'bg-emerald-500'
                            : pct > 0
                              ? 'bg-indigo-600 dark:bg-indigo-400'
                              : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Lower Section: 3 Balanced Workstreams (Fills remaining height) */}
          <div className="grid flex-1 min-h-0 grid-cols-3 gap-2">
            {/* Workstream 1: Payroll */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider dark:text-white">
                    Payroll Register
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('/payroll/entry')}
                    className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Open →
                  </button>
                </div>

                <div className="mt-2.5 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Active Roster</span>
                    <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                      {payroll?.activeEmployees ?? 0} staff
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Processed</span>
                    <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                      {currentMonthPacing?.processed ?? 0} / {currentMonthPacing?.active ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Pending</span>
                    <span
                      className={`font-semibold tabular-nums ${
                        (payroll?.pendingEmployees ?? 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {payroll?.pendingEmployees ?? 0} entries
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1.5 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Missing PAN</span>
                    <span
                      className={`font-semibold ${
                        (payroll?.missingPANs.length ?? 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {payroll?.missingPANs.length ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Zero-TDS</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {payroll?.zeroTaxEntries.length ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('/payroll')}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-slate-200 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Roster Details <ArrowRight size={11} />
              </button>
            </div>

            {/* Workstream 2: Treasury */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider dark:text-white">
                    Treasury (GTR)
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('/gtr30')}
                    className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    GTR-30 →
                  </button>
                </div>

                <div className="mt-2.5 space-y-2 text-xs">
                  <div className="rounded border border-slate-100 p-1.5 dark:border-slate-800">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">GTR-30 Cash</span>
                      <span className="font-bold tabular-nums">{treasury?.gtr30Count ?? 0} bills</span>
                    </div>
                    <div className="mt-0.5 flex justify-between text-[10px] text-slate-500">
                      <span>{formatCurrency(treasury?.gtr30GrossTotal ?? 0)}</span>
                      <span className={(treasury?.gtr30PendingCount ?? 0) > 0 ? 'text-amber-600 font-semibold dark:text-amber-400' : ''}>
                        {treasury?.gtr30PendingCount ?? 0} pending
                      </span>
                    </div>
                  </div>

                  <div className="rounded border border-slate-100 p-1.5 dark:border-slate-800">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">GTR-44 Contingent</span>
                      <span className="font-bold tabular-nums">{treasury?.gtr44Count ?? 0} bills</span>
                    </div>
                    <div className="mt-0.5 flex justify-between text-[10px] text-slate-500">
                      <span>{formatCurrency(treasury?.gtr44GrossTotal ?? 0)}</span>
                      <span className={(treasury?.gtr44DraftCount ?? 0) > 0 ? 'text-amber-600 font-semibold dark:text-amber-400' : ''}>
                        {treasury?.gtr44DraftCount ?? 0} drafts
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => onNavigate('/gtr30')}
                  className="flex items-center justify-center rounded-md border border-slate-200 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  GTR-30
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/gtr44')}
                  className="flex items-center justify-center rounded-md border border-slate-200 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  GTR-44
                </button>
              </div>
            </div>

            {/* Workstream 3: Vendor TDS */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider dark:text-white">
                    Vendor TDS (26Q)
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('/parties/gst')}
                    className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Parties →
                  </button>
                </div>

                <div className="mt-2.5 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Registered Parties</span>
                    <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                      {vendor?.partiesCount ?? 0} active
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Transactions</span>
                    <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                      {vendor?.transactionCount ?? 0} bills
                    </span>
                  </div>
                  <div className="border-t border-slate-100 pt-1.5 dark:border-slate-800">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Total TDS Deducted</div>
                    <div className="text-sm font-bold text-slate-900 tabular-nums dark:text-white">
                      {formatCurrency(totalVendorTds)}
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>IT: {formatCurrency(vendor?.totalVendorIncomeTax ?? 0)}</span>
                    <span>GST: {formatCurrency(vendor?.totalGstTds ?? 0)}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('/parties/gst')}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-slate-200 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Challans & GST <ExternalLink size={11} />
              </button>
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Action Desk (Full vertical height, internal scroll only) */}
        <div className="col-span-4 flex flex-col rounded-xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 min-h-0 overflow-hidden">
          {/* Action Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3.5 py-2.5 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider dark:text-white">
                Action Queue
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.2 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {actions.length}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Prioritized checklist</span>
          </div>

          {/* Internal Scrollable Task List */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 app-scroll">
            {actions.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 size={24} className="text-emerald-500" />
                <p className="mt-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Zero pending actions
                </p>
                <p className="text-[11px] text-slate-400">All registers are reconciled and clean.</p>
              </div>
            ) : (
              actions.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-start justify-between gap-2.5 px-3.5 py-2.5 transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        item.severity === 'danger'
                          ? 'bg-rose-500'
                          : item.severity === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-sky-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">
                          {item.title}
                        </span>
                        {item.count !== undefined && item.count > 0 && (
                          <span className="shrink-0 rounded bg-slate-100 px-1 py-0.2 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {item.count}
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {item.hint}
                      </p>
                      {item.amount !== undefined && item.amount > 0 && (
                        <div className="mt-1 text-[11px] font-semibold text-slate-700 tabular-nums dark:text-slate-300">
                          {formatCurrency(item.amount)}
                        </div>
                      )}
                    </div>
                  </div>

                  {item.action && (
                    <button
                      type="button"
                      onClick={() => {
                        if (item.category === 'payroll') onNavigate('/payroll/entry');
                        else if (item.category === 'treasury') onNavigate('/gtr30');
                        else if (item.category === 'vendor') onNavigate('/parties/gst');
                        else onNavigate('/reports');
                      }}
                      className="inline-flex shrink-0 items-center gap-0.5 rounded px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                      <span>{item.action}</span>
                      <ArrowUpRight size={11} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Micro Footer (Fixed: ~20px) ── */}
      <div className="flex shrink-0 items-center justify-between border-t border-slate-100 pt-1.5 text-[10px] text-slate-400 dark:border-slate-800">
        <span>Surat Tax System · ICDP Modern</span>
        <span>Fixed Viewport Cockpit · 100vh Non-Scrollable</span>
      </div>
    </div>
  );
}
