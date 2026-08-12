import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { employeeSchema, type EmployeeInput } from '../validation/employee.schema';
import { useEmployees } from '../hooks/useEmployees';
import { useBudgetHeads } from '../hooks/useBudgetHeads';
import { getActiveEntryMonths } from '../utils/employeeDates';
import { useUIStore } from '@/core/stores/ui-store';
import { MONTHS } from '@/shared/constants';
import { Save, X, UserPlus, RefreshCw } from 'lucide-react';

interface EmployeeFormProps {
  editingEmployee: EmployeeInput | null;
  onCancel: () => void;
  onSelect?: (employee: EmployeeInput) => void;
  fy?: number;
}

export function EmployeeForm({ editingEmployee, onCancel, onSelect, fy }: EmployeeFormProps) {
  const { createAsync, updateAsync } = useEmployees();
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [searchResults, setSearchResults] = useState<EmployeeInput[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeInput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      hprnNo: '',
      name: '',
      pan: '',
      joinDate: '',
      transferDate: '',
      budgetHeadId: '',
    },
  });

  const { employees } = useEmployees();
  const { heads } = useBudgetHeads();
  const nameValue = watch('name');
  const joinDateValue = watch('joinDate');
  const transferDateValue = watch('transferDate');
  const storeFY = useUIStore((state) => state.activeFinancialYear);
  const resolvedFY = fy ?? storeFY;
  const fyLabel = `${resolvedFY}-${String(resolvedFY + 1).slice(-2)}`;

  useEffect(() => {
    if (editingEmployee) {
      reset({
        id: editingEmployee.id,
        hprnNo: editingEmployee.hprnNo || '',
        name: editingEmployee.name,
        pan: editingEmployee.pan,
        joinDate: editingEmployee.joinDate || '',
        transferDate: editingEmployee.transferDate || '',
        budgetHeadId: editingEmployee.budgetHeadId ? String(editingEmployee.budgetHeadId) : '',
      });
    }
  }, [editingEmployee, reset]);

  useEffect(() => {
    if (nameValue && nameValue.length >= 1) {
      const matches = employees
        .filter((emp) => emp.name.toLowerCase().includes(nameValue.toLowerCase()))
        .slice(0, 8)
        .map((emp) => ({
          id: emp.id,
          hprnNo: emp.hprn_no || '',
          name: emp.name,
          pan: emp.pan,
          joinDate: emp.join_date || '',
          transferDate: emp.transfer_date || '',
          budgetHeadId: emp.budget_head_id ? String(emp.budget_head_id) : '',
        }));
      setSearchResults(matches);
      setShowDropdown(matches.length > 0);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [nameValue, employees]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectEmployee = (emp: EmployeeInput) => {
    onSelect?.(emp);
    setShowDropdown(false);
    setSubmitStatus({ type: 'info', message: 'Employee found. Update their details below.' });
  };

  const onSubmit = async (data: EmployeeInput) => {
    try {
      setSubmitStatus({ type: 'info', message: 'Saving...' });

      if (data.id) {
        await updateAsync(data);
        setSubmitStatus({ type: 'success', message: `Employee "${data.name}" updated successfully.` });
      } else {
        await createAsync(data);
        setSubmitStatus({ type: 'success', message: `New employee "${data.name}" added successfully.` });
      }

      reset();
      onCancel();
      setTimeout(() => setSubmitStatus(null), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save employee';
      setSubmitStatus({ type: 'error', message });
    }
  };

  const handleClear = () => {
    reset();
    onCancel();
    setSubmitStatus(null);
    setShowDropdown(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {submitStatus && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            submitStatus.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : submitStatus.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
          }`}
        >
          {submitStatus.message}
        </div>
      )}

      {/* Grid: 3 balanced columns on lg screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label htmlFor="hprnNo" className="label text-slate-700 dark:text-slate-300">
            HRPN No.
          </label>
          <input
            id="hprnNo"
            {...register('hprnNo')}
            className="input font-mono uppercase text-sm"
            placeholder="e.g. 100123"
            maxLength={50}
            onChange={(e) => {
              const val = e.target.value.toUpperCase().trim();
              setValue('hprnNo', val);
            }}
          />
          {errors.hprnNo && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.hprnNo.message}</p>}
        </div>


        <div className="relative" ref={dropdownRef}>
          <label htmlFor="name" className="label text-slate-700 dark:text-slate-300">
            Employee Name <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            id="name"
            {...register('name')}
            className="input text-sm"
            placeholder="Type to search existing..."
            autoComplete="off"
          />
          {errors.name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.name.message}</p>}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
              {searchResults.map((emp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectEmployee(emp)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors flex items-center justify-between"
                >
                  <span className="font-medium text-sm text-slate-800 dark:text-slate-100">{emp.name}</span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono text-xs ml-2">{emp.pan}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="pan" className="label text-slate-700 dark:text-slate-300">
            PAN Number <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            id="pan"
            {...register('pan')}
            className="input uppercase font-mono font-semibold tracking-wider text-sm"
            placeholder="ABCDE1234F"
            maxLength={10}
            onChange={(e) => {
              const sanitized = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
              setValue('pan', sanitized);
            }}
          />
          {errors.pan && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.pan.message}</p>}
        </div>

        <div>
          <label htmlFor="joinDate" className="label text-slate-700 dark:text-slate-300">
            Join Date {!editingEmployee && <span className="text-red-500 dark:text-red-400">*</span>}
          </label>
          <input
            id="joinDate"
            type="date"
            {...register('joinDate')}
            className="input text-sm"
          />
          {errors.joinDate && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.joinDate.message}</p>}
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
            {editingEmployee
              ? 'Leave blank to keep existing date'
              : 'Start of service — required for salary eligibility'}
          </p>
        </div>

        <div>
          <label htmlFor="transferDate" className="label text-slate-700 dark:text-slate-300">
            Transfer Date
          </label>
          <input
            id="transferDate"
            type="date"
            {...register('transferDate')}
            className="input text-sm"
          />
          {errors.transferDate && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.transferDate.message}</p>}
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Enter only if transferred mid-year</p>
        </div>

        <div>
          <label htmlFor="budgetHeadId" className="label text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Budget Head Tag</span>
          </label>
          <select id="budgetHeadId" {...register('budgetHeadId')} className="input text-sm">
            <option value="">— Unassigned —</option>
            {heads.map((head) => (
              <option key={head.id} value={head.id}>
                {head.code} — {head.name}
              </option>
            ))}
          </select>
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Designation &amp; Budget Head designation tag</p>
        </div>
      </div>

      {(joinDateValue || transferDateValue) && (
        <div className="rounded-xl px-3.5 py-2.5 text-xs bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 flex items-center gap-2 font-medium">
          {(() => {
            const activeMonths = getActiveEntryMonths(resolvedFY, joinDateValue || null, transferDateValue || null);
            if (activeMonths.length === 0) {
              return <span>Not active for any salary entry in FY {fyLabel}.</span>;
            }
            const first = activeMonths[0];
            const last = activeMonths[activeMonths.length - 1];
            const nextIdx = MONTHS.indexOf(last) + 1;
            return (
              <span>
                <b>Active for salary entry:</b> {first} → {last}
                {transferDateValue && nextIdx < MONTHS.length && (
                  <span className="text-amber-700 dark:text-amber-400 ml-1">
                    (transferred from {MONTHS[nextIdx]} onward)
                  </span>
                )}
              </span>
            );
          })()}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
          {isSubmitting ? (
            <>
              <RefreshCw size={14} className="animate-spin mr-1.5" />
              Saving...
            </>
          ) : editingEmployee ? (
            <>
              <Save size={14} className="mr-1.5" />
              Update Employee
            </>
          ) : (
            <>
              <UserPlus size={14} className="mr-1.5" />
              Add Employee
            </>
          )}
        </button>
        <button type="button" onClick={handleClear} className="btn btn-secondary">
          <X size={14} className="mr-1.5" />
          Clear / Cancel
        </button>
      </div>
    </form>
  );
}
