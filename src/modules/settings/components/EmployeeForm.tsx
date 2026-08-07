import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { employeeSchema, type EmployeeInput } from '../validation/settings.schema';
import { useEmployees } from '../hooks/useEmployees';


interface EmployeeFormProps {
  editingEmployee: EmployeeInput | null;
  onCancel: () => void;
}

export function EmployeeForm({ editingEmployee, onCancel }: EmployeeFormProps) {
  const { createAsync, updateAsync } = useEmployees();
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [searchResults, setSearchResults] = useState<Array<{ name: string; pan: string }>>([]);
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
      name: '',
      pan: '',
      joinDate: '',
      transferDate: '',
    },
  });

  const { employees } = useEmployees();
  const nameValue = watch('name');

  useEffect(() => {
    if (editingEmployee) {
      reset({
        id: editingEmployee.id,
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
        .map((emp) => ({ name: emp.name, pan: emp.pan }));
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

  const selectEmployee = (emp: { name: string; pan: string }) => {
    setValue('name', emp.name);
    setValue('pan', emp.pan);
    setShowDropdown(false);
    setSubmitStatus({ type: 'info', message: 'Employee found. Updating record.' });
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative" ref={dropdownRef}>
          <label htmlFor="name" className="label">
            Employee Name
          </label>
          <input
            id="name"
            {...register('name')}
            className="input"
            placeholder="Type to search..."
            autoComplete="off"
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          {showDropdown && searchResults.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
            >
              {searchResults.map((emp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectEmployee(emp)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-slate-100 last:border-0"
                >
                  <span className="font-medium">{emp.name}</span>
                  <span className="text-slate-500 text-sm ml-2">{emp.pan}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="pan" className="label">
            PAN Number
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
          {errors.pan && <p className="text-red-500 text-sm mt-1">{errors.pan.message}</p>}
        </div>

        <div>
          <label htmlFor="joinDate" className="label">
            Join Date
          </label>
          <input
            id="joinDate"
            type="date"
            {...register('joinDate')}
            className="input"
          />
          {errors.joinDate && <p className="text-red-500 text-sm mt-1">{errors.joinDate.message}</p>}
          <p className="text-slate-400 text-xs mt-1">Leave blank if active since March 1</p>
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
          {errors.transferDate && <p className="text-red-500 text-sm mt-1">{errors.transferDate.message}</p>}
          <p className="text-slate-400 text-xs mt-1">Leave blank if staying all year</p>
        </div>
      </div>

      {submitStatus && (
        <div
          className={`alert alert-${
            submitStatus.type === 'success' ? 'success' : submitStatus.type === 'error' ? 'danger' : 'info'
          }`}
        >
          {submitStatus.message}
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
          {isSubmitting ? 'Saving...' : editingEmployee ? 'Update' : 'Save'}
        </button>
        <button type="button" onClick={handleClear} className="btn btn-secondary">
          Clear
        </button>
      </div>
    </form>
  );
}
