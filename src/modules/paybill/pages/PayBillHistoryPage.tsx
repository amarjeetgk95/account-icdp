import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUIStore } from '@/core/stores/ui-store';
import { paybillRepository } from '../repositories/paybill.repository';
import type { PayBillStoredImport, PayBillImportStatus } from '../types';
import { PbPanel, PbButton, PbChip } from '../components/ui';
import { EmptyState } from '@/shared/components/EmptyState';
import { SkeletonTable } from '@/shared/components/Skeleton';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { toast } from '@/shared/components/Toast';
import {
  History,
  Trash2,
  Search,
  RefreshCw,
  FileSpreadsheet,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

const STATUS_TONE: Record<PayBillImportStatus, 'emerald' | 'blue' | 'amber' | 'rose' | 'indigo'> = {
  IMPORTED: 'blue',
  REVIEWED: 'indigo',
  APPROVED: 'emerald',
  POSTED: 'emerald',
  REVERSED: 'rose',
};

function formatInr(n: number) {
  return `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
}

export function PayBillHistoryPage() {
  const fy = useUIStore((s) => s.activeFinancialYear);
  const [imports, setImports] = useState<PayBillStoredImport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sheetFilter, setSheetFilter] = useState<'ALL' | 'EARNING' | 'DEDUCTION'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PayBillImportStatus>('ALL');
  const [fyFilter, setFyFilter] = useState<number | 'ALL'>(fy);
  const [deleteTarget, setDeleteTarget] = useState<PayBillStoredImport | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await paybillRepository.listImports(fyFilter === 'ALL' ? undefined : Number(fyFilter));
      setImports(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load import history.');
    } finally {
      setIsLoading(false);
    }
  }, [fyFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return imports.filter((row) => {
      if (sheetFilter !== 'ALL' && row.sheetType !== sheetFilter) return false;
      if (statusFilter !== 'ALL' && (row.status || 'IMPORTED') !== statusFilter) return false;
      if (!q) return true;
      return (
        row.billNo.toLowerCase().includes(q) ||
        row.month.toLowerCase().includes(q) ||
        String(row.financialYear).includes(q) ||
        (row.uploadedFile || '').toLowerCase().includes(q)
      );
    });
  }, [imports, search, sheetFilter, statusFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await paybillRepository.deleteImport(deleteTarget.id);
      toast.success(`Import ${deleteTarget.billNo} deleted.`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete import.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const fyOptions = useMemo(() => {
    const years = Array.from(new Set(imports.map((r) => r.financialYear))).sort((a, b) => b - a);
    if (!years.includes(fy)) years.unshift(fy);
    return years;
  }, [imports, fy]);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <PbPanel
        icon={History}
        iconClass="bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-sm"
        title="Pay Bill Import History"
        actions={
          <>
            <div className="relative hidden md:block">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bill no, month, file"
                className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
              />
            </div>

            <select
              value={String(fyFilter)}
              onChange={(e) => setFyFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All FY</option>
              {fyOptions.map((y) => (
                <option key={y} value={String(y)}>
                  FY {y}-{String(y + 1).slice(-2)}
                </option>
              ))}
            </select>

            <select
              value={sheetFilter}
              onChange={(e) => setSheetFilter(e.target.value as typeof sheetFilter)}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Sheets</option>
              <option value="EARNING">Earning</option>
              <option value="DEDUCTION">Deduction</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="IMPORTED">Imported</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="APPROVED">Approved</option>
              <option value="POSTED">Posted</option>
              <option value="REVERSED">Reversed</option>
            </select>

            <PbButton variant="ghost" icon={RefreshCw} onClick={() => void load()} disabled={isLoading}>
              Refresh
            </PbButton>
          </>
        }
      >
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <FileSpreadsheet size={14} />
          <span>
            {filtered.length} import{filtered.length === 1 ? '' : 's'} &middot; FY{' '}
            {fyFilter === 'ALL' ? 'All' : `${fyFilter}-${String(Number(fyFilter) + 1).slice(-2)}`}
          </span>
          {loadError && (
            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <AlertTriangle size={12} /> {loadError}
            </span>
          )}
        </div>
      </PbPanel>

      {/* Mobile search */}
      <div className="md:hidden">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bill no, month, file"
            className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {isLoading ? (
        <PbPanel padded={false}>
          <div className="p-4">
            <SkeletonTable rows={6} cols={7} />
          </div>
        </PbPanel>
      ) : filtered.length === 0 ? (
        <PbPanel>
          <EmptyState
            icon={History}
            title={imports.length === 0 ? 'No pay bill imports yet' : 'No imports match the current filters'}
            hint={
              imports.length === 0
                ? 'Upload an Earning or Deduction inner sheet from the Pay Bill module to see history here.'
                : 'Clear the search or change the sheet/status filter to see more results.'
            }
          />
        </PbPanel>
      ) : (
        <PbPanel padded={false} className="overflow-hidden">
          <div className="overflow-x-auto app-scroll">
            <table className="w-full text-xs whitespace-nowrap">
              <thead>
                <tr className="text-left text-[0.65rem] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-2.5 font-bold">Bill No</th>
                  <th className="px-4 py-2.5 font-bold">Month</th>
                  <th className="px-4 py-2.5 font-bold">FY</th>
                  <th className="px-4 py-2.5 font-bold">Sheet</th>
                  <th className="px-4 py-2.5 font-bold text-right">Records</th>
                  <th className="px-4 py-2.5 font-bold text-right">Matched</th>
                  <th className="px-4 py-2.5 font-bold text-right">Gross / Total</th>
                  <th className="px-4 py-2.5 font-bold">Status</th>
                  <th className="px-4 py-2.5 font-bold">Imported At</th>
                  <th className="px-4 py-2.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((row) => {
                  const status = (row.status || 'IMPORTED') as PayBillImportStatus;
                  const matchRate = row.totalRecords > 0 ? Math.round((row.matchedCount / row.totalRecords) * 100) : 0;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-semibold text-slate-800 dark:text-slate-100">
                        {row.billNo}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">
                        {row.month}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-400">
                        {row.financialYear}
                      </td>
                      <td className="px-4 py-2.5">
                        <PbChip tone={row.sheetType === 'DEDUCTION' ? 'rose' : 'blue'}>{row.sheetType || 'EARNING'}</PbChip>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                        {row.totalRecords}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {row.matchedCount}
                        </span>
                        <span className="ml-1 text-[0.65rem] text-slate-400">({matchRate}%)</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {row.sheetType === 'DEDUCTION'
                          ? formatInr((row as unknown as { totalDeductions?: number }).totalDeductions || row.grossTotal)
                          : formatInr(row.grossTotal)}
                      </td>
                      <td className="px-4 py-2.5">
                        <PbChip tone={STATUS_TONE[status]}>{status}</PbChip>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-500 dark:text-slate-400">
                        {new Date(row.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <PbButton
                            variant="ghost"
                            size="xs"
                            icon={Trash2}
                            className="hover:text-rose-600"
                            onClick={() => setDeleteTarget(row)}
                            title="Delete import (and all its rows)"
                          >
                            Delete
                          </PbButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 text-[0.68rem] text-slate-500">
            <ShieldCheck size={12} />
            <span>Duplicate imports are blocked by a server-side unique index on (office, FY, bill no, month, sheet type).</span>
          </div>
        </PbPanel>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Pay Bill Import?"
        danger
        icon={Trash2}
        confirmLabel="Delete"
        busy={deleteBusy}
        message={
          deleteTarget
            ? `Delete bill ${deleteTarget.billNo} (${deleteTarget.month}-${deleteTarget.financialYear}, ${deleteTarget.sheetType || 'EARNING'}) and all ${deleteTarget.totalRecords} associated rows? This cannot be undone.`
            : undefined
        }
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
