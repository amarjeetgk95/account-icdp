import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUIStore } from '@/core/stores/ui-store';
import { paybillRepository } from '../repositories/paybill.repository';
import { form16Repository } from '../repositories/form16.repository';
import { establishmentService } from '@/modules/establishment/services/establishment.service';
import { employeeService } from '@/modules/payroll/services/employee.service';
import { popupNativePrint } from '@/shared/utilities/nativePrint';
import {
  useForm16List,
  useSaveForm16Draft,
  useUpdateForm16Status,
  useForm16Defaults,
  useForm16Office24Q,
  useForm16TaxRules,
  useBatchSaveDrafts,
  useBatchUpdateStatus,
  useBatchDeleteCertificates,
} from '../hooks/useForm16';
import {
  computeForm16Totals,
  deriveQuarterlySummary,
  assessmentYearFor,
} from '../services/form16Calculation.service';
import { Form16QuarterlyModal } from '../components/Form16QuarterlyModal';
import { Form16EditorModal } from '../components/Form16EditorModal';
import { Form16BulkPrintModal } from '../components/Form16BulkPrintModal';
import { Form16Document, type Form16PartALayout } from '../components/Form16Document';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Modal } from '@/shared/components/Modal';
import { toast } from '@/shared/components/Toast';
import {
  FileBadge,
  Search,
  Printer,
  ShieldCheck,
  Send,
  Landmark,
  Calculator,
  Users,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Trash2,
  Sparkles,
  Sliders,
} from 'lucide-react';
import type {
  Form16Certificate,
  Form16Status,
} from '../types/form16';
import type { EstablishmentEmployee } from '@/modules/establishment/types';
import type { PayBillStoredEarning, PayBillStoredDeduction } from '../types';

import { servesInFinancialYear } from '@/modules/establishment/types';

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

interface Form16EmployeeOption {
  hrpn: string;
  name: string;
  pan?: string | null;
  designation?: string | null;
  address?: string | null;
  establishmentEmployee?: EstablishmentEmployee | null;
}

interface EnrichedEmployeeRow {
  hrpn: string;
  name: string;
  pan: string;
  designation: string;
  address: string;
  grossAmount: number;
  deductions: Array<{ incomeTax: number; month: string }>;
  certificate: Form16Certificate;
  status: Form16Status;
  isSavedInDb: boolean;
}

type FilterTab = 'ALL' | 'DRAFT' | 'REVIEWED' | 'ISSUED' | 'MISSING_PAN';

/**
 * Deduplicates and unifies employee records across Earnings, Deductions,
 * Establishment register, Payroll Master, and DB Saved Certificates.
 */
