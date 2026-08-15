import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  FileSpreadsheet,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { paybillRepository } from '../repositories/paybill.repository';
import type {
  PayBillStoredImport,
  PayBillStoredEarning,
  PayBillSortField,
  PayBillSortDirection,
} from '../types';

interface PayBillRecordsArchiveProps {
  financialYear: number;
  onViewReportForEmployee?: (hrpn: string) => void;
}

export function PayBillRecordsArchive({
  financialYear,
  onViewReportForEmployee,
}: PayBillRecordsArchiveProps) {
  const [imports, setImports] = useState<PayBillStoredImport[]>([]);
  const [earnings, setEarnings] = useState<PayBillStoredEarning[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImportId, setSelectedImportId] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<PayBillSortField>('hrpn');
  const [sortDir, setSortDir] = useState<PayBillSortDirection>('asc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [importList, earningsList] = await Promise.all([
        paybillRepository.listImports(financialYear),
        paybillRepository.listEarnings({ financialYear, sortField, sortDir }),
      ]);
      setImports(importList);
      setEarnings(earningsList);
    } catch (err) {
      console.error('[PayBillRecordsArchive] load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [financialYear, sortField, sortDir]);

  const handleDeleteImport = async (importId: string, billNo: string) => {
    if (window.confirm(`Are you sure you want to delete imported bill "${billNo}" and its employee earnings?`)) {
      await paybillRepository.deleteImport(importId);
      await loadData();
    }
  };

  const handleSort = (field: PayBillSortField) => {
    setPage(1);
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const formatInr = (n: number | undefined) =>
    `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

  const filteredEarnings = useMemo(() => {
    return earnings.filter((rec) => {
      if (selectedImportId !== 'ALL' && rec.importId !== selectedImportId) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const hMatch = rec.hrpn.toLowerCase().includes(q);
        const nMatch = rec.employeeName.toLowerCase().includes(q);
        const dMatch = (rec.designation || '').toLowerCase().includes(q);
        const pMatch = (rec.payScale || '').toLowerCase().includes(q);
        const mMatch = rec.month.toLowerCase().includes(q);
        return hMatch || nMatch || dMatch || pMatch || mMatch;
      }
      return true;
    });
  }, [earnings, selectedImportId, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEarnings.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedEarnings = filteredEarnings.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const SortIcon = ({ field }: { field: PayBillSortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-bold" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-bold" />
    );
  };

  const hasSpecialPay = useMemo(() => filteredEarnings.some((r) => (r.specialPay || 0) > 0), [filteredEarnings]);
  const hasWashing = useMemo(() => filteredEarnings.some((r) => (r.washingAllowance || 0) > 0), [filteredEarnings]);
  const hasNpp = useMemo(
    () => filteredEarnings.some((r) => (r.nppAllowance || 0) > 0) || (!hasSpecialPay && !hasWashing),
    [filteredEarnings, hasSpecialPay, hasWashing]
  );

  return (
    <div className="space-y-4">
      {/* Top Header & Summary of Imported Bills */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Imported Pay Bill Archive (FY {financialYear}-{String(financialYear + 1).slice(-2)})
              </h3>
              <p className="text-xs text-slate-500">
                {imports.length} Pay Bills &bull; {earnings.length} Employee earning records stored
              </p>
            </div>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Bill Cards Carousel / Grid */}
        {imports.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {imports.map((imp) => (
              <div
                key={imp.id}
                onClick={() => {
                  setPage(1);
                  setSelectedImportId(selectedImportId === imp.id ? 'ALL' : imp.id);
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedImportId === imp.id
                    ? 'bg-blue-50/70 border-blue-400 dark:bg-blue-950/40 dark:border-blue-700 ring-2 ring-blue-500/20'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/70 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100 font-mono">
                    {imp.billNo}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[0.68rem] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-semibold">
                    {imp.month}
                  </span>
                </div>

                <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Records:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{imp.totalRecords} ({imp.matchedCount} matched)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gross Total:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">{formatInr(imp.grossTotal)}</span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[0.7rem] text-slate-400">
                  <span>{new Date(imp.createdAt).toLocaleDateString('en-IN')}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImport(imp.id, imp.billNo);
                    }}
                    className="p-1 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition-colors"
                    title="Delete Bill"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-slate-400">
            No pay bills imported yet for this financial year. Upload a PDF in the "PDF Import" tab.
          </div>
        )}
      </div>

      {/* Sortable & Searchable Employee Records Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Employee Earnings ({filteredEarnings.length} rows)
            </span>
            {selectedImportId !== 'ALL' && (
              <button
                onClick={() => {
                  setPage(1);
                  setSelectedImportId('ALL');
                }}
                className="text-[0.7rem] text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear Filter (Showing 1 Bill)
              </button>
            )}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search HRPN, Name, Month..."
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] app-scroll">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 sticky top-0 z-10 shadow-sm select-none">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th
                  onClick={() => handleSort('month')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Month</span>
                    <SortIcon field="month" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('hrpn')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>HRPN Key</span>
                    <SortIcon field="hrpn" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('employeeName')}
                  className="py-2.5 px-3 font-semibold min-w-[170px] cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Employee Name</span>
                    <SortIcon field="employeeName" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('designation')}
                  className="py-2.5 px-3 font-semibold min-w-[130px] cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Designation</span>
                    <SortIcon field="designation" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('payScale')}
                  className="py-2.5 px-3 font-semibold min-w-[140px] cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Pay Scale</span>
                    <SortIcon field="payScale" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('basicPay')}
                  className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Basic Pay</span>
                    <SortIcon field="basicPay" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('da')}
                  className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>DA</span>
                    <SortIcon field="da" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('hra')}
                  className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>HRA</span>
                    <SortIcon field="hra" />
                  </div>
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">CLA</th>
                <th className="py-2.5 px-3 font-semibold text-right">Med.</th>
                <th className="py-2.5 px-3 font-semibold text-right">Trans.</th>
                {hasSpecialPay && <th className="py-2.5 px-3 font-semibold text-right">Spl. Pay</th>}
                {hasWashing && <th className="py-2.5 px-3 font-semibold text-right">Washing</th>}
                {hasNpp && <th className="py-2.5 px-3 font-semibold text-right">NPP</th>}
                <th
                  onClick={() => handleSort('grossAmount')}
                  className="py-2.5 px-3 font-semibold text-right bg-blue-50/50 dark:bg-blue-950/30 cursor-pointer hover:bg-blue-100/60 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Gross Amount</span>
                    <SortIcon field="grossAmount" />
                  </div>
                </th>
                <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                <th className="py-2.5 px-3 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEarnings.length === 0 ? (
                <tr>
                  <td colSpan={17} className="py-8 text-center text-slate-400">
                    No employee records found.
                  </td>
                </tr>
              ) : (
                paginatedEarnings.map((r) => (
                  <tr key={r.id} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">{r.month}</td>
                    <td className="py-2 px-3 font-mono font-bold text-blue-700 dark:text-blue-300">{r.hrpn}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">{r.employeeName}</td>
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-medium">{r.designation || '-'}</td>
                    <td className="py-2 px-3 font-mono text-[0.72rem] text-slate-600 dark:text-slate-400">
                      {r.payScale ? (
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                          {r.payScale}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-800 dark:text-slate-200">{formatInr(r.basicPay)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300">{formatInr(r.da)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300">{formatInr(r.hra)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300">{formatInr(r.cla)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300">{formatInr(r.medicalAllowance)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300">{formatInr(r.transportAllowance)}</td>
                    {hasSpecialPay && (
                      <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatInr(r.specialPay)}
                      </td>
                    )}
                    {hasWashing && (
                      <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatInr(r.washingAllowance)}
                      </td>
                    )}
                    {hasNpp && (
                      <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatInr(r.nppAllowance)}
                      </td>
                    )}
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 bg-blue-50/20 dark:bg-blue-950/20">
                      {formatInr(r.grossAmount)}
                    </td>
                    <td className="py-2 px-3 text-center space-y-1">
                      {r.mappingStatus === 'MATCHED' ? (
                        <span className="inline-block px-2 py-0.5 text-[0.68rem] font-medium rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          MATCHED
                        </span>
                      ) : r.mappingStatus === 'NOT_FOUND' ? (
                        <span className="inline-block px-2 py-0.5 text-[0.68rem] font-medium rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          NOT_FOUND
                        </span>
                      ) : r.mappingStatus === 'DUPLICATE' ? (
                        <span className="inline-block px-2 py-0.5 text-[0.68rem] font-medium rounded-full bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                          DUPLICATE
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 text-[0.68rem] font-medium rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          INVALID_HRPN
                        </span>
                      )}
                      {r.validationStatus === 'WARNING' && (
                        <span
                          className="inline-block px-2 py-0.5 text-[0.68rem] font-medium rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          title={(r.warnings || []).join('; ')}
                        >
                          WARNING
                        </span>
                      )}
                      {r.validationStatus === 'ERROR' && (
                        <span
                          className="inline-block px-2 py-0.5 text-[0.68rem] font-medium rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                          title={(r.errors || []).join('; ')}
                        >
                          ERROR
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {onViewReportForEmployee && (
                        <button
                          onClick={() => onViewReportForEmployee(r.hrpn)}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded transition-colors"
                          title="View Allowance Matrix Report for this employee"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredEarnings.length > 0 && (
          <div className="px-3 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-[0.7rem] text-slate-500 font-medium">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filteredEarnings.length)} of{' '}
              {filteredEarnings.length} records
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-2.5 py-1 text-[0.7rem] font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Prev
              </button>
              <span className="px-2.5 py-1 text-[0.7rem] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                Page {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1 text-[0.7rem] font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
