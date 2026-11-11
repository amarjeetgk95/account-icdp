import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Save,
  Printer,
  ShieldCheck,
  Send,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Columns,
  Maximize2,
  Eye,
  ZoomIn,
  ZoomOut,
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

// Shared editor sections (fully extracted — see components/form16/)
import { Form16PartBSection } from './form16/Form16EditorShared';
import { Form16TdsBanner, Form16TabNav } from './form16/Form16EditorChrome';
import { Form16DetailsSection } from './form16/Form16DetailsSection';
import { Form16PartASection } from './form16/Form16PartASection';

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
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 select-none">
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
              <span className="num text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
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
                className={`text-xs font-bold uppercase px-2 py-0.5 rounded-md border ${
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
                <span className="hidden lg:inline text-xs">Split</span>
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
                <span className="hidden lg:inline text-xs">Form</span>
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
                <span className="hidden lg:inline text-xs">Document</span>
              </button>
            </div>

            {(viewMode === 'preview' || viewMode === 'split') && (
              <div className="hidden xl:inline-flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-2xs text-xs">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(75, z - 15))}
                  className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  title="Zoom Out"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="px-1.5 num text-xs text-slate-500">{zoomLevel}%</span>
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
        <Form16TdsBanner
          totalQuarterTds={totalQuarterTds}
          partBTds={partBTds}
          netTaxPayable={computedTotals?.netTaxPayable}
        />

        {/* Main Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {(viewMode === 'split' || viewMode === 'form') && (
            <div className={`${viewMode === 'form' ? 'w-full max-w-4xl mx-auto' : 'w-full lg:w-1/2'} flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden`}>
              <Form16TabNav
                activeTab={activeTab}
                onChange={setActiveTab}
                totalTaxPayable={computedTotals?.totalTaxPayable}
              />

              <div className="flex-1 overflow-y-auto app-scroll p-4 space-y-4">
                {activeTab === 'partB' && localCert && (
                  <Form16PartBSection
                    cert={localCert}
                    computedTotals={computedTotals}
                    grossAmountSource={grossAmountSource}
                    updateCert={updateCert}
                  />
                )}

                {activeTab === 'partA' && (
                  <Form16PartASection
                    cert={localCert}
                    updateQuarter={updateQuarter}
                    updateCert={updateCert}
                    onSyncWithPayroll={payrollQuarterlySource ? handleSyncWithPayroll : undefined}
                  />
                )}

                {activeTab === 'details' && (
                  <Form16DetailsSection
                    cert={localCert}
                    updateCert={updateCert}
                    onAutoFill={() => void handleAutoFillFromEstablishment()}
                    isAutoFilling={isRefreshingEst}
                  />
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
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="hidden sm:inline">Shortcuts: </span>
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono">Ctrl+S</kbd> Save · <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono">Alt+←/→</kbd> Nav
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
