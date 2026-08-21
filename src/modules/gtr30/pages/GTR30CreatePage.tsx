import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Plus, Printer, Save, Settings, Trash2, Users, Calculator, History, TrendingUp, TrendingDown, Columns, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { createDefaultEmployee } from '../constants';
import { gtr30BillFormService } from '../services/gtr30BillForm.service';
import { gtr30EmployeeTransformService } from '../services/gtr30EmployeeTransform.service';
import { useGTR30Settings, useEffectiveDARate } from '../hooks/useGTR30Settings';
import { useGTR30BillCodeMappings } from '../hooks/useGTR30BillCodeMappings';
import { useGTR30EmployeeMasterGroups } from '../hooks/useGTR30EmployeeMaster';
import { useGtr30Bill } from '../hooks/useGTR30Bills';
import { useGtr30SaveBill } from '../hooks/useGTR30BillMutations';
import type { GTR30Employee, GTR30FormData, GTR30PostItem } from '../types';
import { billTotals, earningsTotal, deductionsTotal, formatMoney } from '../services/gtr30Calc.service';
import { monthStartFromKey, resolveBasicPayForMonth, formatDate } from '../utils/gtr30PayMatrix';
import type { PayForMonthResult } from '../utils/gtr30PayMatrix';
import { GTR30Document } from '../components/GTR30Document';
import { useToast } from '@/hooks/use-toast';
import { gtr30ResolveEmployees } from '../services/gtr30EmployeeMaster.service';
import { validateGTR30BillData } from '../validation/gtr30Bill.schema';
import { validateGTR30CrossPages } from '../utils/gtr30BillValidation';

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
  const hasSyncedExistingRef = useRef(false);
  useEffect(() => {
    if (existing && !hasSyncedExistingRef.current) {
      hasSyncedExistingRef.current = true;
      setData(existing);
    }
  }, [existing]);
  const isEditMode = !!id;
  const [activeTab, setActiveTab] = useState('employees');
  const [isSplitView, setIsSplitView] = useState(false);
  const [advancedEarningsOpen, setAdvancedEarningsOpen] = useState<Record<string, boolean>>({});
  const [advancedDeductionsOpen, setAdvancedDeductionsOpen] = useState<Record<string, boolean>>({});

  const billCodeOptions = mappingsQuery.data ?? [];
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

  // Edit mode: wait for the bill to load before rendering the form to avoid flash of empty/new bill
  if (isEditMode && (billQuery.isPending || billQuery.isLoading)) {
    return (
      <div className="max-w-7xl mx-auto py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <div className="text-sm font-medium">Loading GTR-30 Pay Bill…</div>
      </div>
    );
  }
  if (isEditMode && billQuery.isError) {
    return (
      <div className="max-w-7xl mx-auto py-10">
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="text-sm font-bold text-slate-700">Failed to load GTR-30 Pay Bill</div>
          <div className="text-xs text-slate-500 max-w-md">{billQuery.error instanceof Error ? billQuery.error.message : 'An error occurred while loading the bill.'}</div>
          <button onClick={() => navigate('/gtr30/list')} className="mt-2 text-sm font-medium text-blue-600 hover:underline">Back to Register</button>
        </div>
      </div>
    );
  }
  if (isEditMode && !existing && billQuery.isSuccess) {
    return (
      <div className="max-w-7xl mx-auto py-10">
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="text-sm font-bold text-slate-700">GTR-30 Pay Bill Not Found</div>
          <div className="text-xs text-slate-500">The requested bill does not exist or may have been removed.</div>
          <button onClick={() => navigate('/gtr30/list')} className="mt-2 text-sm font-medium text-blue-600 hover:underline">Back to Register</button>
        </div>
      </div>
    );
  }

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
            updated.payLevelCell = `PAY=${pay} (LEVEL CELL-7)`;
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
          payLevelCell: `PAY=${pay} (LEVEL CELL-7)`,
        };
      }),
    }));
    toast({ title: 'Recalculated', description: `DA (${effectiveDaPercent}%) and NPS (10%) updated.` });
  };

  const addEmployee = () => {
    const nextSr = data.employees.length + 1;
    setData((current) => ({
      ...current,
      employees: [
        ...current.employees,
        createDefaultEmployee(nextSr),
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

  const saveBill = async () => {
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
      toast(
        id
          ? { title: 'Bill Updated', description: 'GTR-30 Pay Bill updated successfully.' }
          : { title: 'Bill Created', description: 'New GTR-30 Pay Bill saved to register.' }
      );
      navigate('/gtr30/list');
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const printBill = () => {
    setActiveTab('preview');
    window.setTimeout(() => window.print(), 200);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-24">
      <WorkspaceHeader
        eyebrow="Bill Creation · GTR-30"
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
            <Button size="sm" onClick={saveBill} className="font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20">
              <Save className="mr-1 h-4 w-4" /> Save Bill
            </Button>
          </div>
        }
      />

      <div className={isSplitView ? 'grid grid-cols-1 xl:grid-cols-12 gap-6 items-start' : ''}>
        <div className={isSplitView ? 'xl:col-span-7' : ''}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <TabsTrigger value="employees" className="text-xs font-semibold py-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none">
                1. Employees &amp; Pay ({data.employees.length})
              </TabsTrigger>
              <TabsTrigger value="office" className="text-xs font-semibold py-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none">
                2. Office &amp; Treasury
              </TabsTrigger>
              <TabsTrigger value="establishment" className="text-xs font-semibold py-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none">
                3. Posts &amp; Resolutions
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs font-semibold py-2 text-blue-700 dark:text-blue-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none">
                4. 10-Page Preview
              </TabsTrigger>
            </TabsList>

        {/* TAB 1: Employees & Pay */}
        <TabsContent value="employees" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase text-slate-800">
                Staff Members &amp; Pay Components
              </h2>
              <p className="text-xs text-slate-500">
                Enter employee basic pay, allowances, and schedule deductions. All 10 sheets and cover tables update dynamically.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={loadEmployeesFromMaster}>
                <Users className="mr-1 h-4 w-4" /> Load from Master
              </Button>
              <Button size="sm" onClick={addEmployee} className="font-semibold bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="mr-1 h-4 w-4" /> Add Employee
              </Button>
            </div>
          </div>

          {data.employees.map((emp, index) => {
            const empEarnings = earningsTotal(emp);
            const empDeductions = deductionsTotal(emp);
            const empNet = empEarnings - empDeductions;
            const empNetAfterSociety = empNet - (emp.societyDeduction || 0);

            return (
              <Card key={emp.id} className="border border-slate-200 p-5 shadow-sm space-y-4 focus-within:ring-1 focus-within:ring-blue-200">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="font-bold text-slate-800 text-sm">
                      {emp.name || `Employee ${index + 1}`}
                    </span>
                    {emp.designationGujarati && (
                      <span className="text-xs font-medium text-slate-500 font-serif">
                        ({emp.designationGujarati})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-right">
                      <span className="text-slate-500 mr-2">Gross: <strong>₹{formatMoney(empEarnings)}</strong></span>
                      <span className="text-slate-500 mr-2">Deductions: <strong>₹{formatMoney(empDeductions)}</strong></span>
                      <span className="text-blue-700 font-bold mr-2">Net: ₹{formatMoney(empNet)}</span>
                      {emp.societyDeduction > 0 && (
                        <span className="text-emerald-700 font-bold">After Society: ₹{formatMoney(empNetAfterSociety)}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => autoRecalculateEmployee(emp.id)}
                      title={`Auto-calculate DA (${effectiveDaPercent}%) & NPS (10%)`}
                      className="text-xs text-blue-600 hover:bg-blue-50"
                    >
                      <Calculator className="h-3.5 w-3.5 mr-1" /> Auto-Calc ({effectiveDaPercent}%)
                    </Button>
                    {data.employees.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeEmployee(emp.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Identity & Scale Details */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label htmlFor={`emp-${emp.id}-name`} className="text-xs">Employee Name</Label>
                    <Input
                      id={`emp-${emp.id}-name`}
                      value={emp.name}
                      onChange={(e) => updateEmployee(emp.id, 'name', e.target.value)}
                      placeholder="e.g. Shri R.B.Makvana"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`emp-${emp.id}-designation`} className="text-xs">Designation (English)</Label>
                    <Input
                      id={`emp-${emp.id}-designation`}
                      value={emp.designation}
                      onChange={(e) => updateEmployee(emp.id, 'designation', e.target.value)}
                      placeholder="e.g. Research Assistant"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`emp-${emp.id}-designationGu`} className="text-xs">Designation (Gujarati)</Label>
                    <Input
                      id={`emp-${emp.id}-designationGu`}
                      value={emp.designationGujarati || ''}
                      onChange={(e) => updateEmployee(emp.id, 'designationGujarati', e.target.value)}
                      placeholder="e.g. સંશોધન મદદનીશ"
                      className="font-serif"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`emp-${emp.id}-cadre`} className="text-xs">Cadre Class</Label>
                    <Input
                      id={`emp-${emp.id}-cadre`}
                      value={emp.cadreClass || '3'}
                      onChange={(e) => updateEmployee(emp.id, 'cadreClass', e.target.value)}
                      placeholder="e.g. 3"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`emp-${emp.id}-payScale`} className="text-xs">Pay Scale / Pay Band</Label>
                    <Input
                      id={`emp-${emp.id}-payScale`}
                      value={emp.payScale}
                      onChange={(e) => updateEmployee(emp.id, 'payScale', e.target.value)}
                      placeholder="e.g. 34,500-1,12,400"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`emp-${emp.id}-gradePay`} className="text-xs">Grade Pay</Label>
                    <Input
                      id={`emp-${emp.id}-gradePay`}
                      value={emp.gradePay}
                      onChange={(e) => updateEmployee(emp.id, 'gradePay', e.target.value)}
                      placeholder="e.g. GP:4200"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`emp-${emp.id}-payLevel`} className="text-xs">Pay Level / Cell</Label>
                    <Input
                      id={`emp-${emp.id}-payLevel`}
                      value={emp.payLevelCell}
                      onChange={(e) => updateEmployee(emp.id, 'payLevelCell', e.target.value)}
                      placeholder="e.g. PAY=39900 (LEVEL CELL-7)"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`emp-${emp.id}-ppa`} className="text-xs">PPA No.</Label>
                    <Input
                      id={`emp-${emp.id}-ppa`}
                      value={emp.ppaNo}
                      onChange={(e) => updateEmployee(emp.id, 'ppaNo', e.target.value)}
                      placeholder="e.g. Applied"
                    />
                  </div>
                </div>

                {/* Quarters & Insurance Group */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <Label htmlFor={`emp-${emp.id}-quarter`} className="text-xs">Govt Quarters &amp; Residential Address (for Rent Schedule P5)</Label>
                    <Input
                      id={`emp-${emp.id}-quarter`}
                      value={emp.quarterAddress}
                      onChange={(e) => updateEmployee(emp.id, 'quarterAddress', e.target.value)}
                      placeholder="e.g. H-7, Government Quarters, Khatodara, Nr. Sub Jail, Surat"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`emp-${emp.id}-gisGroup`} className="text-xs">GIS Group (ક / ખ / ગ / ઘ)</Label>
                    <Input
                      id={`emp-${emp.id}-gisGroup`}
                      value={emp.insuranceGroup}
                      onChange={(e) => updateEmployee(emp.id, 'insuranceGroup', e.target.value)}
                      className="font-serif"
                      placeholder="e.g. ખ"
                    />
                  </div>
                </div>

                {/* Earnings & Allowances */}
                <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 border-l-4 border-l-emerald-600 shadow-2xs space-y-2">
                  <div className="text-xs font-bold uppercase text-emerald-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-emerald-600" /> Earnings &amp; Allowances (₹)
                    </span>
                    <span className="font-mono text-emerald-700 font-bold">Total: ₹{formatMoney(empEarnings)}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Pay of Establishment (0102)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.payOfEstablishment || 0}
                        onChange={(e) => updateEmployee(emp.id, 'payOfEstablishment', parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold bg-white"
                      />
                      {(() => {
                        const res = emp.masterId ? payResolutions[emp.masterId] : undefined;
                        if (!res) return null;
                        if (res.prorated && res.split.length > 0) {
                          return (
                            <p className="text-[10px] text-indigo-700 mt-1 flex items-start gap-1">
                              <History className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>
                                Pay Matrix: blended ₹{res.basicPay.toLocaleString('en-IN')} for {formatDate(monthStartFromKey(data.monthOf) ?? '')} — {res.split.map((s) => `${s.basicPay.toLocaleString('en-IN')}×${s.days}d`).join(' + ')}
                              </span>
                            </p>
                          );
                        }
                        if (res.entry) {
                          return (
                            <p className="text-[10px] text-indigo-700 mt-1 flex items-start gap-1">
                              <History className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>
                                Pay Matrix: ₹{res.entry.basicPay.toLocaleString('en-IN')} since {formatDate(res.entry.startDate)}
                              </span>
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Pay of Officer (0101)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.payOfOfficer || 0}
                        onChange={(e) => updateEmployee(emp.id, 'payOfOfficer', parseFloat(e.target.value) || 0)}
                        className="font-mono bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-emerald-800">Dearness Allowance (0103) — {effectiveDaPercent}%</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.da || 0}
                        onChange={(e) => updateEmployee(emp.id, 'da', parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">C.L.A. / Other (0111)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.cla || 0}
                        onChange={(e) => updateEmployee(emp.id, 'cla', parseFloat(e.target.value) || 0)}
                        className="font-mono bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Medical Allowance (0107)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.medicalAllowance || 0}
                        onChange={(e) => updateEmployee(emp.id, 'medicalAllowance', parseFloat(e.target.value) || 0)}
                        className="font-mono bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Transport Allowance (0113)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.transportAllowance || 0}
                        onChange={(e) => updateEmployee(emp.id, 'transportAllowance', parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Schedule Deductions - Core (P4 col 22,24,26,27,35,39) */}
                <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-200 border-l-4 border-l-rose-500 shadow-2xs space-y-2">
                  <div className="text-xs font-bold uppercase text-rose-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <TrendingDown className="h-4 w-4 text-rose-600" /> Schedule Deductions (₹) — Core
                    </span>
                    <span className="font-mono text-rose-700 font-bold">Total: ₹{formatMoney(empDeductions)}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div>
                      <Label className="text-xs font-bold text-rose-900">NPS Pension (9534)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.npsPension || 0}
                        onChange={(e) => updateEmployee(emp.id, 'npsPension', parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Rent of Building (9550)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.rentOfBuilding || 0}
                        onChange={(e) => updateEmployee(emp.id, 'rentOfBuilding', parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Professional Tax (9570)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.professionalTax || 0}
                        onChange={(e) => updateEmployee(emp.id, 'professionalTax', parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">GIS Ins. Fund (9581)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.gis1981Insurance || 0}
                        onChange={(e) => updateEmployee(emp.id, 'gis1981Insurance', parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">GIS Sav. Fund (9582)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.gis1981Savings || 0}
                        onChange={(e) => updateEmployee(emp.id, 'gis1981Savings', parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-sky-800">ICDP Credit Society</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.societyDeduction || 0}
                        onChange={(e) => updateEmployee(emp.id, 'societyDeduction', parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Advanced Earnings & Recoveries (P3 cols 5-7,10-14,16-18,21 Hidden) */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setAdvancedEarningsOpen((prev) => ({ ...prev, [emp.id]: !prev[emp.id] }))}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                      <Columns className="h-3.5 w-3.5 text-slate-500" /> Advanced Earnings &amp; Recoveries (P3 — NPPA, HRA, Bonus, ROP, DP, Recov.)
                    </span>
                    <span className="flex items-center gap-2 text-xs text-slate-500">
                      {(emp.nppa || emp.hra || emp.bonus || emp.ropArrearsGaz || emp.housingFund || emp.recovFestivalAdv) ? <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-mono text-[10px] font-bold">has values</span> : null}
                      <ChevronDown className={`h-4 w-4 transition-transform ${advancedEarningsOpen[emp.id] ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                  {advancedEarningsOpen[emp.id] && (
                    <div className="p-3.5 space-y-3">
                      <div className="text-[11px] font-semibold text-slate-500">These map to P3 columns 5-7, 10-14, 16-18 and P1 Outer BCode 0101-0120. Leave 0 if not applicable.</div>
                      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        <div><Label className="text-xs">NPPA (0128) — Col 5</Label><Input type="number" value={emp.nppa || 0} onChange={(e) => updateEmployee(emp.id, 'nppa', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Deerness Pay (0120) — Col 7</Label><Input type="number" value={emp.dearnessPay || 0} onChange={(e) => updateEmployee(emp.id, 'dearnessPay', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">HRA (0110) — Col 9</Label><Input type="number" value={emp.hra || 0} onChange={(e) => updateEmployee(emp.id, 'hra', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Other Allowance (0104) — Col 10</Label><Input type="number" value={emp.otherAllowance || 0} onChange={(e) => updateEmployee(emp.id, 'otherAllowance', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Bonus (0108) — Col 11</Label><Input type="number" value={emp.bonus || 0} onChange={(e) => updateEmployee(emp.id, 'bonus', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">PTA (1101) — Col 12</Label><Input type="number" value={emp.pta || 0} onChange={(e) => updateEmployee(emp.id, 'pta', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Prof & Spl Service (2801) — Col 12</Label><Input type="number" value={emp.profSplService || 0} onChange={(e) => updateEmployee(emp.id, 'profSplService', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Washing Allowance (1301) — Col 13</Label><Input type="number" value={emp.washingAllowance || 0} onChange={(e) => updateEmployee(emp.id, 'washingAllowance', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Office Expense (5006) — Col 13</Label><Input type="number" value={emp.officeExpenseOther || 0} onChange={(e) => updateEmployee(emp.id, 'officeExpenseOther', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">CA — Col 14</Label><Input type="number" value={emp.ca || 0} onChange={(e) => updateEmployee(emp.id, 'ca', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">ROP Arrears Gaz (0117) — Col 16+</Label><Input type="number" value={emp.ropArrearsGaz || 0} onChange={(e) => updateEmployee(emp.id, 'ropArrearsGaz', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">ROP Arrears Non-Gaz (0118)</Label><Input type="number" value={emp.ropArrearsNonGaz || 0} onChange={(e) => updateEmployee(emp.id, 'ropArrearsNonGaz', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">DP Gaz (0119)</Label><Input type="number" value={emp.dpGaz || 0} onChange={(e) => updateEmployee(emp.id, 'dpGaz', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">DP Non-Gaz (0120)</Label><Input type="number" value={emp.dpNonGaz || 0} onChange={(e) => updateEmployee(emp.id, 'dpNonGaz', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Leave Salary (0102)</Label><Input type="number" value={emp.leaveSalary || 0} onChange={(e) => updateEmployee(emp.id, 'leaveSalary', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Leave Encashment (0109) — Col 6</Label><Input type="number" value={emp.leaveEncashment || 0} onChange={(e) => updateEmployee(emp.id, 'leaveEncashment', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-4 pt-2 border-t border-slate-100">
                        <div><Label className="text-xs text-amber-800 font-semibold">Recov Festival Adv (5701) — Col 17</Label><Input type="number" value={emp.recovFestivalAdv || 0} onChange={(e) => updateEmployee(emp.id, 'recovFestivalAdv', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-amber-50 border-amber-200" /></div>
                        <div><Label className="text-xs text-amber-800 font-semibold">Recov Food Grain Adv (5801) — Col 18</Label><Input type="number" value={emp.recovFoodGrainAdv || 0} onChange={(e) => updateEmployee(emp.id, 'recovFoodGrainAdv', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-amber-50 border-amber-200" /></div>
                        <div><Label className="text-xs text-amber-800 font-semibold">Recov Pay (0101-)</Label><Input type="number" value={emp.recovPay || 0} onChange={(e) => updateEmployee(emp.id, 'recovPay', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-amber-50 border-amber-200" /></div>
                        <div><Label className="text-xs text-amber-800 font-semibold">Leave Salary Adv</Label><Input type="number" value={emp.leaveSalaryAdv || 0} onChange={(e) => updateEmployee(emp.id, 'leaveSalaryAdv', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-amber-50 border-amber-200" /></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Advanced Deductions (P4 cols 21,23,25,28-34) — hidden Govt deductions */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setAdvancedDeductionsOpen((prev) => ({ ...prev, [emp.id]: !prev[emp.id] }))}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                      <TrendingDown className="h-3.5 w-3.5 text-slate-500" /> Advanced Deductions — Govt Codes 9510-9910 (P4 Col 21,23,25,28-34)
                    </span>
                    <span className="flex items-center gap-2 text-xs text-slate-500">
                      {(emp.incomeTax || emp.postalLifeInsurance || emp.gis1979Insurance || emp.hba || emp.motorCarAdv) ? <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-mono text-[10px] font-bold">has values</span> : null}
                      <ChevronDown className={`h-4 w-4 transition-transform ${advancedDeductionsOpen[emp.id] ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                  {advancedDeductionsOpen[emp.id] && (
                    <div className="p-3.5 space-y-3">
                      <div className="text-[11px] font-semibold text-slate-500">Maps to P4 columns 21-34 and P1 Outer Deductions A/B. These reduce Net Payable (col 37). Leave 0 if not applicable.</div>
                      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        <div><Label className="text-xs">Income Tax (9510) — Col 21</Label><Input type="number" value={emp.incomeTax || 0} onChange={(e) => updateEmployee(emp.id, 'incomeTax', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Surcharge IT (9520) — Col 21</Label><Input type="number" value={emp.surchargeIT || 0} onChange={(e) => updateEmployee(emp.id, 'surchargeIT', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Housing Fund (9590) — Col 21</Label><Input type="number" value={emp.housingFund || 0} onChange={(e) => updateEmployee(emp.id, 'housingFund', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Police Housing (9560) — Col 22</Label><Input type="number" value={emp.policeHousing || 0} onChange={(e) => updateEmployee(emp.id, 'policeHousing', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Postal Life Insurance (9530) — Col 23</Label><Input type="number" value={emp.postalLifeInsurance || 0} onChange={(e) => updateEmployee(emp.id, 'postalLifeInsurance', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">BSI Premium (9540) — Col 23</Label><Input type="number" value={emp.bsiPremium || 0} onChange={(e) => updateEmployee(emp.id, 'bsiPremium', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">GIS 1979 Insurance (9580) — Col 25</Label><Input type="number" value={emp.gis1979Insurance || 0} onChange={(e) => updateEmployee(emp.id, 'gis1979Insurance', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">AIS Insurance (9583) — Col 25*</Label><Input type="number" value={emp.aisInsurance || 0} onChange={(e) => updateEmployee(emp.id, 'aisInsurance', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">AIS Savings (9584)</Label><Input type="number" value={emp.aisSavings || 0} onChange={(e) => updateEmployee(emp.id, 'aisSavings', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Divi Acct Insurance (9585)</Label><Input type="number" value={emp.diviAcctInsurance || 0} onChange={(e) => updateEmployee(emp.id, 'diviAcctInsurance', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Divi Acct Savings (9586)</Label><Input type="number" value={emp.diviAcctSavings || 0} onChange={(e) => updateEmployee(emp.id, 'diviAcctSavings', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">PF Deputation (9587)</Label><Input type="number" value={emp.pfDeputation || 0} onChange={(e) => updateEmployee(emp.id, 'pfDeputation', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Govt Housing Fund (9590*)</Label><Input type="number" value={emp.govtHousingFund || 0} onChange={(e) => updateEmployee(emp.id, 'govtHousingFund', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">HBA Principal/Interest (9591) — Col 32</Label><Input type="number" value={emp.hba || 0} onChange={(e) => updateEmployee(emp.id, 'hba', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Motor Car Adv (9592) — Col 31</Label><Input type="number" value={emp.motorCarAdv || 0} onChange={(e) => updateEmployee(emp.id, 'motorCarAdv', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Security Deposit (9600)</Label><Input type="number" value={emp.securityDeposit || 0} onChange={(e) => updateEmployee(emp.id, 'securityDeposit', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">IAS PF (9620) — Col 28</Label><Input type="number" value={emp.iasProvidentFund || 0} onChange={(e) => updateEmployee(emp.id, 'iasProvidentFund', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">GPF Other Class4 (9670) — Col 28</Label><Input type="number" value={emp.gpfOtherThanClass4 || 0} onChange={(e) => updateEmployee(emp.id, 'gpfOtherThanClass4', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">GPF Divi Acct (9680)</Label><Input type="number" value={emp.gpfDiviAcct || 0} onChange={(e) => updateEmployee(emp.id, 'gpfDiviAcct', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Contributory PF (9690)</Label><Input type="number" value={emp.contributoryPF || 0} onChange={(e) => updateEmployee(emp.id, 'contributoryPF', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">GPF Work Charged (9532)</Label><Input type="number" value={emp.gpfWorkCharged || 0} onChange={(e) => updateEmployee(emp.id, 'gpfWorkCharged', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">GPF Rojamdar (9533)</Label><Input type="number" value={emp.gpfRojamdar || 0} onChange={(e) => updateEmployee(emp.id, 'gpfRojamdar', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Festival Advance (5701) — Col 29</Label><Input type="number" value={emp.festivalAdv || 0} onChange={(e) => updateEmployee(emp.id, 'festivalAdv', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Food Grain Advance (5801) — Col 30</Label><Input type="number" value={emp.foodGrainAdv || 0} onChange={(e) => updateEmployee(emp.id, 'foodGrainAdv', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Fan Advance (9720) — Col 33</Label><Input type="number" value={emp.fanAdv || 0} onChange={(e) => updateEmployee(emp.id, 'fanAdv', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Other Conveyance Adv (9740)</Label><Input type="number" value={emp.otherConveyanceAdv || 0} onChange={(e) => updateEmployee(emp.id, 'otherConveyanceAdv', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Interest on Adv (9760)</Label><Input type="number" value={emp.interestOnAdv || 0} onChange={(e) => updateEmployee(emp.id, 'interestOnAdv', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Jeep Rent (9780) — Col 34</Label><Input type="number" value={emp.jeepRent || 0} onChange={(e) => updateEmployee(emp.id, 'jeepRent', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">PF Adjustable by AO (9790)</Label><Input type="number" value={emp.pfAdjustableByAO || 0} onChange={(e) => updateEmployee(emp.id, 'pfAdjustableByAO', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Recov Pay/Leave (9770) — Col 34</Label><Input type="number" value={emp.recovPayLeaveSalary || 0} onChange={(e) => updateEmployee(emp.id, 'recovPayLeaveSalary', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Misc Recoveries (9910) — Col 34</Label><Input type="number" value={emp.miscRecoveries || 0} onChange={(e) => updateEmployee(emp.id, 'miscRecoveries', parseFloat(e.target.value) || 0)} className="font-mono h-8 text-xs bg-white" /></div>
                        <div><Label className="text-xs">Remarks</Label><Input value={emp.remarks || ''} onChange={(e) => updateEmployee(emp.id, 'remarks', e.target.value)} className="h-8 text-xs bg-white" placeholder="P5-P8 remarks" /></div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}

          <div className="flex justify-end pt-3">
            <Button onClick={() => setActiveTab('office')}>
              Next: Office &amp; Treasury Details <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        {/* TAB 2: Office & Treasury */}
        <TabsContent value="office" className="mt-4 space-y-4">
          <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase text-slate-800">Bill &amp; Treasury Metadata</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label className="text-xs">Bill Register No.</Label>
                <Input value={data.billRegisterNo} onChange={(e) => setField('billRegisterNo', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Bill Date</Label>
                <Input value={data.billDate} onChange={(e) => setField('billDate', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">For the Month of</Label>
                <Input value={data.monthOf} onChange={(e) => setField('monthOf', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Bill Code</Label>
                <select
                  value={data.billCode}
                  onChange={(e) => setField('billCode', e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 px-2 text-sm"
                >
                  <option value="">Select Bill Code</option>
                  {billCodeOptions.map((opt) => (
                    <option key={opt.id} value={opt.billCode}>
                      {opt.billCode} - {opt.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Station / District</Label>
                <Input value={data.station} onChange={(e) => setField('station', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">District Code</Label>
                <Input value={data.district} onChange={(e) => setField('district', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Branch Name (Establishment)</Label>
                <Input value={data.branchName} onChange={(e) => setField('branchName', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Office Name (Short)</Label>
                <Input value={data.officeName} onChange={(e) => setField('officeName', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Office Full Name</Label>
                <Input value={data.officeFullName} onChange={(e) => setField('officeFullName', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Treasury Name</Label>
                <Input value={data.treasuryName} onChange={(e) => setField('treasuryName', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Office Telephone</Label>
                <Input value={data.phoneNo} onChange={(e) => setField('phoneNo', e.target.value)} />
              </div>
            </div>
          </Card>

          <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase text-slate-800">Budget Classification &amp; Heads</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label className="text-xs">Class of Expenditure</Label>
                <Input value={data.classOfExpenditure} onChange={(e) => setField('classOfExpenditure', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Fund</Label>
                <Input value={data.fund} onChange={(e) => setField('fund', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Drawing Officer Code</Label>
                <Input value={data.drawingOfficer} onChange={(e) => setField('drawingOfficer', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Demand No.</Label>
                <Input value={data.demandNo} onChange={(e) => setField('demandNo', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Type of Budget</Label>
                <Input value={data.typeOfBudget} onChange={(e) => setField('typeOfBudget', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Scheme No.</Label>
                <Input value={data.schemeNo} onChange={(e) => setField('schemeNo', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Head Chargeable (13 Digits)</Label>
                <Input value={data.headChargeable} onChange={(e) => setField('headChargeable', e.target.value)} className="font-mono" />
              </div>
              <div>
                <Label className="text-xs">Sector</Label>
                <Input value={data.sector} onChange={(e) => setField('sector', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Major Head</Label>
                <Input value={data.majorHead} onChange={(e) => setField('majorHead', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Minor Head</Label>
                <Input value={data.minorHead} onChange={(e) => setField('minorHead', e.target.value)} />
              </div>
              <div className="sm:col-span-3">
                <Label className="text-xs">Sub Head</Label>
                <Input value={data.subHead} onChange={(e) => setField('subHead', e.target.value)} />
              </div>
            </div>
          </Card>

          <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase text-slate-800">Drawing Officer &amp; Messenger</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label className="text-xs">Drawing Officer Name (English)</Label>
                <Input value={data.drawingOfficerName} onChange={(e) => setField('drawingOfficerName', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Drawing Officer Name (Gujarati)</Label>
                <Input value={data.drawingOfficerNameGujarati} onChange={(e) => setField('drawingOfficerNameGujarati', e.target.value)} className="font-serif" />
              </div>
              <div>
                <Label className="text-xs">Designation (English)</Label>
                <Input value={data.drawingOfficerDesignation} onChange={(e) => setField('drawingOfficerDesignation', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Designation (Gujarati)</Label>
                <Input value={data.drawingOfficerDesignationGujarati} onChange={(e) => setField('drawingOfficerDesignationGujarati', e.target.value)} className="font-serif" />
              </div>
              <div>
                <Label className="text-xs">Cardex No.</Label>
                <Input value={data.cardexNo} onChange={(e) => setField('cardexNo', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">DDO Code No.</Label>
                <Input value={data.ddoCode} onChange={(e) => setField('ddoCode', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Authorised Messenger Name</Label>
                <Input value={data.messengerName} onChange={(e) => setField('messengerName', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Messenger Designation</Label>
                <Input value={data.messengerDesignation} onChange={(e) => setField('messengerDesignation', e.target.value)} />
              </div>
            </div>
          </Card>

          <div className="flex justify-between pt-3">
            <Button variant="outline" onClick={() => setActiveTab('employees')}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to Employees
            </Button>
            <Button onClick={() => setActiveTab('establishment')}>
              Next: Establishment Posts &amp; Resolutions <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        {/* TAB 3: Establishment & Schemes */}
        <TabsContent value="establishment" className="mt-4 space-y-4">
          <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase text-slate-800">
                  Establishment Information Posts (મહેકમની માહિતી · Page 9)
                </h2>
                <p className="text-xs text-slate-500">
                  Sanctioned and occupied posts listed on Page 9 of the bill.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={addPost}>
                <Plus className="mr-1 h-4 w-4" /> Add Post
              </Button>
            </div>

            <div className="space-y-3">
              {data.establishmentPosts.map((post) => (
                <div key={post.id} className="grid gap-2 sm:grid-cols-7 items-center bg-slate-50 p-3 rounded-lg border">
                  <div>
                    <Label className="text-xs">Sr.</Label>
                    <Input
                      value={post.srNo}
                      onChange={(e) => updatePost(post.id, 'srNo', e.target.value)}
                      className="font-serif"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Designation / Post</Label>
                    <Input
                      value={post.designation}
                      onChange={(e) => updatePost(post.id, 'designation', e.target.value)}
                      placeholder="e.g. આંકડા અધિકારી"
                      className="font-serif font-bold"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Class (વર્ગ)</Label>
                    <Input
                      value={post.cadreClass}
                      onChange={(e) => updatePost(post.id, 'cadreClass', e.target.value)}
                      className="font-serif"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Sanctioned (મંજુર)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={post.sanctioned}
                      onChange={(e) => updatePost(post.id, 'sanctioned', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Filled (ભરાયેલ)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={post.filled}
                      onChange={(e) => updatePost(post.id, 'filled', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Vacant (ખાલી)</Label>
                      <Input value={post.vacant} disabled className="bg-slate-100 font-bold" />
                    </div>
                    {data.establishmentPosts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 mt-5"
                        onClick={() => removePost(post.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase text-slate-800">
              Government Resolutions (સરકારી ઠરાવ લખાણ)
            </h2>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Scheme Permanent Sanction Resolution (Page 3 Header Box)</Label>
                <Input
                  value={data.schemeResolutionText}
                  onChange={(e) => setField('schemeResolutionText', e.target.value)}
                  className="font-serif"
                />
              </div>
              <div>
                <Label className="text-xs">7th Pay Commission DA Resolution (Page 10 Point 9)</Label>
                <Input
                  value={data.daResolutionText}
                  onChange={(e) => setField('daResolutionText', e.target.value)}
                  className="font-serif"
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-between pt-3">
            <Button variant="outline" onClick={() => setActiveTab('office')}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to Office
            </Button>
            <Button onClick={() => setActiveTab('preview')}>
              Next: View Full 10-Page Preview <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        {/* TAB 4: Live Preview */}
        <TabsContent value="preview" className="mt-4 space-y-4">
          {crossWarnings.length > 0 && (
            <Card className={`p-3.5 rounded-xl border ${crossWarnings.some((w) => w.severity === 'error') ? 'border-red-200 bg-red-50/70 dark:bg-red-950/30' : 'border-amber-200 bg-amber-50/70 dark:bg-amber-950/30'}`}>
              <div className="text-xs font-bold uppercase flex items-center gap-1.5 mb-2">
                <span className={crossWarnings.some((w) => w.severity === 'error') ? 'text-red-700' : 'text-amber-700'}>
                  {crossWarnings.some((w) => w.severity === 'error') ? 'Blocking issues' : 'Warnings'} — cross-page checks (P1-P10)
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border text-[10px] font-mono">{crossWarnings.length}</span>
              </div>
              <ul className="space-y-1.5">
                {crossWarnings.map((w, i) => (
                  <li key={i} className={`text-xs flex items-start gap-2 ${w.severity === 'error' ? 'text-red-700 dark:text-red-300' : 'text-amber-800 dark:text-amber-200'}`}>
                    <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${w.severity === 'error' ? 'bg-red-100 border-red-200' : 'bg-amber-100 border-amber-200'}`}>{w.page}</span>
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
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
              Auto-syncing
            </span>
          </div>
          <div className="transform scale-[0.62] origin-top-left -mr-[60%]">
            <GTR30Document data={data} containerId="gtr30-create-split-preview" showControls={false} />
          </div>
        </div>
      )}
      </div>

      {/* Floating Bottom Summary Bar */}
      {activeTab !== 'preview' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur text-white border-t border-slate-800 px-4 sm:px-6 py-2.5 shadow-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-6 text-xs overflow-x-auto">
            <div>
              <span className="text-slate-400 mr-1">Staff:</span>
              <strong className="text-white text-xs sm:text-sm">{data.employees.length}</strong>
            </div>
            <div className="hidden sm:block">
              <span className="text-slate-400 mr-1">Gross:</span>
              <strong className="text-white text-sm font-mono">₹{formatMoney(totals.gross)}</strong>
            </div>
            <div className="hidden sm:block">
              <span className="text-slate-400 mr-1">Deductions:</span>
              <strong className="text-rose-400 text-sm font-mono">₹{formatMoney(totals.deductions)}</strong>
            </div>
            <div>
              <span className="text-slate-400 mr-1">Net:</span>
              <strong className="text-emerald-400 text-sm sm:text-base font-bold font-mono">₹{formatMoney(totals.net)}</strong>
            </div>
            {totals.societyTotal > 0 && (
              <div className="hidden md:block">
                <span className="text-slate-400 mr-1">After Society:</span>
                <strong className="text-sky-300 text-sm font-mono">₹{formatMoney(totals.netAfterSociety)}</strong>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setActiveTab('preview')} className="bg-slate-800 text-white hover:bg-slate-700 border-slate-700 h-8 text-xs">
              Preview
            </Button>
            <Button size="sm" onClick={saveBill} className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white px-4 sm:px-5 h-8 text-xs shadow-md shadow-emerald-600/20">
              <Save className="mr-1.5 h-3.5 w-3.5" /> Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
