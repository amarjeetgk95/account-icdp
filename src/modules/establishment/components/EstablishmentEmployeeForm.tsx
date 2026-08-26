import { useEffect, useMemo, useRef, useState } from 'react';
import { Save, X, UserPlus, RefreshCw } from 'lucide-react';
import { useUIStore } from '@/core/stores/ui-store';
import { MONTHS } from '@/shared/constants';
import { getActiveEntryMonths } from '@/modules/payroll/utils/employeeDates';
import { useEstablishmentEmployees, useSaveEstablishmentEmployees } from '../hooks/useEstablishment';
import { createBlankEstablishmentEmployee } from '../constants';
import { EstablishmentGujaratiDesignationPicker } from './EstablishmentGujaratiDesignationPicker';
import type { EstablishmentEmployee } from '../types';

interface EstablishmentEmployeeFormProps {
  editingEmployee: EstablishmentEmployee | null;
  onCancel: () => void;
  onSelect?: (employee: EstablishmentEmployee) => void;
}

export function EstablishmentEmployeeForm({ editingEmployee, onCancel, onSelect }: EstablishmentEmployeeFormProps) {
  const { data: employeesData } = useEstablishmentEmployees();
  const employees = useMemo(() => employeesData ?? [], [employeesData]);
  const saveMutation = useSaveEstablishmentEmployees();
  const storeFY = useUIStore((s) => s.activeFinancialYear);
  const fyLabel = `${storeFY}-${String(storeFY + 1).slice(-2)}`;

  const [data, setData] = useState<EstablishmentEmployee>(() => editingEmployee ?? createBlankEstablishmentEmployee());
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isDropdownDismissed, setIsDropdownDismissed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingEmployee) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(editingEmployee);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(createBlankEstablishmentEmployee());
    }
  }, [editingEmployee]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownDismissed(true);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const setField = <K extends keyof EstablishmentEmployee>(field: K, value: EstablishmentEmployee[K]) =>
    setData((cur) => ({ ...cur, [field]: value }));

  const nameSearchResults = useMemo(() => {
    if (editingEmployee) return [];
    const term = (data.name || '').trim().toLowerCase();
    if (term.length < 1) return [];
    return employees
      .filter((emp) => emp.name.toLowerCase().includes(term))
      .slice(0, 8);
  }, [data.name, editingEmployee, employees]);

  const showDropdown = nameSearchResults.length > 0 && !isDropdownDismissed && !editingEmployee;

  const selectEmployee = (emp: EstablishmentEmployee) => {
    setIsDropdownDismissed(true);
    if (onSelect) {
      onSelect(emp);
    }
    setData(emp);
    setSubmitStatus({ type: 'info', message: `Employee "${emp.name}" loaded for editing.` });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.name.trim() || data.name.trim().length < 2) {
      setSubmitStatus({ type: 'error', message: 'Name must be at least 2 characters' });
      return;
    }
    if (data.pan && data.pan.length !== 10) {
      setSubmitStatus({ type: 'error', message: 'PAN must be exactly 10 characters' });
      return;
    }
    if (!editingEmployee && !data.joinDate) {
      setSubmitStatus({ type: 'error', message: 'Join date is required' });
      return;
    }
    if (data.joinDate && data.transferDate && new Date(data.joinDate) > new Date(data.transferDate)) {
      setSubmitStatus({ type: 'error', message: 'Join date cannot be after transfer date' });
      return;
    }
    try {
      setSubmitStatus({ type: 'info', message: 'Saving...' });
      const others = employees.filter((emp) => emp.id !== data.id);
      await saveMutation.mutateAsync([...others, data]);
      setSubmitStatus({ type: 'success', message: editingEmployee ? `Employee "${data.name}" updated successfully.` : `New employee "${data.name}" added successfully.` });
      setData(createBlankEstablishmentEmployee());
      onCancel();
      setTimeout(() => setSubmitStatus(null), 3000);
    } catch (error) {
      setSubmitStatus({ type: 'error', message: error instanceof Error ? error.message : 'Failed to save employee' });
    }
  };

  const handleClear = () => {
    setData(createBlankEstablishmentEmployee());
    onCancel();
    setSubmitStatus(null);
    setIsDropdownDismissed(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label htmlFor="est-hprnNo" className="label text-slate-700 dark:text-slate-300">HRPN No.</label>
          <input
            id="est-hprnNo"
            value={data.hrpnNo ?? ''}
            onChange={(e) => setField('hrpnNo', e.target.value.toUpperCase().trim())}
            className="input font-mono uppercase text-sm"
            placeholder="e.g. 100123"
            maxLength={50}
          />
        </div>

        <div className="relative" ref={dropdownRef}>
          <label htmlFor="est-name" className="label text-slate-700 dark:text-slate-300">Employee Name <span className="text-red-500">*</span></label>
          <input
            id="est-name"
            value={data.name}
            onChange={(e) => {
              setField('name', e.target.value);
              setIsDropdownDismissed(false);
            }}
            className="input text-sm"
            placeholder="Type to search existing..."
            autoComplete="off"
          />
          {showDropdown && (
            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
              {nameSearchResults.map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => selectEmployee(emp)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors flex items-center justify-between"
                >
                  <span className="font-medium text-sm text-slate-800 dark:text-slate-100">{emp.name}</span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono text-xs ml-2">{emp.pan || emp.hrpnNo || ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="est-pan" className="label text-slate-700 dark:text-slate-300">PAN Number <span className="text-red-500">*</span></label>
          <input
            id="est-pan"
            value={data.pan ?? ''}
            onChange={(e) => {
              const sanitized = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
              setField('pan', sanitized);
            }}
            className="input uppercase font-mono font-semibold tracking-wider text-sm"
            placeholder="ABCDE1234F"
            maxLength={10}
          />
        </div>

        <div>
          <label htmlFor="est-joinDate" className="label text-slate-700 dark:text-slate-300">Join Date {!editingEmployee && <span className="text-red-500">*</span>}</label>
          <input id="est-joinDate" type="date" value={data.joinDate ?? ''} onChange={(e) => setField('joinDate', e.target.value)} className="input text-sm" />
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">{editingEmployee ? 'Leave blank to keep existing date' : 'Start of service — required'}</p>
        </div>

        <div>
          <label htmlFor="est-transferDate" className="label text-slate-700 dark:text-slate-300">Transfer Date</label>
          <input id="est-transferDate" type="date" value={data.transferDate ?? ''} onChange={(e) => setField('transferDate', e.target.value)} className="input text-sm" />
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Enter only if transferred mid-year</p>
        </div>

        <div>
          <label htmlFor="est-designation" className="label text-slate-700 dark:text-slate-300">Designation</label>
          <input id="est-designation" type="text" value={data.designation ?? ''} onChange={(e) => setField('designation', e.target.value)} className="input text-sm" placeholder="e.g. Accountant, Driver, Peon" />
        </div>

        <div>
          <label htmlFor="est-designationGu" className="label text-slate-700 dark:text-slate-300">Designation (Gujarati) — હોદ્દો <span className="text-[11px] font-normal text-slate-400">(from sanctioned posts)</span></label>
          <EstablishmentGujaratiDesignationPicker id="est-designationGu" value={data.designationGu ?? ''} onChange={(v) => setField('designationGu', v)} />
        </div>

        <div>
          <label htmlFor="est-cadreClass" className="label text-slate-700 dark:text-slate-300">Cadre Class</label>
          <select id="est-cadreClass" value={data.cadreClass ?? ''} onChange={(e) => setField('cadreClass', e.target.value)} className="input text-sm">
            <option value=""></option>
            <option value="1">વર્ગ ૧ — Class 1</option>
            <option value="2">વર્ગ ૨ — Class 2</option>
            <option value="3">વર્ગ ૩ — Class 3</option>
            <option value="4">વર્ગ ૪ — Class 4</option>
            {data.cadreClass && !['', '1', '2', '3', '4'].includes(data.cadreClass) && <option value={data.cadreClass}>{data.cadreClass}</option>}
          </select>
        </div>

        <div>
          <label htmlFor="est-headquarter" className="label text-slate-700 dark:text-slate-300">Headquarter Name</label>
          <input id="est-headquarter" type="text" value={data.headquarter ?? ''} onChange={(e) => setField('headquarter', e.target.value)} className="input text-sm" placeholder="e.g. Surat, Gandhinagar" />
        </div>

        <div>
          <label htmlFor="est-status" className="label text-slate-700 dark:text-slate-300">Status</label>
          <select id="est-status" value={data.active ? 'active' : 'inactive'} onChange={(e) => setField('active', e.target.value === 'active')} className="input text-sm">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {(data.joinDate || data.transferDate) && (
        <div className="rounded-xl px-3.5 py-2.5 text-xs bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 flex items-center gap-2 font-medium">
          {(() => {
            const activeMonths = getActiveEntryMonths(storeFY, data.joinDate || null, data.transferDate || null);
            if (activeMonths.length === 0) return <span>Not active for any salary entry in FY {fyLabel}.</span>;
            const first = activeMonths[0];
            const last = activeMonths[activeMonths.length - 1];
            const nextIdx = MONTHS.indexOf(last) + 1;
            return (
              <span><b>Active for salary entry:</b> {first} → {last}{data.transferDate && nextIdx < MONTHS.length && <span className="text-amber-700 dark:text-amber-400 ml-1">(transferred from {MONTHS[nextIdx]} onward)</span>}</span>
            );
          })()}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <button type="submit" disabled={saveMutation.isPending} className="btn btn-primary">
          {saveMutation.isPending ? <><RefreshCw size={14} className="animate-spin mr-1.5" /> Saving...</> : editingEmployee ? <><Save size={14} className="mr-1.5" /> Update Employee</> : <><UserPlus size={14} className="mr-1.5" /> Add Employee</>}
        </button>
        <button type="button" onClick={handleClear} className="btn btn-secondary"><X size={14} className="mr-1.5" /> Clear / Cancel</button>
      </div>
    </form>
  );
}
