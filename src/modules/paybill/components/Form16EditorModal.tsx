import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Save,
  Printer,
  ShieldCheck,
  Send,
  User,
  Calculator,
  Building2,
  AlertTriangle,
  RotateCcw,
  Landmark,
  Lock,
  ChevronLeft,
  ChevronRight,
  Columns,
  Maximize2,
  Eye,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { Form16Document } from './Form16Document';
import {
  computeForm16Totals,
  validateCertificate,
  assessmentYearFor,
} from '../services/form16Calculation.service';
import { establishmentService } from '@/modules/establishment/services/establishment.service';
import { useForm16TaxRules } from '../hooks/useForm16';
import { toast } from '@/shared/components/Toast';
import { popupNativePrint } from '@/shared/utilities/nativePrint';
import type {
  Form16Certificate,
  Form16QuarterEntry,
} from '../types/form16';

export interface Form16EditorModalProps {
  open: boolean;
  onClose: () => void;
  cert: Form16Certificate | null;
  grossAmountSource: number;
  deductionsSource: Array<{ incomeTax: number; month: string }>;
  payrollQuarterlySource?: Record<string, { amountPaid: number; taxDeducted: number }> | null;
  allEmployees?: Array<{ hrpn: string; name: string; designation?: string }>;
  onNavigateEmployee?: (hrpn: string) => void;
  onSave: (cert: Form16Certificate) => Promise<Form16Certificate | void>;
  onStatusChange: (id: string, status: 'REVIEWED' | 'ISSUED' | 'VOIDED') => Promise<void>;
  isSaving?: boolean;
}

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const numInput =
  'w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-right font-medium text-slate-800 dark:text-slate-100 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800 transition';
const textInput =
  'w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-100 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800 transition';
const fieldLabel =
  'block text-[0.68rem] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1';

type EditorTab = 'partB' | 'partA' | 'details';
type ViewMode = 'split' | 'form' | 'preview';

