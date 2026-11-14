import { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Save,
  X,
  UserPlus,
  RefreshCw,
  Search,
  AlertCircle,
  User,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Home,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Briefcase,
  Shield,
  CalendarRange,
  History,
} from 'lucide-react';
import {
  gtr30EmployeeMasterSchema,
  type GTR30EmployeeMasterInput,
} from '../validation/gtr30EmployeeMaster.schema';
import { useSaveGTR30Employee } from '../hooks/useGTR30EmployeeMaster';
import { useGTR30BillCodeMappings } from '../hooks/useGTR30BillCodeMappings';
import { DEFAULT_BILL_CODE_MAPPINGS } from '../constants';
import { buildGtr30BillCodeOptions } from '../utils/gtr30BillCodeOptions';
import {
  normalizePayEntries,
  formatDate,
  dayAfter,
  type PayEntryDraft,
} from '../utils/gtr30PayMatrix';
import { PayTimeline } from './PayTimeline';
import type { PayEntry } from '../utils/payHistory';
import { normalizePayHistory as normalizePayHistoryGTR } from '../utils/payHistory';
import {
  calculateDA,
  calculateNPS,
  calculateGujaratPT,
  getGISRatesForGroup,
  PAY_SCALE_CATALOG,
  findPayScaleMappingByScale,
  HRA_PRESETS,
} from '../utils/gtr30GovRules';
import { calculateEmployeeSalary } from '../utils/gtr30SalaryCalc';
import type { GTR30EmployeeMaster } from '../types';
import { useEffectiveDARate } from '../hooks/useGTR30Settings';
import { SalaryPreviewCard } from './employee-form/SalaryPreviewCard';

export type EmployeeFormTab = 'personal' | 'payscale' | 'allowances' | 'deductions' | 'quarters';

const TABS: Array<{ id: EmployeeFormTab; label: string; icon: React.ElementType; desc: string }> = [
  { id: 'personal', label: '1. Personal Profile', icon: User, desc: 'Name, Designation, HRPN & Cadre' },
  { id: 'payscale', label: '2. Pay Matrix', icon: CreditCard, desc: '7th Pay Scale, Basic Pay & Level' },
  { id: 'allowances', label: '3. Allowances', icon: TrendingUp, desc: 'DA, HRA, Transport, CLA, Medical' },
  { id: 'deductions', label: '4. Deductions', icon: TrendingDown, desc: 'PT, NPS, GIS Funds & Society' },
  { id: 'quarters', label: '5. Quarters & Info', icon: Home, desc: 'Govt. Quarters, Rent & Remarks' },
];

const EMPTY_VALUES: GTR30EmployeeMasterInput = {
  id: '',
  srNo: 0,
  billCode: 'GTR-30-GO-STATS',
  hrpnNo: '',
  name: '',
  designation: '',
  designationGujarati: '',
  cadreClass: '૩',
  payScale: '34,500-1,12,400',
  gradePay: 'GP:4200',
  payLevelCell: 'PAY=39900 (LEVEL CELL-7)',
  ppaNo: 'Applied',
  currentPay: 0,
  currentPayDate: '',
  payEntries: [],
  quarterAddress: '',
  insuranceGroup: 'ખ',
  insuranceType: 'savings_and_insurance',
  hraPercent: 0,
  da: 0,
  transportAllowance: 3600,
  medicalAllowance: 1000,
  claAllowance: 270,
  rentOfBuilding: 0,
  professionalTax: 200,
  gis1981Insurance: 240,
  gis1981Savings: 560,
  npsPension: 0,
  societyDeduction: 0,
  remarks: '',
};

type FormValues = z.input<typeof gtr30EmployeeMasterSchema>;

interface GTR30EmployeeMasterFormProps {
  monthKey: string;
  billCode: string;
  employees?: GTR30EmployeeMaster[];
  editingEmployee: GTR30EmployeeMaster | null;
  onCancelEdit?: () => void;
  onCancel?: () => void;
  onSaved?: () => void;
}

interface SearchOption {
  id: string;
  name: string;
  hrpnNo: string;
  designation?: string;
  payScale?: string;
  employee: GTR30EmployeeMaster;
}

