import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronLeft, CreditCard, FilePlus, Pencil, ArrowRight, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useUIStore } from '@/core/stores/ui-store';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { gtr30MonthKeyFor, gtr30MonthOptions, gtr30YearOptions } from '../utils/gtr30MonthKey';
import { gtr30BillFormService } from '../services/gtr30BillForm.service';
import { gtr30EmployeeTransformService } from '../services/gtr30EmployeeTransform.service';
import { useGTR30Settings } from '../hooks/useGTR30Settings';
import { useGTR30BillCodeMappings, useHydrateGTR30BillCodeMappings } from '../hooks/useGTR30BillCodeMappings';
import { useGTR30EmployeeMasterGroups, useHydrateGTR30EmployeeMaster } from '../hooks/useGTR30EmployeeMaster';
import { useGtr30Bills } from '../hooks/useGTR30Bills';
import { useGtr30SaveBill } from '../hooks/useGTR30BillMutations';
import { useToast } from '@/hooks/use-toast';
import { gtr30ResolveEmployees } from '../services/gtr30EmployeeMaster.service';
import { useEffectiveDARate } from '../hooks/useGTR30Settings';

const INR = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

export function GTR30LaunchPage() {
  const navigate = useNavigate();
  const activeFY = useUIStore((state) => state.activeFinancialYear) ?? 2026;
  const { toast } = useToast();
  const billsQuery = useGtr30Bills();
  const saveMutation = useGtr30SaveBill();
  const settingsQuery = useGTR30Settings();
  const mappingsQuery = useGTR30BillCodeMappings();
  const groupsQuery = useGTR30EmployeeMasterGroups();
  const hydrateMappings = useHydrateGTR30BillCodeMappings();
  const hydrateMaster = useHydrateGTR30EmployeeMaster();

  const bills = billsQuery.data ?? [];

  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    void hydrateMappings.mutateAsync().catch(() => {});
    void hydrateMaster.mutateAsync().catch(() => {});
  }, [hydrateMappings, hydrateMaster]);

  const billCodeMappings = mappingsQuery.data ?? [];
  const employeeGroups = groupsQuery.data ?? {};

  const [month, setMonth] = useState('July');
  const [year, setYear] = useState(activeFY);

  const monthKey = gtr30MonthKeyFor(month, year);
  const effectiveDaForMonth = useEffectiveDARate(monthKey);
  const selectStyle =
    'w-full h-9 rounded-md border border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700 px-2 text-sm';

  const existingFor = (billCode: string) =>
    bills.find((b) => b.monthOf === monthKey.trim() && b.billCode === billCode);

  const createBill = async (billCode: string) => {
    const month = monthKey.trim();
    if (!month) {
      toast({ title: 'Missing Month', description: 'Enter Month and Year first.' });
      return;
    }
    const { rows, isFallback, sourceKey } = gtr30ResolveEmployees(employeeGroups, month, billCode);
    if (rows.length === 0) {
      toast({
        title: 'No Master Found',
        description: `No employees found for ${billCode} · ${month}. Register employees in Employee Management first.`,
        variant: 'destructive',
      });
      return;
    }
    const bundle = settingsQuery.data;
    const base = bundle
      ? gtr30BillFormService.buildNewBillFormData({
          settings: bundle.settings,
          employeeTemplate: bundle.employeeTemplate,
          defaultPosts: bundle.defaultPosts,
        })
      : gtr30BillFormService.emptyFormData();
    const formData = {
      ...base,
      // eslint-disable-next-line react-hooks/purity -- Date.now() runs in an onClick handler, not during render
      billRegisterNo: `${billCode}-${month}-${Date.now().toString().slice(-4)}`,
      monthOf: month,
      billCode,
      employees: rows.map((master, idx) =>
        gtr30EmployeeTransformService.masterToBillEmployee(master, idx + 1, undefined, {
          monthKey: month,
          daRate: effectiveDaForMonth,
          forceDaRecalc: true,
        })
      ),
    };
    try {
      const saved = await saveMutation.mutateAsync({ form: formData, existing: null });
      toast({
        title: 'Bill Created',
        description: isFallback
          ? `${rows.length} employee(s) added for ${billCode} · ${month} (fallback from ${sourceKey}).`
          : `${rows.length} employee(s) added for ${billCode} · ${month}.`,
      });
      navigate(`/gtr30/edit/${saved.id}`);
    } catch (error) {
      toast({
        title: 'Create failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-20">
      <WorkspaceHeader
        eyebrow="Bill Creation · GTR-30"
        title="Create GTR-30 Pay Bill"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/gtr30/list')}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Register
          </Button>
        }
      />

      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h2 className="font-bold text-md text-slate-900 dark:text-white">Select Bill Month &amp; Year</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Month</Label>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className={selectStyle}>
              {gtr30MonthOptions().map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Year (FY)</Label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectStyle}>
              {gtr30YearOptions(activeFY).map((y) => (
                <option key={y} value={y}>
                  {y}-{String(y + 1).slice(-2)}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 self-end pb-2">
            Salary entries saved in Employee Master for this month will be picked up automatically.
          </div>
        </div>
      </Card>

      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <h2 className="font-bold text-md text-slate-900 dark:text-white">Bills by Bill Code</h2>
        </div>

        <div className="bg-slate-50/70 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-800 text-left text-xs uppercase font-bold text-slate-600 dark:text-slate-400">
                <th className="px-3.5 py-2.5">Bill Code</th>
                <th className="px-3.5 py-2.5">Description</th>
                <th className="px-3.5 py-2.5">Employees in Master</th>
                <th className="px-3.5 py-2.5">Pay Total (₹)</th>
                <th className="px-3.5 py-2.5">Status</th>
                <th className="px-3.5 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {billCodeMappings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                    No Bill Codes defined. Add them in Bill Settings.
                  </td>
                </tr>
              )}
              {billCodeMappings.map((mapping) => {
                const { rows: monthRows, isFallback, sourceKey } = gtr30ResolveEmployees(employeeGroups, monthKey.trim(), mapping.billCode);
                const payTotal = monthRows.reduce((sum, m) => sum + (m.currentPay || 0), 0);
                const existing = existingFor(mapping.billCode);
                return (
                  <tr key={mapping.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-3.5 py-3 font-bold text-blue-700 dark:text-blue-400 font-mono">{mapping.billCode}</td>
                    <td className="px-3.5 py-3 text-slate-600 dark:text-slate-300">{mapping.description}</td>
                    <td className="px-3.5 py-3">
                      {monthRows.length === 0 ? (
                        <span className="text-slate-400 text-xs">No entries in master</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-900 dark:text-white">{monthRows.length}</span>
                          <span className="text-xs text-slate-400 truncate max-w-[220px]">
                            {monthRows.map((e) => e.name || e.hrpnNo || 'Unnamed').join(', ')}
                          </span>
                          {isFallback && sourceKey && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium" title={`Fallback from ${sourceKey}`}>
                              via {sourceKey.split('|')[0]}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3.5 py-3 font-mono">
                      {monthRows.length === 0 ? (
                        <span className="text-slate-300 text-xs">—</span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {INR(payTotal)}
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-3">
                      {existing ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            existing.status === 'passed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                              : existing.status === 'submitted'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {existing.status}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Not created</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      {existing ? (
                        <Button size="sm" variant="outline" onClick={() => navigate(`/gtr30/edit/${existing.id}`)} className="h-8 text-xs font-semibold">
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Bill
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => createBill(mapping.billCode)} className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
                          <FilePlus className="h-3.5 w-3.5 mr-1" /> Create Bill
                          <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          One bill is created per Bill Code for the selected month. Employees entered in Employee
          Master under the same month + bill code are picked up automatically. If no exact month
          match exists, the system falls back to
          <span className="font-semibold"> master</span> or any existing group for that Bill Code and marks it as
          <span className="font-mono text-amber-700 dark:text-amber-400"> via fallback</span>.
        </p>
      </Card>
    </div>
  );
}