export function Form16EditorModal({
  open,
  onClose,
  cert: initialCert,
  grossAmountSource,
  deductionsSource,
  payrollQuarterlySource,
  allEmployees = [],
  onNavigateEmployee,
  onSave,
  onStatusChange,
  isSaving = false,
}: Form16EditorModalProps) {
  const [localCert, setLocalCert] = useState<Form16Certificate | null>(initialCert);
  const [activeTab, setActiveTab] = useState<EditorTab>('partB');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isRefreshingEst, setIsRefreshingEst] = useState(false);
  const { taxRulesConfig } = useForm16TaxRules();

  useEffect(() => {
    if (initialCert) {
      setLocalCert({
        ...initialCert,
        partA: {
          ...initialCert.partA,
          quarters: initialCert.partA.quarters.map((q) => ({
            ...q,
            taxDeposited: q.taxDeducted,
          })),
        },
      });
    } else {
      setLocalCert(null);
    }
  }, [initialCert]);

  const computedTotals = useMemo(() => {
    if (!localCert) return null;
    return computeForm16Totals({
      financialYear: localCert.financialYear,
      taxRegime: 'NEW',
      earnings: [{ grossAmount: grossAmountSource }],
      deductions: deductionsSource,
      partA: localCert.partA,
      partB: localCert.partB,
      taxRulesSettings: taxRulesConfig,
    });
  }, [localCert, grossAmountSource, deductionsSource, taxRulesConfig]);

  const liveCert: Form16Certificate | null = useMemo(() => {
    if (!localCert) return null;
    return {
      ...localCert,
      computedTotals,
    };
  }, [localCert, computedTotals]);

  const validationErrors = useMemo(() => {
    if (!liveCert) return [];
    return validateCertificate(liveCert);
  }, [liveCert]);

  // Current Employee Index for Navigation
  const currentEmpIndex = useMemo(() => {
    if (!localCert || allEmployees.length === 0) return -1;
    const norm = localCert.hrpn.trim().toLowerCase();
    return allEmployees.findIndex((e) => e.hrpn.trim().toLowerCase() === norm);
  }, [localCert, allEmployees]);

  const canGoPrev = currentEmpIndex > 0;
  const canGoNext = currentEmpIndex >= 0 && currentEmpIndex < allEmployees.length - 1;

  const handleNavigate = useCallback((dir: 'prev' | 'next') => {
    if (!onNavigateEmployee || allEmployees.length === 0) return;
    const targetIdx = dir === 'prev' ? currentEmpIndex - 1 : currentEmpIndex + 1;
    if (targetIdx >= 0 && targetIdx < allEmployees.length) {
      onNavigateEmployee(allEmployees[targetIdx].hrpn);
    }
  }, [currentEmpIndex, allEmployees, onNavigateEmployee]);

  const updateCert = (fn: (prev: Form16Certificate) => Form16Certificate) => {
    setLocalCert((prev) => (prev ? fn(prev) : null));
  };

  const updateQuarter = (idx: number, patch: Partial<Form16QuarterEntry>) => {
    updateCert((prev) => {
      const quarters = prev.partA.quarters.map((q, i) => (i === idx ? { ...q, ...patch } : q));
      return { ...prev, partA: { ...prev.partA, quarters } };
    });
  };

  const handleAutoFillFromEstablishment = async () => {
    if (!localCert?.hrpn) return;
    setIsRefreshingEst(true);
    try {
      const estList = await establishmentService
        .syncEmployees()
        .catch(() => establishmentService.loadEmployees());
      const norm = localCert.hrpn.trim().toLowerCase();
      const matched =
        estList.find((e) => (e.hrpnNo || '').trim().toLowerCase() === norm) ||
        estList.find(
          (e) =>
            localCert.employee.name &&
            e.name.trim().toLowerCase() === localCert.employee.name.trim().toLowerCase()
        );
      if (matched) {
        updateCert((prev) => ({
          ...prev,
          employee: {
            ...prev.employee,
            pan: matched.pan?.trim().toUpperCase() || prev.employee.pan,
            name: matched.name || prev.employee.name,
            designation: matched.designation || prev.employee.designation,
            address:
              matched.quartersAddress || matched.headquarter || prev.employee.address,
          },
        }));
        toast.success(
          `Fetched Establishment details for ${matched.name}`
        );
      } else {
        toast.info(`No matching establishment record found for HRPN ${localCert.hrpn}.`);
      }
    } catch {
      toast.error('Could not fetch establishment record.');
    } finally {
      setIsRefreshingEst(false);
    }
  };

  const handleSyncWithPayroll = () => {
    if (!payrollQuarterlySource) {
      toast.info('No quarterly records found in Payroll module for this employee.');
      return;
    }
    updateCert((p) => ({
      ...p,
      partA: {
        ...p.partA,
        quarters: p.partA.quarters.map((q) => {
          const payrollQ = payrollQuarterlySource[q.quarter];
          return {
            ...q,
            amountPaid: payrollQ ? payrollQ.amountPaid : q.amountPaid,
            taxDeducted: payrollQ ? payrollQ.taxDeducted : q.taxDeducted,
            taxDeposited: payrollQ ? payrollQ.taxDeducted : q.taxDeposited,
          };
        }),
      },
    }));
    toast.success('Part A quarterly figures synchronized from Payroll module.');
  };

  const handleSave = async (): Promise<Form16Certificate | null> => {
    if (!liveCert) return null;
    try {
      const saved = await onSave(liveCert);
      const result = (saved as Form16Certificate) || liveCert;
      setLocalCert(result);
      toast.success('Form 16 certificate saved.');
      return result;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save certificate.');
      return null;
    }
  };

  const handlePrint = () => {
    if (!localCert) return;
    const docEl = document.getElementById('form16-editor-preview');
    if (!docEl) return;
    const empPan = localCert.employee.pan || localCert.hrpn || 'Employee';
    const ayLabel = assessmentYearFor(localCert.financialYear);
    popupNativePrint({
      elements: [docEl],
      title: `Form16_${empPan}_AY${ayLabel}`,
      pageSize: 'A4',
      orientation: 'portrait',
      pageMargin: '4mm 5mm',
      customStyles: `
        #form16-single-page {
          width: 100% !important;
          max-width: 100% !important;
          padding: 0 !important;
          margin: 0 auto !important;
          box-shadow: none !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        @media print {
          @page { size: A4 portrait; margin: 4mm 5mm !important; }
          html, body { background: #fff !important; color: #000 !important; font-family: 'Times New Roman', Times, 'Liberation Serif', Georgia, serif !important; }
        }
      `,
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNavigate('prev');
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleNavigate('next');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleSave, handleNavigate]);

  if (!localCert || !liveCert) return null;

  const fy = localCert.financialYear;
  const fyLabel = `${fy}-${String(fy + 1).slice(-2)}`;
  const ayLabel = assessmentYearFor(fy);

  const totalQuarterTds = localCert.partA.quarters.reduce((s, q) => s + (Number(q.taxDeducted) || 0), 0);
  const partBTds = computedTotals?.tdsDeducted || 0;
  const isTdsReconciled = Math.abs(totalQuarterTds - partBTds) <= 1;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Form 16 Editor — ${localCert.employee.name || localCert.hrpn}`}
      maxWidth="full"
    >
      <div className="flex flex-col h-[86vh] -m-4">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700/80">
          <div className="flex items-center gap-2.5">
            {allEmployees.length > 0 && onNavigateEmployee && (
              <div className="inline-flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  disabled={!canGoPrev}
                  onClick={() => handleNavigate('prev')}
                  className="p-1 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Previous Employee (Alt + ←)"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-2 select-none">
                  {currentEmpIndex >= 0 ? `${currentEmpIndex + 1} / ${allEmployees.length}` : '—'}
                </span>
                <button
                  type="button"
                  disabled={!canGoNext}
                  onClick={() => handleNavigate('next')}
                  className="p-1 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Next Employee (Alt + →)"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
                {localCert.hrpn}
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {localCert.employee.name}
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">·</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                FY {fyLabel} (AY {ayLabel})
              </span>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                  localCert.status === 'ISSUED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    : localCert.status === 'REVIEWED'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                }`}
              >
                {localCert.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:inline-flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 transition ${
                  viewMode === 'split'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Split Side-by-Side (50/50)"
              >
                <Columns size={13} />
                <span className="hidden lg:inline text-[11px]">Split</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('form')}
                className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 transition ${
                  viewMode === 'form'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Form View (Full Width)"
              >
                <Maximize2 size={13} />
                <span className="hidden lg:inline text-[11px]">Form</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`p-1.5 rounded text-xs font-medium flex items-center gap-1 transition ${
                  viewMode === 'preview'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Document Preview Only"
              >
                <Eye size={13} />
                <span className="hidden lg:inline text-[11px]">Document</span>
              </button>
            </div>

            {(viewMode === 'preview' || viewMode === 'split') && (
              <div className="hidden xl:inline-flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-2xs text-[11px]">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(75, z - 15))}
                  className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  title="Zoom Out"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="px-1.5 font-mono text-[10px] text-slate-500">{zoomLevel}%</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(130, z + 15))}
                  className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  title="Zoom In"
                >
                  <ZoomIn size={13} />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer shadow-2xs"
              title="Print Preview (Ctrl + P)"
            >
              <Printer size={13} /> Print
            </button>
          </div>
        </div>

        {/* Reconciliation Bar */}
        <div className="flex items-center justify-between px-5 py-1.5 bg-slate-100/90 dark:bg-slate-850 border-b border-slate-200/80 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            {isTdsReconciled ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 size={12} /> Part A TDS reconciles with Part B ({inr(partBTds)})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                <AlertTriangle size={12} /> TDS Difference: Part A ({inr(totalQuarterTds)}) vs Part B ({inr(partBTds)})
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">New Tax Regime u/s 115BAC</span> · Net Payable: <strong className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{inr(computedTotals?.netTaxPayable || 0)}</strong>
          </div>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {(viewMode === 'split' || viewMode === 'form') && (
            <div className={`${viewMode === 'form' ? 'w-full max-w-4xl mx-auto' : 'w-full lg:w-1/2'} flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden`}>
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setActiveTab('partB')}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === 'partB'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Calculator size={13} />
                    <span>Part B (Salary)</span>
                    <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-indigo-500/30 text-white font-medium">
                      {inr(computedTotals?.totalTaxPayable || 0)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('partA')}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === 'partA'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Landmark size={13} />
                    <span>Part A (Quarters)</span>
                    <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded-full font-medium bg-blue-500/20 text-blue-700 dark:text-blue-200">
                      4/4 Qtrs
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('details')}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === 'details'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700'
                    }`}
                  >
                    <User size={13} />
                    <span>Details & Sign</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto app-scroll p-4 space-y-4">
                {activeTab === 'partB' && (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                          <Lock size={14} className="text-amber-600 dark:text-amber-400" />
                          <span>Official Paybill Salary Data</span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          🔒 Fetched from Paybill (Read-Only)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
                          <span className="text-slate-600 dark:text-slate-300">1(a) Gross Salary u/s 17(1)</span>
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {inr(computedTotals?.grossSalary17_1 || grossAmountSource)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
                          <span className="text-slate-600 dark:text-slate-300">1(b) Perquisites u/s 17(2)</span>
                          <span className="font-mono font-bold text-slate-500">₹0</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
                          <span className="text-slate-600 dark:text-slate-300">1(c) Profits in lieu u/s 17(3)</span>
                          <span className="font-mono font-bold text-slate-500">₹0</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
                          <span className="text-slate-600 dark:text-slate-300">1(d) Total Gross Salary</span>
                          <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                            {inr(computedTotals?.totalGrossSalary1d || grossAmountSource)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
                          <span className="text-slate-600 dark:text-slate-300">2(a) Std. Deduction u/s 16(ia)</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {inr(computedTotals?.standardDeduction16ia || 75000)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900/60">
                          <span className="font-bold text-amber-900 dark:text-amber-200">3. Income Chargeable (Salaries)</span>
                          <span className="font-mono font-bold text-amber-900 dark:text-amber-200">
                            {inr(computedTotals?.incomeChargeableSalaries || 0)}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                        * Salary heads are automatically fetched from Paybill records. To modify official salary, adjust the respective bills in the Paybill module.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={fieldLabel}>1(e) Other Employer Salary</label>
                        <input
                          type="number"
                          min={0}
                          value={localCert.partB.otherEmployerSalary || ''}
                          onChange={(e) =>
                            updateCert((p) => ({
                              ...p,
                              partB: { ...p.partB, otherEmployerSalary: Number(e.target.value) || 0 },
                            }))
                          }
                          className={numInput}
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className={fieldLabel}>4(a) House Property Income / Loss</label>
                        <input
                          type="number"
                          value={localCert.partB.housePropertyIncome || ''}
                          onChange={(e) =>
                            updateCert((p) => ({
                              ...p,
                              partB: { ...p.partB, housePropertyIncome: Number(e.target.value) || 0 },
                            }))
                          }
                          className={numInput}
                          placeholder="0 (Negative for loss)"
                        />
                      </div>

                      <div>
                        <label className={fieldLabel}>4(b) Other Sources Income</label>
                        <input
                          type="number"
                          min={0}
                          value={localCert.partB.otherSourcesIncome || ''}
                          onChange={(e) =>
                            updateCert((p) => ({
                              ...p,
                              partB: { ...p.partB, otherSourcesIncome: Number(e.target.value) || 0 },
                            }))
                          }
                          className={numInput}
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className={fieldLabel}>7. Employer NPS u/s 80CCD(2)</label>
                        <input
                          type="number"
                          min={0}
                          value={localCert.partB.nps80CCD2 || ''}
                          onChange={(e) =>
                            updateCert((p) => ({
                              ...p,
                              partB: { ...p.partB, nps80CCD2: Number(e.target.value) || 0 },
                            }))
                          }
                          className={numInput}
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className={fieldLabel}>8. Agnipath u/s 80CCH</label>
                        <input
                          type="number"
                          min={0}
                          value={localCert.partB.agnipath80CCH || ''}
                          onChange={(e) =>
                            updateCert((p) => ({
                              ...p,
                              partB: { ...p.partB, agnipath80CCH: Number(e.target.value) || 0 },
                            }))
                          }
                          className={numInput}
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className={fieldLabel}>16. Relief u/s 89 (Arrears)</label>
                        <input
                          type="number"
                          min={0}
                          value={localCert.partB.relief89 || ''}
                          onChange={(e) =>
                            updateCert((p) => ({
                              ...p,
                              partB: { ...p.partB, relief89: Number(e.target.value) || 0 },
                            }))
                          }
                          className={numInput}
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className={fieldLabel}>18. Tax Collected at Source (TCS)</label>
                        <input
                          type="number"
                          min={0}
                          value={localCert.partB.taxCollectedAtSource || ''}
                          onChange={(e) =>
                            updateCert((p) => ({
                              ...p,
                              partB: {
                                ...p.partB,
                                taxCollectedAtSource: Number(e.target.value) || 0,
                              },
                            }))
                          }
                          className={numInput}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {computedTotals && (
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs space-y-1.5">
                        <div className="font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1 flex justify-between">
                          <span>Tax Computation (New Regime u/s 115BAC)</span>
                          <span className="font-mono text-indigo-600 dark:text-indigo-400">
                            Taxable: {inr(computedTotals.totalTaxableIncome)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Tax on Total Income:</span>
                            <span className="font-mono font-semibold">
                              {inr(computedTotals.taxOnTotalIncome)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Rebate u/s 87A:</span>
                            <span className="font-mono font-semibold text-emerald-600">
                              -{inr(computedTotals.rebate87A)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Cess (4%):</span>
                            <span className="font-mono font-semibold">
                              {inr(computedTotals.cess4)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Total Tax Payable:</span>
                            <span className="font-mono font-semibold">
                              {inr(computedTotals.totalTaxPayable)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">TDS Deducted:</span>
                            <span className="font-mono font-semibold text-rose-600">
                              -{inr(computedTotals.tdsDeducted)}
                            </span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span className="text-slate-800 dark:text-slate-100">
                              Net Tax Payable / (Refund):
                            </span>
                            <span
                              className={`font-mono ${
                                computedTotals.netTaxPayable < 0
                                  ? 'text-emerald-600'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {inr(computedTotals.netTaxPayable)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'partA' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-xl gap-3">
                      <div className="flex items-center gap-2">
                        <Landmark size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="text-xs">
                          <span className="font-bold text-blue-900 dark:text-blue-200">
                            Fetched from Payroll Module (24Q Statement)
                          </span>
                          <p className="text-[0.7rem] text-blue-700 dark:text-blue-300">
                            Quarterly payments and TDS deductions are automatically derived from Payroll monthly returns.
                          </p>
                        </div>
                      </div>
                      {payrollQuarterlySource && (
                        <button
                          type="button"
                          onClick={handleSyncWithPayroll}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shrink-0 cursor-pointer shadow-2xs"
                        >
                          <RotateCcw size={12} /> Sync from Payroll
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl">
                      <div>
                        <label className={fieldLabel}>Period From</label>
                        <input
                          value={localCert.partA.periodFrom || ''}
                          onChange={(e) =>
                            updateCert((p) => ({
                              ...p,
                              partA: { ...p.partA, periodFrom: e.target.value },
                            }))
                          }
                          className={textInput}
                          placeholder={`01-Apr-${fy}`}
                        />
                      </div>
                      <div>
                        <label className={fieldLabel}>Period To</label>
                        <input
                          value={localCert.partA.periodTo || ''}
                          onChange={(e) =>
                            updateCert((p) => ({
                              ...p,
                              partA: { ...p.partA, periodTo: e.target.value },
                            }))
                          }
                          className={textInput}
                          placeholder={`31-Mar-${fy + 1}`}
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto app-scroll">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-[0.65rem] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                            <th className="py-2 pr-2 font-bold w-12 text-center">Qtr</th>
                            <th className="py-2 pr-2 font-bold min-w-[140px]">24Q Receipt No</th>
                            <th className="py-2 pr-2 font-bold text-right w-24">Gross Paid</th>
                            <th className="py-2 pr-2 font-bold text-right w-24">TDS Deducted</th>
                            <th className="py-2 pr-2 font-bold text-right w-24">TDS Deposited</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {localCert.partA.quarters.map((q, idx) => (
                            <tr key={q.quarter}>
                              <td className="py-2 pr-2 font-bold text-center text-slate-700 dark:text-slate-200">
                                {q.quarter}
                              </td>
                              <td className="py-2 pr-2">
                                <input
                                  value={q.receiptNumber}
                                  onChange={(e) =>
                                    updateQuarter(idx, { receiptNumber: e.target.value.toUpperCase() })
                                  }
                                  placeholder="e.g. QWBYJLWA"
                                  className="w-full text-xs px-2 py-1 font-mono uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                                />
                              </td>
                              <td className="py-2 pr-2 text-right">
                                <div
                                  className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-700 dark:text-slate-200 text-right cursor-not-allowed select-all"
                                  title="Gross paid is fetched from the employee ledger and is non-editable"
                                >
                                  {inr(q.amountPaid)}
                                </div>
                              </td>
                              <td className="py-2 pr-2 text-right">
                                <div
                                  className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-rose-600 dark:text-rose-400 text-right cursor-not-allowed select-all"
                                  title="TDS Deducted is fetched from the employee ledger and is non-editable"
                                >
                                  {inr(q.taxDeducted)}
                                </div>
                              </td>
                              <td className="py-2 pr-2 text-right">
                                <div
                                  className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right cursor-not-allowed select-all"
                                  title="TDS Deposited is equal to TDS Deducted and is non-editable"
                                >
                                  {inr(q.taxDeducted)}
                                </div>
                              </td>
                            </tr>
                          ))}
                          <tr className="font-bold bg-slate-50 dark:bg-slate-800/40">
                            <td className="py-2 text-center">Total</td>
                            <td />
                            <td className="py-2 pr-2 text-right font-mono text-xs">
                              {inr(localCert.partA.quarters.reduce((s, q) => s + (Number(q.amountPaid) || 0), 0))}
                            </td>
                            <td className="py-2 pr-2 text-right font-mono text-xs">
                              {inr(localCert.partA.quarters.reduce((s, q) => s + (Number(q.taxDeducted) || 0), 0))}
                            </td>
                            <td className="py-2 pr-2 text-right font-mono text-xs">
                              {inr(localCert.partA.quarters.reduce((s, q) => s + (Number(q.taxDeposited) || 0), 0))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'details' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-2.5">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <Building2 size={14} className="text-indigo-600" /> Certificate Identifier & Date
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className={fieldLabel}>Certificate Number</label>
                          <input
                            value={localCert.certificateNumber || ''}
                            onChange={(e) =>
                              updateCert((p) => ({
                                ...p,
                                certificateNumber: e.target.value,
                              }))
                            }
                            className={textInput}
                            placeholder="Auto-generated if empty"
                          />
                        </div>
                        <div>
                          <label className={fieldLabel}>Issue Date</label>
                          <input
                            type="date"
                            value={localCert.issuedAt ? localCert.issuedAt.slice(0, 10) : ''}
                            onChange={(e) =>
                              updateCert((p) => ({
                                ...p,
                                issuedAt: e.target.value,
                              }))
                            }
                            className={textInput}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                          <User size={14} className="text-indigo-600" /> Employee Profile
                        </div>
                        <button
                          type="button"
                          disabled={isRefreshingEst}
                          onClick={() => void handleAutoFillFromEstablishment()}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition cursor-pointer"
                        >
                          <RotateCcw size={11} className={isRefreshingEst ? 'animate-spin' : ''} /> Auto-fill from Establishment
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className={fieldLabel}>Full Name</label>
                          <input
                            value={localCert.employee.name}
                            onChange={(e) =>
                              updateCert((p) => ({
                                ...p,
                                employee: { ...p.employee, name: e.target.value },
                              }))
                            }
                            className={textInput}
                          />
                        </div>
                        <div>
                          <label className={fieldLabel}>Designation</label>
                          <input
                            value={localCert.employee.designation}
                            onChange={(e) =>
                              updateCert((p) => ({
                                ...p,
                                employee: { ...p.employee, designation: e.target.value },
                              }))
                            }
                            className={textInput}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className={fieldLabel}>PAN (Permanent Account No)</label>
                          <input
                            value={localCert.employee.pan}
                            onChange={(e) =>
                              updateCert((p) => ({
                                ...p,
                                employee: {
                                  ...p.employee,
                                  pan: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
                                },
                              }))
                            }
                            className={`${textInput} font-mono uppercase`}
                            placeholder="ABCDE1234F"
                          />
                        </div>
                        <div>
                          <label className={fieldLabel}>HRPN / Employee Code</label>
                          <input
                            value={localCert.employee.hrpn}
                            disabled
                            className={`${textInput} font-mono bg-slate-100 dark:bg-slate-800 text-slate-500`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={fieldLabel}>Employee Residential Address</label>
                        <input
                          value={localCert.employee.address}
                          onChange={(e) =>
                            updateCert((p) => ({
                              ...p,
                              employee: { ...p.employee, address: e.target.value },
                            }))
                          }
                          className={textInput}
                          placeholder="Employee address as per official records"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                        <Building2 size={14} className="text-blue-600" /> Deductor Details
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="sm:col-span-2">
                          <label className={fieldLabel}>Office Name (Deductor)</label>
                          <textarea
                            value={localCert.employer.name}
                            onChange={(e) =>
                              updateCert((p) => ({
                                ...p,
                                employer: { ...p.employer, name: e.target.value },
                              }))
                            }
                            rows={2}
                            className={`${textInput} resize-y min-h-[54px]`}
                            placeholder="Office of Deputy Director of Animal Husbandry&#10;ICDP, Surat"
                          />
                          <p className="text-[10px] text-slate-400 mt-0.5">Press Enter to add a second line</p>
                        </div>
                        <div>
                          <label className={fieldLabel}>CIT (TDS) Location</label>
                          <input
                            value={localCert.partA.citTds || ''}
                            onChange={(e) =>
                              updateCert((p) => ({
                                ...p,
                                partA: { ...p.partA, citTds: e.target.value },
                                employer: { ...p.employer, citTds: e.target.value },
                              }))
                            }
                            className={textInput}
                            placeholder="CIT(TDS), Surat"
                          />
                        </div>
                      </div>

                      <div>
                        <label className={fieldLabel}>Deductor Office Address</label>
                        <input
                          value={localCert.employer.address}
                          onChange={(e) =>
                            updateCert((p) => ({
                              ...p,
                              employer: { ...p.employer, address: e.target.value },
                            }))
                          }
                          className={textInput}
                          placeholder="Jilla Seva Sadan-2, Athwalines, Surat - 395001"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className={fieldLabel}>Deductor PAN</label>
                          <input
                            value={localCert.employer.pan}
                            onChange={(e) =>
                              updateCert((p) => ({
                                ...p,
                                employer: {
                                  ...p.employer,
                                  pan: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
                                },
                              }))
                            }
                            className={`${textInput} font-mono uppercase`}
                          />
                        </div>
                        <div>
                          <label className={fieldLabel}>Deductor TAN</label>
                          <input
                            value={localCert.employer.tan}
                            onChange={(e) =>
                              updateCert((p) => ({
                                ...p,
                                employer: {
                                  ...p.employer,
                                  tan: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
                                },
                              }))
                            }
                            className={`${textInput} font-mono uppercase`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                        <ShieldCheck size={14} className="text-emerald-600" /> Verification & Signatory Officer
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div>
                          <label className={fieldLabel}>Signatory Name</label>
                          <input
                            value={localCert.signatory.name}
                            onChange={(e) =>
                              updateCert((p) => ({
                                ...p,
                                signatory: { ...p.signatory, name: e.target.value },
                              }))
                            }
                            className={textInput}
                          />
                        </div>
                        <div>
                          <label className={fieldLabel}>Designation</label>
                          <input
                            value={localCert.signatory.designation}
                            onChange={(e) =>
                              updateCert((p) => ({
                                ...p,
                                signatory: { ...p.signatory, designation: e.target.value },
                              }))
                            }
                            className={textInput}
                          />
                        </div>
                        <div>
                          <label className={fieldLabel}>Place</label>
                          <input
                            value={localCert.signatory.place}
                            onChange={(e) =>
                              updateCert((p) => ({
                                ...p,
                                signatory: { ...p.signatory, place: e.target.value },
                              }))
                            }
                            className={textInput}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {validationErrors.length > 0 ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-start gap-2">
                    <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
                    <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-0.5 list-disc pl-3.5">
                      {validationErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    <ShieldCheck size={14} className="text-emerald-600 shrink-0" /> Certificate passes all official validation rules.
                  </div>
                )}
              </div>

              <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="hidden sm:inline">Shortcuts: </span>
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[10px] font-mono">Ctrl+S</kbd> Save · <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[10px] font-mono">Alt+←/→</kbd> Nav
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSaving || localCert.status === 'ISSUED'}
                    onClick={() => void handleSave()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    <Save size={13} /> {isSaving ? 'Saving…' : 'Save Draft'}
                  </button>

                  {localCert.status === 'DRAFT' && (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={async () => {
                        const saved = await handleSave();
                        const targetId = saved?.id || localCert.id;
                        await onStatusChange(targetId, 'REVIEWED');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition cursor-pointer"
                    >
                      <ShieldCheck size={13} /> Mark Reviewed
                    </button>
                  )}

                  {localCert.status === 'REVIEWED' && (
                    <button
                      type="button"
                      disabled={isSaving || validationErrors.length > 0}
                      onClick={async () => {
                        const saved = await handleSave();
                        const targetId = saved?.id || localCert.id;
                        await onStatusChange(targetId, 'ISSUED');
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                    >
                      <Send size={13} /> Issue Certificate
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {(viewMode === 'split' || viewMode === 'preview') && (
            <div className={`${viewMode === 'preview' ? 'w-full' : 'w-full lg:w-1/2'} bg-slate-200/70 dark:bg-slate-950/80 p-4 overflow-y-auto app-scroll flex justify-center items-start`}>
              <div
                id="form16-editor-preview"
                className="w-full max-w-[210mm] transition-all origin-top"
                style={{
                  transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
                  transformOrigin: 'top center',
                }}
              >
                <Form16Document cert={liveCert} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
