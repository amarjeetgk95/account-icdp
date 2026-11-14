import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUIStore } from '@/core/stores/ui-store';
import { paybillRepository } from '../repositories/paybill.repository';
import { establishmentService } from '@/modules/establishment/services/establishment.service';
import { employeeService } from '@/modules/payroll/services/employee.service';
import { useOfficeDetails } from '@/modules/settings/hooks/useOfficeDetails';
import { useForm16Defaults } from '../hooks/useForm16';
import { useGTR30Settings } from '@/modules/gtr30/hooks/useGTR30Settings';
import type { OfficeDetailsInput } from '@/modules/settings/validation/settings.schema';
import type { Form16DeductorDefaults } from '../types/form16';
import type { GTR30DefaultSettings } from '@/modules/gtr30/types/settings';
import {
  useSelfAssessmentList,
  useSaveSelfAssessmentMemo,
} from '../hooks/useSelfAssessment';
import {
  buildEmployeeSelfAssessmentMemo,
} from '../services/selfAssessmentCalculation.service';
import { assessmentYearFor } from '../services/form16Calculation.service';
import type { SelfAssessmentMemo } from '../types/selfAssessment';
import type { EstablishmentEmployee } from '@/modules/establishment/types';
import type { PayBillStoredEarning, PayBillStoredDeduction } from '../types';
import { SelfAssessmentEditor } from '../components/self-assessment/SelfAssessmentEditor';
import { BulkSelfAssessmentModal } from '../components/self-assessment/BulkSelfAssessmentModal';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import {
  Calculator,
  Search,
  CheckCircle2,
  Calendar,
  ChevronRight,
  FileArchive,
} from 'lucide-react';
import { servesInFinancialYear } from '@/modules/establishment/types';

interface EmployeeDirectoryItem {
  hrpn: string;
  name: string;
  pan: string;
  designation: string;
  address: string;
}

