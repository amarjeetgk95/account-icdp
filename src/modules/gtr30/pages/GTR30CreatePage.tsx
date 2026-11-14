import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Plus, Printer, Save, Settings, Users, Calculator, Columns, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { createBlankEmployee, DEFAULT_BILL_CODE_MAPPINGS } from '../constants';
import { gtr30BillFormService } from '../services/gtr30BillForm.service';
import { gtr30EmployeeTransformService } from '../services/gtr30EmployeeTransform.service';
import { useGTR30Settings, useEffectiveDARate } from '../hooks/useGTR30Settings';
import { useGTR30BillCodeMappings } from '../hooks/useGTR30BillCodeMappings';
import { useGTR30BudgetHeads } from '../hooks/useGTR30BudgetHeads';
import { useGTR30EmployeeMasterGroups } from '../hooks/useGTR30EmployeeMaster';
import { useGtr30Bill } from '../hooks/useGTR30Bills';
import { useGtr30SaveBill } from '../hooks/useGTR30BillMutations';
import type { GTR30Employee, GTR30FormData, GTR30PostItem } from '../types';
import { billTotals } from '../services/gtr30Calc.service';
import { monthStartFromKey, resolveBasicPayForMonth } from '../utils/gtr30PayMatrix';
import type { PayForMonthResult } from '../utils/gtr30PayMatrix';
import { GTR30Document } from '../components/GTR30Document';
import { useToast } from '@/hooks/use-toast';
import { gtr30ResolveEmployees } from '../services/gtr30EmployeeMaster.service';
import { mergeGtr30BillCodeMappings } from '../utils/gtr30BillCodeOptions';
import { validateGTR30BillData } from '../validation/gtr30Bill.schema';
import { validateGTR30CrossPages } from '../utils/gtr30BillValidation';
import { GTR30_SETTINGS_STORAGE_KEY } from '../constants/settings';
import { parsePayLevelCell, composePayLevelCell } from './gtr30Create/payLevelCell';
import { EmployeeCard } from './gtr30Create/EmployeeCard';
import { OfficeTreasuryTab } from './gtr30Create/OfficeTreasuryTab';
import { EstablishmentTab } from './gtr30Create/EstablishmentTab';
import { FloatingSummaryBar } from './gtr30Create/FloatingSummaryBar';

