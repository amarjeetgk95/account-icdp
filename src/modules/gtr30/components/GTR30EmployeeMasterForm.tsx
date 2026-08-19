import { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Save, X, UserPlus, RefreshCw, Search } from 'lucide-react';
import {
  gtr30EmployeeMasterSchema,
  type GTR30EmployeeMasterInput,
} from '../validation/gtr30EmployeeMaster.schema';
import { useSaveGTR30Employee } from '../hooks/useGTR30EmployeeMaster';
import { useEmployees } from '@/modules/payroll/hooks/useEmployees';
import type { GTR30EmployeeMaster } from '../types';

const EMPTY_VALUES: GTR30EmployeeMasterInput = {
  id: '',
  srNo: 0,
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
  quarterAddress: 'H-7, Government Quarters, Khatodara, Nr. Sub Jail, Surat',
  insuranceGroup: 'ખ',
  insuranceType: 'savings_and_insurance',
  hraPercent: 0,
  da: 0,
  transportAllowance: 3600,
  medicalAllowance: 1000,
  claAllowance: 270,
  rentOfBuilding: 300,
  professionalTax: 200,
  gis1981Insurance: 240,
  gis1981Savings: 560,
  npsPension: 6105,
  societyDeduction: 4154,
  remarks: '',
};

type FormValues = z.input<typeof gtr30EmployeeMasterSchema>;

interface GTR30EmployeeMasterFormProps {
  monthKey: string;
  billCode: string;
  employees: GTR30EmployeeMaster[];
  editingEmployee: GTR30EmployeeMaster | null;
  onCancelEdit: () => void;
  onSaved?: () => void;
}

interface SearchOption {
  kind: 'master' | 'payroll';
  id: string;
  name: string;
  hrpnNo: string;
  designation?: string;
  payScale?: string;
  employee?: GTR30EmployeeMaster;
}

