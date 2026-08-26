import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
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
  ArrowLeft,
  X,
  Check,
  RefreshCw,
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
import { getOfficeScope } from '@/shared/utilities/office';
import { toast } from '@/shared/components/Toast';
import { popupNativePrint } from '@/shared/utilities/nativePrint';
import type {
  Form16Certificate,
  Form16QuarterEntry,
} from '../types/form16';
import { EMPTY_FORM16_CERTIFICATE } from '../types/form16';
import type { PayBillStoredEarning, PayBillStoredDeduction } from '../types';
import type { EstablishmentEmployee } from '@/modules/establishment/types';
import { servesInFinancialYear } from '@/modules/establishment/types';

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const numInput =
  'w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-right font-medium text-slate-800 dark:text-slate-100 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800 transition';
const textInput =
  'w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-100 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800 transition';
const fieldLabel =
  'block text-[0.68rem] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1';

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

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const defaultFy = currentMonth >= 4 ? currentYear : currentYear - 1;
  const fyParam = searchParams.get('fy');
  const fy = fyParam ? parseInt(fyParam, 10) : defaultFy;

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
            const scope = getOfficeScope();
            let q = supabase
              .from('employee_salaries')
              .select('employee_id, month, gross, da, tax, financial_year, employees(id, name, pan, hprn_no)')
              .eq('financial_year', fy);
            if (!scope.all && scope.officeId) q = q.eq('office_id', scope.officeId);
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

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
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
  const isTdsReconciled = Math.abs(totalQuarterTds - partBTds) <= 1;

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
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 px-2 select-none font-mono">
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
            <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
              {localCert.hrpn}
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {localCert.employee.name}
            </span>
            <span className="text-xs text-slate-400 hidden md:inline">({localCert.employee.designation || 'Staff'})</span>
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
              <span className="px-1.5 font-mono text-xs text-slate-600 dark:text-slate-300 font-semibold">{zoomLevel}%</span>
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
      <div className="flex items-center justify-between px-5 py-1.5 bg-slate-100 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-xs shrink-0">
        <div className="flex items-center gap-2">
          {isTdsReconciled ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 size={13} /> Part A TDS reconciles with Part B ({inr(partBTds)})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
              <AlertTriangle size={13} /> TDS Difference: Part A ({inr(totalQuarterTds)}) vs Part B ({inr(partBTds)})
            </span>
          )}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">New Tax Regime u/s 115BAC</span> · Net Payable: <strong className="font-mono text-indigo-600 dark:text-indigo-400 font-bold text-sm">{inr(computedTotals?.netTaxPayable || 0)}</strong>
        </div>
      </div>

      {/* Level 3: Main Full-Screen Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {(viewMode === 'split' || viewMode === 'form') && (
          <div className={`${viewMode === 'form' ? 'w-full max-w-5xl mx-auto' : 'w-full lg:w-1/2'} flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden`}>
            {/* Tab navigation */}
            <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 shrink-0">
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setActiveTab('partB')}
                  className={`py-1.5 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'partB'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700'
                  }`}
                >
                  <Calculator size={14} />
                  <span>Part B (Salary)</span>
                  <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-indigo-500/30 text-white font-medium">
                    {inr(computedTotals?.totalTaxPayable || 0)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('partA')}
                  className={`py-1.5 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'partA'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700'
                  }`}
                >
                  <Landmark size={14} />
                  <span>Part A (Quarters)</span>
                  <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded-full font-medium bg-blue-500/20 text-blue-700 dark:text-blue-200">
                    4/4 Qtrs
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`py-1.5 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'details'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-700'
                  }`}
                >
                  <User size={14} />
                  <span>Details & Sign</span>
                </button>
              </div>
            </div>

            {/* Scrollable Form Body (Single Natural Scrollbar) */}
            <div className="flex-1 overflow-y-auto app-scroll p-5 space-y-4">
              {/* TAB 1: PART B */}
              {activeTab === 'partB' && (
                <div className="space-y-4">
                  {/* Official Paybill Salary Card */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                        <Lock size={15} className="text-amber-600 dark:text-amber-400" />
                        <span>Official Paybill Salary Data</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        🔒 Fetched from Paybill (Read-Only)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
                        <span className="text-slate-600 dark:text-slate-300">1(a) Gross Salary u/s 17(1)</span>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {inr(computedTotals?.grossSalary17_1 || grossAmountSource)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
                        <span className="text-slate-600 dark:text-slate-300">1(b) Perquisites u/s 17(2)</span>
                        <span className="font-mono font-bold text-slate-500">₹0</span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
                        <span className="text-slate-600 dark:text-slate-300">1(c) Profits in lieu u/s 17(3)</span>
                        <span className="font-mono font-bold text-slate-500">₹0</span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
                        <span className="text-slate-600 dark:text-slate-300">1(d) Total Gross Salary</span>
                        <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                          {inr(computedTotals?.totalGrossSalary1d || grossAmountSource)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/60">
                        <span className="text-slate-600 dark:text-slate-300">2(a) Std. Deduction u/s 16(ia)</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {inr(computedTotals?.standardDeduction16ia || 75000)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900/60">
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

                  {/* Non-Salary Declarations */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

                  {/* Live Tax Summary */}
                  {computedTotals && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs space-y-2">
                      <div className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1.5 flex justify-between">
                        <span>Tax Computation (New Regime u/s 115BAC)</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                          Taxable Income: {inr(computedTotals.totalTaxableIncome)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
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
                        <div className="flex justify-between font-bold text-sm">
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

              {/* TAB 2: PART A */}
              {activeTab === 'partA' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-xl gap-3">
                    <div className="flex items-center gap-2.5">
                      <Landmark size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
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
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shrink-0 cursor-pointer shadow-2xs"
                      >
                        <RotateCcw size={12} /> Sync from Payroll
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl">
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

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-[0.65rem] uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                          <th className="py-2.5 pr-2 font-bold w-12 text-center">Qtr</th>
                          <th className="py-2.5 pr-2 font-bold min-w-[140px]">24Q Receipt No</th>
                          <th className="py-2.5 pr-2 font-bold text-right w-28">Gross Paid</th>
                          <th className="py-2.5 pr-2 font-bold text-right w-28">TDS Deducted</th>
                          <th className="py-2.5 pr-2 font-bold text-right w-28">TDS Deposited</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {localCert.partA.quarters.map((q, idx) => (
                          <tr key={q.quarter}>
                            <td className="py-2.5 pr-2 font-bold text-center text-slate-700 dark:text-slate-200">
                              {q.quarter}
                            </td>
                            <td className="py-2.5 pr-2">
                              <input
                                value={q.receiptNumber}
                                onChange={(e) =>
                                  updateQuarter(idx, { receiptNumber: e.target.value.toUpperCase() })
                                }
                                placeholder="e.g. QWBYJLWA"
                                className="w-full text-xs px-2.5 py-1.5 font-mono uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                              />
                            </td>
                              <td className="py-2.5 pr-2 text-right">
                                <div
                                  className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-700 dark:text-slate-200 text-right cursor-not-allowed select-all"
                                  title="Gross paid is fetched from the employee ledger and is non-editable"
                                >
                                  {inr(q.amountPaid)}
                                </div>
                              </td>
                              <td className="py-2.5 pr-2 text-right">
                                <div
                                  className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-rose-600 dark:text-rose-400 text-right cursor-not-allowed select-all"
                                  title="TDS Deducted is fetched from the employee ledger and is non-editable"
                                >
                                  {inr(q.taxDeducted)}
                                </div>
                              </td>
                              <td className="py-2.5 pr-2 text-right">
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
                          <td className="py-2.5 text-center">Total</td>
                          <td />
                          <td className="py-2.5 pr-2 text-right font-mono text-xs">
                            {inr(localCert.partA.quarters.reduce((s, q) => s + (Number(q.amountPaid) || 0), 0))}
                          </td>
                          <td className="py-2.5 pr-2 text-right font-mono text-xs">
                            {inr(localCert.partA.quarters.reduce((s, q) => s + (Number(q.taxDeducted) || 0), 0))}
                          </td>
                          <td className="py-2.5 pr-2 text-right font-mono text-xs">
                            {inr(localCert.partA.quarters.reduce((s, q) => s + (Number(q.taxDeposited) || 0), 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: DETAILS */}
              {activeTab === 'details' && (
                <div className="space-y-4">
                  {/* Certificate Identifier */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-3">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Building2 size={15} className="text-indigo-600" /> Certificate Identifier & Date
                    </div>
                    <div className="grid grid-cols-2 gap-3">
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

                  {/* Employee Profile */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                        <User size={15} className="text-indigo-600" /> Employee Profile
                      </div>
                      <button
                        type="button"
                        disabled={isRefreshingEst}
                        onClick={() => void handleAutoFillFromEstablishment()}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition cursor-pointer"
                      >
                        <RotateCcw size={12} className={isRefreshingEst ? 'animate-spin' : ''} /> Auto-fill from Establishment
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={fieldLabel}>PAN (Permanent Account No)</label>
                        <input
                          value={localCert.employee.pan}
                          onChange={(e) =>
                            updateCert((p) => ({
                              ...p,
                              employee: {
                                ...p.employee,
                                pan: String(e.target.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
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

                  {/* Deductor Profile */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                        <Building2 size={15} className="text-blue-600" /> Deductor Details
                      </div>
                      <button
                        type="button"
                        onClick={handleSyncDeductorDefaults}
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800 cursor-pointer transition"
                      >
                        <RefreshCw size={11} /> Load from Settings
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={fieldLabel}>Deductor PAN</label>
                        <input
                          value={localCert.employer.pan}
                          onChange={(e) =>
                            updateCert((p) => ({
                              ...p,
                              employer: {
                                ...p.employer,
                                pan: String(e.target.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
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
                                tan: String(e.target.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
                              },
                            }))
                          }
                          className={`${textInput} font-mono uppercase`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Signatory Profile */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                      <ShieldCheck size={15} className="text-emerald-600" /> Verification & Signatory Officer
                    </div>

                    <div className="grid grid-cols-3 gap-3">
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
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[10px] font-mono">Ctrl+S</kbd> Save · <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-[10px] font-mono">Alt+←/→</kbd> Nav
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