export function GTR30EmployeeMasterForm({
  monthKey,
  billCode,
  employees = [],
  editingEmployee,
  onCancelEdit,
  onCancel,
  onSaved,
}: GTR30EmployeeMasterFormProps) {
  const { toast } = useToast();
  const saveMutation = useSaveGTR30Employee();
  const mappingsQuery = useGTR30BillCodeMappings();
  const rawMappings = mappingsQuery.data ?? [];
  const mappings = rawMappings.length > 0 ? rawMappings : DEFAULT_BILL_CODE_MAPPINGS;

  const availableBillCodes = useMemo(
    () =>
      buildGtr30BillCodeOptions(mappings, undefined, [
        billCode,
        editingEmployee?.billCode,
      ]),
    [mappings, billCode, editingEmployee?.billCode]
  );

  const [activeTab, setActiveTab] = useState<EmployeeFormTab>('personal');
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDropdownDismissed, setIsDropdownDismissed] = useState(false);
  const [shouldCloseAfterSave, setShouldCloseAfterSave] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, GTR30EmployeeMasterInput>({
    resolver: zodResolver(gtr30EmployeeMasterSchema),
    defaultValues: {
      ...EMPTY_VALUES,
      billCode: billCode || 'GTR-30-GO-STATS',
    },
  });

  // React's recommended "adjust state during render" pattern: when a different
  // employee (or bill code) is loaded into the form, reset the fields and tab.
  const resetKey = editingEmployee ? `${editingEmployee.id}::${billCode}` : null;
  const [prevResetKey, setPrevResetKey] = useState<string | null>(null);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    if (editingEmployee) {
      reset({
        id: editingEmployee.id,
        srNo: editingEmployee.srNo,
        billCode: editingEmployee.billCode || billCode || 'GTR-30-GO-STATS',
        hrpnNo: editingEmployee.hrpnNo || '',
        name: editingEmployee.name,
        designation: editingEmployee.designation || '',
        designationGujarati: editingEmployee.designationGujarati || '',
        cadreClass: editingEmployee.cadreClass || '૩',
        payScale: editingEmployee.payScale || '',
        gradePay: editingEmployee.gradePay || '',
        payLevelCell: editingEmployee.payLevelCell || '',
        ppaNo: editingEmployee.ppaNo || '',
        currentPay: editingEmployee.currentPay || 0,
        currentPayDate: editingEmployee.currentPayDate || '',
        payEntries: (editingEmployee.payEntries ?? []).map((e) => ({ ...e })),
        quarterAddress: editingEmployee.quarterAddress || '',
        insuranceGroup: editingEmployee.insuranceGroup || 'ખ',
        insuranceType: editingEmployee.insuranceType || 'savings_and_insurance',
        hraPercent: editingEmployee.hraPercent || 0,
        da: editingEmployee.da || 0,
        transportAllowance: editingEmployee.transportAllowance ?? 3600,
        medicalAllowance: editingEmployee.medicalAllowance ?? 1000,
        claAllowance: editingEmployee.claAllowance ?? 270,
        rentOfBuilding: editingEmployee.rentOfBuilding ?? 300,
        professionalTax: editingEmployee.professionalTax ?? 200,
        gis1981Insurance: editingEmployee.gis1981Insurance ?? 240,
        gis1981Savings: editingEmployee.gis1981Savings ?? 560,
        npsPension: editingEmployee.npsPension ?? 6105,
        societyDeduction: editingEmployee.societyDeduction ?? 4154,
        remarks: editingEmployee.remarks || '',
      });
      setActiveTab('personal');
    }
  }

  // Watched fields for real-time live salary calculations
  const nameValue = useWatch({ control, name: 'name' });
  const rentValue = useWatch({ control, name: 'rentOfBuilding' });
  const addressValue = useWatch({ control, name: 'quarterAddress' });
  const currentPayValue = useWatch({ control, name: 'currentPay' });
  const currentPayDateWatched = useWatch({ control, name: 'currentPayDate' });
  const payEntriesValue = useWatch({ control, name: 'payEntries' }) ?? [];
  const daValue = useWatch({ control, name: 'da' });
  const hraPercentValue = useWatch({ control, name: 'hraPercent' });
  const transportValue = useWatch({ control, name: 'transportAllowance' });
  const medicalValue = useWatch({ control, name: 'medicalAllowance' });
  const claValue = useWatch({ control, name: 'claAllowance' });
  const npsValue = useWatch({ control, name: 'npsPension' });
  const ptValue = useWatch({ control, name: 'professionalTax' });
  const gisInsValue = useWatch({ control, name: 'gis1981Insurance' });
  const gisSavValue = useWatch({ control, name: 'gis1981Savings' });
  const societyValue = useWatch({ control, name: 'societyDeduction' });

  const effectiveDaPercent = useEffectiveDARate(currentPayDateWatched || monthKey);

  // Real-time live salary breakdown calculations
  const basic = Number(currentPayValue || 0);
  const hraAmt = Math.round((basic * Number(hraPercentValue || 0)) / 100);
  const salaryPreview = calculateEmployeeSalary({
    currentPay: basic,
    da: Number(daValue || 0),
    hraPercent: Number(hraPercentValue || 0),
    transportAllowance: Number(transportValue || 0),
    medicalAllowance: Number(medicalValue || 0),
    claAllowance: Number(claValue || 0),
    npsPension: Number(npsValue || 0),
    professionalTax: Number(ptValue || 0),
    gis1981Insurance: Number(gisInsValue || 0),
    gis1981Savings: Number(gisSavValue || 0),
    societyDeduction: Number(societyValue || 0),
    rentOfBuilding: Number(rentValue || 0),
  });
  const grossPay = salaryPreview.grossPay;
  const deductionsTotal = salaryPreview.totalDeductions;
  const netTakeHome = salaryPreview.netTakeHome;

  const applyPayAutoCalc = (pay: number) => {
    if (pay > 0) {
      const calcDA = calculateDA(pay, effectiveDaPercent);
      const calcNPS = calculateNPS(pay, calcDA);
      const calcPT = calculateGujaratPT(pay);
      setValue('da', calcDA);
      setValue('npsPension', calcNPS);
      setValue('professionalTax', calcPT);
      const scale = (getValues('payScale') as string) || '';
      const mapping = findPayScaleMappingByScale(scale);
      const level = mapping?.level ?? 'Level 7';
      const cur = (getValues('payLevelCell') as string) || '';
      const cellM = /CELL\s*0*([0-9]{1,2})/i.exec(cur);
      const cell = cellM ? `Cell ${cellM[1]}` : 'Cell 1';
      setValue('payLevelCell', `${level} — ${cell} • ₹${pay.toLocaleString('en-IN')}`);
    }
  };

  const syncFromEntries = (entries: PayEntryDraft[]) => {
    const norm = normalizePayEntries(entries);
    setValue('payEntries', norm, { shouldValidate: false, shouldDirty: true });
    const latest = norm[norm.length - 1] ?? null;
    if (latest) {
      setValue('currentPay', latest.basicPay, { shouldValidate: false });
      setValue('currentPayDate', latest.startDate, { shouldValidate: false });
    }
    return norm;
  };

  // Auto-calculate DA (53%), NPS (10%), PT and Pay Level Cell when current pay changes.
  // The latest pay-matrix entry is kept in sync with the Current Pay fields.
  const handlePayChange = (payStr: string) => {
    const pay = parseFloat(payStr) || 0;
    setValue('currentPay', pay);
    const dateVal = getValues('currentPayDate') || '';
    const current = (getValues('payEntries') ?? []).map((e) => ({ ...e }));
    if (pay > 0 && (current.length > 0 || dateVal)) {
      const latest = current[current.length - 1] ?? null;
      const latestOpen = latest && !latest.endDate;
      if (current.length === 0) {
        syncFromEntries([{ id: crypto.randomUUID(), startDate: dateVal, basicPay: pay }]);
      } else if (latestOpen && (dateVal === '' || latest.startDate === dateVal)) {
        syncFromEntries(
          current.map((e, i) => (i === current.length - 1 ? { ...e, basicPay: pay } : e))
        );
      } else if (dateVal) {
        syncFromEntries([
          ...current,
          { id: crypto.randomUUID(), startDate: dateVal, basicPay: pay },
        ]);
      }
    }
    applyPayAutoCalc(pay);
  };

  const handlePayDateChange = (dateStr: string) => {
    setValue('currentPayDate', dateStr);
    const pay = Number(getValues('currentPay') || 0);
    const current = (getValues('payEntries') ?? []).map((e) => ({ ...e }));
    if (pay > 0 && dateStr) {
      const latest = current[current.length - 1] ?? null;
      if (current.length === 0) {
        syncFromEntries([{ id: crypto.randomUUID(), startDate: dateStr, basicPay: pay }]);
      } else if (latest && !latest.endDate) {
        syncFromEntries([...current.slice(0, -1), { ...latest, startDate: dateStr }]);
      } else {
        syncFromEntries([
          ...current,
          { id: crypto.randomUUID(), startDate: dateStr, basicPay: pay },
        ]);
      }
    }
  };

  // Pay Matrix history helpers
  const [showNewPayRow, setShowNewPayRow] = useState(false);
  const [newPayStart, setNewPayStart] = useState('');
  const [newPayAmount, setNewPayAmount] = useState('');
  const [newPayError, setNewPayError] = useState('');

  const openNewPayRow = () => {
    const norm = normalizePayEntries(getValues('payEntries') ?? []);
    const latest = norm[norm.length - 1] ?? null;
    setNewPayStart(latest ? dayAfter(latest.endDate ?? latest.startDate) : '');
    setNewPayAmount('');
    setNewPayError('');
    setShowNewPayRow(true);
  };

  const updateEntryRaw = (
    idx: number,
    field: 'startDate' | 'endDate' | 'basicPay',
    value: string
  ) => {
    const current = (getValues('payEntries') ?? []).map((e) => ({ ...e }));
    setValue(
      'payEntries',
      current.map((e, i) =>
        i === idx
          ? { ...e, [field]: field === 'basicPay' ? (Number(value) || 0) : value }
          : e
      ),
      { shouldValidate: false }
    );
  };

  const normalizeNow = () => {
    syncFromEntries(getValues('payEntries') ?? []);
  };

  const deletePayEntry = (idx: number) => {
    const next = (getValues('payEntries') ?? []).filter((_, i) => i !== idx);
    syncFromEntries(next);
    const latest = normalizePayEntries(next)[normalizePayEntries(next).length - 1] ?? null;
    applyPayAutoCalc(latest?.basicPay ?? 0);
  };

  const confirmAddPayEntry = () => {
    setNewPayError('');
    const start = newPayStart.trim();
    const pay = Number(newPayAmount) || 0;
    if (!start) {
      setNewPayError('Select the date the new pay becomes effective.');
      return;
    }
    if (pay <= 0) {
      setNewPayError('Enter a basic pay amount greater than 0.');
      return;
    }
    const current = (getValues('payEntries') ?? []).map((e) => ({ ...e }));
    if (current.some((e) => e.startDate === start)) {
      setNewPayError(`An entry already starts on ${formatDate(start)}. Edit that entry instead.`);
      return;
    }
    syncFromEntries([...current, { id: crypto.randomUUID(), startDate: start, basicPay: pay }]);
    applyPayAutoCalc(pay);
    setShowNewPayRow(false);
    setNewPayStart('');
    setNewPayAmount('');
  };
  void handlePayDateChange; void newPayError; void updateEntryRaw; void normalizeNow; void deletePayEntry; void confirmAddPayEntry; void syncFromEntries; void applyPayAutoCalc; void openNewPayRow; void showNewPayRow; void newPayStart; void newPayAmount; void handlePayChange; void PAY_SCALE_CATALOG;

  // Auto-calculate GIS Insurance & Savings amounts when GIS Group changes
  const handleGISGroupChange = (groupStr: string) => {
    setValue('insuranceGroup', groupStr);
    const rates = getGISRatesForGroup(groupStr);
    if (rates) {
      setValue('gis1981Insurance', rates.insuranceFund);
      setValue('gis1981Savings', rates.savingsFund);
      if (rates.cadreClass) {
        setValue('cadreClass', rates.cadreClass);
      }
    }
  };

  // When Pay Scale is selected -> auto-fill corresponding grade pay, cadre class, GIS group
  const handlePayScaleSelect = (selectedPayScale: string) => {
    setValue('payScale', selectedPayScale);
    const mapping = findPayScaleMappingByScale(selectedPayScale);
    if (mapping) {
      setValue('gradePay', mapping.gradePay);
      setValue('cadreClass', mapping.cadreClass);
      if (mapping.defaultGISGroup) {
        handleGISGroupChange(mapping.defaultGISGroup);
      }
      const pay = Number(currentPayValue || 0);
      if (pay === 0) {
        handlePayChange(String(mapping.entryPay));
      } else {
        const cur = (getValues('payLevelCell') as string) || '';
        const cellM = /CELL\s*0*([0-9]{1,2})/i.exec(cur);
        const cell = cellM ? `Cell ${cellM[1]}` : 'Cell 1';
        setValue('payLevelCell', `${mapping.level} — ${cell} • ₹${pay.toLocaleString('en-IN')}`);
      }
    }
  };
  void handlePayScaleSelect;

  const searchResults = useMemo<SearchOption[]>(() => {
    if (!nameValue || nameValue.trim().length < 1) return [];
    const q = nameValue.trim().toLowerCase();
    return employees
      .filter(
        (emp) =>
          emp.id !== editingEmployee?.id &&
          (emp.name.toLowerCase().includes(q) || (emp.hrpnNo ?? '').toLowerCase().includes(q))
      )
      .slice(0, 6)
      .map((emp) => ({
        id: emp.id,
        name: emp.name,
        hrpnNo: emp.hrpnNo || '',
        designation: emp.designation,
        payScale: emp.payScale,
        employee: emp,
      }));
  }, [nameValue, employees, editingEmployee?.id]);

  const showDropdown = searchResults.length > 0 && !isDropdownDismissed;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownDismissed(true);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectOption = (option: SearchOption) => {
    const emp = option.employee;
    reset({
      id: emp.id,
      srNo: emp.srNo,
      billCode: emp.billCode || billCode || 'GTR-30-GO-STATS',
      hrpnNo: emp.hrpnNo || '',
      name: emp.name,
      designation: emp.designation || '',
      designationGujarati: emp.designationGujarati || '',
      cadreClass: emp.cadreClass || '૩',
      payScale: emp.payScale || '',
      gradePay: emp.gradePay || '',
      payLevelCell: emp.payLevelCell || '',
      ppaNo: emp.ppaNo || '',
      currentPay: emp.currentPay || 0,
      currentPayDate: emp.currentPayDate || '',
      quarterAddress: emp.quarterAddress || '',
      insuranceGroup: emp.insuranceGroup || 'ખ',
      insuranceType: emp.insuranceType || 'savings_and_insurance',
      hraPercent: emp.hraPercent || 0,
      da: emp.da || 0,
      transportAllowance: emp.transportAllowance ?? 3600,
      medicalAllowance: emp.medicalAllowance ?? 1000,
      claAllowance: emp.claAllowance ?? 270,
      rentOfBuilding: emp.rentOfBuilding ?? 300,
      professionalTax: emp.professionalTax ?? 200,
      gis1981Insurance: emp.gis1981Insurance ?? 240,
      gis1981Savings: emp.gis1981Savings ?? 560,
      npsPension: emp.npsPension ?? 6105,
      societyDeduction: emp.societyDeduction ?? 4154,
      remarks: emp.remarks || '',
    });
    onCancelEdit?.();
    onCancel?.();
    setSubmitStatus({ type: 'success', message: 'Employee found. Update details below.' });
    setIsDropdownDismissed(true);
  };

  const onSubmit = async (data: GTR30EmployeeMasterInput) => {
    try {
      setSubmitStatus({ type: 'success', message: 'Saving...' });
      const employee: GTR30EmployeeMasterInput = {
        ...gtr30EmployeeMasterSchema.parse(data),
        id: editingEmployee?.id || data.id || '',
        srNo: data.srNo || Math.max(0, ...employees.map((e) => e.srNo)) + 1,
      };
      const targetBillCode = data.billCode || billCode || 'GTR-30-GO-STATS';
      await saveMutation.mutateAsync({ monthKey, billCode: targetBillCode, employee });
      toast({
        title: editingEmployee ? 'Employee Updated' : 'Employee Added',
        description: `${employee.name} saved under ${targetBillCode} — pay history updated.`,
      });
      const doClose = shouldCloseAfterSave;
      setShouldCloseAfterSave(false);
      if (doClose) {
        try {
          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'GTR30_EMPLOYEE_SAVED', employeeId: employee.id }, '*');
              window.opener.location.reload();
            } catch {}
          }
        } catch {}
        onSaved?.();
        window.close();
        setTimeout(() => {
          if (!window.closed) {
            onCancel?.();
            window.location.href = '/gtr30/employee-management';
          }
        }, 150);
        return;
      }
      if (editingEmployee) {
        // Stay on form and show saved pay — no reload needed. Keep saved values visible.
        reset({
          ...employee,
          billCode: targetBillCode,
        } as never);
        setSubmitStatus({ type: 'success', message: 'Saved — pay timeline updated (no reload needed).' });
        (onSaved as unknown as (e: typeof employee) => void)?.(employee as never);
      } else {
        reset({
          ...EMPTY_VALUES,
          billCode: targetBillCode,
        });
        onCancelEdit?.();
        onCancel?.();
        setSubmitStatus(null);
        onSaved?.();
        setActiveTab('personal');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save employee';
      setSubmitStatus({ type: 'error', message });
      toast({ title: 'Save Failed', description: message, variant: 'destructive' });
    }
  };

  const handleClear = () => {
    reset(EMPTY_VALUES);
    onCancelEdit?.();
    onCancel?.();
    setSubmitStatus(null);
    setIsDropdownDismissed(true);
    setActiveTab('personal');
  };

  const currentTabIndex = TABS.findIndex((t) => t.id === activeTab);
  const handlePrevTab = () => {
    if (currentTabIndex > 0) {
      setActiveTab(TABS[currentTabIndex - 1].id);
    }
  };
  const handleNextTab = () => {
    if (currentTabIndex < TABS.length - 1) {
      setActiveTab(TABS[currentTabIndex + 1].id);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {editingEmployee && (
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 rounded-full border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            onClick={() => {
              onCancelEdit?.();
              onCancel?.();
              if (window.opener) {
                try { window.opener.location.reload(); } catch {}
                window.close();
              } else {
                window.location.href = '/gtr30/employee-management';
              }
            }}
            title="Close edit and reload employee management"
          >
            <X className="h-3.5 w-3.5" /> Close
          </Button>
        </div>
      )}
      {/* 1. Live Salary & Statutory Overview Banner */}
      <SalaryPreviewCard
        employeeName={nameValue}
        basicPay={basic}
        grossPay={grossPay}
        deductionsTotal={deductionsTotal}
        netTakeHome={netTakeHome}
        effectiveDaPercent={effectiveDaPercent}
        onRecalculate={() => handlePayChange(String(basic))}
      />

      {submitStatus && (
        <div
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border ${
            submitStatus.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {submitStatus.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          )}
          <span>{submitStatus.message}</span>
        </div>
      )}

      {/* 2. Section Navigation Bar (Direct Section Switcher) */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto app-scroll">
        <nav className="flex items-center gap-2 min-w-max" aria-label="Form Sections">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all select-none ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <div className="text-left">
                  <div className="leading-tight">{tab.label}</div>
                  <div className={`text-xs font-normal leading-none mt-0.5 ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                    {tab.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 3. Tab Contents Container */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm min-h-[340px]">
        {/* TAB 1: 👤 Personal Profile & Identification */}
        <div className={activeTab === 'personal' ? 'space-y-4 animate-in fade-in duration-150' : 'hidden'}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900">Personal &amp; Designation Details</h3>
            </div>
            <span className="text-xs text-slate-500">Step 1 of 5</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Employee Name with Directory Search */}
            <div className="relative sm:col-span-2 lg:col-span-1" ref={dropdownRef}>
              <div className="flex items-center gap-1">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                  Employee Name
                </Label>
                <span className="text-red-500 text-xs">*</span>
              </div>
              <div className="relative mt-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="name"
                  {...register('name')}
                  className="pl-9 text-xs font-bold"
                  placeholder="e.g. Shri R.B.Makvana"
                  autoComplete="off"
                  onChange={(e) => {
                    setIsDropdownDismissed(false);
                    void setValue('name', e.target.value);
                  }}
                />
              </div>
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              {showDropdown && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                  {searchResults.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => selectOption(option)}
                      className="w-full text-left px-3 py-2.5 hover:bg-blue-50/70 border-b border-slate-100 last:border-0 transition-colors flex items-center justify-between gap-2"
                    >
                      <span className="font-semibold text-xs text-slate-800 truncate">{option.name}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        {option.hrpnNo && (
                          <span className="text-slate-500 font-mono text-xs">{option.hrpnNo}</span>
                        )}
                        <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          GTR-30 Master
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* HRPN No */}
            <div>
              <Label htmlFor="hrpnNo" className="text-xs font-semibold text-slate-700">
                HRPN No.
              </Label>
              <Input
                id="hrpnNo"
                {...register('hrpnNo')}
                className="mt-1 font-mono uppercase text-xs"
                placeholder="e.g. 100123"
                maxLength={50}
              />
              {errors.hrpnNo && <p className="text-red-500 text-xs mt-1">{errors.hrpnNo.message}</p>}
            </div>

            {/* Cadre Class */}
            <div>
              <Label htmlFor="cadreClass" className="text-xs font-semibold text-slate-700">
                Cadre Class (સંવર્ગ વર્ગ)
              </Label>
              <select
                id="cadreClass"
                {...register('cadreClass')}
                className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-gujSans font-bold"
              >
                <option value="૧">વર્ગ ૧ (Class 1 - Gazetted Officer)</option>
                <option value="૨">વર્ગ ૨ (Class 2 - Gazetted Officer)</option>
                <option value="૩">વર્ગ ૩ (Class 3 - Non-Gazetted Staff)</option>
                <option value="૪">વર્ગ ૪ (Class 4 - Support Staff)</option>
              </select>
            </div>

            {/* Designation English */}
            <div>
              <Label htmlFor="designation" className="text-xs font-semibold text-slate-700">
                Designation
              </Label>
              <div className="relative mt-1">
                <Briefcase className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="designation"
                  {...register('designation')}
                  className="pl-9 text-xs"
                  placeholder="e.g. Research Assistant"
                />
              </div>
            </div>

            {/* Designation Gujarati */}
            <div>
              <Label htmlFor="designationGujarati" className="text-xs font-semibold text-slate-700">
                Designation (ગુજરાતી હોદ્દો)
              </Label>
              <Input
                id="designationGujarati"
                {...register('designationGujarati')}
                className="mt-1 text-xs font-gujSans font-medium"
                placeholder="e.g. સંશોધન મદદનીશ"
              />
            </div>

            {/* PPA Number */}
            <div>
              <Label htmlFor="ppaNo" className="text-xs font-semibold text-slate-700">
                PPA Number
              </Label>
              <Input
                id="ppaNo"
                {...register('ppaNo')}
                className="mt-1 text-xs num"
                placeholder="Applied"
              />
            </div>

            {/* Bill Code / Pay Category */}
            <div>
              <Label htmlFor="billCode" className="text-xs font-semibold text-blue-900">
                Assigned Bill Code / Category
              </Label>
              <select
                id="billCode"
                {...register('billCode')}
                className="mt-1 w-full h-9 rounded-md border border-blue-300 bg-white px-2.5 text-xs num font-bold text-blue-950"
              >
                {availableBillCodes.map((m) => (
                  <option key={m.billCode} value={m.billCode}>
                    {m.billCode} — {m.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* TAB 2: 💼 7th Pay Matrix & Basic Salary */}
        <div className={activeTab === 'payscale' ? 'space-y-4 animate-in fade-in duration-150' : 'hidden'}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900">7th Pay Matrix — Pay History</h3>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                {payEntriesValue.length} {payEntriesValue.length===1?'entry':'entries'}
              </span>
              <span className="hidden sm:inline text-xs text-slate-500">• Current pay from history</span>
            </div>
            <span className="text-xs text-slate-500">Step 2 of 5</span>
          </div>

          {/* Hidden single-source fields — Current Pay is derived from Pay History */}
          <input type="hidden" {...register('currentPay')} />
          <input type="hidden" {...register('currentPayDate')} />
          {errors.currentPay && <p className="text-red-500 text-xs">{errors.currentPay.message}</p>}
          {errors.currentPayDate && <p className="text-red-500 text-xs">{errors.currentPayDate.message}</p>}

          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-indigo-900">Pay managed via History Timeline below</div>
              <div className="text-xs text-indigo-700">Current Pay auto from last entry • DA {effectiveDaPercent}% • NPS 10% • {payEntriesValue.length} {payEntriesValue.length===1?'entry':'entries'}</div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
              <History size={12} /> {payEntriesValue.length ? `₹${(payEntriesValue[payEntriesValue.length-1]?.basicPay ?? 0).toLocaleString('en-IN')}` : 'No pay yet'} {payEntriesValue.length ? `• ${formatDate(payEntriesValue[payEntriesValue.length-1]?.startDate)}` : ''}
            </span>
          </div>

          {/* Pay Scale / Grade / Level hidden — kept for Schedule P3 print but not shown in minimal pay matrix */}
          <input type="hidden" {...register('payScale')} />
          <input type="hidden" {...register('gradePay')} />
          <input type="hidden" {...register('payLevelCell')} />

          {/* Refined Pay History — single source for pay changes (gtr30/payHistory integrated) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              <History className="h-3.5 w-3.5" /> Pay History Timeline
              <span className="ml-auto hidden text-xs font-normal normal-case tracking-normal text-slate-500 sm:inline">Current Pay is derived from last entry — edit history to change pay</span>
            </div>
            <PayTimeline
              value={(payEntriesValue as unknown as PayEntry[]) ?? []}
              onChange={(next) => {
                const norm = normalizePayHistoryGTR(next as unknown as PayEntry[]);
                setValue('payEntries', norm as never, { shouldDirty: true, shouldValidate: true });
                const last = norm[norm.length - 1];
                if (last) {
                  setValue('currentPay', last.basicPay as never, { shouldDirty: true });
                  setValue('currentPayDate', last.startDate as never, { shouldDirty: true });
                } else {
                  setValue('currentPay', 0 as never, { shouldDirty: true });
                  setValue('currentPayDate', '' as never, { shouldDirty: true });
                }
              }}
            />
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <CalendarRange className="h-3 w-3" />
            Pay History is the single source: bills use pay active on bill month (prorated). Reason / Order No kept for audit.
          </p>
        </div>

        {/* TAB 3: 📈 Allowances & Earnings */}
        <div className={activeTab === 'allowances' ? 'space-y-4 animate-in fade-in duration-150' : 'hidden'}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900">Monthly Allowances &amp; Earnings (₹)</h3>
            </div>
            <span className="text-xs text-slate-500">Step 3 of 5</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* DA */}
            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200">
              <div className="flex items-center justify-between">
                <Label htmlFor="da" className="text-xs font-bold text-emerald-900">
                  Dearness Allowance (DA {effectiveDaPercent}%)
                </Label>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {effectiveDaPercent}% Auto
                </span>
              </div>
              <Input
                id="da"
                type="number"
                step="any"
                {...register('da')}
                className="mt-1.5 num text-xs font-bold bg-white"
                placeholder="21147"
              />
            </div>

            {/* HRA */}
            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200">
              <div className="flex items-center justify-between">
                <Label htmlFor="hraPercent" className="text-xs font-bold text-emerald-900">
                  HRA %
                </Label>
                <span className="text-xs font-semibold text-emerald-700">₹{hraAmt.toLocaleString('en-IN')} (Calculated on Basic)</span>
              </div>
              <Input
                id="hraPercent"
                type="number"
                step="any"
                {...register('hraPercent')}
                className="mt-1.5 num text-xs font-bold bg-white"
                placeholder="0"
              />
              <select
                className="mt-1.5 w-full text-xs h-7 rounded border border-emerald-300 bg-white px-2 font-medium text-emerald-900"
                onChange={(e) => {
                  if (e.target.value !== '') {
                    setValue('hraPercent', Number(e.target.value));
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>Select HRA City Category...</option>
                {HRA_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Transport Allowance */}
            <div>
              <Label htmlFor="transportAllowance" className="text-xs font-semibold text-slate-700">
                Transport Allowance (TA)
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs num">₹</span>
                <Input
                  id="transportAllowance"
                  type="number"
                  step="any"
                  {...register('transportAllowance')}
                  className="pl-7 num text-xs tabular-nums"
                  placeholder="3,600"
                />
              </div>
            </div>

            {/* Medical Allowance */}
            <div>
              <Label htmlFor="medicalAllowance" className="text-xs font-semibold text-slate-700">
                Medical Allowance
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs num">₹</span>
                <Input
                  id="medicalAllowance"
                  type="number"
                  step="any"
                  {...register('medicalAllowance')}
                  className="pl-7 num text-xs tabular-nums"
                  placeholder="1,000"
                />
              </div>
            </div>

            {/* CLA */}
            <div>
              <Label htmlFor="claAllowance" className="text-xs font-semibold text-slate-700">
                City Compensatory (CLA)
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs num">₹</span>
                <Input
                  id="claAllowance"
                  type="number"
                  step="any"
                  {...register('claAllowance')}
                  className="pl-7 num text-xs tabular-nums"
                  placeholder="270"
                />
              </div>
            </div>
          </div>
        </div>

        {/* TAB 4: 📉 Deductions & Recoveries */}
        <div className={activeTab === 'deductions' ? 'space-y-4 animate-in fade-in duration-150' : 'hidden'}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-rose-600" />
              <h3 className="text-xs font-bold text-slate-900">Statutory Deductions &amp; Recoveries (₹)</h3>
            </div>
            <span className="text-xs text-slate-500">Step 4 of 5</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* NPS Pension */}
            <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200">
              <div className="flex items-center justify-between">
                <Label htmlFor="npsPension" className="text-xs font-bold text-amber-950">
                  NPS Pension (9534 - 10%)
                </Label>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                  10% (Basic+DA)
                </span>
              </div>
              <Input
                id="npsPension"
                type="number"
                step="any"
                {...register('npsPension')}
                className="mt-1.5 num text-xs font-bold bg-white"
                placeholder="6105"
              />
            </div>

            {/* Professional Tax */}
            <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200">
              <div className="flex items-center justify-between">
                <Label htmlFor="professionalTax" className="text-xs font-bold text-amber-950">
                  Professional Tax (9570)
                </Label>
                <span className="text-xs font-semibold text-amber-800">Gujarat Slab</span>
              </div>
              <Input
                id="professionalTax"
                type="number"
                step="any"
                {...register('professionalTax')}
                className="mt-1.5 num text-xs font-bold bg-white"
                placeholder="200"
              />
            </div>

            {/* ICDP Credit Society */}
            <div>
              <Label htmlFor="societyDeduction" className="text-xs font-semibold text-slate-700">
                ICDP Credit Society
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs num">₹</span>
                <Input
                  id="societyDeduction"
                  type="number"
                  step="any"
                  {...register('societyDeduction')}
                  className="pl-7 num text-xs tabular-nums"
                  placeholder="4,154"
                />
              </div>
            </div>

            {/* GIS Group Selection */}
            <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 sm:col-span-2 lg:col-span-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-purple-700" />
                <span className="text-xs font-bold text-purple-950 uppercase tracking-wide">
                  Group Insurance Scheme (GIS-1981)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="insuranceGroup" className="text-xs font-semibold text-purple-900">
                    GIS Group (ક / ખ / ગ / ઘ)
                  </Label>
                  <select
                    id="insuranceGroup"
                    {...register('insuranceGroup')}
                    onChange={(e) => handleGISGroupChange(e.target.value)}
                    className="mt-1 w-full h-9 rounded-md border border-purple-300 bg-white px-2.5 text-xs font-gujSans font-bold text-purple-950"
                  >
                    <option value="ક">ક — Class 1 (Ins: ₹480 / Sav: ₹1120)</option>
                    <option value="ખ">ખ — Class 2 (Ins: ₹240 / Sav: ₹560)</option>
                    <option value="ગ">ગ — Class 3 (Ins: ₹120 / Sav: ₹280)</option>
                    <option value="ઘ">ઘ — Class 4 (Ins: ₹60 / Sav: ₹140)</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="gis1981Insurance" className="text-xs font-semibold text-purple-900">
                    GIS Ins. Fund (9581)
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs num">₹</span>
                    <Input
                      id="gis1981Insurance"
                      type="number"
                      step="any"
                      {...register('gis1981Insurance')}
                      className="pl-7 num text-xs tabular-nums bg-white"
                      placeholder="240"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="gis1981Savings" className="text-xs font-semibold text-purple-900">
                    GIS Sav. Fund (9582)
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs num">₹</span>
                    <Input
                      id="gis1981Savings"
                      type="number"
                      step="any"
                      {...register('gis1981Savings')}
                      className="pl-7 num text-xs tabular-nums bg-white"
                      placeholder="560"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 5: 🏠 Quarters, Rent & Insurance Details */}
        <div className={activeTab === 'quarters' ? 'space-y-4 animate-in fade-in duration-150' : 'hidden'}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900">Govt. Quarters, Rent &amp; Additional Information</h3>
            </div>
            <span className="text-xs text-slate-500">Step 5 of 5</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Rent of Building */}
            <div>
              <Label htmlFor="rentOfBuilding" className="text-xs font-semibold text-slate-700">
                Rent of Building Recovery (9550)
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs num">₹</span>
                <Input
                  id="rentOfBuilding"
                  type="number"
                  step="any"
                  {...register('rentOfBuilding')}
                  className="pl-7 num text-xs tabular-nums"
                  placeholder="300"
                />
              </div>
            </div>

            {/* Insurance Scheme Type */}
            <div>
              <Label htmlFor="insuranceType" className="text-xs font-semibold text-slate-700">
                Insurance Scheme Type
              </Label>
              <select
                id="insuranceType"
                {...register('insuranceType')}
                className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
              >
                <option value="savings_and_insurance">Savings &amp; Insurance Combined</option>
                <option value="insurance_only">Insurance Only</option>
              </select>
            </div>

            {/* Govt Quarter Address */}
            <div className="sm:col-span-2">
              <Label htmlFor="quarterAddress" className="text-xs font-semibold text-slate-700">
                Govt. Quarter Address (For Schedule P5)
              </Label>
              <Input
                id="quarterAddress"
                {...register('quarterAddress')}
                className="mt-1 text-xs"
                placeholder="H-7, Government Quarters, Khatodara, Nr. Sub Jail, Surat"
              />
              {Number(rentValue || 0) > 0 && !addressValue && (
                <p className="text-amber-700 text-xs flex items-center gap-1 mt-1 font-medium">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  Quarter address is recommended when Rent is deducted so GTR-30 Page 5 schedule is complete.
                </p>
              )}
            </div>

            {/* Remarks */}
            <div className="sm:col-span-2">
              <Label htmlFor="remarks" className="text-xs font-semibold text-slate-700">
                Remarks / Special Notes
              </Label>
              <Input
                id="remarks"
                {...register('remarks')}
                className="mt-1 text-xs"
                placeholder="e.g. Promoted to Senior Scale w.e.f. July 2026"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Actions & Section Stepper (Robust Footer Bar) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrevTab}
            disabled={currentTabIndex === 0}
            className="text-xs font-semibold text-slate-700"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous Section
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNextTab}
            disabled={currentTabIndex === TABS.length - 1}
            className="text-xs font-semibold text-slate-700"
          >
            Next Section <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            size="sm"
            onClick={() => setShouldCloseAfterSave(false)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 shadow-sm shadow-blue-600/20"
          >
            {isSubmitting && !shouldCloseAfterSave ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving...
              </>
            ) : editingEmployee ? (
              <>
                <Save className="h-3.5 w-3.5 mr-1.5" /> Save
              </>
            ) : (
              <>
                <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Save
              </>
            )}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            size="sm"
            onClick={() => setShouldCloseAfterSave(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 shadow-sm shadow-emerald-600/20"
          >
            {isSubmitting && shouldCloseAfterSave ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1.5" /> Save &amp; Close
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default GTR30EmployeeMasterForm;