export function GTR30CreatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const billQuery = useGtr30Bill(id ?? null);
  const saveMutation = useGtr30SaveBill();
  const settingsQuery = useGTR30Settings();
  const mappingsQuery = useGTR30BillCodeMappings();
  const groupsQuery = useGTR30EmployeeMasterGroups();
  const existing = billQuery.data ?? null;

  const initialBundle = settingsQuery.data;
  const [data, setData] = useState<GTR30FormData>(() =>
    existing ??
    (initialBundle
      ? gtr30BillFormService.buildNewBillFormData({
          settings: initialBundle.settings,
          employeeTemplate: initialBundle.employeeTemplate,
          defaultPosts: initialBundle.defaultPosts,
        })
      : gtr30BillFormService.emptyFormData())
  );
  const isEditMode = !!id;
  const hasSyncedExistingRef = useRef(false);
  const hasSyncedSettingsRef = useRef(false);
  useEffect(() => {
    if (existing && !hasSyncedExistingRef.current) {
      hasSyncedExistingRef.current = true;
      const s = settingsQuery.data?.settings;
      setData({
        ...existing,
        officeName: existing.officeName || s?.officeName || '',
        officeFullName: existing.officeFullName || s?.officeFullName || existing.officeName || '',
        branchName: existing.branchName || s?.branchName || '',
        treasuryName: existing.treasuryName || s?.treasuryName || '',
        phoneNo: existing.phoneNo || s?.phoneNo || '',
        district: existing.district || s?.district || '',
        station: existing.station || s?.station || '',
        cardexNo: existing.cardexNo || s?.cardexNo || '',
        ddoCode: existing.ddoCode || s?.ddoCode || '',
        controllingOfficer: existing.controllingOfficer || s?.controllingOfficer || '',
        classOfExpenditure: existing.classOfExpenditure || s?.classOfExpenditure || '',
        fund: existing.fund || s?.fund || '',
        drawingOfficer: existing.drawingOfficer || s?.drawingOfficer || '',
        demandNo: existing.demandNo || s?.demandNo || '',
        typeOfBudget: existing.typeOfBudget || s?.typeOfBudget || '',
        schemeNo: existing.schemeNo || s?.schemeNo || '',
        headChargeable: existing.headChargeable || s?.headChargeable || '',
        sector: existing.sector || s?.sector || '',
        majorHead: existing.majorHead || s?.majorHead || '',
        subHead: existing.subHead || s?.subHead || '',
        minorHead: existing.minorHead || s?.minorHead || '',
        budgetYear: existing.budgetYear || s?.budgetYear || '',
        drawingOfficerName: existing.drawingOfficerName || s?.drawingOfficerName || '',
        drawingOfficerDesignation: existing.drawingOfficerDesignation || s?.drawingOfficerDesignation || '',
        drawingOfficerOffice: existing.drawingOfficerOffice || s?.drawingOfficerOffice || '',
      });
    }
  }, [existing, settingsQuery.data?.settings]);

  useEffect(() => {
    if (!isEditMode && settingsQuery.data?.settings && !hasSyncedSettingsRef.current) {
      hasSyncedSettingsRef.current = true;
      const s = settingsQuery.data.settings;
      setData((prev) => ({
        ...prev,
        officeName: s.officeName || prev.officeName,
        officeFullName: s.officeFullName || prev.officeFullName,
        branchName: s.branchName || prev.branchName,
        treasuryName: s.treasuryName || prev.treasuryName,
        phoneNo: s.phoneNo || prev.phoneNo,
        district: s.district || prev.district,
        station: s.station || prev.station,
        cardexNo: s.cardexNo || prev.cardexNo,
        ddoCode: s.ddoCode || prev.ddoCode,
        controllingOfficer: s.controllingOfficer || prev.controllingOfficer,
        classOfExpenditure: s.classOfExpenditure || prev.classOfExpenditure,
        fund: s.fund || prev.fund,
        drawingOfficer: s.drawingOfficer || prev.drawingOfficer,
        demandNo: s.demandNo || prev.demandNo,
        typeOfBudget: s.typeOfBudget || prev.typeOfBudget,
        schemeNo: s.schemeNo || prev.schemeNo,
        headChargeable: s.headChargeable || prev.headChargeable,
        sector: s.sector || prev.sector,
        majorHead: s.majorHead || prev.majorHead,
        minorHead: s.minorHead || prev.minorHead,
        subHead: s.subHead || prev.subHead,
        budgetYear: s.budgetYear || prev.budgetYear,
        schemeResolutionText: s.schemeResolutionText || prev.schemeResolutionText,
        daResolutionText: s.daResolutionText || prev.daResolutionText,
        drawingOfficerName: s.drawingOfficerName || prev.drawingOfficerName,
        drawingOfficerNameGujarati: s.drawingOfficerNameGujarati || prev.drawingOfficerNameGujarati,
        drawingOfficerDesignation: s.drawingOfficerDesignation || prev.drawingOfficerDesignation,
        drawingOfficerDesignationGujarati: s.drawingOfficerDesignationGujarati || prev.drawingOfficerDesignationGujarati,
        drawingOfficerOffice: s.drawingOfficerOffice || prev.drawingOfficerOffice,
        drawingOfficerOfficeGujarati: s.drawingOfficerOfficeGujarati || prev.drawingOfficerOfficeGujarati,
        messengerName: s.messengerName || prev.messengerName,
        messengerDesignation: s.messengerDesignation || prev.messengerDesignation,
      }));
    }
  }, [isEditMode, settingsQuery.data]);
  const [activeTab, setActiveTab] = useState('employees');
  const [isSplitView, setIsSplitView] = useState(false);
  const [advancedEarningsOpen, setAdvancedEarningsOpen] = useState<Record<string, boolean>>({});
  const [advancedDeductionsOpen, setAdvancedDeductionsOpen] = useState<Record<string, boolean>>({});
  const [identityOpen, setIdentityOpen] = useState<Record<string, boolean>>({});
  const [lastAutoSaved, setLastAutoSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rawBillCodeOptions = mappingsQuery.data ?? [];
  const baseBillCodeOptions = rawBillCodeOptions.length > 0 ? rawBillCodeOptions : DEFAULT_BILL_CODE_MAPPINGS;
  const employeeGroups = useMemo(() => groupsQuery.data ?? {}, [groupsQuery.data]);

  const billCodeOptions = useMemo(
    () => mergeGtr30BillCodeMappings(baseBillCodeOptions, employeeGroups),
    [baseBillCodeOptions, employeeGroups]
  );

  const budgetHeadOptions = useGTR30BudgetHeads().data ?? [];
  const effectiveDaPercent = useEffectiveDARate(data.monthOf);

  const loadEmployeesFromMaster = () => {
    const month = data.monthOf;
    const code = data.billCode;
    if (!month || !code) {
      toast({ title: 'Missing Data', description: 'Enter Month and Bill Code first.' });
      return;
    }
    const groups = groupsQuery.data ?? {};
    const { rows, isFallback, sourceKey } = gtr30ResolveEmployees(groups, month, code);
    if (rows.length === 0) {
      toast({
        title: 'No Master Found',
        description: `No employees assigned to bill code "${code}". Assign Bill Codes in Master Directory. Checked ${month} and fallback groups.`,
      });
      return;
    }
    setData((current) => ({
      ...current,
      employees: rows.map((master, idx) =>
        gtr30EmployeeTransformService.masterToBillEmployee(master, idx + 1, undefined, {
          monthKey: month,
          daRate: effectiveDaPercent,
          forceDaRecalc: true,
        })
      ),
    }));
    toast({
      title: isFallback ? 'Employees Loaded (Fallback)' : 'Employees Loaded',
      description: isFallback
        ? `${rows.length} employee(s) loaded via fallback from "${sourceKey}" for ${code} · ${month} (no exact match for ${month}). DA ${effectiveDaPercent}% applied.`
        : `${rows.length} employee(s) loaded from master for ${code} · ${month}. DA ${effectiveDaPercent}% applied.`,
    });
  };

  const totals = billTotals(data);

  const payResolutions = useMemo(() => {
    const monthStart = monthStartFromKey(data.monthOf);
    const groups = groupsQuery.data ?? {};
    const map: Record<string, PayForMonthResult> = {};
    if (monthStart) {
      for (const group of Object.values(groups)) {
        for (const master of group) {
          if (master.id) {
            map[master.id] = resolveBasicPayForMonth(master.payEntries ?? [], monthStart);
          }
        }
      }
    }
    return map;
  }, [groupsQuery.data, data.monthOf]);

  const crossWarnings = useMemo(() => validateGTR30CrossPages(data), [data]);

  const saveBill = useCallback(async (opts?: { silent?: boolean }) => {
    const validation = validateGTR30BillData(data);
    if (!validation.isValid) {
      toast({
        title: 'Validation Issues',
        description: validation.errors[0] || 'Please fill in all mandatory fields before saving.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await saveMutation.mutateAsync({ form: data, existing });
      if (opts?.silent) {
        setLastAutoSaved(new Date());
        return;
      }
      toast(
        id
          ? { title: 'Bill Updated', description: 'GTR-30 Pay Bill updated successfully.' }
          : { title: 'Bill Created', description: 'New GTR-30 Pay Bill saved to register.' }
      );
      navigate('/gtr30/list');
    } catch (error) {
      toast({
        title: opts?.silent ? 'Autosave failed' : 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [data, saveMutation, existing, id, navigate, toast]);

  const saveBillRef = useRef(saveBill);
  useEffect(() => {
    saveBillRef.current = saveBill;
  }, [saveBill]);

  const printBill = useCallback(() => {
    setActiveTab('preview');
    window.setTimeout(() => window.print(), 200);
  }, [setActiveTab]);

  const printBillRef = useRef(printBill);
  useEffect(() => {
    printBillRef.current = printBill;
  }, [printBill]);

  // Autosave: save draft after 30s of inactivity
  useEffect(() => {
    if (activeTab === 'preview') return; // Don't autosave while previewing
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      // Only autosave if there are employees and it's a draft
      if (data.employees.length > 0 && (!existing?.status || existing.status === 'draft')) {
        void saveBillRef.current({ silent: true });
      }
    }, 30000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [data, activeTab, existing?.status]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S: Save bill (also works while typing)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void saveBillRef.current();
      }
      // Ctrl+P / Cmd+P: Print (switch to preview + open print dialog)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        printBillRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent accidental value changes when scrolling over number inputs
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
        (target as HTMLInputElement).blur();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  // Edit mode: wait for the bill to load before rendering the form to avoid flash of empty/new bill
  if (isEditMode && (billQuery.isPending || billQuery.isLoading)) {
    return (
      <div className="max-w-7xl mx-auto py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <div className="text-xs font-medium">Loading GTR-30 Pay Bill…</div>
      </div>
    );
  }
  if (isEditMode && billQuery.isError) {
    return (
      <div className="max-w-7xl mx-auto py-10">
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="text-xs font-bold text-slate-700">Failed to load GTR-30 Pay Bill</div>
          <div className="text-xs text-slate-500 max-w-md">{billQuery.error instanceof Error ? billQuery.error.message : 'An error occurred while loading the bill.'}</div>
          <button onClick={() => navigate('/gtr30/list')} className="mt-2 text-xs font-medium text-blue-600 hover:underline">Back to Register</button>
        </div>
      </div>
    );
  }
  if (isEditMode && !existing && billQuery.isSuccess) {
    return (
      <div className="max-w-7xl mx-auto py-10">
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="text-xs font-bold text-slate-700">GTR-30 Pay Bill Not Found</div>
          <div className="text-xs text-slate-500">The requested bill does not exist or may have been removed.</div>
          <button onClick={() => navigate('/gtr30/list')} className="mt-2 text-xs font-medium text-blue-600 hover:underline">Back to Register</button>
        </div>
      </div>
    );
  }

  if (!isEditMode && settingsQuery.isPending && !settingsQuery.data) {
    return (
      <div className="max-w-7xl mx-auto py-16 flex flex-col items-center justify-center gap-4 text-slate-500">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <div className="text-xs font-medium text-slate-700">Loading settings…</div>
        <div className="text-xs text-slate-500 max-w-md text-center">
          Configure settings first to generate a blank bill with your office defaults.
        </div>
      </div>
    );
  }

  const settingsConfigured = !isEditMode && typeof window !== 'undefined' && localStorage.getItem(GTR30_SETTINGS_STORAGE_KEY) !== null;

  const setField = (field: keyof GTR30FormData, value: string | number) =>
    setData((current) => ({ ...current, [field]: value }));

  const updateEmployee = (employeeId: string, field: keyof GTR30Employee, value: string | number) => {
    setData((current) => ({
      ...current,
      employees: current.employees.map((emp) => {
        if (emp.id !== employeeId) return emp;
        const updated = { ...emp, [field]: value };

        // Auto-recalculate DA (effective %) and NPS (10%) when pay changes
        if (field === 'payOfEstablishment' || field === 'payOfOfficer') {
          const pay = Number(value) || 0;
          if (pay > 0 && emp.da === 0) {
            const da = Math.round(pay * (effectiveDaPercent / 100));
            updated.da = da;
            updated.npsPension = Math.round((pay + da) * 0.1);
            updated.payLevelCell = composePayLevelCell(pay, '', parsePayLevelCell(emp.payLevelCell).cell || '7');
          }
        }
        return updated;
      }),
    }));
  };

  const autoRecalculateEmployee = (employeeId: string) => {
    setData((current) => ({
      ...current,
      employees: current.employees.map((emp) => {
        if (emp.id !== employeeId) return emp;
        const pay = (emp.payOfEstablishment || emp.payOfOfficer || 0);
        const da = Math.round(pay * (effectiveDaPercent / 100));
        const nps = Math.round((pay + da) * 0.1);
        return {
          ...emp,
          da,
          npsPension: nps,
          payLevelCell: composePayLevelCell(pay, '', parsePayLevelCell(emp.payLevelCell).cell || '7'),
        };
      }),
    }));
    toast({ title: 'Recalculated', description: `DA (${effectiveDaPercent}%) and NPS (10%) updated.` });
  };

  const autoRecalculateAllEmployees = () => {
    setData((current) => ({
      ...current,
      employees: current.employees.map((emp) => {
        const pay = (emp.payOfEstablishment || emp.payOfOfficer || 0);
        const da = Math.round(pay * (effectiveDaPercent / 100));
        const nps = Math.round((pay + da) * 0.1);
        return {
          ...emp,
          da,
          npsPension: nps,
          payLevelCell: composePayLevelCell(pay, '', parsePayLevelCell(emp.payLevelCell).cell || '7'),
        };
      }),
    }));
    toast({
      title: 'All Staff Recalculated',
      description: `Applied DA (${effectiveDaPercent}%) and NPS (10%) to all ${data.employees.length} staff members.`,
    });
  };

  const addEmployee = () => {
    const nextSr = data.employees.length + 1;
    setData((current) => ({
      ...current,
      employees: [
        ...current.employees,
        createBlankEmployee(nextSr),
      ],
    }));
  };

  const removeEmployee = (empId: string) => {
    setData((current) => ({
      ...current,
      employees: current.employees
        .filter((emp) => emp.id !== empId)
        .map((emp, idx) => ({ ...emp, srNo: idx + 1 })),
    }));
  };

  const updatePost = (postId: string, field: keyof GTR30PostItem, value: string | number) => {
    setData((current) => ({
      ...current,
      establishmentPosts: current.establishmentPosts.map((post) => {
        if (post.id === postId) {
          const updated = { ...post, [field]: value };
          if (field === 'sanctioned' || field === 'filled') {
            const sanc = Number(field === 'sanctioned' ? value : post.sanctioned) || 0;
            const fill = Number(field === 'filled' ? value : post.filled) || 0;
            updated.vacant = Math.max(0, sanc - fill);
            updated.total = sanc;
          }
          return updated;
        }
        return post;
      }),
    }));
  };

  const addPost = () => {
    const nextSr = data.establishmentPosts.length + 1;
    setData((current) => ({
      ...current,
      establishmentPosts: [
        ...current.establishmentPosts,
        {
          id: crypto.randomUUID(),
          srNo: String(nextSr),
          designation: '',
          cadreClass: '૩',
          sanctioned: 1,
          filled: 0,
          vacant: 1,
          total: 1,
        },
      ],
    }));
  };

  const removePost = (postId: string) => {
    setData((current) => ({
      ...current,
      establishmentPosts: current.establishmentPosts.filter((p) => p.id !== postId),
    }));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-24">
      <WorkspaceHeader
        title={id ? 'Edit GTR-30 Pay Bill' : 'Create GTR-30 Pay Bill'}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSplitView((v) => !v)}
              className="hidden xl:inline-flex text-xs font-semibold text-slate-700 dark:text-slate-300 dark:border-slate-700"
              title="Toggle side-by-side editing and live preview"
            >
              <Columns className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
              {isSplitView ? 'Standard Tabs' : 'Split Live Preview'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/gtr30/list')}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Register
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/gtr30/settings')}>
              <Settings className="mr-1 h-4 w-4" /> Settings
            </Button>
            <Button variant="outline" size="sm" onClick={printBill}>
              <Printer className="mr-1 h-4 w-4" /> Print PDF
            </Button>
            <Button size="sm" onClick={() => saveBill()} className="font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20">
              <Save className="mr-1 h-4 w-4" /> Save Bill
              <kbd className="hidden sm:inline-flex ml-1.5 text-xs font-mono opacity-60 px-1 py-0.5 rounded bg-white/10 border border-white/20">Ctrl+S</kbd>
            </Button>
          </div>
        }
      />

      {!settingsConfigured && !isEditMode && (
        <div className="border border-amber-200 bg-amber-50 dark:bg-amber-950/50 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
              Office settings not configured
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Configure settings first to generate a blank bill with your office defaults.
              <Button variant="link" size="sm" className="ml-2 p-0 h-auto text-amber-800 dark:text-amber-200 hover:underline" onClick={() => navigate('/gtr30/settings')}>
                Open Settings
              </Button>
            </p>
          </div>
        </div>
      )}

      <div className={isSplitView ? 'grid grid-cols-1 xl:grid-cols-12 gap-6 items-start' : ''}>
        <div className={isSplitView ? 'xl:col-span-7' : ''}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="workspace-tabs w-full sm:grid sm:grid-cols-4">
              <TabsTrigger value="employees" className="workspace-tab data-[state=active]:workspace-tab-active focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none">
                1. Employees &amp; Pay ({data.employees.length})
              </TabsTrigger>
              <TabsTrigger value="office" className="workspace-tab data-[state=active]:workspace-tab-active focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none">
                2. Office &amp; Treasury
              </TabsTrigger>
              <TabsTrigger value="establishment" className="workspace-tab data-[state=active]:workspace-tab-active focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none">
                3. Posts &amp; Resolutions
              </TabsTrigger>
              <TabsTrigger value="preview" className="workspace-tab data-[state=active]:workspace-tab-active focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none">
                4. 10-Page Preview
                <kbd className="hidden sm:inline-flex ml-1.5 text-xs font-mono opacity-60 px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/20">Ctrl+P</kbd>
              </TabsTrigger>
            </TabsList>

        {/* TAB 1: Employees & Pay */}
        <TabsContent value="employees" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase text-slate-800">
                Staff Members &amp; Pay Components
              </h2>
              <p className="text-xs text-slate-500">
                Enter employee basic pay, allowances, and schedule deductions. All 10 sheets and cover tables update dynamically.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {data.employees.length > 0 && (
                <Button size="sm" variant="outline" onClick={autoRecalculateAllEmployees} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                  <Calculator className="mr-1 h-3.5 w-3.5" /> Auto-Calc All ({effectiveDaPercent}%)
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={loadEmployeesFromMaster}>
                <Users className="mr-1 h-4 w-4" /> Load from Master
              </Button>
              <Button size="sm" onClick={addEmployee} className="font-semibold bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="mr-1 h-4 w-4" /> Add Employee
              </Button>
            </div>
          </div>
          {data.employees.map((emp, index) => (
            <EmployeeCard
              key={emp.id}
              emp={emp}
              index={index}
              canRemove={data.employees.length > 1}
              effectiveDaPercent={effectiveDaPercent}
              payResolutions={payResolutions}
              monthOf={data.monthOf}
              identityOpen={identityOpen}
              setIdentityOpen={setIdentityOpen}
              advancedEarningsOpen={advancedEarningsOpen}
              setAdvancedEarningsOpen={setAdvancedEarningsOpen}
              advancedDeductionsOpen={advancedDeductionsOpen}
              setAdvancedDeductionsOpen={setAdvancedDeductionsOpen}
              updateEmployee={updateEmployee}
              autoRecalculateEmployee={autoRecalculateEmployee}
              removeEmployee={removeEmployee}
            />
          ))}

          <div className="flex justify-end pt-3">
            <Button onClick={() => setActiveTab('office')}>
              Next: Office &amp; Treasury Details <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
        <OfficeTreasuryTab
          data={data}
          setField={setField}
          setData={setData}
          billCodeOptions={billCodeOptions}
          budgetHeadOptions={budgetHeadOptions}
          setActiveTab={setActiveTab}
        />


        <EstablishmentTab
          data={data}
          setField={setField}
          updatePost={updatePost}
          addPost={addPost}
          removePost={removePost}
          setActiveTab={setActiveTab}
        />

        {/* TAB 4: Live Preview */}
        <TabsContent value="preview" className="mt-4 space-y-4">
          {crossWarnings.length > 0 && (
            <Card className={`p-3.5 rounded-xl border ${crossWarnings.some((w) => w.severity === 'error') ? 'border-red-200 bg-red-50/70 dark:bg-red-950/30' : 'border-amber-200 bg-amber-50/70 dark:bg-amber-950/30'}`}>
              <div className="text-xs font-bold uppercase flex items-center gap-1.5 mb-2">
                <span className={crossWarnings.some((w) => w.severity === 'error') ? 'text-red-700' : 'text-amber-700'}>
                  {crossWarnings.some((w) => w.severity === 'error') ? 'Blocking issues' : 'Warnings'} — cross-page checks (P1-P10)
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border text-xs num">{crossWarnings.length}</span>
              </div>
              <ul className="space-y-1.5">
                {crossWarnings.map((w, i) => (
                  <li key={i} className={`text-xs flex items-start gap-2 ${w.severity === 'error' ? 'text-red-700 dark:text-red-300' : 'text-amber-800 dark:text-amber-200'}`}>
                    <span className={`mt-0.5 px-1.5 py-0.5 rounded text-xs font-bold border ${w.severity === 'error' ? 'bg-red-100 border-red-200' : 'bg-amber-100 border-amber-200'}`}>{w.page}</span>
                    <span>{w.message}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <div className="bg-slate-100 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 overflow-auto">
            <GTR30Document data={data} containerId="gtr30-create-preview" />
          </div>
        </TabsContent>
      </Tabs>
      </div>

      {/* Split Live Preview Column (Large Screens) */}
      {isSplitView && (
        <div className="hidden xl:block xl:col-span-5 sticky top-4 bg-slate-100 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Printer className="h-4 w-4 text-blue-600" /> Live Document Preview
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
              Auto-syncing
            </span>
          </div>
          <div className="transform scale-[0.62] origin-top-left -mr-[60%]">
            <GTR30Document data={data} containerId="gtr30-create-split-preview" showControls={false} />
          </div>
        </div>
      )}
      </div>

      <FloatingSummaryBar
        activeTab={activeTab}
        employeeCount={data.employees.length}
        totals={totals}
        crossWarnings={crossWarnings}
        lastAutoSaved={lastAutoSaved}
        onShowPreview={() => setActiveTab('preview')}
        onSaveBill={() => saveBill()}
      />
    </div>
  );
}