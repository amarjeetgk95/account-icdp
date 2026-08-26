import { useState, useMemo } from 'react';
import { Pencil, Trash2, Search, Filter, X, ShieldCheck, ShieldAlert, Tag } from 'lucide-react';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { formatDate } from '@/shared/utilities';
import { useEstablishmentEmployees, useSaveEstablishmentEmployees } from '../hooks/useEstablishment';
import { useBudgetHeads } from '@/modules/payroll/hooks/useBudgetHeads';
import { latestPayOf } from '../types';
import type { EstablishmentEmployee } from '../types';

const INR = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

interface EstablishmentEmployeeListProps {
  onEdit?: (employee: EstablishmentEmployee) => void;
}

export function EstablishmentEmployeeList({ onEdit }: EstablishmentEmployeeListProps) {
  const { data: employeesData, isLoading } = useEstablishmentEmployees();
  const employees = useMemo(() => employeesData ?? [], [employeesData]);
  const { heads } = useBudgetHeads();
  const saveMutation = useSaveEstablishmentEmployees();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'transferred'>('all');
  const [deleteTarget, setDeleteTarget] = useState<EstablishmentEmployee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const headMap = useMemo(() => new Map(heads.map((h) => [String(h.id), h])), [heads]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const isTransferred = Boolean(emp.transferDate);
      if (statusFilter === 'active' && isTransferred) return false;
      if (statusFilter === 'transferred' && !isTransferred) return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        emp.name.toLowerCase().includes(term) ||
        (emp.pan || '').toLowerCase().includes(term) ||
        (emp.hrpnNo || '').toLowerCase().includes(term) ||
        (emp.designation || '').toLowerCase().includes(term) ||
        (emp.headquarter || '').toLowerCase().includes(term)
      );
    });
  }, [employees, searchTerm, statusFilter]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const remaining = employees.filter((e) => e.id !== deleteTarget.id);
      await saveMutation.mutateAsync(remaining);
      setDeleteTarget(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete employee');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (emp: EstablishmentEmployee) => {
    if (onEdit) {
      onEdit(emp);
      return;
    }
    window.open(`/establishment/employees/edit/${emp.id}`, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner h-8 w-8"></div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="empty-state py-8">
        <div className="empty-state-icon">👥</div>
        <p className="empty-state-text text-slate-700 dark:text-slate-200">No employees registered yet.</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Add employees using the form above to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, PAN, HRPN, designation, headquarter..."
            className="input text-xs pl-8 pr-8"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <Filter size={13} className="text-slate-400 ml-1.5 mr-0.5" />
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${statusFilter === 'all' ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}
          >
            All ({employees.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${statusFilter === 'active' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}
          >
            Active ({employees.filter((e) => !e.transferDate).length})
          </button>
          <button
            onClick={() => setStatusFilter('transferred')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${statusFilter === 'transferred' ? 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}
          >
            Transferred ({employees.filter((e) => Boolean(e.transferDate)).length})
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
        <table className="table text-sm">
          <thead>
            <tr>
              <th className="text-center" style={{ width: '50px' }}>#</th>
              <th className="text-left">HRPN No.</th>
              <th className="text-left">Name</th>
              <th className="text-left">PAN</th>
              <th className="text-center">Designation / Budget Head</th>
              <th className="text-center">Status</th>
              <th className="text-center">Join Date</th>
              <th className="text-center">Transfer Date</th>
              <th className="text-center">Latest Pay</th>
              <th className="text-center" style={{ width: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">No matching employees found for &quot;{searchTerm}&quot;</td>
              </tr>
            ) : (
              filteredEmployees.map((employee, index) => {
                const isTransferred = Boolean(employee.transferDate);
                const head = employee.budgetHeadId ? headMap.get(String(employee.budgetHeadId)) : null;
                const latest = latestPayOf(employee);
                return (
                  <tr key={employee.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="text-slate-400 text-center">{index + 1}</td>
                    <td className="font-semibold text-slate-700 dark:text-slate-300">{employee.hrpnNo || '-'}</td>
                    <td className="font-semibold text-slate-800 dark:text-slate-100">
                      <div>{employee.name}</div>
                      {employee.headquarter && <div className="text-[11px] font-normal text-indigo-600 dark:text-indigo-400">{employee.headquarter}</div>}
                    </td>
                    <td className="font-semibold uppercase text-slate-700 dark:text-slate-300">{employee.pan || '-'}</td>
                    <td className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{employee.designation || '-'}</span>
                        {head ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800">
                            <Tag size={10} /> {head.code} — {head.name}
                          </span>
                        ) : null}
                        {employee.cadreClass && <span className="text-[11px] text-slate-500">Class {employee.cadreClass}</span>}
                      </div>
                    </td>
                    <td className="text-center">
                      {isTransferred ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                          <ShieldAlert size={11} /> Transferred
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                          <ShieldCheck size={11} /> Active
                        </span>
                      )}
                    </td>
                    <td className="text-center text-slate-600 dark:text-slate-300 text-xs">{employee.joinDate ? formatDate(employee.joinDate) : '-'}</td>
                    <td className="text-center text-slate-600 dark:text-slate-300 text-xs">{employee.transferDate ? formatDate(employee.transferDate) : '-'}</td>
                    <td className="text-center">
                      {latest ? <span className="font-bold text-slate-800 dark:text-slate-100">{INR(latest.basicPay)}</span> : <span className="text-slate-400 text-xs">-</span>}
                    </td>
                    <td>
                      <div className="flex justify-center gap-1.5">
                        <button onClick={() => handleEdit(employee)} className="btn btn-icon btn-sm btn-secondary" title="Edit employee">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteTarget(employee)} className="btn btn-icon btn-sm btn-outline text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50" title="Delete employee">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Employee Record"
        message={
          deleteTarget ? (
            <div className="space-y-2">
              <p>Are you sure you want to delete employee <strong>{deleteTarget.name}</strong> (PAN: {deleteTarget.pan || '-'})?</p>
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">⚠️ Warning: This action will permanently remove the employee from the establishment register.</p>
            </div>
          ) : undefined
        }
        confirmLabel="Yes, Delete Employee"
        cancelLabel="Cancel"
        danger
        busy={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
