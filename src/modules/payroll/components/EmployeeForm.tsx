import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { employeeSchema, type EmployeeInput } from '../validation/employee.schema';
import { useEmployees } from '../hooks/useEmployees';
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
    },
  });

  const { employees } = useEmployees();
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
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
            submitStatus.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : submitStatus.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {submitStatus.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <div>
          <label htmlFor="hprnNo" className="label">
            HRPN No.
          </label>
          <input
            id="hprnNo"
            {...register('hprnNo')}
            className="input"
            placeholder="Optional"
            maxLength={50}
            onChange={(e) => setValue('hprnNo', e.target.value)}
          />
          {errors.hprnNo && <p className="text-red-500 text-xs mt-1">{errors.hprnNo.message}</p>}
        </div>

        <div className="relative" ref={dropdownRef}>
          <label htmlFor="name" className="label">
            Employee Name <span className="text-red-400">*</span>
          </label>
          <input
            id="name"
            {...register('name')}
            className="input"
            placeholder="Type to search existing..."
            autoComplete="off"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          {showDropdown && searchResults.length > 0 && (
            <div
              className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
            >
              {searchResults.map((emp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectEmployee(emp)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-slate-100 last:border-0 transition-colors"
                >
                  <span className="font-medium text-sm">{emp.name}</span>
                  <span className="text-slate-500 text-xs ml-2">{emp.pan}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="pan" className="label">
            PAN Number <span className="text-red-400">*</span>
          </label>
          <input
            id="pan"
            {...register('pan')}
            className="input uppercase"
            placeholder="ABCDE1234F"
            maxLength={10}
            onChange={(e) => {
              const sanitized = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
              setValue('pan', sanitized);
            }}
          />
          {errors.pan && <p className="text-red-500 text-xs mt-1">{errors.pan.message}</p>}
        </div>

        <div>
          <label htmlFor="joinDate" className="label">
            Join Date {!editingEmployee && <span className="text-red-400">*</span>}
          </label>
          <input
            id="joinDate"
            type="date"
            {...register('joinDate')}
            className="input"
          />
          {errors.joinDate && <p className="text-red-500 text-xs mt-1">{errors.joinDate.message}</p>}
          <p className="text-slate-400 text-xs mt-1">
            {editingEmployee
              ? 'Leave blank to keep the existing record unchanged'
              : 'Start of service — required for payroll eligibility'}
          </p>
        </div>

        <div>
          <label htmlFor="transferDate" className="label">
            Transfer Date
          </label>
          <input
            id="transferDate"
            type="date"
            {...register('transferDate')}
            className="input"
          />
          {errors.transferDate && <p className="text-red-500 text-xs mt-1">{errors.transferDate.message}</p>}
          <p className="text-slate-400 text-xs mt-1">Leave blank — enter only if the employee is transferred mid-year</p>
        </div>
      </div>

      {(joinDateValue || transferDateValue) && (
        <div className="rounded-lg px-3 py-2 text-sm bg-blue-50 border border-blue-200 text-blue-800">
          {(() => {
            const activeMonths = getActiveEntryMonths(resolvedFY, joinDateValue || null, transferDateValue || null);
            if (activeMonths.length === 0) {
              return <span>Not active for any entry in FY {fyLabel}.</span>;
            }
            const first = activeMonths[0];
            const last = activeMonths[activeMonths.length - 1];
            const nextIdx = MONTHS.indexOf(last) + 1;
            return (
              <span>
                <b>Active for entry:</b> {first} → {last}
                {transferDateValue && nextIdx < MONTHS.length && (
                  <span className="text-amber-700">
                    {' '}
                    — removed from entry from {MONTHS[nextIdx]} onward
                  </span>
                )}
              </span>
            );
          })()}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
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
          Clear
        </button>
      </div>
    </form>
  );
}
