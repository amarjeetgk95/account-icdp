import { useState, useMemo, useId } from 'react';
import { formatCurrency } from '@/shared/utilities';
import type { TaxReconciliationReport, TaxReconciliationStatus } from '../types/reconciliation';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileQuestion,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

interface TaxReconciliationTableProps {
  report: TaxReconciliationReport;
  onSyncSingle: (hrpn: string) => void;
  onSyncBulk: (hrpns: string[]) => void;
  isSyncing: boolean;
}

type FilterTab = 'ALL' | 'MISMATCHES' | 'MISSING_PAYROLL' | 'MISSING_PAYBILL' | 'MATCHED' | 'UNMAPPED';
type DataViewMode = 'COMBINED' | 'TAX' | 'GROSS';

export function TaxReconciliationTable({
  report,
  onSyncSingle,
  onSyncBulk,
  isSyncing,
}: TaxReconciliationTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [dataViewMode, setDataViewMode] = useState<DataViewMode>('COMBINED');
  const [selectedHrpns, setSelectedHrpns] = useState<string[]>([]);
  const selectAllTableId = useId();

  // Filter rows
  const filteredRows = useMemo(() => {
    return report.rows.filter((row) => {
      // Tab filter
      if (activeTab === 'MISMATCHES') {
        if (row.status !== 'TAX_MISMATCH' && row.status !== 'GROSS_MISMATCH') return false;
      } else if (activeTab === 'MISSING_PAYROLL') {
        if (row.status !== 'MISSING_IN_PAYROLL') return false;
      } else if (activeTab === 'MISSING_PAYBILL') {
        if (row.status !== 'MISSING_IN_PAYBILL') return false;
      } else if (activeTab === 'MATCHED') {
        if (row.status !== 'MATCHED') return false;
      } else if (activeTab === 'UNMAPPED') {
        if (row.status !== 'UNMAPPED_HRPN') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = row.employeeName.toLowerCase().includes(q);
        const hrpnMatch = row.hrpn.toLowerCase().includes(q);
        const panMatch = row.pan.toLowerCase().includes(q);
        const desigMatch = (row.designation || '').toLowerCase().includes(q);
        return nameMatch || hrpnMatch || panMatch || desigMatch;
      }

      return true;
    });
  }, [report.rows, activeTab, searchQuery]);

  const syncableVisibleRows = useMemo(() => {
    return filteredRows.filter((r) => r.canSync);
  }, [filteredRows]);

  const handleToggleSelect = (hrpn: string) => {
    setSelectedHrpns((prev) =>
      prev.includes(hrpn) ? prev.filter((h) => h !== hrpn) : [...prev, hrpn]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedHrpns.length === syncableVisibleRows.length && syncableVisibleRows.length > 0) {
      setSelectedHrpns([]);
    } else {
      setSelectedHrpns(syncableVisibleRows.map((r) => r.hrpn));
    }
  };

  const m1 = report.monthLabels[0] || { work: 'M1', paid: 'M1' };
  const m2 = report.monthLabels[1] || { work: 'M2', paid: 'M2' };
  const m3 = report.monthLabels[2] || { work: 'M3', paid: 'M3' };

  // Status Badge Helper
  const renderStatusBadge = (status: TaxReconciliationStatus, message: string) => {
    switch (status) {
      case 'MATCHED':
        return (
          <span
            title={message}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 whitespace-nowrap"
          >
            <CheckCircle2 size={11} />
            <span>Matched</span>
          </span>
        );
      case 'TAX_MISMATCH':
        return (
          <span
            title={message}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse whitespace-nowrap"
          >
            <AlertCircle size={11} />
            <span>Tax Variance</span>
          </span>
        );
      case 'GROSS_MISMATCH':
        return (
          <span
            title={message}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 whitespace-nowrap"
          >
            <AlertTriangle size={11} />
            <span>Gross Diff</span>
          </span>
        );
      case 'MISSING_IN_PAYROLL':
        return (
          <span
            title={message}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800 whitespace-nowrap"
          >
            <AlertTriangle size={11} />
            <span>Missing in Payroll</span>
          </span>
        );
      case 'MISSING_IN_PAYBILL':
        return (
          <span
            title={message}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 whitespace-nowrap"
          >
            <FileQuestion size={11} />
            <span>No Paybill</span>
          </span>
        );
      case 'UNMAPPED_HRPN':
        return (
          <span
            title={message}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 whitespace-nowrap"
          >
            <FileQuestion size={11} />
            <span>Unmapped HRPN</span>
          </span>
        );
    }
  };

  const mismatchCount = report.summary.taxMismatchCount + report.summary.grossMismatchCount;

  return (
    <div className="space-y-3">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-xs">
        {/* Left: Search Box */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by HRPN, Name, PAN or Designation..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>

        {/* Center: Data View Mode (Gross / Tax / Combined) */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
          <div className="flex items-center gap-1 px-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <SlidersHorizontal size={12} />
            <span>View:</span>
          </div>
          <button
            type="button"
            onClick={() => setDataViewMode('COMBINED')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              dataViewMode === 'COMBINED'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Gross &amp; Tax (Both)
          </button>
          <button
            type="button"
            onClick={() => setDataViewMode('TAX')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              dataViewMode === 'TAX'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Income Tax (TDS)
          </button>
          <button
            type="button"
            onClick={() => setDataViewMode('GROSS')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              dataViewMode === 'GROSS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Gross Salary
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All ({report.rows.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MISMATCHES')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
              activeTab === 'MISMATCHES'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            <span>Mismatches</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 font-extrabold">
              {mismatchCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MISSING_PAYROLL')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
              activeTab === 'MISSING_PAYROLL'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <span>Missing</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-extrabold">
              {report.summary.missingInPayrollCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('MATCHED')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
              activeTab === 'MATCHED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            <span>Matched</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 font-extrabold">
              {report.summary.matchedCount}
            </span>
          </button>
        </div>

        {/* Right: Bulk Sync Button */}
        {selectedHrpns.length > 0 && (
          <button
            type="button"
            onClick={() => onSyncBulk(selectedHrpns)}
            disabled={isSyncing}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            <span>Sync {selectedHrpns.length} to Payroll</span>
          </button>
        )}
      </div>

      {/* Main Reconciliation Matrix Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-xs border-collapse">
          <thead>
            {/* Level 1 Header: Grouped Sections */}
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold border-b border-slate-200 dark:border-slate-700">
              <th rowSpan={2} className="px-2 py-2 text-center w-8 align-middle border-r border-slate-200 dark:border-slate-700">
                <input
                  id={selectAllTableId}
                  type="checkbox"
                  checked={
                    selectedHrpns.length === syncableVisibleRows.length &&
                    syncableVisibleRows.length > 0
                  }
                  onChange={handleToggleSelectAll}
                  disabled={syncableVisibleRows.length === 0}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th rowSpan={2} className="px-2 py-2 text-center w-8 align-middle border-r border-slate-200 dark:border-slate-700">
                Sr.
              </th>
              <th rowSpan={2} className="px-3 py-2 text-left align-middle border-r border-slate-200 dark:border-slate-700 min-w-[170px]">
                Employee &amp; Reference
              </th>

              {/* Month 1 */}
              <th
                colSpan={dataViewMode === 'COMBINED' ? 6 : 3}
                className="px-2 py-1.5 text-center font-bold border-r border-slate-200 dark:border-slate-700 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300"
              >
                <div>Month 1: {m1.work}</div>
                <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">paid in {m1.paid}</div>
              </th>

              {/* Month 2 */}
              <th
                colSpan={dataViewMode === 'COMBINED' ? 6 : 3}
                className="px-2 py-1.5 text-center font-bold border-r border-slate-200 dark:border-slate-700 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300"
              >
                <div>Month 2: {m2.work}</div>
                <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">paid in {m2.paid}</div>
              </th>

              {/* Month 3 */}
              <th
                colSpan={dataViewMode === 'COMBINED' ? 6 : 3}
                className="px-2 py-1.5 text-center font-bold border-r border-slate-200 dark:border-slate-700 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300"
              >
                <div>Month 3: {m3.work}</div>
                <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">paid in {m3.paid}</div>
              </th>

              {/* Quarter Totals */}
              <th
                colSpan={dataViewMode === 'COMBINED' ? 6 : 3}
                className="px-2 py-1.5 text-center font-bold border-r border-slate-200 dark:border-slate-700 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-300"
              >
                {dataViewMode === 'GROSS' ? 'Quarter Gross Salary' : dataViewMode === 'TAX' ? 'Quarter Tax (TDS)' : 'Quarter Totals (Gross & IT)'}
              </th>

              {/* Status */}
              <th rowSpan={2} className="px-2.5 py-2 text-center align-middle border-r border-slate-200 dark:border-slate-700 min-w-[110px]">
                Status
              </th>

              {/* Actions */}
              <th rowSpan={2} className="px-2.5 py-2 text-center align-middle min-w-[80px]">
                Action
              </th>
            </tr>

            {/* Level 2 Header: Columns */}
            <tr className="bg-slate-50 dark:bg-slate-800/60 text-[10px] text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              {/* M1 */}
              {(dataViewMode === 'COMBINED' || dataViewMode === 'GROSS') && (
                <>
                  <th className="px-1.5 py-1 text-right bg-emerald-50/30 dark:bg-emerald-950/20">PB Gross</th>
                  <th className="px-1.5 py-1 text-right bg-emerald-50/30 dark:bg-emerald-950/20">PR Gross</th>
                  <th className={`px-1.5 py-1 text-right bg-emerald-50/30 dark:bg-emerald-950/20 ${dataViewMode === 'GROSS' ? 'border-r border-slate-200 dark:border-slate-700' : ''}`}>Δ Gross</th>
                </>
              )}
              {(dataViewMode === 'COMBINED' || dataViewMode === 'TAX') && (
                <>
                  <th className="px-1.5 py-1 text-right">PB IT</th>
                  <th className="px-1.5 py-1 text-right">PR IT</th>
                  <th className="px-1.5 py-1 text-right border-r border-slate-200 dark:border-slate-700">Δ Tax</th>
                </>
              )}

              {/* M2 */}
              {(dataViewMode === 'COMBINED' || dataViewMode === 'GROSS') && (
                <>
                  <th className="px-1.5 py-1 text-right bg-emerald-50/30 dark:bg-emerald-950/20">PB Gross</th>
                  <th className="px-1.5 py-1 text-right bg-emerald-50/30 dark:bg-emerald-950/20">PR Gross</th>
                  <th className={`px-1.5 py-1 text-right bg-emerald-50/30 dark:bg-emerald-950/20 ${dataViewMode === 'GROSS' ? 'border-r border-slate-200 dark:border-slate-700' : ''}`}>Δ Gross</th>
                </>
              )}
              {(dataViewMode === 'COMBINED' || dataViewMode === 'TAX') && (
                <>
                  <th className="px-1.5 py-1 text-right">PB IT</th>
                  <th className="px-1.5 py-1 text-right">PR IT</th>
                  <th className="px-1.5 py-1 text-right border-r border-slate-200 dark:border-slate-700">Δ Tax</th>
                </>
              )}

              {/* M3 */}
              {(dataViewMode === 'COMBINED' || dataViewMode === 'GROSS') && (
                <>
                  <th className="px-1.5 py-1 text-right bg-emerald-50/30 dark:bg-emerald-950/20">PB Gross</th>
                  <th className="px-1.5 py-1 text-right bg-emerald-50/30 dark:bg-emerald-950/20">PR Gross</th>
                  <th className={`px-1.5 py-1 text-right bg-emerald-50/30 dark:bg-emerald-950/20 ${dataViewMode === 'GROSS' ? 'border-r border-slate-200 dark:border-slate-700' : ''}`}>Δ Gross</th>
                </>
              )}
              {(dataViewMode === 'COMBINED' || dataViewMode === 'TAX') && (
                <>
                  <th className="px-1.5 py-1 text-right">PB IT</th>
                  <th className="px-1.5 py-1 text-right">PR IT</th>
                  <th className="px-1.5 py-1 text-right border-r border-slate-200 dark:border-slate-700">Δ Tax</th>
                </>
              )}

              {/* Q Total */}
              {(dataViewMode === 'COMBINED' || dataViewMode === 'GROSS') && (
                <>
                  <th className="px-1.5 py-1 text-right font-bold text-slate-800 dark:text-slate-200 bg-indigo-50/30">PB Gross</th>
                  <th className="px-1.5 py-1 text-right font-bold text-slate-800 dark:text-slate-200 bg-indigo-50/30">PR Gross</th>
                  <th className={`px-1.5 py-1 text-right font-bold bg-indigo-50/30 ${dataViewMode === 'GROSS' ? 'border-r border-slate-200 dark:border-slate-700' : ''}`}>Δ Gross</th>
                </>
              )}
              {(dataViewMode === 'COMBINED' || dataViewMode === 'TAX') && (
                <>
                  <th className="px-1.5 py-1 text-right font-bold text-slate-800 dark:text-slate-200">PB Tax</th>
                  <th className="px-1.5 py-1 text-right font-bold text-slate-800 dark:text-slate-200">PR Tax</th>
                  <th className="px-1.5 py-1 text-right font-bold border-r border-slate-200 dark:border-slate-700 text-rose-700 dark:text-rose-400">Δ Tax</th>
                </>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={dataViewMode === 'COMBINED' ? 29 : 17} className="text-center py-10 text-slate-500 dark:text-slate-400">
                  No records match your filter criteria.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => {
                const isSelected = selectedHrpns.includes(row.hrpn);
                const hasTaxMismatch = row.status === 'TAX_MISMATCH';
                const m = row.months;

                return (
                  <tr
                    key={row.hrpn}
                    className={`transition-colors text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      hasTaxMismatch ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                    } ${isSelected ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-800">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(row.hrpn)}
                        disabled={!row.canSync}
                        aria-label={`Select employee ${row.employeeName} with HRPN ${row.hrpn}`}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-30"
                      />
                    </td>

                    {/* Sr */}
                    <td className="px-2 py-2 text-center text-slate-400 text-[11px] border-r border-slate-200 dark:border-slate-800">
                      {idx + 1}
                    </td>

                    {/* Employee Info */}
                    <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-800">
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{row.employeeName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-400">
                          {row.hrpn}
                        </span>
                        {row.pan && row.pan !== 'UNMAPPED' && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-400">
                            {row.pan}
                          </span>
                        )}
                        {row.designation && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[110px]">
                            {row.designation}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Month 1 Data */}
                    {(dataViewMode === 'COMBINED' || dataViewMode === 'GROSS') && (
                      <>
                        <td className="px-1.5 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300 bg-emerald-50/20">
                          {formatCurrency(m[0].paybillGross)}
                        </td>
                        <td className="px-1.5 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400 bg-emerald-50/20">
                          {formatCurrency(m[0].payrollGross)}
                        </td>
                        <td className={`px-1.5 py-2 text-right tabular-nums font-bold bg-emerald-50/20 ${
                          dataViewMode === 'GROSS' ? 'border-r border-slate-200 dark:border-slate-800' : ''
                        } ${Math.abs(m[0].grossDiff) > 0.01 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-400'}`}>
                          {formatCurrency(m[0].grossDiff)}
                        </td>
                      </>
                    )}
                    {(dataViewMode === 'COMBINED' || dataViewMode === 'TAX') && (
                      <>
                        <td className="px-1.5 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {formatCurrency(m[0].paybillTax)}
                        </td>
                        <td className="px-1.5 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">
                          {formatCurrency(m[0].payrollTax)}
                        </td>
                        <td className={`px-1.5 py-2 text-right tabular-nums font-bold border-r border-slate-200 dark:border-slate-800 ${
                          Math.abs(m[0].taxDiff) > 0.01 ? 'text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20' : 'text-slate-400'
                        }`}>
                          {formatCurrency(m[0].taxDiff)}
                        </td>
                      </>
                    )}

                    {/* Month 2 Data */}
                    {(dataViewMode === 'COMBINED' || dataViewMode === 'GROSS') && (
                      <>
                        <td className="px-1.5 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300 bg-emerald-50/20">
                          {formatCurrency(m[1].paybillGross)}
                        </td>
                        <td className="px-1.5 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400 bg-emerald-50/20">
                          {formatCurrency(m[1].payrollGross)}
                        </td>
                        <td className={`px-1.5 py-2 text-right tabular-nums font-bold bg-emerald-50/20 ${
                          dataViewMode === 'GROSS' ? 'border-r border-slate-200 dark:border-slate-800' : ''
                        } ${Math.abs(m[1].grossDiff) > 0.01 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-400'}`}>
                          {formatCurrency(m[1].grossDiff)}
                        </td>
                      </>
                    )}
                    {(dataViewMode === 'COMBINED' || dataViewMode === 'TAX') && (
                      <>
                        <td className="px-1.5 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {formatCurrency(m[1].paybillTax)}
                        </td>
                        <td className="px-1.5 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">
                          {formatCurrency(m[1].payrollTax)}
                        </td>
                        <td className={`px-1.5 py-2 text-right tabular-nums font-bold border-r border-slate-200 dark:border-slate-800 ${
                          Math.abs(m[1].taxDiff) > 0.01 ? 'text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20' : 'text-slate-400'
                        }`}>
                          {formatCurrency(m[1].taxDiff)}
                        </td>
                      </>
                    )}

                    {/* Month 3 Data */}
                    {(dataViewMode === 'COMBINED' || dataViewMode === 'GROSS') && (
                      <>
                        <td className="px-1.5 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300 bg-emerald-50/20">
                          {formatCurrency(m[2].paybillGross)}
                        </td>
                        <td className="px-1.5 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400 bg-emerald-50/20">
                          {formatCurrency(m[2].payrollGross)}
                        </td>
                        <td className={`px-1.5 py-2 text-right tabular-nums font-bold bg-emerald-50/20 ${
                          dataViewMode === 'GROSS' ? 'border-r border-slate-200 dark:border-slate-800' : ''
                        } ${Math.abs(m[2].grossDiff) > 0.01 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-400'}`}>
                          {formatCurrency(m[2].grossDiff)}
                        </td>
                      </>
                    )}
                    {(dataViewMode === 'COMBINED' || dataViewMode === 'TAX') && (
                      <>
                        <td className="px-1.5 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {formatCurrency(m[2].paybillTax)}
                        </td>
                        <td className="px-1.5 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">
                          {formatCurrency(m[2].payrollTax)}
                        </td>
                        <td className={`px-1.5 py-2 text-right tabular-nums font-bold border-r border-slate-200 dark:border-slate-800 ${
                          Math.abs(m[2].taxDiff) > 0.01 ? 'text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20' : 'text-slate-400'
                        }`}>
                          {formatCurrency(m[2].taxDiff)}
                        </td>
                      </>
                    )}

                    {/* Quarter Totals */}
                    {(dataViewMode === 'COMBINED' || dataViewMode === 'GROSS') && (
                      <>
                        <td className="px-1.5 py-2 text-right tabular-nums font-bold text-slate-800 dark:text-slate-200 bg-indigo-50/20">
                          {formatCurrency(row.quarterPaybillGross)}
                        </td>
                        <td className="px-1.5 py-2 text-right tabular-nums font-medium text-slate-600 dark:text-slate-400 bg-indigo-50/20">
                          {formatCurrency(row.quarterPayrollGross)}
                        </td>
                        <td className={`px-1.5 py-2 text-right tabular-nums font-bold bg-indigo-50/20 ${
                          dataViewMode === 'GROSS' ? 'border-r border-slate-200 dark:border-slate-800' : ''
                        } ${Math.abs(row.quarterGrossDiff) > 0.01 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                          {formatCurrency(row.quarterGrossDiff)}
                        </td>
                      </>
                    )}
                    {(dataViewMode === 'COMBINED' || dataViewMode === 'TAX') && (
                      <>
                        <td className="px-1.5 py-2 text-right tabular-nums font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800/30">
                          {formatCurrency(row.quarterPaybillTax)}
                        </td>
                        <td className="px-1.5 py-2 text-right tabular-nums font-medium text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30">
                          {formatCurrency(row.quarterPayrollTax)}
                        </td>
                        <td className={`px-1.5 py-2 text-right tabular-nums font-extrabold border-r border-slate-200 dark:border-slate-800 ${
                          Math.abs(row.quarterTaxDiff) > 0.01 ? 'text-rose-600 dark:text-rose-400 bg-rose-100/50 dark:bg-rose-950/40' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {formatCurrency(row.quarterTaxDiff)}
                        </td>
                      </>
                    )}

                    {/* Status Badge */}
                    <td className="px-2.5 py-2 text-center border-r border-slate-200 dark:border-slate-800">
                      {renderStatusBadge(row.status, row.statusMessage)}
                    </td>

                    {/* Action */}
                    <td className="px-2 py-2 text-center">
                      {row.canSync ? (
                        <button
                          type="button"
                          onClick={() => onSyncSingle(row.hrpn)}
                          disabled={isSyncing}
                          title="Sync Paybill IT & Gross to Payroll 24Q Grid"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
                          <span>Sync</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Footer Grand Totals */}
          {filteredRows.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-800 font-extrabold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
                <td colSpan={3} className="px-3 py-2.5 text-center uppercase tracking-wider text-[11px] border-r border-slate-200 dark:border-slate-700">
                  Total ({filteredRows.length} Records)
                </td>

                {/* M1 */}
                {(dataViewMode === 'COMBINED' || dataViewMode === 'GROSS') && (
                  <>
                    <td className="px-1.5 py-2 text-right tabular-nums bg-emerald-100/40">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.months[0].paybillGross, 0))}
                    </td>
                    <td className="px-1.5 py-2 text-right tabular-nums bg-emerald-100/40">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.months[0].payrollGross, 0))}
                    </td>
                    <td className={`px-1.5 py-2 text-right tabular-nums bg-emerald-100/40 ${dataViewMode === 'GROSS' ? 'border-r border-slate-200 dark:border-slate-700' : ''}`}>
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.months[0].grossDiff, 0))}
                    </td>
                  </>
                )}
                {(dataViewMode === 'COMBINED' || dataViewMode === 'TAX') && (
                  <>
                    <td className="px-1.5 py-2 text-right tabular-nums">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.months[0].paybillTax, 0))}
                    </td>
                    <td className="px-1.5 py-2 text-right tabular-nums">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.months[0].payrollTax, 0))}
                    </td>
                    <td className="px-1.5 py-2 text-right tabular-nums border-r border-slate-200 dark:border-slate-700">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.months[0].taxDiff, 0))}
                    </td>
                  </>
                )}

                {/* M2 */}
                {(dataViewMode === 'COMBINED' || dataViewMode === 'GROSS') && (
                  <>
                    <td className="px-1.5 py-2 text-right tabular-nums bg-emerald-100/40">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.months[1].paybillGross, 0))}
                    </td>
                    <td className="px-1.5 py-2 text-right tabular-nums bg-emerald-100/40">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.months[1].payrollGross, 0))}
                    </td>
                    <td className={`px-1.5 py-2 text-right tabular-nums bg-emerald-100/40 ${dataViewMode === 'GROSS' ? 'border-r border-slate-200 dark:border-slate-700' : ''}`}>
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.months[1].grossDiff, 0))}
                    </td>
                  </>
                )}
                {(dataViewMode === 'COMBINED' || dataViewMode === 'TAX') && (
                  <>
                    <td className="px-1.5 py-2 text-right tabular-nums">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.months[1].paybillTax, 0))}
                    </td>
                    <td className="px-1.5 py-2 text-right tabular-nums">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.months[1].payrollTax, 0))}
                    </td>
                    <td className="px-1.5 py-2 text-right tabular-nums border-r border-slate-200 dark:border-slate-700">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.months[1].taxDiff, 0))}
                    </td>
                  </>
                )}

                {/* M3 */}
                {(dataViewMode === 'COMBINED' || dataViewMode === 'GROSS') && (
                  <>
                    <td className="px-1.5 py-2 text-right tabular-nums bg-emerald-100/40">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.months[2].paybillGross, 0))}
                    </td>
                    <td className="px-1.5 py-2 text-right tabular-nums bg-emerald-100/40">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.months[2].payrollGross, 0))}
                    </td>
                    <td className={`px-1.5 py-2 text-right tabular-nums bg-emerald-100/40 ${dataViewMode === 'GROSS' ? 'border-r border-slate-200 dark:border-slate-700' : ''}`}>
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.months[2].grossDiff, 0))}
                    </td>
                  </>
                )}
                {(dataViewMode === 'COMBINED' || dataViewMode === 'TAX') && (
                  <>
                    <td className="px-1.5 py-2 text-right tabular-nums">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.months[2].paybillTax, 0))}
                    </td>
                    <td className="px-1.5 py-2 text-right tabular-nums">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.months[2].payrollTax, 0))}
                    </td>
                    <td className="px-1.5 py-2 text-right tabular-nums border-r border-slate-200 dark:border-slate-700">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.months[2].taxDiff, 0))}
                    </td>
                  </>
                )}

                {/* Q Totals */}
                {(dataViewMode === 'COMBINED' || dataViewMode === 'GROSS') && (
                  <>
                    <td className="px-1.5 py-2 text-right tabular-nums text-slate-800 dark:text-slate-200 bg-indigo-100/30">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.quarterPaybillGross, 0))}
                    </td>
                    <td className="px-1.5 py-2 text-right tabular-nums text-slate-800 dark:text-slate-200 bg-indigo-100/30">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.quarterPayrollGross, 0))}
                    </td>
                    <td className={`px-1.5 py-2 text-right tabular-nums bg-indigo-100/30 ${dataViewMode === 'GROSS' ? 'border-r border-slate-200 dark:border-slate-700' : ''}`}>
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.quarterGrossDiff, 0))}
                    </td>
                  </>
                )}
                {(dataViewMode === 'COMBINED' || dataViewMode === 'TAX') && (
                  <>
                    <td className="px-1.5 py-2 text-right tabular-nums text-indigo-700 dark:text-indigo-300">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.quarterPaybillTax, 0))}
                    </td>
                    <td className="px-1.5 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.quarterPayrollTax, 0))}
                    </td>
                    <td className={`px-1.5 py-2 text-right tabular-nums border-r border-slate-200 dark:border-slate-700 ${
                      Math.abs(filteredRows.reduce((s, r) => s + r.quarterTaxDiff, 0)) > 0.01 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {formatCurrency(filteredRows.reduce((s, r) => s + r.quarterTaxDiff, 0))}
                    </td>
                  </>
                )}

                <td colSpan={2} className="px-2 py-2 text-center text-[10px] text-slate-500">
                  Summary
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
