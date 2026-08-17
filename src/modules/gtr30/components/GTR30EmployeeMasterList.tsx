import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Search, X, Pencil, Trash2, Users } from 'lucide-react';
import { useRemoveGTR30Employee } from '../hooks/useGTR30EmployeeMaster';
import type { GTR30EmployeeMaster } from '../types';

interface GTR30EmployeeMasterListProps {
  monthKey: string;
  billCode: string;
  employees: GTR30EmployeeMaster[];
  onEdit: (employee: GTR30EmployeeMaster) => void;
}

const INR = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

export function GTR30EmployeeMasterList({ monthKey, billCode, employees, onEdit }: GTR30EmployeeMasterListProps) {
  const { toast } = useToast();
  const removeMutation = useRemoveGTR30Employee();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<GTR30EmployeeMaster | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees;
    const q = searchTerm.trim().toLowerCase();
    return employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) || (emp.hrpnNo ?? '').toLowerCase().includes(q)
    );
  }, [employees, searchTerm]);

  const totals = useMemo(() => {
    return filteredEmployees.reduce(
      (acc, emp) => ({
        currentPay: acc.currentPay + (emp.currentPay || 0),
        transportAllowance: acc.transportAllowance + (emp.transportAllowance || 0),
        medicalAllowance: acc.medicalAllowance + (emp.medicalAllowance || 0),
        claAllowance: acc.claAllowance + (emp.claAllowance || 0),
      }),
      { currentPay: 0, transportAllowance: 0, medicalAllowance: 0, claAllowance: 0 }
    );
  }, [filteredEmployees]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await removeMutation.mutateAsync({
        monthKey,
        billCode,
        employeeId: deleteTarget.id,
      });
      toast({
        title: 'Employee Removed',
        description: `${deleteTarget.name} removed from ${monthKey} / ${billCode}.`,
      });
      setDeleteTarget(null);
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Could not remove the employee.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or HRPN..."
            className="pl-8 pr-8 h-8 text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="text-xs text-slate-500 shrink-0">
          {filteredEmployees.length} of {employees.length} employee(s)
        </div>
      </div>

      {filteredEmployees.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
          <Users className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No employees saved for <strong>{monthKey}</strong> / <strong>{billCode}</strong>.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {searchTerm
              ? `No matches for "${searchTerm}".`
              : 'Add employees using the form above, then save.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-lg border overflow-x-auto">
          <table className="w-full text-sm min-w-[1080px]">
            <thead>
              <tr className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                <th className="px-2 py-2 w-12">Sr.</th>
                <th className="px-2 py-2">HRPN No.</th>
                <th className="px-2 py-2">Employee Name</th>
                <th className="px-2 py-2">Designation</th>
                <th className="px-2 py-2">Pay Scale</th>
                <th className="px-2 py-2 text-right">Current Pay (₹)</th>
                <th className="px-2 py-2">Pay Date</th>
                <th className="px-2 py-2 text-right">HRA %</th>
                <th className="px-2 py-2 text-right">Transport (₹)</th>
                <th className="px-2 py-2 text-right">Medical (₹)</th>
                <th className="px-2 py-2 text-right">CLA (₹)</th>
                <th className="px-2 py-2 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="border-t border-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40">
                  <td className="px-2 py-2 text-slate-500 font-medium">{emp.srNo}</td>
                  <td className="px-2 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">{emp.hrpnNo || '-'}</td>
                  <td className="px-2 py-2 font-semibold text-slate-800 dark:text-slate-100">{emp.name}</td>
                  <td className="px-2 py-2 text-xs text-slate-600 dark:text-slate-300">{emp.designation || '-'}</td>
                  <td className="px-2 py-2 text-xs text-slate-600 dark:text-slate-300">{emp.payScale || '-'}</td>
                  <td className="px-2 py-2 text-right font-semibold text-slate-800 dark:text-slate-100 font-mono">
                    {INR(emp.currentPay || 0)}
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-600 dark:text-slate-300">
                    {emp.currentPayDate ? new Date(emp.currentPayDate).toLocaleDateString('en-IN') : '-'}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                    {emp.hraPercent || 0}%
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                    {INR(emp.transportAllowance || 0)}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                    {INR(emp.medicalAllowance || 0)}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                    {INR(emp.claAllowance || 0)}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Edit employee"
                        onClick={() => onEdit(emp)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
                        title="Delete employee"
                        onClick={() => setDeleteTarget(emp)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/60 font-semibold text-slate-800 dark:text-slate-100">
                <td colSpan={5} className="px-2 py-2 text-right text-xs uppercase text-slate-500">
                  Total ({filteredEmployees.length})
                </td>
                <td className="px-2 py-2 text-right font-mono text-sm">{INR(totals.currentPay)}</td>
                <td className="px-2 py-2" />
                <td className="px-2 py-2" />
                <td className="px-2 py-2 text-right font-mono text-xs">{INR(totals.transportAllowance)}</td>
                <td className="px-2 py-2 text-right font-mono text-xs">{INR(totals.medicalAllowance)}</td>
                <td className="px-2 py-2 text-right font-mono text-xs">{INR(totals.claAllowance)}</td>
                <td className="px-2 py-2" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Employee Entry"
        message={
          deleteTarget ? (
            <div className="space-y-2">
              <p>
                Are you sure you want to remove <strong>{deleteTarget.name}</strong> from{' '}
                <strong>{monthKey}</strong> / <strong>{billCode}</strong>?
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                This only removes the master entry; bills already created are not changed.
              </p>
            </div>
          ) : undefined
        }
        confirmLabel="Yes, Remove Employee"
        cancelLabel="Cancel"
        danger
        busy={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
