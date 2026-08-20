import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import {
  Search,
  X,
  Pencil,
  Trash2,
  Users,
  Building,
  ShieldCheck,
  Table,
  Check,
  Sparkles,
  Download,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useRemoveGTR30Employee, useSaveGTR30EmployeeGroup } from '../hooks/useGTR30EmployeeMaster';
import { exportMasterToCsv, downloadCsvFile } from '../utils/gtr30Csv';
import {
  calculateDA,
  calculateNPS,
  calculateGujaratPT,
  PAY_SCALE_CATALOG,
  findPayScaleMappingByScale,
} from '../utils/gtr30GovRules';
import { calculateEmployeeSalary } from '../utils/gtr30SalaryCalc';
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
  const saveGroupMutation = useSaveGTR30EmployeeGroup();

  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<GTR30EmployeeMaster | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGridMode, setIsGridMode] = useState(false);
  const [gridData, setGridData] = useState<GTR30EmployeeMaster[]>([]);
  const [isSavingGrid, setIsSavingGrid] = useState(false);

  useEffect(() => {
    setGridData(employees);
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const list = isGridMode ? gridData : employees;
    if (!searchTerm.trim()) return list;
    const q = searchTerm.trim().toLowerCase();
    return list.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        (emp.hrpnNo ?? '').toLowerCase().includes(q) ||
        (emp.designation ?? '').toLowerCase().includes(q)
    );
  }, [employees, gridData, isGridMode, searchTerm]);

  const totals = useMemo(() => {
    return filteredEmployees.reduce(
      (acc, emp) => {
        const s = calculateEmployeeSalary(emp);
        return {
          currentPay: acc.currentPay + s.basic,
          da: acc.da + s.da,
          gross: acc.gross + s.grossPay,
          deds: acc.deds + s.totalDeductions,
          net: acc.net + s.netTakeHome,
        };
      },
      { currentPay: 0, da: 0, gross: 0, deds: 0, net: 0 }
    );
  }, [filteredEmployees]);

  const handleGridCellChange = (id: string, field: keyof GTR30EmployeeMaster, value: unknown) => {
    setGridData((prev) =>
      prev.map((emp) => {
        if (emp.id !== id) return emp;
        const updated = { ...emp, [field]: value };
        if (field === 'currentPay') {
          const pay = Number(value) || 0;
          if (pay > 0) {
            const da = calculateDA(pay, 53);
            const nps = calculateNPS(pay, da);
            const pt = calculateGujaratPT(pay);
            updated.da = da;
            updated.npsPension = nps;
            updated.professionalTax = pt;
            updated.payLevelCell = `PAY=${pay} (LEVEL CELL-7)`;
          }
        }
        return updated;
      })
    );
  };

  const handleApply53PercentDA = () => {
    const updated = (isGridMode ? gridData : employees).map((emp) => {
      const pay = emp.currentPay || 0;
      const da = calculateDA(pay, 53);
      const nps = calculateNPS(pay, da);
      return {
        ...emp,
        da,
        npsPension: nps,
      };
    });
    setGridData(updated);
    if (!isGridMode) {
      void saveGroupMutation.mutateAsync({ monthKey, billCode, employees: updated });
      toast({ title: 'DA Recalculated', description: '53% DA and 10% NPS applied to all employees.' });
    } else {
      toast({ title: 'DA Updated in Grid', description: 'Click "Save Grid Changes" to persist.' });
    }
  };

  const handleReindexSerialNumbers = () => {
    const updated = (isGridMode ? gridData : employees).map((emp, idx) => ({
      ...emp,
      srNo: idx + 1,
    }));
    setGridData(updated);
    if (!isGridMode) {
      void saveGroupMutation.mutateAsync({ monthKey, billCode, employees: updated });
      toast({ title: 'Serial Numbers Re-indexed', description: 'Numbered 1 to ' + updated.length });
    } else {
      toast({ title: 'Re-indexed in Grid', description: 'Click "Save Grid Changes" to persist.' });
    }
  };

  const handleSaveGrid = async () => {
    try {
      setIsSavingGrid(true);
      await saveGroupMutation.mutateAsync({
        monthKey,
        billCode,
        employees: gridData,
      });
      toast({
        title: 'Grid Saved',
        description: `Successfully updated ${gridData.length} employee entries.`,
      });
      setIsGridMode(false);
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Could not save grid.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingGrid(false);
    }
  };

  const handleExportCsv = () => {
    if (employees.length === 0) {
      toast({ title: 'Nothing to Export', description: 'No employee entries present.' });
      return;
    }
    const csv = exportMasterToCsv(employees);
    downloadCsvFile(`GTR30_Master_${monthKey}_${billCode}.csv`, csv);
    toast({ title: 'Export Complete', description: 'Downloaded CSV file.' });
  };

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
      {/* Toolbar */}
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

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            disabled={employees.length === 0}
            className="h-8 text-xs font-medium"
            title="Export Master Directory to CSV"
          >
            <Download className="h-3.5 w-3.5 mr-1 text-slate-600" /> Export CSV
          </Button>

          {employees.length > 0 && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleApply53PercentDA}
                className="h-8 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                title="Apply standard 53% DA to all rows"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Apply 53% DA
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleReindexSerialNumbers}
                className="h-8 text-xs font-medium text-slate-700"
                title="Renumber Serial Numbers 1..N"
              >
                1..N Re-order
              </Button>

              <Button
                type="button"
                size="sm"
                variant={isGridMode ? 'default' : 'outline'}
                onClick={() => {
                  if (isGridMode) {
                    setIsGridMode(false);
                    setGridData(employees);
                  } else {
                    setIsGridMode(true);
                    setGridData(employees);
                  }
                }}
                className={`h-8 text-xs font-medium ${isGridMode ? 'bg-indigo-600 text-white' : ''}`}
                title="Toggle inline spreadsheet edit mode"
              >
                <Table className="h-3.5 w-3.5 mr-1" /> {isGridMode ? 'Exit Grid Mode' : 'Quick Grid Edit'}
              </Button>
            </>
          )}

          {isGridMode && (
            <Button
              type="button"
              size="sm"
              onClick={handleSaveGrid}
              disabled={isSavingGrid}
              className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {isSavingGrid ? (
                <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5 mr-1" />
              )}
              Save Grid Changes
            </Button>
          )}

          <div className="text-xs text-slate-500 shrink-0 ml-1">
            {filteredEmployees.length} of {employees.length} employee(s)
          </div>
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
              : 'Add employees using the form above, Copy from Previous Month, or Import from Directory.'}
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
                const salary = calculateEmployeeSalary(emp);
                const pay = salary.basic;
                const da = salary.da;
                const gross = salary.grossPay;
                const deds = salary.totalDeductions;
                const net = salary.netTakeHome;

                const hasQuarterWarning = Number(emp.rentOfBuilding || 0) > 0 && !emp.quarterAddress;

                return (
                  <tr key={emp.id} className="border-t border-slate-200 hover:bg-slate-50/80">
                    <td className="px-3 py-2 text-center text-slate-500 font-bold">
                      {isGridMode ? (
                        <input
                          type="number"
                          value={emp.srNo}
                          onChange={(e) => handleGridCellChange(emp.id, 'srNo', Number(e.target.value))}
                          className="w-10 h-7 text-center font-bold text-xs border rounded"
                        />
                      ) : (
                        emp.srNo
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{emp.name}</span>
                        {hasQuarterWarning && (
                          <span
                            title="Rent is deducted but Quarter Address is blank (Page 5 Schedule incomplete)"
                            className="inline-flex items-center text-amber-600"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        {emp.designation && <span>{emp.designation}</span>}
                        {emp.designationGujarati && (
                          <span className="font-serif text-slate-600 font-medium">({emp.designationGujarati})</span>
                        )}
                        {emp.hrpnNo && <span className="font-mono text-[11px] bg-slate-100 px-1 rounded">{emp.hrpnNo}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {isGridMode ? (
                        <div className="space-y-1 min-w-[170px]">
                          <select
                            value={emp.payScale || '34,500-1,12,400'}
                            onChange={(e) => {
                              const scale = e.target.value;
                              const m = findPayScaleMappingByScale(scale);
                              setGridData((prev) =>
                                prev.map((item) =>
                                  item.id === emp.id
                                    ? {
                                        ...item,
                                        payScale: scale,
                                        gradePay: m ? m.gradePay : item.gradePay,
                                        cadreClass: m ? m.cadreClass : item.cadreClass,
                                        insuranceGroup: m?.defaultGISGroup || item.insuranceGroup,
                                      }
                                    : item
                                )
                              );
                            }}
                            className="w-full h-7 text-[11px] font-semibold border border-blue-300 rounded px-1 text-blue-800 bg-white truncate"
                          >
                            {PAY_SCALE_CATALOG.map((m) => (
                              <option key={m.id} value={m.payScale}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {emp.gradePay || 'GP:4200'} · {emp.payLevelCell || 'LEVEL CELL-7'}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="font-medium text-slate-800">{emp.payScale || '34,500-1,12,400'}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {emp.gradePay || 'GP:4200'} · {emp.payLevelCell || 'LEVEL CELL-7'}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-slate-900 font-mono">
                      {isGridMode ? (
                        <input
                          type="number"
                          value={emp.currentPay || ''}
                          onChange={(e) => handleGridCellChange(emp.id, 'currentPay', Number(e.target.value))}
                          className="w-24 h-7 text-right font-bold text-xs border rounded px-1.5 font-mono text-blue-700 bg-blue-50/50"
                        />
                      ) : (
                        INR(pay)
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-800 font-mono">
                      {isGridMode ? (
                        <input
                          type="number"
                          value={emp.da || ''}
                          onChange={(e) => handleGridCellChange(emp.id, 'da', Number(e.target.value))}
                          className="w-20 h-7 text-right font-medium text-xs border rounded px-1.5 font-mono"
                        />
                      ) : (
                        INR(da)
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-blue-900 font-mono">
                      {INR(gross)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-amber-900 font-mono">
                      {INR(deds)}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-700 font-mono text-base">
                      {INR(net)}
                    </td>
                    <td className="px-3 py-2 text-xs">
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
                    <td className="px-3 py-2">
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
