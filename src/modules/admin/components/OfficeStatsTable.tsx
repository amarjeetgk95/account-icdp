import { ChevronRight, Users, Handshake, Receipt, Building2 } from 'lucide-react';
import { SkeletonTable } from '@/shared/components/Skeleton';
import type { OfficeStats } from '../types';
import type { LucideIcon } from 'lucide-react';
import '../styles/overview.css';

interface OfficeStatsTableProps {
  offices: OfficeStats[];
  isLoading: boolean;
  activeOfficeId: string | null;
  onSelectOffice: (officeId: string) => void;
}

type MetricKey = 'employees' | 'parties' | 'transactions';

const METRIC_ICONS: Record<MetricKey, LucideIcon> = {
  employees: Users,
  parties: Handshake,
  transactions: Receipt,
};

const METRIC_TINTS: Record<MetricKey, string> = {
  employees: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  parties: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  transactions: 'bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400',
};

function MetricChip({ icon: Icon, tint, value }: { icon: LucideIcon; tint: string; value: number }) {
  return (
    <span className="inline-flex items-center justify-end gap-1.5 font-semibold tabular-nums text-slate-700 dark:text-slate-300">
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md ${tint}`}>
        <Icon size={11} strokeWidth={2.5} />
      </span>
      {value.toLocaleString('en-IN')}
    </span>
  );
}

export function OfficeStatsTable({ offices, isLoading, activeOfficeId, onSelectOffice }: OfficeStatsTableProps) {
  if (isLoading) {
    return (
      <div className="p-5">
        <SkeletonTable rows={4} cols={7} />
      </div>
    );
  }

  if (offices.length === 0) {
    return (
      <div className="empty-state py-16">
        <Building2
          size={40}
          strokeWidth={1.5}
          className="mx-auto mb-3 text-slate-300 dark:text-slate-600"
        />
        <p className="empty-state-text">No offices yet.</p>
        <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
          Create an office under User Management to populate this overview.
        </p>
      </div>
    );
  }

  const totals = offices.reduce(
    (acc, office) => {
      acc.employees += office.employees;
      acc.salaries += office.salaries;
      acc.parties += office.parties;
      acc.transactions += office.transactions;
      acc.users += office.users;
      return acc;
    },
    { employees: 0, salaries: 0, parties: 0, transactions: 0, users: 0 }
  );

  return (
    <div className="overflow-x-auto admin-table ec-scroll">
      <table className="table table-sm">
        <thead>
          <tr>
            <th className="w-10">#</th>
            <th>Office</th>
            <th className="text-right">Employees</th>
            <th className="text-right">Salary Records</th>
            <th className="text-right">Vendors</th>
            <th className="text-right">Transactions</th>
            <th className="text-right">Users</th>
            <th className="text-right">Reports</th>
          </tr>
        </thead>
        <tbody>
          {offices.map((office, idx) => {
            const isActive = String(office.office_id) === String(activeOfficeId);
            return (
              <tr
                key={office.office_id}
                onClick={() => onSelectOffice(office.office_id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectOffice(office.office_id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Open reports for ${office.office_name}`}
                className={`ost-row group cursor-pointer ${isActive ? 'ost-row-active' : ''}`}
                title="Open this office's reports"
              >
                <td className="text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                  {idx + 1}
                </td>
                <td className="font-bold whitespace-nowrap text-slate-900 dark:text-slate-100">
                  <span className="inline-flex items-center gap-2">
                    <span className="hidden sm:inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 dark:group-hover:bg-indigo-500/20 dark:group-hover:text-indigo-300 transition-colors duration-150">
                      <Building2 size={12} strokeWidth={2.2} />
                    </span>
                    {office.office_name}
                    {isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 shadow-sm">
                        <span className="w-1 h-1 rounded-full bg-white" />
                        active
                      </span>
                    )}
                  </span>
                </td>
                <td className="text-right">
                  <MetricChip icon={METRIC_ICONS.employees} tint={METRIC_TINTS.employees} value={office.employees} />
                </td>
                <td className="text-right font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                  {office.salaries.toLocaleString('en-IN')}
                </td>
                <td className="text-right">
                  <MetricChip icon={METRIC_ICONS.parties} tint={METRIC_TINTS.parties} value={office.parties} />
                </td>
                <td className="text-right">
                  <MetricChip icon={METRIC_ICONS.transactions} tint={METRIC_TINTS.transactions} value={office.transactions} />
                </td>
                <td className="text-right font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                  {office.users}
                </td>
                <td className="text-right">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 px-2.5 py-1 text-xs font-bold transition-colors duration-150 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-primary">
                    Open
                    <ChevronRight
                      size={13}
                      className="transition-transform duration-150 group-hover:translate-x-0.5"
                    />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>All offices</td>
            <td className="text-right tabular-nums">{totals.employees.toLocaleString('en-IN')}</td>
            <td className="text-right tabular-nums">{totals.salaries.toLocaleString('en-IN')}</td>
            <td className="text-right tabular-nums">{totals.parties.toLocaleString('en-IN')}</td>
            <td className="text-right tabular-nums">{totals.transactions.toLocaleString('en-IN')}</td>
            <td className="text-right tabular-nums">{totals.users.toLocaleString('en-IN')}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
