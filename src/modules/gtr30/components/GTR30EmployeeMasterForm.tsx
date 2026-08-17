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
  payScale: '',
  currentPay: 0,
  currentPayDate: '',
  hraPercent: 0,
  transportAllowance: 0,
  medicalAllowance: 0,
  claAllowance: 0,
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
        payScale: editingEmployee.payScale || '',
        currentPay: editingEmployee.currentPay || 0,
        currentPayDate: editingEmployee.currentPayDate || '',
        hraPercent: editingEmployee.hraPercent || 0,
        transportAllowance: editingEmployee.transportAllowance || 0,
        medicalAllowance: editingEmployee.medicalAllowance || 0,
        claAllowance: editingEmployee.claAllowance || 0,
      });
    }
  }, [editingEmployee, reset]);

  const nameValue = useWatch({ control, name: 'name' });

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
        payScale: emp.payScale || '',
        currentPay: emp.currentPay || 0,
        currentPayDate: emp.currentPayDate || '',
        hraPercent: emp.hraPercent || 0,
        transportAllowance: emp.transportAllowance || 0,
        medicalAllowance: emp.medicalAllowance || 0,
        claAllowance: emp.claAllowance || 0,
      });
      onCancelEdit();
      setSubmitStatus({ type: 'success', message: 'Employee found. Update their details below.' });
    } else {
      reset({
        ...EMPTY_VALUES,
        name: option.name,
        hrpnNo: option.hrpnNo,
        designation: option.designation || '',
        payScale: option.payScale || '',
      });
      setSubmitStatus({ type: 'success', message: 'Prefilled from employee directory. Enter salary details.' });
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="relative" ref={dropdownRef}>
          <Label htmlFor="name" className="text-xs">
            Employee Name <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              id="name"
              {...register('name')}
              className="pl-8"
              placeholder="e.g. Shri R.B.Makvana"
              autoComplete="off"
              onChange={(e) => {
                setIsDropdownDismissed(false);
                void setValue('name', e.target.value);
              }}
            />
          </div>
          {errors.name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.name.message}</p>}
          {showDropdown && (
            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-56 overflow-y-auto">
              {searchResults.map((option) => (
                <button
                  key={`${option.kind}-${option.id}`}
                  type="button"
                  onClick={() => selectOption(option)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors flex items-center justify-between gap-2"
                >
                  <span className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">
                    {option.name}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {option.hrpnNo && (
                      <span className="text-slate-500 dark:text-slate-400 font-mono text-xs">{option.hrpnNo}</span>
                    )}
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        option.kind === 'master'
                          ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                          : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                      }`}
                    >
                      {option.kind === 'master' ? 'Master' : 'Directory'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="hrpnNo" className="text-xs">
            HRPN No.
          </Label>
          <Input
            id="hrpnNo"
            {...register('hrpnNo')}
            className="font-mono uppercase text-sm"
            placeholder="e.g. 100123"
            maxLength={50}
            onChange={(e) => {
              void setValue('hrpnNo', e.target.value.toUpperCase());
            }}
          />
          {errors.hrpnNo && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.hrpnNo.message}</p>}
        </div>

        <div>
          <Label htmlFor="designation" className="text-xs">
            Designation
          </Label>
          <Input
            id="designation"
            {...register('designation')}
            className="text-sm"
            placeholder="e.g. Research Assistant"
          />
          {errors.designation && (
            <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.designation.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="payScale" className="text-xs">
            Pay Scale
          </Label>
          <Input
            id="payScale"
            {...register('payScale')}
            className="text-sm"
            placeholder="e.g. 34,500-1,12,400"
          />
          {errors.payScale && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.payScale.message}</p>}
        </div>

        <div>
          <Label htmlFor="currentPay" className="text-xs">
            Current Pay (₹)
          </Label>
          <Input
            id="currentPay"
            type="number"
            step="any"
            {...register('currentPay')}
            className="font-mono text-sm"
            placeholder="0"
          />
          {errors.currentPay && (
            <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.currentPay.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="currentPayDate" className="text-xs">
            Pay Date
          </Label>
          <Input id="currentPayDate" type="date" {...register('currentPayDate')} className="text-sm" />
          {errors.currentPayDate && (
            <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.currentPayDate.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="hraPercent" className="text-xs">
            HRA %
          </Label>
          <Input
            id="hraPercent"
            type="number"
            step="any"
            {...register('hraPercent')}
            className="font-mono text-sm"
            placeholder="e.g. 24"
          />
          {errors.hraPercent && (
            <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.hraPercent.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="transportAllowance" className="text-xs">
            Transport (₹)
          </Label>
          <Input
            id="transportAllowance"
            type="number"
            step="any"
            {...register('transportAllowance')}
            className="font-mono text-sm"
            placeholder="0"
          />
          {errors.transportAllowance && (
            <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.transportAllowance.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="medicalAllowance" className="text-xs">
            Medical (₹)
          </Label>
          <Input
            id="medicalAllowance"
            type="number"
            step="any"
            {...register('medicalAllowance')}
            className="font-mono text-sm"
            placeholder="0"
          />
          {errors.medicalAllowance && (
            <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.medicalAllowance.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="claAllowance" className="text-xs">
            CLA (₹)
          </Label>
          <Input
            id="claAllowance"
            type="number"
            step="any"
            {...register('claAllowance')}
            className="font-mono text-sm"
            placeholder="0"
          />
          {errors.claAllowance && (
            <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.claAllowance.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting} size="sm">
          {isSubmitting ? (
            <>
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              Saving...
            </>
          ) : editingEmployee ? (
            <>
              <Save className="h-4 w-4 mr-1" />
              Update Employee
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-1" />
              Add Employee
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
