import { useState } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { formatCurrency } from '@/shared/utilities';
import { useNavigate } from 'react-router-dom';
import { useOfficeName } from '@/modules/settings/hooks/useOfficeName';
import { useUIStore } from '@/core/stores/ui-store';
import {
  RefreshCw,
  AlertCircle,
  Users,
  Banknote,
  Receipt,
  Search,
  X,
  ClipboardList,
  CalendarDays,
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { FYRoadmap } from '../components/FYRoadmap';
import { TaskList } from '../components/TaskList';
import { FVUReadinessWidget } from '../components/FVUReadinessWidget';
import { SalaryLookup } from '@/modules/payroll/components/SalaryLookup';
import { CommandPaletteModal } from '../components/CommandPaletteModal';

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboard();
  const navigate = useNavigate();
  const officeName = useOfficeName();
  const activeFy = useUIStore((state) => state.activeFinancialYear);
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [lookupQuery, setLookupQuery] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const fyMonth = ((new Date().getMonth() + 9) % 12) + 1;
  const fyProgress = Math.round((fyMonth / 12) * 100);

  const attentionChips: { label: string; tone: 'amber' | 'rose' | 'indigo'; to: string }[] = [];
  if ((data?.prevQuarterPending ?? 0) > 0) {
    attentionChips.push({
      label: `${data?.prevQuarterPending} prev-quarter entries pending`,
      tone: 'amber',
      to: '/payroll',
    });
  }
  if ((data?.zeroTaxEntries?.length ?? 0) > 0) {
    attentionChips.push({
      label: `${data?.zeroTaxEntries.length} zero-TDS entries`,
      tone: 'rose',
      to: '/payroll?tab=employees',
    });
  }
  if ((data?.missingPANs?.length ?? 0) > 0) {
    attentionChips.push({
      label: `${data?.missingPANs.length} missing PAN`,
      tone: 'rose',
      to: '/payroll?tab=employees',
    });
  }

  if (isLoading) {
    return (
      <div className="h-full overflow-hidden flex flex-col p-6 space-y-4 animate-pulse">
        <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="p-8 text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
            Could not load dashboard
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            {error instanceof Error
              ? error.message
              : 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw size={13} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="relative h-full overflow-hidden flex flex-col max-w-6xl mx-auto w-full select-none">


      {/* Header */}
      <div className="px-6 pt-6 pb-4 shrink-0 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/70 dark:border-slate-800">
        <div className="animate-fade-in">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            {officeName}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300">
              <CalendarDays size={12} className="text-indigo-500" />
              FY {data.fy}
            </span>
            {data.entryMonthName && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {data.entryMonthName}
              </span>
            )}
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400"
              title={`Month ${fyMonth} of the financial year (Apr–Mar)`}
            >
              <span className="w-24 h-1.5 bg-slate-200/80 dark:bg-slate-700 rounded-full overflow-hidden shrink-0">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                  style={{ width: `${fyProgress}%` }}
                />
              </span>
              Month {fyMonth}/12
            </span>
            {data.lastUpdated && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Updated {data.lastUpdated}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 animate-fade-in animate-fade-in-delay-1">
          {/* Command Palette Trigger */}
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors cursor-pointer"
          >
            <Search size={13} />
            <span>Search...</span>
            <kbd className="text-[10px] font-mono text-slate-400 dark:text-slate-500 ml-2">⌘K</kbd>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 px-6 py-5 overflow-y-auto space-y-5">

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
          <StatCard
            icon={Users}
            tone="indigo"
            label="Active Staff"
            value={String(data.activeEmployees ?? 0)}
            sub={(data.pendingEmployees ?? 0) > 0 ? `${data.pendingEmployees} pending` : 'All updated'}
            onClick={() => navigate('/payroll?tab=employees')}
          />
          <StatCard
            icon={Banknote}
            tone="emerald"
            label="Salary (YTD)"
            value={formatCurrency(data.ytdSalary ?? 0)}
            sub="Gross + DA"
            onClick={() => navigate('/payroll')}
          />
          <StatCard
            icon={Receipt}
            tone="amber"
            label="TDS (YTD)"
            value={formatCurrency(data.ytdTax ?? 0)}
            sub="24Q deductions"
            onClick={() => navigate('/reports')}
          />
          <StatCard
            icon={ClipboardList}
            tone="sky"
            label="Pending Tasks"
            value={data.tasks?.length ?? 0}
            sub={data.pendingEmployees ? `${data.pendingEmployees} to review` : 'Action items'}
            onClick={() => navigate('/payroll?tab=employees')}
          />
        </div>

        {/* Needs-attention chips */}
        {attentionChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 animate-fade-in animate-fade-in-delay-1">
            {attentionChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => navigate(chip.to)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                  chip.tone === 'rose'
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950'
                    : chip.tone === 'amber'
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950'
                      : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-950'
                }`}
              >
                <AlertCircle size={11} />
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Roadmap */}
        <div className="animate-fade-in animate-fade-in-delay-1">
          <FYRoadmap data={data.monthlyRoadmap ?? []} />
        </div>

        {/* Action Banner */}
        {(data.pendingEmployees ?? 0) > 0 && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-slate-200/80 dark:border-slate-800 border-l-2 border-l-indigo-500 bg-white dark:bg-slate-900 shadow-sm animate-fade-in animate-fade-in-delay-1">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {data.pendingEmployees} records need attention
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Update PAN formats and tax regime before Q{data.currentQuarter?.replace('Q', '')} filing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/payroll?tab=employees')}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shrink-0 transition-colors cursor-pointer"
            >
              Review →
            </button>
          </div>
        )}

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start animate-fade-in animate-fade-in-delay-2">
          <FVUReadinessWidget data={data} />

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm p-5 flex flex-col min-h-[360px]">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Tasks
              </h3>
              <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                {data.tasks?.length ?? 0}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <TaskList tasks={data.tasks ?? []} />
            </div>
          </div>
        </div>
      </div>

      {/* Command Palette */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectSalaryLookup={(query) => {
          setLookupQuery(query);
          setIsCommandPaletteOpen(false);
          setShowLookupModal(true);
        }}
        onRefresh={() => refetch()}
      />

      {/* Employee Lookup Modal */}
      {showLookupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Search size={15} className="text-slate-400" />
                Employee Lookup
              </span>
              <button
                type="button"
                onClick={() => setShowLookupModal(false)}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <SalaryLookup fy={activeFy || 2024} initialHrpn={lookupQuery} />
          </div>
        </div>
      )}
    </div>
  );
}