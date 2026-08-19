import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Search, X, Pencil, Trash2, Users, Building, ShieldCheck } from 'lucide-react';
import { useRemoveGTR30Employee } from '../hooks/useGTR30EmployeeMaster';
import type { GTR30EmployeeMaster } from '../types';

interface GTR30EmployeeMasterListProps {
  monthKey: string;
  billCode: string;
  employees: GTR30EmployeeMaster[];
  onEdit: (employee: GTR30EmployeeMaster) => void;
}

const INR = (n: number) => '₹' + Math.round(n || 0).toLocaleString('en-IN');

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
        emp.name.toLowerCase().includes(q) ||
        (emp.hrpnNo ?? '').toLowerCase().includes(q) ||
        (emp.designation ?? '').toLowerCase().includes(q)
    );
  }, [employees, searchTerm]);

  const totals = useMemo(() => {
    return filteredEmployees.reduce(
      (acc, emp) => {
        const pay = emp.currentPay || 0;
        const da = emp.da !== undefined && emp.da > 0 ? emp.da : Math.round(pay * 0.53);
        const allowances = (emp.transportAllowance || 0) + (emp.medicalAllowance || 0) + (emp.claAllowance || 0);
        const gross = pay + da + allowances;
        const nps = emp.npsPension !== undefined && emp.npsPension > 0 ? emp.npsPension : Math.round((pay + da) * 0.1);
        const deds = (emp.rentOfBuilding || 0) + (emp.professionalTax || 0) + (emp.gis1981Insurance || 0) + (emp.gis1981Savings || 0) + nps;
        const net = gross - deds;

        return {
          currentPay: acc.currentPay + pay,
          da: acc.da + da,
          gross: acc.gross + gross,
          deds: acc.deds + deds,
          net: acc.net + net,
        };
      },
      { currentPay: 0, da: 0, gross: 0, deds: 0, net: 0 }
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
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, HRPN or designation..."
            className="pl-8 pr-8 h-8 text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
        <div className="text-center py-10 border border-dashed border-slate-300 rounded-lg">
          <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            No employees saved for <strong>{monthKey}</strong> / <strong>{billCode}</strong>.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm
              ? `No matches for "${searchTerm}".`
              : 'Add employees using the form above or Import from Employee Directory.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-x-auto shadow-sm">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="bg-slate-100 text-left text-xs uppercase text-slate-600 font-bold">
                <th className="px-3 py-2.5 w-10 text-center">Sr.</th>
                <th className="px-3 py-2.5">Employee Name &amp; Designation</th>
                <th className="px-3 py-2.5">7th Pay Matrix</th>
                <th className="px-3 py-2.5 text-right">Basic Pay (₹)</th>
                <th className="px-3 py-2.5 text-right">DA 53% (₹)</th>
                <th className="px-3 py-2.5 text-right">Est. Gross (₹)</th>
                <th className="px-3 py-2.5 text-right">Est. Deductions (₹)</th>
                <th className="px-3 py-2.5 text-right text-emerald-700">Est. Net (₹)</th>
                <th className="px-3 py-2.5">GIS / Qtrs</th>
                <th className="px-3 py-2.5 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => {
                const pay = emp.currentPay || 0;
                const da = emp.da !== undefined && emp.da > 0 ? emp.da : Math.round(pay * 0.53);
                const allowances = (emp.transportAllowance || 0) + (emp.medicalAllowance || 0) + (emp.claAllowance || 0);
                const gross = pay + da + allowances;
                const nps = emp.npsPension !== undefined && emp.npsPension > 0 ? emp.npsPension : Math.round((pay + da) * 0.1);
                const deds = (emp.rentOfBuilding || 0) + (emp.professionalTax || 0) + (emp.gis1981Insurance || 0) + (emp.gis1981Savings || 0) + nps;
                const net = gross - deds;

                return (
                  <tr key={emp.id} className="border-t border-slate-200 hover:bg-slate-50/80">
                    <td className="px-3 py-2.5 text-center text-slate-500 font-bold">{emp.srNo}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-slate-900">{emp.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        {emp.designation && <span>{emp.designation}</span>}
                        {emp.designationGujarati && (
                          <span className="font-serif text-slate-600 font-medium">({emp.designationGujarati})</span>
                        )}
                        {emp.hrpnNo && <span className="font-mono text-[11px] bg-slate-100 px-1 rounded">{emp.hrpnNo}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-600">
                      <div>{emp.payScale || '34,500-1,12,400'}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {emp.gradePay || 'GP:4200'} · {emp.payLevelCell || 'LEVEL CELL-7'}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-900 font-mono">
                      {INR(pay)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-emerald-800 font-mono">
                      {INR(da)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-blue-900 font-mono">
                      {INR(gross)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-amber-900 font-mono">
                      {INR(deds)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-emerald-700 font-mono text-base">
                      {INR(net)}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-serif font-bold text-xs" title="GIS Group">
                          <ShieldCheck className="h-3 w-3 mr-0.5" /> {emp.insuranceGroup || 'ખ'}
                        </span>
                        {emp.rentOfBuilding && emp.rentOfBuilding > 0 ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium" title={emp.quarterAddress || 'Quarter Allotted'}>
                            <Building className="h-3 w-3 mr-0.5" /> Qtr
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                          title="Edit employee"
                          onClick={() => onEdit(emp)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:bg-red-50"
                          title="Delete employee"
                          onClick={() => setDeleteTarget(emp)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900">
                <td colSpan={3} className="px-3 py-2.5 text-right text-xs uppercase text-slate-600">
                  Total ({filteredEmployees.length} Employee{filteredEmployees.length === 1 ? '' : 's'})
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-sm">{INR(totals.currentPay)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-sm text-emerald-800">{INR(totals.da)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-sm text-blue-900">{INR(totals.gross)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-sm text-amber-900">{INR(totals.deds)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-base text-emerald-700">{INR(totals.net)}</td>
                <td colSpan={2} />
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
              <p className="text-xs text-red-600 font-medium">
                This only removes the master entry; bills already created will not be affected.
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