function unifyEmployees(
  earnings: PayBillStoredEarning[],
  deductions: PayBillStoredDeduction[],
  estEmployees: EstablishmentEmployee[],
  masterEmployees: Array<{ hprn_no?: string | null; name: string; designation?: string | null; pan?: string | null }>,
  savedCerts: Form16Certificate[],
  fy: number
): Form16EmployeeOption[] {
  // Index establishment records
  const estByHrpn = new Map<string, EstablishmentEmployee>();
  const estByPan = new Map<string, EstablishmentEmployee>();
  const estByName = new Map<string, EstablishmentEmployee>();

  for (const est of estEmployees) {
    if (!servesInFinancialYear(est, fy)) continue;
    const h = (est.hrpnNo || '').trim().toLowerCase();
    const p = (est.pan || '').trim().toUpperCase();
    const n = (est.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (h) estByHrpn.set(h, est);
    if (p && /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(p)) estByPan.set(p, est);
    if (n) estByName.set(n, est);
  }

  // Index master employee records
  const masterByHrpn = new Map<string, { pan?: string | null; name: string; designation?: string | null }>();
  const masterByPan = new Map<string, { pan?: string | null; name: string; designation?: string | null }>();
  const masterByName = new Map<string, { pan?: string | null; name: string; designation?: string | null }>();

  for (const m of masterEmployees) {
    const h = (m.hprn_no || '').trim().toLowerCase();
    const p = (m.pan || '').trim().toUpperCase();
    const n = (m.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (h) masterByHrpn.set(h, m);
    if (p && /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(p)) masterByPan.set(p, m);
    if (n) masterByName.set(n, m);
  }

  const canonicalList: Form16EmployeeOption[] = [];
  const hrpnIndex = new Map<string, number>();
  const panIndex = new Map<string, number>();
  const nameIndex = new Map<string, number>();

  const registerOrMerge = (
    rawHrpn: string | undefined | null,
    rawName: string | undefined | null,
    rawDesignation?: string | null,
    rawPan?: string | null
  ) => {
    const cleanHrpn = (rawHrpn || '').trim();
    const cleanName = (rawName || '').trim();
    if (!cleanHrpn && !cleanName) return;

    const normHrpn = cleanHrpn.toLowerCase();
    const normName = cleanName.toLowerCase().replace(/\s+/g, ' ');
    let cleanPan = (rawPan || '').trim().toUpperCase();

    // Look up Establishment & Master enrichment
    const est = (normHrpn ? estByHrpn.get(normHrpn) : null) ||
                (cleanPan ? estByPan.get(cleanPan) : null) ||
                (normName ? estByName.get(normName) : null);

    const master = (normHrpn ? masterByHrpn.get(normHrpn) : null) ||
                   (cleanPan ? masterByPan.get(cleanPan) : null) ||
                   (normName ? masterByName.get(normName) : null);

    if (!cleanPan) {
      cleanPan = est?.pan?.trim().toUpperCase() || master?.pan?.trim().toUpperCase() || '';
    }
    const isValidPan = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(cleanPan);

    const resolvedName = cleanName || est?.name || master?.name || cleanHrpn;
    const resolvedDesignation = rawDesignation || est?.designation || master?.designation || null;
    const resolvedAddress = est?.quartersAddress || est?.headquarter || null;

    // Check if we already have this employee by HRPN, PAN, or exact Name
    let existingIdx = -1;
    if (normHrpn && hrpnIndex.has(normHrpn)) {
      existingIdx = hrpnIndex.get(normHrpn)!;
    } else if (isValidPan && panIndex.has(cleanPan)) {
      existingIdx = panIndex.get(cleanPan)!;
    } else if (normName && nameIndex.has(normName)) {
      const candidate = canonicalList[nameIndex.get(normName)!];
      if (!candidate.pan || !cleanPan || candidate.pan === cleanPan) {
        existingIdx = nameIndex.get(normName)!;
      }
    }

    if (existingIdx >= 0) {
      const existing = canonicalList[existingIdx];
      if (!existing.pan && cleanPan) existing.pan = cleanPan;
      if (!existing.designation && resolvedDesignation) existing.designation = resolvedDesignation;
      if (!existing.address && resolvedAddress) existing.address = resolvedAddress;
      if (!existing.establishmentEmployee && est) existing.establishmentEmployee = est;
      if (!existing.name && resolvedName) existing.name = resolvedName;
      if (normHrpn && !hrpnIndex.has(normHrpn)) hrpnIndex.set(normHrpn, existingIdx);
      if (isValidPan && !panIndex.has(cleanPan)) panIndex.set(cleanPan, existingIdx);
    } else {
      const newEntry: Form16EmployeeOption = {
        hrpn: cleanHrpn || (est?.hrpnNo ? est.hrpnNo.trim() : `EMP_${canonicalList.length + 1}`),
        name: resolvedName,
        pan: cleanPan || null,
        designation: resolvedDesignation,
        address: resolvedAddress,
        establishmentEmployee: est || null,
      };
      const idx = canonicalList.length;
      canonicalList.push(newEntry);
      if (normHrpn) hrpnIndex.set(normHrpn, idx);
      if (newEntry.hrpn) hrpnIndex.set(newEntry.hrpn.trim().toLowerCase(), idx);
      if (isValidPan) panIndex.set(cleanPan, idx);
      if (normName) nameIndex.set(normName, idx);
    }
  };

  for (const e of earnings) {
    registerOrMerge(e.hrpn, e.employeeName, e.designation);
  }
  for (const d of deductions) {
    registerOrMerge(d.hrpn, d.employeeName, d.designation);
  }
  for (const est of estEmployees) {
    if (servesInFinancialYear(est, fy)) {
      registerOrMerge(est.hrpnNo, est.name, est.designation, est.pan);
    }
  }
  for (const cert of savedCerts) {
    registerOrMerge(cert.hrpn, cert.employee.name, cert.employee.designation, cert.employee.pan);
  }

  return canonicalList;
}

export function Form16Page() {
  const fy = useUIStore((s) => s.activeFinancialYear);
  const fyLabel = `${fy}-${String(fy + 1).slice(-2)}`;
  const ayLabel = assessmentYearFor(fy);

  const [employees, setEmployees] = useState<Array<Form16EmployeeOption>>([]);
  const [earnings, setEarnings] = useState<PayBillStoredEarning[]>([]);
  const [deductions, setDeductions] = useState<PayBillStoredDeduction[]>([]);
  const [manualLedger, setManualLedger] = useState<Record<string, Record<string, Record<string, number>>>>({});
  const [manualAllowances, setManualAllowances] = useState<string[]>(['Pay Difference', 'DA Difference']);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Search, Filters & Selection
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
  const [selectedHrpns, setSelectedHrpns] = useState<Set<string>>(new Set());

  // Modals state
  const [show24QModal, setShow24QModal] = useState(false);
  const [showBulkPrintModal, setShowBulkPrintModal] = useState(false);
  const [editingCert, setEditingCert] = useState<Form16Certificate | null>(null);
  const [quickPreviewCert, setQuickPreviewCert] = useState<Form16Certificate | null>(null);
  const [confirmIssueId, setConfirmIssueId] = useState<string | null>(null);
  const [confirmBatchAction, setConfirmBatchAction] = useState<'REVIEWED' | 'ISSUED' | 'DELETE' | null>(null);
  const [partALayout, setPartALayout] = useState<Form16PartALayout>(() => {
    try {
      return (localStorage.getItem('form16_parta_layout') as Form16PartALayout) || 'traces';
    } catch {
      return 'traces';
    }
  });

  const handleToggleLayout = (layout: Form16PartALayout) => {
    setPartALayout(layout);
    try {
      localStorage.setItem('form16_parta_layout', layout);
    } catch {
      /* ignore */
    }
  };

  // Queries & Mutations
  const { data: savedCertificates = [], refetch: refetchCerts } = useForm16List(fy);
  const { defaults: f16Defaults } = useForm16Defaults();
  const { settings: office24QSettings } = useForm16Office24Q(fy);
  const { taxRulesConfig } = useForm16TaxRules();

  const saveDraftMutation = useSaveForm16Draft();
  const updateStatusMutation = useUpdateForm16Status();
  const batchSaveMutation = useBatchSaveDrafts();
  const batchStatusMutation = useBatchUpdateStatus();
  const batchDeleteMutation = useBatchDeleteCertificates();

  // Load all Paybill, Establishment, and Master records for the FY
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingData(true);
      try {
        const [
          allEarnings,
          allDeductions,
          estEmployees,
          masterEmployees,
          settingsObj,
          ledgerVals,
        ] = await Promise.all([
          paybillRepository.listEarnings({ financialYear: fy }).catch(() => []),
          paybillRepository.listDeductions({ financialYear: fy }).catch(() => []),
          establishmentService.syncEmployees().catch(() => establishmentService.loadEmployees()),
          employeeService.listEmployees().catch(() => []),
          paybillRepository.getSettings().catch(() => ({})),
          paybillRepository.getManualLedgerValues().catch(() => ({})),
        ]);

        if (cancelled) return;

        setEarnings(allEarnings || []);
        setDeductions(allDeductions || []);
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

        const unified = unifyEmployees(
          allEarnings || [],
          allDeductions || [],
          estEmployees || [],
          masterEmployees || [],
          savedCertificates || [],
          fy
        );

        setEmployees(unified);
      } catch (err) {
        console.error('[Form16Page] Failed loading employee records:', err);
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fy, savedCertificates]);

  // Index saved certificates by HRPN (case-insensitive)
  const savedCertsByHrpn = useMemo(() => {
    const map = new Map<string, Form16Certificate>();
    for (const c of savedCertificates) {
      map.set(c.hrpn.trim().toLowerCase(), c);
    }
    return map;
  }, [savedCertificates]);

  // Build Enriched Rows for all Distinct Employees in the FY
  const employeeRows: EnrichedEmployeeRow[] = useMemo(() => {
    return employees.map((emp) => {
      const normHrpn = emp.hrpn.trim().toLowerCase();
      const normName = emp.name.trim().toLowerCase().replace(/\s+/g, ' ');

      const empEarnings = earnings.filter((e) => {
        const eH = (e.hrpn || '').trim().toLowerCase();
        const eN = (e.employeeName || '').trim().toLowerCase().replace(/\s+/g, ' ');
        return (eH && eH === normHrpn) || (eN && eN === normName);
      });

      const empDeds = deductions.filter((d) => {
        const dH = (d.hrpn || '').trim().toLowerCase();
        const dN = (d.employeeName || '').trim().toLowerCase().replace(/\s+/g, ' ');
        return (dH && dH === normHrpn) || (dN && dN === normName);
      });

      // Sum manual allowances from ledger
      const empManual = manualLedger[emp.hrpn] || {};
      let manualAllowanceSum = 0;
      for (const label of manualAllowances) {
        const mObj = empManual[label] || {};
        for (const mVal of Object.values(mObj)) {
          manualAllowanceSum += Number(mVal) || 0;
        }
      }

      const grossAmount =
        empEarnings.reduce((s, e) => s + (Number(e.grossAmount) || 0), 0) + manualAllowanceSum;

      const deductionsMapped = empDeds.map((d) => ({
        incomeTax: Number(d.incomeTax) || 0,
        month: d.month || '',
      }));

      const existingCert = savedCertsByHrpn.get(normHrpn);

      // Auto-derived quarterly entries
      const quarterlyDerived = deriveQuarterlySummary(empEarnings, empDeds);

      // Default base cert template
      const baseDraft = form16Repository.newDraftDefaults(fy, emp.hrpn);

      // Apply office defaults
      if (f16Defaults) {
        baseDraft.employer = {
          name: f16Defaults.employerName || '',
          address: '',
          pan: f16Defaults.employerPan || '',
          tan: f16Defaults.employerTan || '',
          citTds: f16Defaults.citTds || '',
        };
        baseDraft.signatory = {
          name: f16Defaults.signatoryName || '',
          designation: f16Defaults.signatoryDesignation || '',
          place: f16Defaults.signatoryPlace || '',
          date: '',
        };
        if (f16Defaults.citTds) baseDraft.partA.citTds = f16Defaults.citTds;
      }

      // Populate employee details
      baseDraft.employee = {
        name: emp.name || '',
        designation: emp.designation || '',
        pan: emp.pan || '',
        hrpn: emp.hrpn,
        address: emp.address || '',
      };

      // Populate Part A quarterly summary & 24Q receipts
      baseDraft.partA.quarters = baseDraft.partA.quarters.map((q) => {
        const derived = quarterlyDerived[q.quarter];
        const officeReceipt = office24QSettings?.quarters[q.quarter]?.receiptNumber || '';
        return {
          quarter: q.quarter,
          receiptNumber: officeReceipt,
          amountPaid: derived?.amountPaid || 0,
          taxDeducted: derived?.taxDeducted || 0,
          taxDeposited: derived?.taxDeducted || 0,
        };
      });

      const effectiveCert: Form16Certificate = existingCert
        ? {
            ...existingCert,
            employee: {
              ...existingCert.employee,
              name: existingCert.employee.name || emp.name,
              pan: existingCert.employee.pan || emp.pan || '',
              designation: existingCert.employee.designation || emp.designation || '',
            },
          }
        : {
            ...baseDraft,
            id: `temp_${emp.hrpn}`,
            createdAt: '',
            updatedAt: '',
            computedTotals: null,
          };

      // Compute live totals for this row
      const totals = computeForm16Totals({
        financialYear: fy,
        taxRegime: 'NEW',
        earnings: [{ grossAmount }],
        deductions: deductionsMapped,
        partB: effectiveCert.partB,
        taxRulesSettings: taxRulesConfig,
      });

      effectiveCert.computedTotals = totals;

      return {
        hrpn: emp.hrpn,
        name: emp.name || effectiveCert.employee.name,
        pan: emp.pan || effectiveCert.employee.pan || '',
        designation: emp.designation || effectiveCert.employee.designation || '',
        address: emp.address || effectiveCert.employee.address || '',
        grossAmount,
        deductions: deductionsMapped,
        certificate: effectiveCert,
        status: effectiveCert.status || 'DRAFT',
        isSavedInDb: !!existingCert,
      };
    });
  }, [
    employees,
    earnings,
    deductions,
    manualLedger,
    manualAllowances,
    savedCertsByHrpn,
    fy,
    f16Defaults,
    office24QSettings,
    taxRulesConfig,
  ]);

  // Filtered rows based on Search and Filter Tab
  const filteredRows = useMemo(() => {
    let result = employeeRows;

    if (filterTab === 'DRAFT') {
      result = result.filter((r) => r.status === 'DRAFT');
    } else if (filterTab === 'REVIEWED') {
      result = result.filter((r) => r.status === 'REVIEWED');
    } else if (filterTab === 'ISSUED') {
      result = result.filter((r) => r.status === 'ISSUED');
    } else if (filterTab === 'MISSING_PAN') {
      result = result.filter((r) => !r.pan.trim());
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.hrpn.toLowerCase().includes(q) ||
          r.pan.toLowerCase().includes(q) ||
          r.designation.toLowerCase().includes(q)
      );
    }

    return result;
  }, [employeeRows, filterTab, search]);

  // Overall Statistics for Dashboard Metric Strip
  const stats = useMemo(() => {
    const totalEmployees = employeeRows.length;
    let draftsCount = 0;
    let reviewedCount = 0;
    let issuedCount = 0;
    let missingPanCount = 0;
    let totalGrossSalary = 0;
    let totalTdsDeposited = 0;
    let totalNetTaxPayable = 0;

    for (const r of employeeRows) {
      if (r.status === 'ISSUED') issuedCount++;
      else if (r.status === 'REVIEWED') reviewedCount++;
      else draftsCount++;

      if (!r.pan.trim()) missingPanCount++;

      const t = r.certificate.computedTotals;
      totalGrossSalary += t?.grossSalary17_1 || r.grossAmount || 0;
      totalTdsDeposited += t?.tdsDeducted || 0;
      totalNetTaxPayable += t?.netTaxPayable || 0;
    }

    return {
      totalEmployees,
      draftsCount,
      reviewedCount,
      issuedCount,
      missingPanCount,
      totalGrossSalary,
      totalTdsDeposited,
      totalNetTaxPayable,
    };
  }, [employeeRows]);

  // Selection Checkbox Helpers
  const isAllSelected =
    filteredRows.length > 0 && filteredRows.every((r) => selectedHrpns.has(r.hrpn));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedHrpns(new Set());
    } else {
      setSelectedHrpns(new Set(filteredRows.map((r) => r.hrpn)));
    }
  };

  const toggleSelectRow = (hrpn: string) => {
    const next = new Set(selectedHrpns);
    if (next.has(hrpn)) {
      next.delete(hrpn);
    } else {
      next.add(hrpn);
    }
    setSelectedHrpns(next);
  };

  // Bulk Operations
  const handleBulkGenerateDrafts = async () => {
    try {
      const draftsToSave = employeeRows.map((r) => ({
        ...r.certificate,
        id: r.certificate.id.startsWith('temp_') ? undefined : r.certificate.id,
      }));

      await batchSaveMutation.mutateAsync(draftsToSave);
      await refetchCerts();
      toast.success(
        `Generated & synchronized Form 16 drafts for ${draftsToSave.length} employees.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate drafts.');
    }
  };

  const handleBatchStatusUpdate = async (status: Form16Status) => {
    const selectedRows = employeeRows.filter((r) => selectedHrpns.has(r.hrpn));
    const toSaveFirst = selectedRows.filter((r) => !r.isSavedInDb);

    try {
      if (toSaveFirst.length > 0) {
        await batchSaveMutation.mutateAsync(
          toSaveFirst.map((r) => ({
            ...r.certificate,
            id: undefined,
          }))
        );
      }

      const refreshed = await form16Repository.listCertificates(fy);
      const targetIds = refreshed
        .filter((c) => selectedHrpns.has(c.hrpn))
        .map((c) => c.id);

      if (targetIds.length > 0) {
        await batchStatusMutation.mutateAsync({ ids: targetIds, status });
      }

      toast.success(`Updated status of ${selectedRows.length} certificate(s) to ${status}.`);
      setSelectedHrpns(new Set());
      setConfirmBatchAction(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Batch status update failed.');
    }
  };

  const handleBatchDelete = async () => {
    const targetIds = savedCertificates
      .filter((c) => selectedHrpns.has(c.hrpn))
      .map((c) => c.id);

    try {
      if (targetIds.length > 0) {
        await batchDeleteMutation.mutateAsync(targetIds);
      }
      toast.success(`Deleted ${targetIds.length} draft record(s).`);
      setSelectedHrpns(new Set());
      setConfirmBatchAction(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Batch delete failed.');
    }
  };

  const handleQuickPrint = (cert: Form16Certificate) => {
    setQuickPreviewCert(cert);
  };

  const triggerNativePrint = (el: HTMLElement, cert: Form16Certificate) => {
    const empPan = cert.employee?.pan || cert.hrpn || 'Employee';
    popupNativePrint({
      elements: [el],
      title: `Form16_${empPan}_AY${ayLabel}`,
      pageSize: 'A4',
      orientation: 'portrait',
      pageMargin: '5mm 6mm',
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
          @page { size: A4 portrait; margin: 5mm 6mm !important; }
          html, body { background: #fff !important; color: #000 !important; font-family: 'Times New Roman', Times, 'Liberation Serif', Georgia, serif !important; font-size: 10pt !important; }
          .f16-title-main { font-size: 16.5pt !important; font-weight: 900 !important; }
          .f16-parta-title { font-size: 13pt !important; font-weight: 900 !important; }
          .f16-rule-sub { font-size: 10pt !important; font-weight: 600 !important; }
          .f16-cert-desc { font-size: 9.2pt !important; font-weight: 600 !important; }
          .f16-hdr-cell { font-size: 8.8pt !important; font-weight: 800 !important; }
          .f16-val-cell { font-size: 10.5pt !important; font-weight: 700 !important; }
          .f16-table th { font-size: 9.8pt !important; font-weight: 900 !important; padding: 1.3mm 2mm !important; }
          .f16-table td { font-size: 10pt !important; padding: 1.2mm 2mm !important; }
          .f16-num { font-size: 10.8pt !important; font-weight: 800 !important; }
          .f16-verify-box { font-size: 9.8pt !important; }
          .f16-verify-title { font-size: 10.5pt !important; font-weight: 900 !important; }
          .f16-verify-text { font-size: 9.8pt !important; }
          .f16-verify-grid { font-size: 10pt !important; }
        }
      `,
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-12">
      {/* Workspace Header */}
      <WorkspaceHeader
        eyebrow="Employee IT · Pay Bill"
        title="Form 16 TDS Certificates"
        context={
          <span className="flex items-center gap-2">
            <span>FY {fyLabel} · AY {ayLabel}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 px-2 py-0.5 rounded">
              New Regime u/s 115BAC
            </span>
          </span>
        }
        actions={
          <>
            <Link
              to="/settings/tax-rules"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition"
              title="Configure dynamic tax brackets, standard deduction, and 87A limits"
            >
              <Sliders size={13} className="text-indigo-600" />
              Tax Slabs & Rules
            </Link>

            <button
              type="button"
              onClick={() => setShow24QModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition"
              title="Configure Q1-Q4 receipt numbers for the office"
            >
              <Landmark size={13} className="text-blue-600" />
              24Q Quarterly Manager
            </button>

            <button
              type="button"
              disabled={batchSaveMutation.isPending || isLoadingData}
              onClick={() => void handleBulkGenerateDrafts()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition disabled:opacity-50"
              title="Auto-compute Form 16 drafts from paybill records for all staff"
            >
              <Sparkles size={13} />
              {batchSaveMutation.isPending ? 'Syncing…' : 'Generate All Drafts'}
            </button>

            <button
              type="button"
              onClick={() => setShowBulkPrintModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition"
              title="Bulk print or export ZIP of all Form 16 certificates"
            >
              <Printer size={13} />
              Bulk Print / ZIP
            </button>
          </>
        }
      />

      {/* Top Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Staff</span>
            <Users size={14} className="text-slate-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-1">
            {stats.totalEmployees}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Active in FY {fyLabel}</div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Drafts</span>
            <FileBadge size={14} className="text-slate-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-700 dark:text-slate-300 mt-1">
            {stats.draftsCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Awaiting Review</div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Reviewed</span>
            <ShieldCheck size={14} className="text-indigo-500" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
            {stats.reviewedCount}
          </div>
          <div className="text-[10px] text-indigo-500/80 mt-0.5">Ready to Issue</div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Issued</span>
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.issuedCount}
          </div>
          <div className="text-[10px] text-emerald-500/80 mt-0.5">Locked & Formal</div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total TDS</span>
            <Calculator size={14} className="text-blue-500" />
          </div>
          <div className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
            {inr(stats.totalTdsDeposited)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Part A Deposited</div>
        </div>

        <div
          className={`p-3 rounded-xl border shadow-xs ${
            stats.missingPanCount > 0
              ? 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/60'
              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Missing PAN</span>
            <AlertTriangle
              size={14}
              className={stats.missingPanCount > 0 ? 'text-amber-500' : 'text-slate-400'}
            />
          </div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              stats.missingPanCount > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {stats.missingPanCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">206AA Higher TDS alert</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Status Filter Pills */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto app-scroll">
          {(
            [
              ['ALL', `All (${stats.totalEmployees})`],
              ['DRAFT', `Drafts (${stats.draftsCount})`],
              ['REVIEWED', `Reviewed (${stats.reviewedCount})`],
              ['ISSUED', `Issued (${stats.issuedCount})`],
              ['MISSING_PAN', `Missing PAN (${stats.missingPanCount})`],
            ] as Array<[FilterTab, string]>
          ).map(([tabKey, tabLabel]) => (
            <button
              key={tabKey}
              type="button"
              onClick={() => setFilterTab(tabKey)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                filterTab === tabKey
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700'
              }`}
            >
              {tabLabel}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Part A Layout Preference Switcher */}
          <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleToggleLayout('traces')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                partALayout === 'traces'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
              title="Official TRACES CPC-TDS Government Layout"
            >
              🏛️ TRACES Format
            </button>
            <button
              type="button"
              onClick={() => handleToggleLayout('modern')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                partALayout === 'modern'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
              title="Modern Executive Dual-Badge Layout"
            >
              📄 Executive Layout
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Name, HRPN, PAN…"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Batch Operations Bar (Visible when rows selected) */}
      {selectedHrpns.size > 0 && (
        <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
              {selectedHrpns.size}
            </span>
            <span className="text-xs font-semibold text-indigo-950 dark:text-indigo-200">
              Employee(s) selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmBatchAction('REVIEWED')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
            >
              <ShieldCheck size={13} /> Mark Reviewed
            </button>
            <button
              type="button"
              onClick={() => setConfirmBatchAction('ISSUED')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
            >
              <Send size={13} /> Issue Certificates
            </button>
            <button
              type="button"
              onClick={() => setConfirmBatchAction('DELETE')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg transition"
            >
              <Trash2 size={13} /> Delete Drafts
            </button>
            <button
              type="button"
              onClick={() => setSelectedHrpns(new Set())}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Main Employee Register Table */}
      <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto app-scroll">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/40 text-[0.68rem] uppercase tracking-wider text-slate-400 font-bold">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3 min-w-[200px]">Employee / Designation</th>
                <th className="py-3 px-3 min-w-[110px]">PAN Details</th>
                <th className="py-3 px-3 text-right">Gross 17(1)</th>
                <th className="py-3 px-3 text-right">Std Ded 16(ia)</th>
                <th className="py-3 px-3 text-right">Taxable Income</th>
                <th className="py-3 px-3 text-right">TDS Deducted</th>
                <th className="py-3 px-3 text-right">Net Tax Payable</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right min-w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredRows.map((r) => {
                const isSelected = selectedHrpns.has(r.hrpn);
                const t = r.certificate.computedTotals;
                return (
                  <tr
                    key={r.hrpn}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-750 transition ${
                      isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(r.hrpn)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{r.name}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                          HRPN:{r.hrpn}
                        </span>
                        <span>·</span>
                        <span>{r.designation || 'Staff'}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      {r.pan ? (
                        <span className="font-mono text-[11px] font-bold tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <CheckCircle2 size={11} /> {r.pan}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <AlertTriangle size={11} /> No PAN
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {inr(t?.grossSalary17_1 || r.grossAmount)}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {inr(t?.standardDeduction16ia || 75000)}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {inr(t?.totalTaxableIncome || 0)}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-semibold">
                      {inr(t?.tdsDeducted || 0)}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {inr(t?.netTaxPayable || 0)}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          r.status === 'ISSUED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                            : r.status === 'REVIEWED'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingCert(r.certificate)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition"
                          title="Edit / Review Form 16"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickPrint(r.certificate)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition"
                          title="Quick Print Preview"
                        >
                          <Printer size={14} />
                        </button>
                        {r.status === 'REVIEWED' && (
                          <button
                            type="button"
                            onClick={() => setConfirmIssueId(r.certificate.id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition"
                            title="Issue Certificate"
                          >
                            <Send size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-xs text-slate-400">
                    {isLoadingData
                      ? 'Loading employee paybill records…'
                      : 'No employee records found matching your filter / search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Office 24Q Quarterly Return Manager Modal */}
      <Form16QuarterlyModal
        open={show24QModal}
        onClose={() => setShow24QModal(false)}
        financialYear={fy}
        onSuccess={() => void refetchCerts()}
      />

      {/* Side-by-Side Live Editor Modal */}
      {editingCert && (
        <Form16EditorModal
          open={!!editingCert}
          onClose={() => setEditingCert(null)}
          cert={editingCert}
          grossAmountSource={
            employeeRows.find((r) => r.hrpn === editingCert.hrpn)?.grossAmount || 0
          }
          deductionsSource={
            employeeRows.find((r) => r.hrpn === editingCert.hrpn)?.deductions || []
          }
          onSave={async (updated) => {
            await saveDraftMutation.mutateAsync(updated);
            await refetchCerts();
            setEditingCert(null);
          }}
          onStatusChange={async (id, status) => {
            await updateStatusMutation.mutateAsync({ id, status });
            await refetchCerts();
          }}
          isSaving={saveDraftMutation.isPending || updateStatusMutation.isPending}
        />
      )}

      {/* Bulk Print & Export Suite Modal */}
      <Form16BulkPrintModal
        open={showBulkPrintModal}
        onClose={() => setShowBulkPrintModal(false)}
        certs={employeeRows.map((r) => r.certificate)}
        financialYear={fy}
      />

      {/* Single Quick Preview Modal */}
      {quickPreviewCert && (
        <Modal
          open={!!quickPreviewCert}
          onClose={() => setQuickPreviewCert(null)}
          title={`Form 16 Preview — ${quickPreviewCert.employee.name || quickPreviewCert.hrpn}`}
          maxWidth="xl"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => handleToggleLayout('traces')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                    partALayout === 'traces'
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                  title="Official TRACES CPC-TDS Government Layout"
                >
                  🏛️ TRACES Format
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleLayout('modern')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                    partALayout === 'modern'
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                  title="Modern Executive Dual-Badge Layout"
                >
                  📄 Executive Layout
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('form16-quick-preview-doc');
                  if (el) triggerNativePrint(el, quickPreviewCert);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition cursor-pointer"
              >
                <Printer size={13} /> Print Certificate
              </button>
            </div>
            <div id="form16-quick-preview-doc" className="bg-white p-2 rounded-sm shadow-sm">
              <Form16Document cert={quickPreviewCert} layout={partALayout} />
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={!!confirmIssueId}
        title="Issue Form 16 Certificate?"
        confirmLabel="Issue"
        busy={updateStatusMutation.isPending}
        message="Once issued, this certificate is locked for editing and recorded in the audit log."
        onConfirm={async () => {
          if (confirmIssueId) {
            await updateStatusMutation.mutateAsync({ id: confirmIssueId, status: 'ISSUED' });
            await refetchCerts();
            setConfirmIssueId(null);
          }
        }}
        onCancel={() => setConfirmIssueId(null)}
      />

      <ConfirmDialog
        open={confirmBatchAction !== null}
        title={
          confirmBatchAction === 'DELETE'
            ? `Delete ${selectedHrpns.size} Form-16 Draft(s)?`
            : confirmBatchAction === 'ISSUED'
              ? `Issue ${selectedHrpns.size} Form-16 Certificate(s)?`
              : `Mark ${selectedHrpns.size} Certificate(s) as Reviewed?`
        }
        confirmLabel={
          confirmBatchAction === 'DELETE'
            ? 'Delete'
            : confirmBatchAction === 'ISSUED'
              ? 'Issue All'
              : 'Mark Reviewed'
        }
        busy={batchStatusMutation.isPending || batchDeleteMutation.isPending}
        message={
          confirmBatchAction === 'DELETE'
            ? 'This will delete the saved draft records for the selected employees.'
            : confirmBatchAction === 'ISSUED'
              ? 'Issued certificates carry formal verification and are locked for editing.'
              : 'This will transition selected drafts to Reviewed status.'
        }
        onConfirm={async () => {
          if (confirmBatchAction === 'DELETE') {
            await handleBatchDelete();
          } else if (confirmBatchAction === 'ISSUED') {
            await handleBatchStatusUpdate('ISSUED');
          } else if (confirmBatchAction === 'REVIEWED') {
            await handleBatchStatusUpdate('REVIEWED');
          }
        }}
        onCancel={() => setConfirmBatchAction(null)}
      />
    </div>
  );
}
