import { useMemo } from 'react';
import {
  Upload,
  FileSpreadsheet,
  TriangleAlert,
  UserRoundX,
  ShieldAlert,
  Activity,
} from 'lucide-react';
import { useImportHealth } from '../hooks/useAdmin';
import { AdminLayout } from '@/shared/components/AdminLayout';
import { ErrorBanner } from '@/shared/components/ErrorBanner';
import { EmptyState } from '@/shared/components/EmptyState';
import { SkeletonTable } from '@/shared/components/Skeleton';
import { StatCard } from '@/shared/components/StatCard';
import { getSectionIcon } from '@/shared/icons';
import { formatDateTime } from '@/shared/utilities';

function HealthBadge({ value, tone }: { value: number; tone: 'good' | 'warn' | 'bad' }) {
  const cls =
    tone === 'good'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-800/50'
      : tone === 'warn'
        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-800/50'
        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-800/50';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-bold border tabular-nums ${cls}`}
    >
      {value.toLocaleString('en-IN')}
    </span>
  );
}

function issueTone(value: number): 'good' | 'warn' | 'bad' {
  if (value === 0) return 'good';
  if (value <= 10) return 'warn';
  return 'bad';
}

export function AdminImportsPage() {
  const { data: rows, isLoading, isError, error } = useImportHealth();

  const totals = useMemo(() => {
    const zero = { salary: 0, paybill: 0, mapping: 0, nameMismatch: 0, validation: 0, offices: 0 };
    if (!rows) return zero;
    return rows.reduce(
      (acc, r) => ({
        salary: acc.salary + r.salary_imports,
        paybill: acc.paybill + r.paybill_imports,
        mapping: acc.mapping + r.mapping_issues,
        nameMismatch: acc.nameMismatch + r.name_mismatches,
        validation: acc.validation + r.validation_errors,
        offices: acc.offices + 1,
      }),
      zero
    );
  }, [rows]);

  return (
    <AdminLayout
      title="Import Monitoring"
      icon={getSectionIcon('upload')}
    >
      <div className="space-y-4">
        {isError && (
          <ErrorBanner title="Failed to load import health:" error={error} className="animate-fade-in" />
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <StatCard
            label="Salary Imports"
            value={totals.salary}
            icon={FileSpreadsheet}
            gradient="linear-gradient(135deg, #10B981, #34D399)"
            hint="files across all offices"
          />
          <StatCard
            label="Paybill Imports"
            value={totals.paybill}
            icon={Upload}
            gradient="linear-gradient(135deg, #06B6D4, #0D9488)"
            hint="PDF batches across all offices"
          />
          <StatCard
            label="Mapping Issues"
            value={totals.mapping}
            icon={TriangleAlert}
            gradient="linear-gradient(135deg, #F59E0B, #F97316)"
            hint="records not matched to HRPN"
          />
          <StatCard
            label="Name Mismatches"
            value={totals.nameMismatch}
            icon={UserRoundX}
            gradient="linear-gradient(135deg, #F43F5E, #EC4899)"
            hint="employee name vs HRPN record"
          />
          <StatCard
            label="Validation Errors"
            value={totals.validation}
            icon={ShieldAlert}
            gradient="linear-gradient(135deg, #8B5CF6, #6366F1)"
            hint="records failing validation"
          />
        </div>

        <div className="card rounded-2xl animate-fade-in animate-fade-in-delay-1">
          <div className="card-body p-0">
            {isLoading ? (
              <div className="p-4">
                <SkeletonTable rows={6} cols={9} />
              </div>
            ) : !rows || rows.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No import activity yet"
                hint="Once offices upload salary or paybill files, their import health will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead>
                    <tr className="text-left text-[0.65rem] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <th className="px-4 py-2.5 font-bold">Office</th>
                      <th className="px-4 py-2.5 font-bold">FY</th>
                      <th className="px-4 py-2.5 font-bold text-right">Salary</th>
                      <th className="px-4 py-2.5 font-bold text-right">Paybill</th>
                      <th className="px-4 py-2.5 font-bold text-right">Rows</th>
                      <th className="px-4 py-2.5 font-bold text-center">Mapping</th>
                      <th className="px-4 py-2.5 font-bold text-center">Name</th>
                      <th className="px-4 py-2.5 font-bold text-center">Validation</th>
                      <th className="px-4 py-2.5 font-bold">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.map((r) => {
                      const salaryMatched =
                        r.salary_total_records > 0
                          ? `${r.salary_matched_count}/${r.salary_total_records}`
                          : '—';
                      const paybillMatched =
                        r.paybill_total_records > 0
                          ? `${r.paybill_matched_count}/${r.paybill_total_records}`
                          : '—';
                      return (
                        <tr
                          key={r.office_id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-800 dark:text-slate-100">
                              {r.office_name}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                            {r.fy ? `${r.fy}-${String(r.fy + 1).slice(-2)}` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="font-mono text-slate-700 dark:text-slate-200 tabular-nums">
                              {r.salary_imports}
                            </div>
                            <div className="text-[0.68rem] text-slate-400 tabular-nums">
                              matched {salaryMatched}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="font-mono text-slate-700 dark:text-slate-200 tabular-nums">
                              {r.paybill_imports}
                            </div>
                            <div className="text-[0.68rem] text-slate-400 tabular-nums">
                              matched {paybillMatched}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                            {(r.earnings_rows + r.deduction_rows).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <HealthBadge value={r.mapping_issues} tone={issueTone(r.mapping_issues)} />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <HealthBadge value={r.name_mismatches} tone={issueTone(r.name_mismatches)} />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <HealthBadge value={r.validation_errors} tone={issueTone(r.validation_errors)} />
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                            {r.last_activity ? formatDateTime(r.last_activity) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
