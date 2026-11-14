import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
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
  ArrowLeft,
  X,
  Check,
} from 'lucide-react';
import { Form16Document } from '../components/Form16Document';
import {
  computeForm16Totals,
  validateCertificate,
  assessmentYearFor,
  deriveQuarterlySummary,
  derivePayrollQuarterlySummary,
} from '../services/form16Calculation.service';
import { establishmentService } from '@/modules/establishment/services/establishment.service';
import { paybillRepository } from '../repositories/paybill.repository';
import { isValidUuid } from '../repositories/form16.repository';
import {
  useForm16List,
  useForm16Defaults,
  useForm16TaxRules,
  useSaveForm16Draft,
  useUpdateForm16Status,
} from '../hooks/useForm16';
import { supabase } from '@/core/supabase/client';
import { useUIStore } from '@/core/stores/ui-store';
import { toast } from '@/shared/components/Toast';
import { popupNativePrint } from '@/shared/utilities/nativePrint';
import type {
  Form16Certificate,
  Form16QuarterEntry,
} from '../types/form16';
import { EMPTY_FORM16_CERTIFICATE } from '../types/form16';
import type { PayBillStoredEarning, PayBillStoredDeduction } from '../types';
import type { EstablishmentEmployee } from '@/modules/establishment/types';
import { servesInFinancialYear, establishmentOrderRank } from '@/modules/establishment/types';

// Shared editor sections (fully extracted — see components/form16/)
import { Form16PartBSection } from '../components/form16/Form16EditorShared';
import { Form16DetailsSection } from '../components/form16/Form16DetailsSection';
import { Form16TdsBanner, Form16TabNav } from '../components/form16/Form16EditorChrome';
import { Form16PartASection } from '../components/form16/Form16PartASection';

type EditorTab = 'partB' | 'partA' | 'details';
type ViewMode = 'split' | 'form' | 'preview';

interface PayrollSalaryItem {
  employee_id: string;
  month: string;
  gross: number;
  da: number;
  tax: number;
  financial_year: number;
  employees?: { id: string; name: string; pan: string; hprn_no: string | null } | null;
}

