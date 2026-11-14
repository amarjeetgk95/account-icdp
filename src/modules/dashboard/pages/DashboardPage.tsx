import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { EmptyState } from '@/shared/components/EmptyState';
import { useOfficeName } from '@/modules/settings/hooks/useOfficeName';
import { useDashboard } from '../hooks/useDashboard';
import { buildActions } from '../utils/derive';
import { DashboardHeader } from '../components/DashboardHeader';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
import { MinimalDashboardView } from '../components/MinimalDashboardView';

export function DashboardPage() {
  const navigate = useNavigate();
  const officeName = useOfficeName();
  const {
    fy,
    payrollQuery,
    treasuryQuery,
    vendorQuery,
    refetchAll,
    isFetching,
    updatedAt,
  } = useDashboard();

  const payroll = payrollQuery.data;
  const treasury = treasuryQuery.data;
  const vendor = vendorQuery.data;

  const actions = useMemo(() => buildActions(payroll, treasury), [payroll, treasury]);

  const isInitialLoading =
    payrollQuery.isLoading && treasuryQuery.isLoading && vendorQuery.isLoading;
  const allErrors = payrollQuery.isError && treasuryQuery.isError && vendorQuery.isError;
  const partialErrors = [
    payrollQuery.isError ? 'payroll' : null,
    treasuryQuery.isError ? 'treasury' : null,
    vendorQuery.isError ? 'vendor TDS' : null,
  ].filter((name): name is string => Boolean(name));

  const navigateTo = (to: string) => {
    if (to.startsWith('#')) {
      document.getElementById(to.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    navigate(to);
  };

  const retryAll = () => {
    void refetchAll();
  };

  return (
    <div className="relative mx-auto flex h-full w-full max-w-[1600px] flex-col overflow-hidden">
      <DashboardHeader
        officeName={officeName}
        fy={fy}
        entryMonthName={payroll?.entryMonthName}
        filing={payroll?.statutoryDeadlines}
        updatedAt={updatedAt}
        isFetching={isFetching}
        onRefresh={retryAll}
      />

      <div className="flex flex-1 min-h-0 flex-col overflow-hidden bg-slate-50 p-2 sm:p-2.5 dark:bg-slate-950">
        {isInitialLoading ? (
          <DashboardSkeleton />
        ) : allErrors ? (
          <div className="flex h-full items-center justify-center py-16">
            <EmptyState
              icon={AlertCircle}
              title="Could not load the dashboard"
              hint="Payroll, treasury and vendor summaries all failed to load. Check your connection and retry."
              action={
                <button
                  type="button"
                  onClick={retryAll}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-black dark:bg-white dark:text-slate-900"
                >
                  <RefreshCw size={13} aria-hidden="true" /> Retry all
                </button>
              }
            />
          </div>
        ) : (
          <>
            {partialErrors.length > 0 && (
              <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300">
                <AlertCircle size={13} aria-hidden="true" />
                <span>
                  <strong className="font-semibold">Partly unavailable:</strong>{' '}
                  {partialErrors.join(', ')} could not be loaded.
                </span>
                <button
                  type="button"
                  onClick={retryAll}
                  className="ml-auto inline-flex items-center gap-1 rounded border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-bold text-amber-800 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-300"
                >
                  <RefreshCw size={11} aria-hidden="true" /> Retry
                </button>
              </div>
            )}

            <MinimalDashboardView
              officeName={officeName}
              fy={fy}
              payroll={payroll}
              treasury={treasury}
              vendor={vendor}
              actions={actions}
              isFetching={isFetching}
              updatedAt={updatedAt}
              onRefresh={retryAll}
              onNavigate={navigateTo}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
