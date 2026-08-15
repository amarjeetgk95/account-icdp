import React, { useState, useEffect, useMemo } from 'react';
import { paybillRepository } from '../repositories/paybill.repository';
import { paybillPdfService } from '../services/paybillPdf.service';
import { PostToLedgerModal } from './PostToLedgerModal';
import { PayBillSettingsModal } from './PayBillSettingsModal';
import {
  Calendar,
  Send,
  Trash2,
  Upload,
  Search,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Receipt,
  FileDown,
  Settings,
} from 'lucide-react';
import type {
  PayBillStoredImport,
  PayBillStoredEarning,
  PayBillStoredDeduction,
  PayBillTotalRow,
  PayBillMetadata,
  PayBillSettings,
} from '../types';

interface PayBillMonthlyViewProps {
  financialYear: number;
  onOpenUploadModal: () => void;
  onViewEmployeeLedger?: (hrpn: string) => void;
  refreshTrigger?: number;
}

type ViewMode = 'EARNING' | 'DEDUCTION' | 'COMBINED';

export const PayBillMonthlyView: React.FC<PayBillMonthlyViewProps> = ({
  financialYear,
  onOpenUploadModal,
  onViewEmployeeLedger,
  refreshTrigger,
}) => {
  // Generate the 12 FY months
  const fyMonths = useMemo(() => {
    const nextYear = financialYear + 1;
    return [
      `April-${financialYear}`,
      `May-${financialYear}`,
      `June-${financialYear}`,
      `July-${financialYear}`,
      `August-${financialYear}`,
      `September-${financialYear}`,
      `October-${financialYear}`,
      `November-${financialYear}`,
      `December-${financialYear}`,
      `January-${nextYear}`,
      `February-${nextYear}`,
      `March-${nextYear}`,
    ];
  }, [financialYear]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return `April-${financialYear}`;
  });

  const [viewMode, setViewMode] = useState<ViewMode>('EARNING');
  const [imports, setImports] = useState<PayBillStoredImport[]>([]);
  const [earnings, setEarnings] = useState<PayBillStoredEarning[]>([]);
  const [deductions, setDeductions] = useState<PayBillStoredDeduction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState<PayBillSettings | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [importList, earningsList, deductionList] = await Promise.all([
        paybillRepository.listImports(financialYear),
        paybillRepository.listEarnings({ financialYear }),
        paybillRepository.listDeductions({ financialYear }),
      ]);
      setImports(importList);
      setEarnings(earningsList);
      setDeductions(deductionList);
    } catch (err) {
      console.error('[PayBillMonthlyView] load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [financialYear, refreshTrigger]);

  useEffect(() => {
    let cancelled = false;
    paybillRepository
      .getSettings()
      .then((s) => {
        if (!cancelled) setSettings(s);
      })
      .catch(() => {
        // defaults apply
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Current month's import metadata
  const currentImport = useMemo(() => {
    return imports.find(
      (imp) => imp.month.toLowerCase() === selectedMonth.toLowerCase()
    );
  }, [imports, selectedMonth]);

  // Current month's employee earnings
  const currentMonthEarnings = useMemo(() => {
    return earnings.filter(
      (e) => e.month.toLowerCase() === selectedMonth.toLowerCase()
    );
  }, [earnings, selectedMonth]);

  // Current month's employee deductions
  const currentMonthDeductions = useMemo(() => {
    return deductions.filter(
      (d) => d.month.toLowerCase() === selectedMonth.toLowerCase()
    );
  }, [deductions, selectedMonth]);

  // Filtered by search (Earnings)
  const filteredEarnings = useMemo(() => {
    if (!search.trim()) return currentMonthEarnings;
    const q = search.toLowerCase();
    return currentMonthEarnings.filter(
      (e) =>
        e.hrpn.toLowerCase().includes(q) ||
        e.employeeName.toLowerCase().includes(q) ||
        (e.designation || '').toLowerCase().includes(q) ||
        (e.payScale || '').toLowerCase().includes(q)
    );
  }, [currentMonthEarnings, search]);

  // Filtered by search (Deductions)
  const filteredDeductions = useMemo(() => {
    if (!search.trim()) return currentMonthDeductions;
    const q = search.toLowerCase();
    return currentMonthDeductions.filter(
      (d) =>
        d.hrpn.toLowerCase().includes(q) ||
        d.employeeName.toLowerCase().includes(q) ||
        (d.designation || '').toLowerCase().includes(q)
    );
  }, [currentMonthDeductions, search]);

  // Combined records for Current Month (Gross - Deductions = Net)
  const combinedRecords = useMemo(() => {
    const map = new Map<
      string,
      {
        hrpn: string;
        employeeName: string;
        designation: string;
        basicPay: number;
        grossAmount: number;
        incomeTax: number;
        totalDeductions: number;
        netPay: number;
      }
    >();

    for (const e of currentMonthEarnings) {
      map.set(e.hrpn, {
        hrpn: e.hrpn,
        employeeName: e.employeeName,
        designation: e.designation || 'Staff',
        basicPay: e.basicPay,
        grossAmount: e.grossAmount,
        incomeTax: 0,
        totalDeductions: 0,
        netPay: e.grossAmount,
      });
    }

    for (const d of currentMonthDeductions) {
      const existing = map.get(d.hrpn);
      if (existing) {
        existing.incomeTax = d.incomeTax;
        existing.totalDeductions = d.totalDeductions;
        existing.netPay = d.netPay || Math.max(0, existing.grossAmount - d.totalDeductions);
      } else {
        map.set(d.hrpn, {
          hrpn: d.hrpn,
          employeeName: d.employeeName,
          designation: d.designation || 'Staff',
          basicPay: 0,
          grossAmount: 0,
          incomeTax: d.incomeTax,
          totalDeductions: d.totalDeductions,
          netPay: d.netPay,
        });
      }
    }

    const list = Array.from(map.values());
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (r) =>
        r.hrpn.toLowerCase().includes(q) ||
        r.employeeName.toLowerCase().includes(q) ||
        r.designation.toLowerCase().includes(q)
    );
  }, [currentMonthEarnings, currentMonthDeductions, search]);

  // Computed Totals for Earnings
  const monthTotals = useMemo<PayBillTotalRow>(() => {
    return currentMonthEarnings.reduce(
      (acc, row) => {
        acc.basicPay += row.basicPay || 0;
        acc.da += row.da || 0;
        acc.hra += row.hra || 0;
        acc.cla += row.cla || 0;
        acc.medicalAllowance += row.medicalAllowance || 0;
        acc.transportAllowance += row.transportAllowance || 0;
        acc.specialPay = (acc.specialPay || 0) + (row.specialPay || 0);
        acc.washingAllowance = (acc.washingAllowance || 0) + (row.washingAllowance || 0);
        acc.nonPrivatePracticeAllowance =
          (acc.nonPrivatePracticeAllowance || 0) + (row.nppAllowance || 0);
        acc.grossAmount += row.grossAmount || 0;
        return acc;
      },
      {
        basicPay: 0,
        da: 0,
        hra: 0,
        cla: 0,
        medicalAllowance: 0,
        transportAllowance: 0,
        specialPay: 0,
        washingAllowance: 0,
        nonPrivatePracticeAllowance: 0,
        grossAmount: 0,
      }
    );
  }, [currentMonthEarnings]);

  // Computed Totals for Deductions
  const deductionTotals = useMemo(() => {
    return currentMonthDeductions.reduce(
      (acc, row) => {
        acc.incomeTax += row.incomeTax || 0;
        acc.profTax += row.profTax || 0;
        acc.hbaInterest += row.hbaInterest || 0;
        acc.gpfRegular += row.gpfRegular || 0;
        acc.gpfClass4 += row.gpfClass4 || 0;
        acc.npsRegular += row.npsRegular || 0;
        acc.gisGovtFund += row.gisGovtFund || 0;
        acc.gisGovtSaving += row.gisGovtSaving || 0;
        acc.totalDeductions += row.totalDeductions || 0;
        acc.netPay += row.netPay || 0;
        return acc;
      },
      {
        incomeTax: 0,
        profTax: 0,
        hbaInterest: 0,
        gpfRegular: 0,
        gpfClass4: 0,
        npsRegular: 0,
        gisGovtFund: 0,
        gisGovtSaving: 0,
        totalDeductions: 0,
        netPay: 0,
      }
    );
  }, [currentMonthDeductions]);

  // Combined Totals
  const combinedTotals = useMemo(() => {
    return combinedRecords.reduce(
      (acc, r) => {
        acc.gross += r.grossAmount;
        acc.deductions += r.totalDeductions;
        acc.netPay += r.netPay;
        return acc;
      },
      { gross: 0, deductions: 0, netPay: 0 }
    );
  }, [combinedRecords]);

  const hasSpecialPay = useMemo(
    () => currentMonthEarnings.some((r) => (r.specialPay || 0) > 0),
    [currentMonthEarnings]
  );
  const hasWashing = useMemo(
    () => currentMonthEarnings.some((r) => (r.washingAllowance || 0) > 0),
    [currentMonthEarnings]
  );
  const hasNpp = useMemo(
    () => currentMonthEarnings.some((r) => (r.nppAllowance || 0) > 0),
    [currentMonthEarnings]
  );

  const formatInr = (n: number | undefined) =>
    `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

  const handleDeleteCurrentMonth = async () => {
    if (!currentImport) return;
    if (
      window.confirm(
        `Are you sure you want to delete the imported bill for ${selectedMonth} (Bill No: ${currentImport.billNo})?`
      )
    ) {
      await paybillRepository.deleteImport(currentImport.id);
      await loadData();
    }
  };

  const currentMetadata: PayBillMetadata | null = currentImport
    ? {
        month: currentImport.month,
        ddoHrpn: currentImport.ddoHrpn || settings?.ddoHrpn || '',
        ddoName: currentImport.ddoName || settings?.ddoName || '',
        officeName: currentImport.officeName || settings?.officeName || 'ICDP Surat',
        billNo: currentImport.billNo || settings?.billNo || '',
        majorHead: currentImport.majorHead || settings?.majorHead || '2403-00-101-02-00',
        ddoCode: currentImport.ddoCode || settings?.ddoCode || '0299',
        department: settings?.department || 'Animal Husbandry',
        tanNo: currentImport.tanNo || settings?.tanNo || '',
        cardexNo: currentImport.cardexNo || settings?.cardexNo || '',
        address: settings?.address || 'Surat',
        mobileNo: settings?.mobileNo || '',
      }
    : null;

  const handleExportPdf = () => {
    if (!hasData) return;
    paybillPdfService.exportMonthlyBillPdf({
      month: selectedMonth,
      financialYear,
      billNo: currentImport?.billNo || settings?.billNo || 'Srt0299002202',
      majorHead: currentImport?.majorHead || settings?.majorHead || '2403-00-101-02-00',
      earnings: currentMonthEarnings,
      deductions: currentMonthDeductions.length > 0 ? currentMonthDeductions : undefined,
    });
  };

  const hasData =
    currentMonthEarnings.length > 0 || currentMonthDeductions.length > 0;

  return (
    <div className="space-y-4">
      {/* Top Filter & Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector Dropdown */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {fyMonths.map((m) => {
                const hasEarn = earnings.some((e) => e.month.toLowerCase() === m.toLowerCase());
                const hasDed = deductions.some((d) => d.month.toLowerCase() === m.toLowerCase());
                let tag = '— (Not Uploaded)';
                if (hasEarn && hasDed) tag = '✓ (Earn + Ded)';
                else if (hasEarn) tag = '✓ (Earnings)';
                else if (hasDed) tag = '✓ (Deductions)';

                return (
                  <option key={m} value={m}>
                    {m} {tag}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          {/* View Mode Switcher */}
          <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex text-[0.72rem] font-bold">
            <button
              onClick={() => setViewMode('EARNING')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                viewMode === 'EARNING'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <TrendingUp size={12} />
              Earnings (Gross)
            </button>
            <button
              onClick={() => setViewMode('DEDUCTION')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                viewMode === 'DEDUCTION'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <TrendingDown size={12} />
              Deductions Side
            </button>
            <button
              onClick={() => setViewMode('COMBINED')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                viewMode === 'COMBINED'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Receipt size={12} />
              Net Pay Statement
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          {/* Search Box */}
          {hasData && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search HRPN, name, designation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 font-medium text-slate-800 dark:text-slate-200"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            title="Pay Bill Settings (DA rates & defaults)"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {hasData && (
            <button
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-lg transition"
              title="Export monthly summary as PDF"
            >
              <FileDown className="w-3.5 h-3.5" />
              Export PDF
            </button>
          )}

          {currentImport ? (
            <>
              <button
                onClick={() => setShowLedgerModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 rounded-lg transition"
              >
                <Send className="w-3.5 h-3.5" />
                Post to Ledger
              </button>

              <button
                onClick={handleDeleteCurrentMonth}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition"
                title="Delete Month Bill"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onOpenUploadModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload {selectedMonth} Bill
            </button>
          )}
        </div>
      </div>

      {/* When Month Data Exists */}
      {hasData ? (
        <div className="space-y-4">
          {/* Month Bill Overview Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-[0.7rem] text-slate-400 block font-medium">Bill Number</span>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                {currentImport?.billNo || settings?.billNo || 'Srt0299002202'}
              </span>
            </div>
            <div>
              <span className="text-[0.7rem] text-slate-400 block font-medium">Major Budget Head</span>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                {currentImport?.majorHead || settings?.majorHead || '2403-00-101-02-00'}
              </span>
            </div>
            <div>
              <span className="text-[0.7rem] text-slate-400 block font-medium">Gross Expenditure</span>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatInr(monthTotals.grossAmount || currentImport?.grossTotal)}
              </span>
            </div>
            <div>
              <span className="text-[0.7rem] text-slate-400 block font-medium">Total Deductions / Net Pay</span>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono block">
                <span className="text-rose-600 dark:text-rose-400">Ded: {formatInr(deductionTotals.totalDeductions)}</span> &bull;{' '}
                <span className="text-emerald-600 dark:text-emerald-400">Net: {formatInr(deductionTotals.netPay || (monthTotals.grossAmount - deductionTotals.totalDeductions))}</span>
              </span>
            </div>
          </div>

          {/* VIEW 1: EARNINGS TABLE */}
          {viewMode === 'EARNING' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Pay Bill Inner Sheet Details &bull; Earning Side ({filteredEarnings.length} Employees)
                </h4>
                <span className="text-xs text-slate-500 font-mono">
                  {selectedMonth}
                </span>
              </div>

              <div className="overflow-x-auto max-h-[500px] app-scroll">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase text-[0.68rem] tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                    <tr>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700">Sr</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700">HRPN</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700">Employee Name</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700">Designation</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700">Pay Scale</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">Basic Pay</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">DA (0103)</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">HRA (0110)</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">CLA (0111)</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">Med (0107)</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">Trans (0113)</th>
                      {hasSpecialPay && (
                        <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">Spl Pay</th>
                      )}
                      {hasWashing && (
                        <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">Wash (0132)</th>
                      )}
                      {hasNpp && (
                        <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">NPP (0128)</th>
                      )}
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right bg-blue-50/50 dark:bg-blue-950/30">Gross Amt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredEarnings.map((row, idx) => (
                      <tr
                        key={row.id}
                        onClick={() => onViewEmployeeLedger && onViewEmployeeLedger(row.hrpn)}
                        className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors cursor-pointer"
                        title="Click to view full Employee Ledger"
                      >
                        <td className="py-2.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline">
                          {row.hrpn}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {row.employeeName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {row.designation}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[0.7rem] text-slate-500 whitespace-nowrap">
                          {row.payScale}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                          {formatInr(row.basicPay)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatInr(row.da)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatInr(row.hra)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatInr(row.cla)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatInr(row.medicalAllowance)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatInr(row.transportAllowance)}
                        </td>
                        {hasSpecialPay && (
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                            {formatInr(row.specialPay)}
                          </td>
                        )}
                        {hasWashing && (
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                            {formatInr(row.washingAllowance)}
                          </td>
                        )}
                        {hasNpp && (
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                            {formatInr(row.nppAllowance)}
                          </td>
                        )}
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900 dark:text-slate-100 bg-blue-50/30 dark:bg-blue-950/20">
                          {formatInr(row.grossAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Total Row */}
                  <tfoot className="bg-slate-100/90 dark:bg-slate-800/90 font-bold border-t-2 border-slate-300 dark:border-slate-600 sticky bottom-0 z-10 backdrop-blur-xs">
                    <tr>
                      <td colSpan={5} className="py-3 px-3 text-left uppercase text-[0.72rem] tracking-wider text-slate-800 dark:text-slate-200">
                        Total ({currentMonthEarnings.length} Employees)
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                        {formatInr(monthTotals.basicPay)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                        {formatInr(monthTotals.da)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                        {formatInr(monthTotals.hra)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                        {formatInr(monthTotals.cla)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                        {formatInr(monthTotals.medicalAllowance)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                        {formatInr(monthTotals.transportAllowance)}
                      </td>
                      {hasSpecialPay && (
                        <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                          {formatInr(monthTotals.specialPay)}
                        </td>
                      )}
                      {hasWashing && (
                        <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                          {formatInr(monthTotals.washingAllowance)}
                        </td>
                      )}
                      {hasNpp && (
                        <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                          {formatInr(monthTotals.nonPrivatePracticeAllowance)}
                        </td>
                      )}
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-blue-700 dark:text-blue-300 text-sm bg-blue-100/60 dark:bg-blue-900/40">
                        {formatInr(monthTotals.grossAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: DEDUCTIONS TABLE */}
          {viewMode === 'DEDUCTION' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span>Pay Bill Inner Sheet Details &bull; Deduction Side ({filteredDeductions.length} Employees)</span>
                </h4>
                <span className="text-xs text-slate-500 font-mono">
                  {selectedMonth}
                </span>
              </div>

              <div className="overflow-x-auto max-h-[500px] app-scroll">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase text-[0.68rem] tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                    <tr>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700">Sr</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700">HRPN</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700">Employee Name</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700">Designation</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">IT (9510)</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">PT (9570)</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">HBA (9591)</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">GPF (9670)</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">GPF Cl.4 (9531)</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">NPS (9534)</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">Govt Fund (9581)</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">Govt Sav (9582)</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right bg-rose-50/50 dark:bg-rose-950/30">Total Ded</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right bg-emerald-50/50 dark:bg-emerald-950/30">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredDeductions.map((row, idx) => (
                      <tr
                        key={row.id}
                        onClick={() => onViewEmployeeLedger && onViewEmployeeLedger(row.hrpn)}
                        className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors cursor-pointer"
                        title="Click to view full Employee Ledger"
                      >
                        <td className="py-2.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline">
                          {row.hrpn}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {row.employeeName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {row.designation}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatInr(row.incomeTax)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatInr(row.profTax)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatInr(row.hbaInterest)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatInr(row.gpfRegular)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatInr(row.gpfClass4)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatInr(row.npsRegular)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatInr(row.gisGovtFund)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatInr(row.gisGovtSaving)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/20">
                          {formatInr(row.totalDeductions)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">
                          {formatInr(row.netPay)}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Deduction Total Row */}
                  <tfoot className="bg-slate-100/90 dark:bg-slate-800/90 font-bold border-t-2 border-slate-300 dark:border-slate-600 sticky bottom-0 z-10 backdrop-blur-xs">
                    <tr>
                      <td colSpan={4} className="py-3 px-3 text-left uppercase text-[0.72rem] tracking-wider text-slate-800 dark:text-slate-200">
                        Total Deductions ({filteredDeductions.length} Employees)
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                        {formatInr(deductionTotals.incomeTax)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                        {formatInr(deductionTotals.profTax)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                        {formatInr(deductionTotals.hbaInterest)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                        {formatInr(deductionTotals.gpfRegular)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                        {formatInr(deductionTotals.gpfClass4)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                        {formatInr(deductionTotals.npsRegular)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                        {formatInr(deductionTotals.gisGovtFund)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-slate-100">
                        {formatInr(deductionTotals.gisGovtSaving)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 text-sm bg-rose-100/60 dark:bg-rose-900/40">
                        {formatInr(deductionTotals.totalDeductions)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-100/60 dark:bg-emerald-900/40">
                        {formatInr(deductionTotals.netPay)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 3: COMBINED NET PAY STATEMENT */}
          {viewMode === 'COMBINED' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Combined Monthly Salary Statement &bull; Gross vs. Deductions vs. Net Pay ({combinedRecords.length} Staff)
                </h4>
                <span className="text-xs text-slate-500 font-mono">
                  {selectedMonth}
                </span>
              </div>

              <div className="overflow-x-auto max-h-[500px] app-scroll">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase text-[0.68rem] tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                    <tr>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700">Sr</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700">HRPN</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700">Employee Name</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700">Designation</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">Basic Pay</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right bg-blue-50/40 dark:bg-blue-950/20">Gross Amount</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right">Income Tax</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right bg-rose-50/40 dark:bg-rose-950/20">Total Ded</th>
                      <th className="py-2.5 px-3 font-bold border-b border-slate-200 dark:border-slate-700 text-right bg-emerald-50/50 dark:bg-emerald-950/30">Net Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {combinedRecords.map((r, idx) => (
                      <tr
                        key={r.hrpn}
                        onClick={() => onViewEmployeeLedger && onViewEmployeeLedger(r.hrpn)}
                        className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {r.hrpn}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                          {r.employeeName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {r.designation}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatInr(r.basicPay)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-950/10">
                          {formatInr(r.grossAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatInr(r.incomeTax)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/10">
                          {formatInr(r.totalDeductions)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-50/30 dark:bg-emerald-950/20">
                          {formatInr(r.netPay)}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Combined Totals Footer */}
                  <tfoot className="bg-slate-100/90 dark:bg-slate-800/90 font-bold border-t-2 border-slate-300 dark:border-slate-600 sticky bottom-0 z-10 backdrop-blur-xs">
                    <tr>
                      <td colSpan={5} className="py-3 px-3 text-left uppercase text-[0.72rem] tracking-wider text-slate-800 dark:text-slate-200">
                        Monthly Net Outflow Total ({combinedRecords.length} Staff)
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-blue-700 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-950/30">
                        {formatInr(combinedTotals.gross)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatInr(deductionTotals.incomeTax)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-rose-600 dark:text-rose-400 bg-rose-100/50 dark:bg-rose-950/30">
                        {formatInr(combinedTotals.deductions)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-100/60 dark:bg-emerald-900/40">
                        {formatInr(combinedTotals.netPay)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No Pay Bill Records Found for {selectedMonth}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Upload the <strong>Earning Side</strong> or <strong>Deduction Side</strong> PDF bill for {selectedMonth} to populate this register.
            </p>
          </div>
          <button
            onClick={onOpenUploadModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition"
          >
            <Upload size={14} />
            Upload {selectedMonth} Bill PDF
          </button>
        </div>
      )}

      {/* Ledger Voucher Posting Modal */}
      {currentMetadata && (
        <PostToLedgerModal
          isOpen={showLedgerModal}
          onClose={() => setShowLedgerModal(false)}
          metadata={currentMetadata}
          financialYear={financialYear}
          totals={monthTotals}
          onSuccess={() => setShowLedgerModal(false)}
        />
      )}

      {/* Pay Bill Settings Modal */}
      <PayBillSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSaved={(s) => setSettings(s)}
      />
    </div>
  );
};