export function Form16EditorPage() {
  const { hrpn = '' } = useParams<{ hrpn: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const storeFY = useUIStore((s) => s.activeFinancialYear);
  const fyParam = searchParams.get('fy');
  const fy = fyParam ? parseInt(fyParam, 10) : storeFY;

  // React Query Hooks
  const { data: savedCertificates = [], refetch: refetchCerts, isLoading: isLoadingCerts } = useForm16List(fy);
  const { defaults: f16Defaults } = useForm16Defaults();
  const { taxRulesConfig } = useForm16TaxRules();
  const saveDraftMutation = useSaveForm16Draft();
  const updateStatusMutation = useUpdateForm16Status();

  // Local state for raw data
  const [earnings, setEarnings] = useState<PayBillStoredEarning[]>([]);
  const [deductions, setDeductions] = useState<PayBillStoredDeduction[]>([]);
  const [estEmployees, setEstEmployees] = useState<EstablishmentEmployee[]>([]);
  const [manualLedger, setManualLedger] = useState<Record<string, Record<string, Record<string, number>>>>({});
  const [manualAllowances, setManualAllowances] = useState<string[]>(['Pay Difference', 'DA Difference']);
  const [payrollSalaries, setPayrollSalaries] = useState<PayrollSalaryItem[]>([]);
  const [isLoadingRaw, setIsLoadingRaw] = useState(true);

  // Editor interactive state
  const [localCert, setLocalCert] = useState<Form16Certificate | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('partB');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isRefreshingEst, setIsRefreshingEst] = useState(false);
  const [isSavingAndClosing, setIsSavingAndClosing] = useState(false);

  // Broadcast updates to opener tab
  const broadcastChange = (type: 'FORM16_SAVED' | 'FORM16_CLOSED') => {
    try {
      const channel = new BroadcastChannel('form16_updates');
      channel.postMessage({ type, hrpn, fy, timestamp: Date.now() });
      channel.close();
    } catch {}
    try {
      localStorage.setItem('form16_last_saved', String(Date.now()));
    } catch {}
  };

  // Load Paybill, Establishment, and Payroll data
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setIsLoadingRaw(true);
      try {
        const [allEarnings, allDeductions, estList, ledgerVals, settingsObj, payrollRows] = await Promise.all([
          paybillRepository.listEarnings({ financialYear: fy }).catch(() => []),
          paybillRepository.listDeductions({ financialYear: fy }).catch(() => []),
          establishmentService.syncEmployees().catch(() => establishmentService.loadEmployees()),
          paybillRepository.getManualLedgerValues().catch(() => ({})),
          paybillRepository.getSettings().catch(() => ({})),
          (async () => {
            const q = supabase
              .from('employee_salaries')
              .select('employee_id, month, gross, da, tax, financial_year, employees(id, name, pan, hprn_no)')
              .eq('financial_year', fy);
            const { data, error } = await q;
            if (!error && data) return data as unknown as PayrollSalaryItem[];
            return [];
          })(),
        ]);

        if (!cancelled) {
          setEarnings(allEarnings);
          setDeductions(allDeductions);
          setEstEmployees(estList);
          setManualLedger(ledgerVals || {});
          if (
            settingsObj &&
            typeof settingsObj === 'object' &&
            'manualAllowances' in settingsObj &&
            Array.isArray(settingsObj.manualAllowances) &&
            settingsObj.manualAllowances.length > 0
          ) {
            setManualAllowances(settingsObj.manualAllowances);
          }
          setPayrollSalaries(payrollRows);
        }
      } finally {
        if (!cancelled) setIsLoadingRaw(false);
      }
    }
    void loadData();
    return () => {
      cancelled = true;
    };
  }, [fy]);

  // Unified canonical employee list for sequential navigation
  const allEmployees = useMemo(() => {
    const map = new Map<string, { hrpn: string; name: string; designation?: string; pan?: string }>();

    earnings.forEach((e) => {
      const h = String(e.hrpn || '').trim();
      if (h && !map.has(h.toLowerCase())) {
        map.set(h.toLowerCase(), { hrpn: h, name: e.employeeName || h, designation: e.designation || undefined });
      }
    });

    deductions.forEach((d) => {
      const h = String(d.hrpn || '').trim();
      if (h && !map.has(h.toLowerCase())) {
        map.set(h.toLowerCase(), { hrpn: h, name: d.employeeName || h, designation: d.designation || undefined });
      }
    });

    estEmployees.forEach((est) => {
      if (servesInFinancialYear(est, fy)) {
        const h = String(est.hrpnNo || '').trim();
        if (h && !map.has(h.toLowerCase())) {
          map.set(h.toLowerCase(), { hrpn: h, name: est.name, designation: est.designation || undefined, pan: est.pan || undefined });
        }
      }
    });

    savedCertificates.forEach((c) => {
      const h = String(c.hrpn || '').trim();
      if (h && !map.has(h.toLowerCase())) {
        map.set(h.toLowerCase(), { hrpn: h, name: c.employee.name || h, designation: c.employee.designation || undefined, pan: c.employee.pan });
      }
    });

    // Office manual sequence (ક્રમ) from Establishment Directory first; others last, A-Z.
    const orderByHrpn = new Map<string, number>();
    [...estEmployees]
      .sort(
        (a, b) =>
          establishmentOrderRank(a) - establishmentOrderRank(b) ||
          (a.name || '').localeCompare(b.name || '')
      )
      .forEach((est, idx) => {
        const h = String(est.hrpnNo || '').trim().toLowerCase();
        if (h && !orderByHrpn.has(h)) orderByHrpn.set(h, idx);
      });

    return Array.from(map.values()).sort(
      (a, b) =>
        (orderByHrpn.get(a.hrpn.trim().toLowerCase()) ?? Number.MAX_SAFE_INTEGER) -
          (orderByHrpn.get(b.hrpn.trim().toLowerCase()) ?? Number.MAX_SAFE_INTEGER) ||
        a.name.localeCompare(b.name)
    );
  }, [earnings, deductions, estEmployees, savedCertificates, fy]);

  // Current Employee Index
  const currentEmpIndex = useMemo(() => {
    const norm = String(hrpn || '').trim().toLowerCase();
    return allEmployees.findIndex((e) => String(e.hrpn || '').trim().toLowerCase() === norm);
  }, [allEmployees, hrpn]);

  // Earnings & Deductions for current employee
  const currentEarnings = useMemo(() => {
    const norm = String(hrpn || '').trim().toLowerCase();
    return earnings.filter((e) => String(e.hrpn || '').trim().toLowerCase() === norm);
  }, [earnings, hrpn]);

  const currentDeductions = useMemo(() => {
    const norm = String(hrpn || '').trim().toLowerCase();
    return deductions.filter((d) => String(d.hrpn || '').trim().toLowerCase() === norm);
  }, [deductions, hrpn]);

  const grossAmountSource = useMemo(() => {
    const earningsSum = currentEarnings.reduce((s, e) => s + (Number(e.grossAmount) || 0), 0);
    const empManual = manualLedger[hrpn] || {};
    let manualAllowanceSum = 0;
    for (const label of manualAllowances) {
      const mObj = empManual[label] || {};
      for (const mVal of Object.values(mObj)) {
        manualAllowanceSum += Number(mVal) || 0;
      }
    }
    return earningsSum + manualAllowanceSum;
  }, [currentEarnings, manualLedger, manualAllowances, hrpn]);

  const deductionsSource = useMemo(() => {
    return currentDeductions.map((d) => ({
      incomeTax: Number(d.incomeTax) || 0,
      month: d.month || '',
    }));
  }, [currentDeductions]);

  const payrollQuarterlySource = useMemo(() => {
    if (!payrollSalaries.length) return null;
    const norm = String(hrpn || '').trim().toLowerCase();
    const matched = payrollSalaries.filter((s) => {
      const empId = String(s.employee_id ?? '').trim().toLowerCase();
      const empHrpn = String(s.employees?.hprn_no ?? '').trim().toLowerCase();
      const empPan = String(s.employees?.pan ?? '').trim().toUpperCase();
      const empName = String(s.employees?.name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
      return (
        (empId && empId === norm) ||
        (empHrpn && empHrpn === norm) ||
        (empPan && empPan === norm.toUpperCase()) ||
        (empName && empName === norm)
      );
    });
    if (!matched.length) return null;
    return derivePayrollQuarterlySummary(matched);
  }, [payrollSalaries, hrpn]);

  // Initialize or match local certificate
  useEffect(() => {
    const norm = String(hrpn || '').trim().toLowerCase();
    const existing = savedCertificates.find((c) => String(c.hrpn || '').trim().toLowerCase() === norm);

    const quarterlyDerived = payrollQuarterlySource || deriveQuarterlySummary(currentEarnings, currentDeductions);

    if (existing) {
      const updatedQuarters = existing.partA.quarters.map((q) => {
        const qData = quarterlyDerived[q.quarter];
        const amountPaid = qData ? qData.amountPaid : q.amountPaid;
        const taxDeducted = qData ? qData.taxDeducted : q.taxDeducted;
        return {
          ...q,
          amountPaid,
          taxDeducted,
          taxDeposited: taxDeducted,
        };
      });

      if (existing.status !== 'ISSUED' && f16Defaults) {
        setLocalCert({
          ...existing,
          employer: {
            ...existing.employer,
            name: f16Defaults.employerName || existing.employer.name,
            address: f16Defaults.employerAddress || existing.employer.address,
            tan: f16Defaults.employerTan || existing.employer.tan,
            pan: f16Defaults.employerPan || existing.employer.pan,
            citTds: f16Defaults.citTds || existing.employer.citTds,
          },
          partA: {
            ...existing.partA,
            citTds: f16Defaults.citTds || existing.partA.citTds,
            quarters: updatedQuarters,
          },
          signatory: {
            ...existing.signatory,
            name: f16Defaults.signatoryName || existing.signatory.name,
            designation: f16Defaults.signatoryDesignation || existing.signatory.designation,
            place: f16Defaults.signatoryPlace || existing.signatory.place,
          },
        });
      } else {
        setLocalCert({
          ...existing,
          partA: {
            ...existing.partA,
            quarters: updatedQuarters,
          },
        });
      }
    } else {
      const base = EMPTY_FORM16_CERTIFICATE(hrpn, fy);
      const estMatch = estEmployees.find((e) => String(e.hrpnNo || '').trim().toLowerCase() === norm);
      const empEntry = allEmployees.find((e) => String(e.hrpn || '').trim().toLowerCase() === norm);

      base.employee.name = estMatch?.name || empEntry?.name || hrpn;
      base.employee.designation = estMatch?.designation || empEntry?.designation || '';
      base.employee.pan = String(estMatch?.pan || empEntry?.pan || '').toUpperCase();
      base.employee.address = estMatch?.quartersAddress || estMatch?.headquarter || '';

      if (f16Defaults) {
        base.employer.name = f16Defaults.employerName || base.employer.name;
        base.employer.address = f16Defaults.employerAddress || base.employer.address;
        base.employer.tan = f16Defaults.employerTan || base.employer.tan;
        base.employer.pan = f16Defaults.employerPan || base.employer.pan;
        base.employer.citTds = f16Defaults.citTds || base.employer.citTds;
        base.partA.citTds = f16Defaults.citTds || base.partA.citTds;
        base.signatory.name = f16Defaults.signatoryName || base.signatory.name;
        base.signatory.designation = f16Defaults.signatoryDesignation || base.signatory.designation;
        base.signatory.place = f16Defaults.signatoryPlace || base.signatory.place;
      }

      if (payrollQuarterlySource) {
        base.partA.quarters = base.partA.quarters.map((q) => {
          const pq = payrollQuarterlySource[q.quarter];
          return {
            ...q,
            amountPaid: pq ? pq.amountPaid : q.amountPaid,
            taxDeducted: pq ? pq.taxDeducted : q.taxDeducted,
            taxDeposited: pq ? pq.taxDeducted : q.taxDeposited,
          };
        });
      } else {
        const paybillQ = deriveQuarterlySummary(currentEarnings, currentDeductions);
        base.partA.quarters = base.partA.quarters.map((q) => {
          const pq = paybillQ[q.quarter];
          return {
            ...q,
            amountPaid: pq ? pq.amountPaid : q.amountPaid,
            taxDeducted: pq ? pq.taxDeducted : q.taxDeducted,
            taxDeposited: pq ? pq.taxDeducted : q.taxDeposited,
          };
        });
      }

      setLocalCert(base);
    }
  }, [savedCertificates, estEmployees, allEmployees, f16Defaults, payrollQuarterlySource, currentEarnings, currentDeductions, hrpn, fy]);

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

  const canGoPrev = currentEmpIndex > 0;
  const canGoNext = currentEmpIndex >= 0 && currentEmpIndex < allEmployees.length - 1;

  const handleNavigateEmployee = useCallback(
    (dir: 'prev' | 'next') => {
      if (allEmployees.length === 0) return;
      const targetIdx = dir === 'prev' ? currentEmpIndex - 1 : currentEmpIndex + 1;
      if (targetIdx >= 0 && targetIdx < allEmployees.length) {
        const nextEmp = allEmployees[targetIdx];
        navigate(`/paybill/form16/${encodeURIComponent(nextEmp.hrpn)}?fy=${fy}`);
      }
    },
    [allEmployees, currentEmpIndex, fy, navigate]
  );

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
      const norm = String(localCert.hrpn || '').trim().toLowerCase();
      const matched =
        estList.find((e) => String(e.hrpnNo || '').trim().toLowerCase() === norm) ||
        estList.find(
          (e) =>
            localCert.employee.name &&
            String(e.name || '').trim().toLowerCase() === String(localCert.employee.name || '').trim().toLowerCase()
        );
      if (matched) {
        updateCert((prev) => ({
          ...prev,
          employee: {
            ...prev.employee,
            pan: String(matched.pan || '').trim().toUpperCase() || prev.employee.pan,
            name: matched.name || prev.employee.name,
            designation: matched.designation || prev.employee.designation,
            address:
              matched.quartersAddress || matched.headquarter || prev.employee.address,
          },
        }));
        toast.success(`Fetched Establishment details for ${matched.name}`);
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

  const handleSyncDeductorDefaults = () => {
    if (!f16Defaults) {
      toast.info('No office deductor defaults saved in Settings.');
      return;
    }
    updateCert((prev) => ({
      ...prev,
      employer: {
        ...prev.employer,
        name: f16Defaults.employerName || prev.employer.name,
        address: f16Defaults.employerAddress || prev.employer.address,
        tan: f16Defaults.employerTan || prev.employer.tan,
        pan: f16Defaults.employerPan || prev.employer.pan,
        citTds: f16Defaults.citTds || prev.employer.citTds,
      },
      partA: {
        ...prev.partA,
        citTds: f16Defaults.citTds || prev.partA.citTds,
      },
      signatory: {
        ...prev.signatory,
        name: f16Defaults.signatoryName || prev.signatory.name,
        designation: f16Defaults.signatoryDesignation || prev.signatory.designation,
        place: f16Defaults.signatoryPlace || prev.signatory.place,
      },
    }));
    toast.success('Deductor & Signatory details loaded from Settings.');
  };

  const handleSaveDraft = async (): Promise<Form16Certificate | null> => {
    if (!liveCert) return null;
    try {
      const payload = {
        ...liveCert,
        id: isValidUuid(liveCert.id) ? liveCert.id : undefined,
      };

      const saved = await saveDraftMutation.mutateAsync(payload);
      const result = (saved as Form16Certificate) || liveCert;
      setLocalCert(result);
      await refetchCerts();
      broadcastChange('FORM16_SAVED');
      toast.success('Form 16 certificate saved successfully.');
      return result;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save certificate.');
      return null;
    }
  };

  const handleSaveAndClose = async () => {
    setIsSavingAndClosing(true);
    try {
      const saved = await handleSaveDraft();
      if (saved) {
        broadcastChange('FORM16_SAVED');
        window.close();
        setTimeout(() => {
          navigate(`/paybill/form16?fy=${fy}&reload=${Date.now()}`);
        }, 200);
      }
    } finally {
      setIsSavingAndClosing(false);
    }
  };

  const handleClose = () => {
    broadcastChange('FORM16_CLOSED');
    window.close();
    setTimeout(() => {
      navigate(`/paybill/form16?fy=${fy}&reload=${Date.now()}`);
    }, 200);
  };

  const handlePrint = () => {
    if (!localCert) return;
    const docEl = document.getElementById('form16-page-preview');
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
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void handleSaveDraft();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNavigateEmployee('prev');
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleNavigateEmployee('next');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveDraft, handleNavigateEmployee]);

  if (isLoadingCerts || isLoadingRaw || !localCert || !liveCert) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 space-y-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading Form 16 Workspace…</p>
      </div>
    );
  }

  const fyLabel = `${fy}-${String(fy + 1).slice(-2)}`;
  const ayLabel = assessmentYearFor(fy);

  const totalQuarterTds = localCert.partA.quarters.reduce((s, q) => s + (Number(q.taxDeducted) || 0), 0);
  const partBTds = computedTotals?.tdsDeducted || 0;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-text overflow-hidden">
      {/* Level 1: Page Header & Breadcrumbs (No App Navigation Bar) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-2xs shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
            title="Close this Tab / Window"
          >
            <ArrowLeft size={14} />
            <span>Close Window</span>
          </button>

          {allEmployees.length > 0 && (
            <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                disabled={!canGoPrev}
                onClick={() => handleNavigateEmployee('prev')}
                className="p-1 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Previous Employee (Alt + ←)"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 px-2 select-none num">
                {currentEmpIndex >= 0 ? `${currentEmpIndex + 1} / ${allEmployees.length}` : '—'}
              </span>
              <button
                type="button"
                disabled={!canGoNext}
                onClick={() => handleNavigateEmployee('next')}
                className="p-1 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Next Employee (Alt + →)"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="num text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
              {localCert.hrpn}
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {localCert.employee.name}
            </span>
            <span className="text-xs text-slate-400 hidden md:inline">({localCert.employee.designation || 'Staff'})</span>
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

        {/* Top Right Action Bar */}
        <div className="flex items-center gap-2">
          {/* View mode switcher */}
          <div className="hidden md:inline-flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Split View (50 / 50)"
            >
              <Columns size={13} />
              <span className="hidden lg:inline">Split View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('form')}
              className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'form'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Form View (Full Width)"
            >
              <Maximize2 size={13} />
              <span className="hidden lg:inline">Form Only</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'preview'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Document Preview Only"
            >
              <Eye size={13} />
              <span className="hidden lg:inline">Document Only</span>
            </button>
          </div>

          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className="hidden xl:inline-flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-2xs text-xs">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(75, z - 15))}
                className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <span className="px-1.5 num text-xs text-slate-600 dark:text-slate-300 font-semibold">{zoomLevel}%</span>
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs"
            title="Print TRACES Certificate (Ctrl + P)"
          >
            <Printer size={13} /> Print
          </button>

          <button
            type="button"
            disabled={saveDraftMutation.isPending || isSavingAndClosing}
            onClick={() => void handleSaveDraft()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 rounded-lg transition disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <Save size={13} /> Save Draft
          </button>

          <button
            type="button"
            disabled={saveDraftMutation.isPending || isSavingAndClosing}
            onClick={() => void handleSaveAndClose()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <Check size={14} /> Save & Close
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Close Tab"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Level 2: Reconciliation & Status Meter */}
      <Form16TdsBanner
        totalQuarterTds={totalQuarterTds}
        partBTds={partBTds}
        netTaxPayable={computedTotals?.netTaxPayable}
      />

      {/* Level 3: Main Full-Screen Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {(viewMode === 'split' || viewMode === 'form') && (
          <div className={`${viewMode === 'form' ? 'w-full max-w-5xl mx-auto' : 'w-full lg:w-1/2'} flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden`}>
            {/* Tab navigation */}
            <Form16TabNav
              activeTab={activeTab}
              onChange={setActiveTab}
              totalTaxPayable={computedTotals?.totalTaxPayable}
            />

            {/* Scrollable Form Body (Single Natural Scrollbar) */}
            <div className="flex-1 overflow-y-auto app-scroll p-5 space-y-4">
              {/* TAB 1: PART B */}
              {activeTab === 'partB' && (
                <Form16PartBSection
                  cert={localCert}
                  computedTotals={computedTotals}
                  grossAmountSource={grossAmountSource}
                  updateCert={updateCert}
                />
              )}

              {/* TAB 2: PART A */}
              {activeTab === 'partA' && (
                <Form16PartASection
                  cert={localCert}
                  updateQuarter={updateQuarter}
                  updateCert={updateCert}
                  onSyncWithPayroll={payrollQuarterlySource ? handleSyncWithPayroll : undefined}
                />
              )}

              {/* TAB 3: DETAILS */}
              {activeTab === 'details' && (
                <Form16DetailsSection
                  cert={localCert}
                  updateCert={updateCert}
                  onAutoFill={() => void handleAutoFillFromEstablishment()}
                  isAutoFilling={isRefreshingEst}
                  showLoadFromSettings
                  onLoadFromSettings={handleSyncDeductorDefaults}
                />
              )}

              {/* Validation Banner */}
              {validationErrors.length > 0 ? (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-0.5 list-disc pl-3.5">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  <ShieldCheck size={15} className="text-emerald-600 shrink-0" /> Certificate passes all official validation rules.
                </div>
              )}
            </div>

            {/* Sticky Action Footer in Left Pane */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 shadow-sm shrink-0">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <span className="hidden sm:inline">Shortcuts: </span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono">Ctrl+S</kbd> Save · <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono">Alt+←/→</kbd> Nav
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  disabled={saveDraftMutation.isPending || isSavingAndClosing || localCert.status === 'ISSUED'}
                  onClick={() => void handleSaveDraft()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 rounded-lg shadow-2xs transition disabled:opacity-50 cursor-pointer"
                >
                  <Save size={14} /> Save Draft
                </button>

                <button
                  type="button"
                  disabled={saveDraftMutation.isPending || isSavingAndClosing}
                  onClick={() => void handleSaveAndClose()}
                  className="inline-flex items-center gap-1.5 px-4.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  <Check size={14} /> {isSavingAndClosing ? 'Saving & Closing…' : 'Save & Close'}
                </button>

                {localCert.status === 'DRAFT' && (
                  <button
                    type="button"
                    disabled={saveDraftMutation.isPending || isSavingAndClosing}
                    onClick={async () => {
                      const saved = await handleSaveDraft();
                      if (saved?.id) {
                        await updateStatusMutation.mutateAsync({ id: saved.id, status: 'REVIEWED' });
                        await refetchCerts();
                        broadcastChange('FORM16_SAVED');
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition cursor-pointer"
                  >
                    <ShieldCheck size={14} /> Mark Reviewed
                  </button>
                )}

                {localCert.status === 'REVIEWED' && (
                  <button
                    type="button"
                    disabled={saveDraftMutation.isPending || isSavingAndClosing || validationErrors.length > 0}
                    onClick={async () => {
                      const saved = await handleSaveDraft();
                      if (saved?.id) {
                        await updateStatusMutation.mutateAsync({ id: saved.id, status: 'ISSUED' });
                        await refetchCerts();
                        broadcastChange('FORM16_SAVED');
                        handleClose();
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    <Send size={14} /> Issue Certificate
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {(viewMode === 'split' || viewMode === 'preview') && (
          <div className={`${viewMode === 'preview' ? 'w-full' : 'w-full lg:w-1/2'} bg-slate-200/70 dark:bg-slate-950/80 p-6 overflow-y-auto app-scroll flex justify-center items-start`}>
            <div
              id="form16-page-preview"
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
  );
}