export function resolveOfficeSettings(
  officeDetails?: Partial<OfficeDetailsInput> | null,
  f16Defaults?: Partial<Form16DeductorDefaults> | null,
  gtr30Settings?: Partial<GTR30DefaultSettings> | null
) {
  const f16NameParts = (f16Defaults?.employerName || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const departmentName =
    officeDetails?.officeName?.trim() ||
    f16NameParts[0] ||
    gtr30Settings?.officeFullName?.trim() ||
    gtr30Settings?.officeName?.trim() ||
    'Deputy Director of Animal Husbandry';

  const departmentDivision =
    officeDetails?.departmentDivision?.trim() ||
    officeDetails?.subtitle?.trim() ||
    f16NameParts[1] ||
    gtr30Settings?.branchName?.trim() ||
    gtr30Settings?.drawingOfficerOffice?.trim() ||
    '';

  const district =
    officeDetails?.district?.trim() ||
    (gtr30Settings?.district && !/^\d+$/.test(gtr30Settings.district.trim())
      ? gtr30Settings.district.trim()
      : '') ||
    gtr30Settings?.station?.trim() ||
    f16Defaults?.signatoryPlace?.trim() ||
    '';

  const officeAddress =
    officeDetails?.address?.trim() ||
    f16Defaults?.employerAddress?.trim() ||
    '';

  const place =
    f16Defaults?.signatoryPlace?.trim() ||
    gtr30Settings?.station?.trim() ||
    district ||
    'Surat';

  const treasuryOfficerDesignation =
    f16Defaults?.signatoryDesignation?.trim() ||
    gtr30Settings?.drawingOfficerDesignation?.trim() ||
    'Assistant Administrative cum Account Officer';

  const treasuryOfficerName =
    f16Defaults?.signatoryName?.trim() ||
    gtr30Settings?.drawingOfficerName?.trim() ||
    'DDO';

  return {
    departmentName,
    departmentDivision,
    district,
    officeAddress,
    place,
    treasuryOfficerDesignation,
    treasuryOfficerName,
  };
}

export function SelfAssessmentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fy = useUIStore((s) => s.activeFinancialYear);
  const fyLabel = `${fy}-${String(fy + 1).slice(-2)}`;
  const ayLabel = assessmentYearFor(fy);

  const [earnings, setEarnings] = useState<PayBillStoredEarning[]>([]);
  const [deductions, setDeductions] = useState<PayBillStoredDeduction[]>([]);
  const [manualLedger, setManualLedger] = useState<Record<string, Record<string, Record<string, number>>>>({});
  const [employees, setEmployees] = useState<EmployeeDirectoryItem[]>([]);
  const [selectedHrpn, setSelectedHrpn] = useState<string>(
    searchParams.get('hrpn') || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  const { details: officeDetails } = useOfficeDetails();
  const { defaults: f16Defaults } = useForm16Defaults();
  const { data: gtr30Data } = useGTR30Settings();
  const { data: savedMemos = [], refetch: refetchSavedMemos } = useSelfAssessmentList(fy);
  const saveMutation = useSaveSelfAssessmentMemo();

  const resolvedOffice = useMemo(() => {
    return resolveOfficeSettings(officeDetails, f16Defaults, gtr30Data?.settings);
  }, [officeDetails, f16Defaults, gtr30Data]);

  // Load Paybill earnings, deductions, and establishment employees
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [storedEarnings, storedDeductions, estEmployees, masterEmps, manualVals] =
          await Promise.all([
            paybillRepository.listEarnings({ financialYear: fy }).catch(() => []),
            paybillRepository.listDeductions({ financialYear: fy }).catch(() => []),
            establishmentService
              .syncEmployees()
              .catch(() => establishmentService.loadEmployees())
              .catch(() => [] as EstablishmentEmployee[]),
            employeeService.listEmployees().catch(() => []),
            paybillRepository.getManualLedgerValues().catch(() => ({})),
          ]);

        if (!mounted) return;
        setEarnings(storedEarnings || []);
        setDeductions(storedDeductions || []);
        setManualLedger((manualVals as Record<string, Record<string, Record<string, number>>>) || {});

        // Build unique employee directory
        const empMap = new Map<string, EmployeeDirectoryItem>();

        for (const e of storedEarnings || []) {
          const h = (e.hrpn || '').trim();
          if (h && !empMap.has(h)) {
            empMap.set(h, {
              hrpn: h,
              name: e.employeeName || h,
              pan: '',
              designation: e.designation || 'EMPLOYEE',
              address: '',
            });
          }
        }

        for (const est of estEmployees || []) {
          if (!servesInFinancialYear(est, fy)) continue;
          const h = (est.hrpnNo || '').trim();
          if (h) {
            const existing = empMap.get(h);
            empMap.set(h, {
              hrpn: h,
              name: est.name || existing?.name || h,
              pan: est.pan || existing?.pan || '',
              designation: est.designation || existing?.designation || '',
              address: est.quartersAddress || est.headquarter || '',
            });
          }
        }

        for (const m of masterEmps || []) {
          const h = (m.hprn_no || '').trim();
          if (h) {
            const existing = empMap.get(h);
            if (existing) {
              if (!existing.pan && m.pan) existing.pan = m.pan;
              if (!existing.designation && m.designation) existing.designation = m.designation;
            } else {
              empMap.set(h, {
                hrpn: h,
                name: m.name || h,
                pan: m.pan || '',
                designation: m.designation || '',
                address: '',
              });
            }
          }
        }

        const list = Array.from(empMap.values()).sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setEmployees(list);

        if (!selectedHrpn && list.length > 0) {
          const initial = searchParams.get('hrpn') || list[0].hrpn;
          setSelectedHrpn(initial);
        }
      } catch (err) {
        console.error('[SelfAssessmentPage] Error loading data:', err);
      }
    }

    void loadData();
    return () => {
      mounted = false;
    };
  }, [fy, searchParams, selectedHrpn]);

  // Index saved memos by HRPN
  const savedMemosByHrpn = useMemo(() => {
    const map = new Map<string, SelfAssessmentMemo>();
    for (const m of savedMemos) {
      if (m?.hrpn) {
        map.set(m.hrpn.trim().toLowerCase(), m);
      }
    }
    return map;
  }, [savedMemos]);

  // Filtered employees for search
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.hrpn.toLowerCase().includes(q) ||
        e.pan.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  // Active selected employee
  const selectedEmployee = useMemo(() => {
    return (
      employees.find((e) => e.hrpn.toLowerCase() === selectedHrpn.toLowerCase()) ||
      employees[0] ||
      null
    );
  }, [employees, selectedHrpn]);

  // Active Memo: Either saved memo or freshly derived initial draft
  const activeMemo = useMemo<SelfAssessmentMemo | null>(() => {
    if (!selectedEmployee) return null;
    return buildEmployeeSelfAssessmentMemo({
      employee: selectedEmployee,
      savedMemo: savedMemosByHrpn.get(selectedEmployee.hrpn.trim().toLowerCase()),
      earnings,
      deductions,
      manualLedger,
      financialYear: fy,
      assessmentYear: ayLabel,
      resolvedOffice,
      ddoCode: gtr30Data?.settings?.ddoCode || '',
    });
  }, [
    selectedEmployee,
    savedMemosByHrpn,
    earnings,
    deductions,
    manualLedger,
    fy,
    ayLabel,
    resolvedOffice,
    gtr30Data,
  ]);

  // Compute complete memos for all employees in staff directory
  const allMemos = useMemo<SelfAssessmentMemo[]>(() => {
    return employees.map((emp) =>
      buildEmployeeSelfAssessmentMemo({
        employee: emp,
        savedMemo: savedMemosByHrpn.get(emp.hrpn.trim().toLowerCase()),
        earnings,
        deductions,
        manualLedger,
        financialYear: fy,
        assessmentYear: ayLabel,
        resolvedOffice,
        ddoCode: gtr30Data?.settings?.ddoCode || '',
      })
    );
  }, [
    employees,
    savedMemosByHrpn,
    earnings,
    deductions,
    manualLedger,
    fy,
    ayLabel,
    resolvedOffice,
    gtr30Data,
  ]);

  const filteredHrpns = useMemo(() => {
    return new Set(filteredEmployees.map((e) => e.hrpn));
  }, [filteredEmployees]);

  const handleSelectEmployee = (hrpn: string) => {
    setSelectedHrpn(hrpn);
    setSearchParams({ hrpn });
  };

  const handleSaveMemo = async (memoToSave: SelfAssessmentMemo, syncWithForm16: boolean) => {
    await saveMutation.mutateAsync({
      memo: memoToSave,
      syncWithForm16,
    });
    void refetchSavedMemos();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Workspace Header */}
      <div className="no-print">
        <WorkspaceHeader
          title="Self-Assessment Memo (સ્વયં કર આકારણી)"
          context={
            <>
              <Calendar size={13} className="text-slate-500" /> FY {fyLabel} (AY {ayLabel})
            </>
          }
          actions={
            <button
              type="button"
              disabled={employees.length === 0}
              onClick={() => setShowBulkModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
              title="Bulk download all self-assessment memos as individual PDFs in a ZIP archive"
            >
              <FileArchive size={13} />
              Bulk Export ZIP ({employees.length})
            </button>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Sidebar: Employee Directory */}
        <div className="lg:col-span-3 space-y-3 no-print">
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name, HRPN, PAN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="text-[11px] text-slate-500 font-semibold mb-1.5 flex justify-between items-center px-1">
              <span>STAFF DIRECTORY</span>
              <div className="flex items-center gap-1.5">
                <span>{filteredEmployees.length} EMPLOYEES</span>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(true)}
                  disabled={employees.length === 0}
                  className="p-1 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-500 hover:text-indigo-600 rounded transition cursor-pointer"
                  title="Bulk Export Self-Assessment Memos as ZIP"
                  aria-label="Bulk Export Self-Assessment Memos as ZIP"
                >
                  <FileArchive className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-[640px] overflow-y-auto space-y-1 divide-y divide-slate-50 pr-1">
              {filteredEmployees.map((emp) => {
                const isSelected =
                  emp.hrpn.toLowerCase() === selectedEmployee?.hrpn.toLowerCase();
                const isSaved = savedMemosByHrpn.has(emp.hrpn.toLowerCase());

                return (
                  <button
                    key={emp.hrpn}
                    onClick={() => handleSelectEmployee(emp.hrpn)}
                    className={`w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between group ${
                      isSelected
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-900'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-xs truncate uppercase flex items-center gap-1.5">
                        {emp.name}
                        {isSaved && (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        )}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        HRPN: {emp.hrpn} · {emp.pan || 'NO PAN'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {emp.designation || 'Employee'}
                      </p>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isSelected
                          ? 'text-indigo-600 translate-x-0.5'
                          : 'text-slate-300 group-hover:text-slate-500'
                      }`}
                    />
                  </button>
                );
              })}

              {filteredEmployees.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">
                  No matching employees found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Area: Interactive Self-Assessment Editor */}
        <div className="lg:col-span-9">
          {activeMemo ? (
            <SelfAssessmentEditor
              initialMemo={activeMemo}
              onSave={handleSaveMemo}
              isSaving={saveMutation.isPending}
              settingsOfficeDetails={resolvedOffice}
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
              <Calculator className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold">Select an employee to view or compute Self-Assessment Memo.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Self-Assessment Export & Print Modal */}
      {showBulkModal && (
        <BulkSelfAssessmentModal
          open={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          financialYear={fy}
          fyLabel={fyLabel}
          ayLabel={ayLabel}
          allMemos={allMemos}
          filteredHrpns={filteredHrpns}
        />
      )}
    </div>
  );
}