export function GTR30EmployeeMasterForm({
  monthKey,
  billCode,
  employees,
  editingEmployee,
  onCancelEdit,
  onSaved,
}: GTR30EmployeeMasterFormProps) {
  const { toast } = useToast();
  const saveMutation = useSaveGTR30Employee();
  const { employees: payrollEmployees } = useEmployees();
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDropdownDismissed, setIsDropdownDismissed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, GTR30EmployeeMasterInput>({
    resolver: zodResolver(gtr30EmployeeMasterSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (editingEmployee) {
      reset({
        id: editingEmployee.id,
        srNo: editingEmployee.srNo,
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
    }
  }, [editingEmployee, reset]);

  const nameValue = useWatch({ control, name: 'name' });

  // Auto-calculate DA (53%) and NPS (10%) when current pay changes
  const handlePayChange = (payStr: string) => {
    const pay = parseFloat(payStr) || 0;
    setValue('currentPay', pay);
    if (pay > 0) {
      const calcDA = Math.round(pay * 0.53);
      const calcNPS = Math.round((pay + calcDA) * 0.1);
      setValue('da', calcDA);
      setValue('npsPension', calcNPS);
      setValue('payLevelCell', `PAY=${pay} (LEVEL CELL-7)`);
    }
  };

  const searchResults = useMemo<SearchOption[]>(() => {
    if (!nameValue || nameValue.trim().length < 1) return [];
    const q = nameValue.trim().toLowerCase();
    const masterMatches: SearchOption[] = employees
      .filter(
        (emp) =>
          emp.id !== editingEmployee?.id &&
          (emp.name.toLowerCase().includes(q) || (emp.hrpnNo ?? '').toLowerCase().includes(q))
      )
      .slice(0, 4)
      .map((emp) => ({
        kind: 'master',
        id: emp.id,
        name: emp.name,
        hrpnNo: emp.hrpnNo || '',
        designation: emp.designation,
        payScale: emp.payScale,
        employee: emp,
      }));
    const payrollMatches: SearchOption[] = payrollEmployees
      .filter(
        (emp) =>
          emp.name.toLowerCase().includes(q) || (emp.hprn_no ?? '').toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((emp) => ({
        kind: 'payroll',
        id: emp.hprn_no || emp.id.toString(),
        name: emp.name,
        hrpnNo: emp.hprn_no || '',
        designation: emp.designation || '',
        payScale: emp.pay_scale || '',
      }));
    return [...masterMatches, ...payrollMatches];
  }, [nameValue, employees, payrollEmployees, editingEmployee?.id]);

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
    if (option.kind === 'master' && option.employee) {
      const emp = option.employee;
      reset({
        id: emp.id,
        srNo: emp.srNo,
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
      onCancelEdit();
      setSubmitStatus({ type: 'success', message: 'Employee found. Update details below.' });
    } else {
      reset({
        ...EMPTY_VALUES,
        name: option.name,
        hrpnNo: option.hrpnNo,
        designation: option.designation || '',
        payScale: option.payScale || '',
      });
      setSubmitStatus({ type: 'success', message: 'Prefilled from employee directory.' });
    }
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
      await saveMutation.mutateAsync({ monthKey, billCode, employee });
      toast({
        title: editingEmployee ? 'Employee Updated' : 'Employee Added',
        description: `${employee.name} saved for ${monthKey} / ${billCode}.`,
      });
      reset(EMPTY_VALUES);
      onCancelEdit();
      setSubmitStatus(null);
      onSaved?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save employee';
      setSubmitStatus({ type: 'error', message });
      toast({ title: 'Save Failed', description: message, variant: 'destructive' });
    }
  };

  const handleClear = () => {
    reset(EMPTY_VALUES);
    onCancelEdit();
    setSubmitStatus(null);
    setIsDropdownDismissed(true);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {submitStatus && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${
            submitStatus.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
          }`}
        >
          {submitStatus.message}
        </div>
      )}

      {/* 1. Identification & Designation */}
      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
          1. Identification &amp; Designation
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative" ref={dropdownRef}>
            <Label htmlFor="name" className="text-xs">
              Employee Name <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="name"
                {...register('name')}
                className="pl-8 text-sm font-semibold"
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
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                {searchResults.map((option) => (
                  <button
                    key={`${option.kind}-${option.id}`}
                    type="button"
                    onClick={() => selectOption(option)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors flex items-center justify-between gap-2"
                  >
                    <span className="font-medium text-sm text-slate-800 truncate">{option.name}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      {option.hrpnNo && <span className="text-slate-500 font-mono text-xs">{option.hrpnNo}</span>}
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                        {option.kind === 'master' ? 'Master' : 'Directory'}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="hrpnNo" className="text-xs">HRPN No.</Label>
            <Input
              id="hrpnNo"
              {...register('hrpnNo')}
              className="font-mono uppercase text-sm"
              placeholder="e.g. 100123"
              maxLength={50}
            />
            {errors.hrpnNo && <p className="text-red-500 text-xs mt-1">{errors.hrpnNo.message}</p>}
          </div>

          <div>
            <Label htmlFor="designation" className="text-xs">Designation</Label>
            <Input
              id="designation"
              {...register('designation')}
              className="text-sm"
              placeholder="e.g. Research Assistant"
            />
          </div>

          <div>
            <Label htmlFor="designationGujarati" className="text-xs">Designation (Gujarati)</Label>
            <Input
              id="designationGujarati"
              {...register('designationGujarati')}
              className="text-sm font-serif"
              placeholder="e.g. સંશોધન મદદનીશ"
            />
          </div>
        </div>
      </div>

      {/* 2. 7th Pay Commission Scale & Basic Pay */}
      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
          2. 7th Pay Matrix &amp; Basic Salary
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <Label htmlFor="currentPay" className="text-xs font-bold text-blue-700">
              Current Pay (₹)
            </Label>
            <Input
              id="currentPay"
              type="number"
              step="any"
              {...register('currentPay')}
              onChange={(e) => handlePayChange(e.target.value)}
              className="font-mono text-sm font-bold border-blue-300 bg-white"
              placeholder="39900"
            />
            {errors.currentPay && <p className="text-red-500 text-xs mt-1">{errors.currentPay.message}</p>}
          </div>

          <div>
            <Label htmlFor="currentPayDate" className="text-xs">Pay Increment Date</Label>
            <Input id="currentPayDate" type="date" {...register('currentPayDate')} className="text-sm" />
            {errors.currentPayDate && <p className="text-red-500 text-xs mt-1">{errors.currentPayDate.message}</p>}
          </div>

          <div>
            <Label htmlFor="payScale" className="text-xs">Pay Scale</Label>
            <Input id="payScale" {...register('payScale')} className="text-sm" placeholder="e.g. 34,500-1,12,400" />
          </div>

          <div>
            <Label htmlFor="gradePay" className="text-xs">Grade Pay</Label>
            <Input id="gradePay" {...register('gradePay')} className="text-sm" placeholder="e.g. GP:4200" />
          </div>

          <div>
            <Label htmlFor="payLevelCell" className="text-xs">Pay Level / Cell</Label>
            <Input id="payLevelCell" {...register('payLevelCell')} className="text-sm" placeholder="PAY=39900 (LEVEL CELL-7)" />
          </div>
        </div>
      </div>

      {/* 3. Allowances */}
      <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200 space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-emerald-900">
          3. Monthly Allowances (₹)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <Label htmlFor="da" className="text-xs font-semibold text-emerald-800">Dearness Allowance (53%)</Label>
            <Input id="da" type="number" step="any" {...register('da')} className="font-mono text-sm" placeholder="21147" />
          </div>

          <div>
            <Label htmlFor="transportAllowance" className="text-xs">Transport (₹)</Label>
            <Input id="transportAllowance" type="number" step="any" {...register('transportAllowance')} className="font-mono text-sm" placeholder="3600" />
          </div>

          <div>
            <Label htmlFor="medicalAllowance" className="text-xs">Medical (₹)</Label>
            <Input id="medicalAllowance" type="number" step="any" {...register('medicalAllowance')} className="font-mono text-sm" placeholder="1000" />
          </div>

          <div>
            <Label htmlFor="claAllowance" className="text-xs">CLA (₹)</Label>
            <Input id="claAllowance" type="number" step="any" {...register('claAllowance')} className="font-mono text-sm" placeholder="270" />
          </div>

          <div>
            <Label htmlFor="hraPercent" className="text-xs">HRA %</Label>
            <Input id="hraPercent" type="number" step="any" {...register('hraPercent')} className="font-mono text-sm" placeholder="0" />
          </div>
        </div>
      </div>

      {/* 4. Deductions, Quarters & Group Insurance */}
      <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200 space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-amber-900">
          4. Schedule Deductions &amp; Quarters (₹)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Label htmlFor="npsPension" className="text-xs font-semibold text-amber-900">NPS Pension (9534 - 10%)</Label>
            <Input id="npsPension" type="number" step="any" {...register('npsPension')} className="font-mono text-sm" placeholder="6105" />
          </div>

          <div>
            <Label htmlFor="rentOfBuilding" className="text-xs">Rent of Building (9550)</Label>
            <Input id="rentOfBuilding" type="number" step="any" {...register('rentOfBuilding')} className="font-mono text-sm" placeholder="300" />
          </div>

          <div>
            <Label htmlFor="professionalTax" className="text-xs">Professional Tax (9570)</Label>
            <Input id="professionalTax" type="number" step="any" {...register('professionalTax')} className="font-mono text-sm" placeholder="200" />
          </div>

          <div>
            <Label htmlFor="societyDeduction" className="text-xs">ICDP Credit Society</Label>
            <Input id="societyDeduction" type="number" step="any" {...register('societyDeduction')} className="font-mono text-sm" placeholder="4154" />
          </div>

          <div>
            <Label htmlFor="gis1981Insurance" className="text-xs">GIS Ins. Fund (9581)</Label>
            <Input id="gis1981Insurance" type="number" step="any" {...register('gis1981Insurance')} className="font-mono text-sm" placeholder="240" />
          </div>

          <div>
            <Label htmlFor="gis1981Savings" className="text-xs">GIS Sav. Fund (9582)</Label>
            <Input id="gis1981Savings" type="number" step="any" {...register('gis1981Savings')} className="font-mono text-sm" placeholder="560" />
          </div>

          <div>
            <Label htmlFor="insuranceGroup" className="text-xs">GIS Group (ક / ખ / ગ / ઘ)</Label>
            <Input id="insuranceGroup" {...register('insuranceGroup')} className="text-sm font-serif" placeholder="ખ" />
          </div>

          <div>
            <Label htmlFor="ppaNo" className="text-xs">PPA No.</Label>
            <Input id="ppaNo" {...register('ppaNo')} className="text-sm" placeholder="Applied" />
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <Label htmlFor="quarterAddress" className="text-xs">Govt. Quarter Address (Rent Schedule P5)</Label>
            <Input id="quarterAddress" {...register('quarterAddress')} className="text-sm" placeholder="H-7, Government Quarters, Khatodara, Nr. Sub Jail, Surat" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5">
          {isSubmitting ? (
            <>
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              Saving...
            </>
          ) : editingEmployee ? (
            <>
              <Save className="h-4 w-4 mr-1" />
              Update Employee Master
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-1" />
              Add Employee Master
            </>
          )}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleClear}>
          <X className="h-4 w-4 mr-1" />
          Clear / Cancel
        </Button>
      </div>
    </form>
  );
}
