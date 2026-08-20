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
import { useGTR30EmployeeMasterGroups, gtr30GroupKey, useHydrateGTR30EmployeeMaster } from '../hooks/useGTR30EmployeeMaster';
import { useGtr30Bills } from '../hooks/useGTR30Bills';
import { useGtr30SaveBill } from '../hooks/useGTR30BillMutations';
import { useToast } from '@/hooks/use-toast';

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
    const rows =
      employeeGroups[gtr30GroupKey(month, billCode)] ??
      employeeGroups[gtr30GroupKey('July-2026', billCode)] ??
      employeeGroups[gtr30GroupKey('master', billCode)] ??
      [];
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
      employees: rows.map((master, idx) => gtr30EmployeeTransformService.masterToBillEmployee(master, idx + 1)),
    };
    try {
      const saved = await saveMutation.mutateAsync({ form: formData, existing: null });
      toast({
        title: 'Bill Created',
        description: `${rows.length} employee(s) added for ${billCode} · ${month}.`,
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

      <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h2 className="font-bold text-md text-slate-900">Select Bill Month &amp; Year</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Month</Label>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className={selectStyle}>
              {gtr30MonthOptions().map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Year (FY)</Label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectStyle}>
              {gtr30YearOptions(activeFY).map((y) => (
                <option key={y} value={y}>
                  {y}-{String(y + 1).slice(-2)}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-slate-500 self-end pb-2">
            Salary entries saved in Employee Master for this month will be picked up automatically.
          </div>
        </div>
      </Card>

      <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <h2 className="font-bold text-md text-slate-900">Bills by Bill Code</h2>
        </div>

        <div className="bg-slate-50 rounded-lg border overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                <th className="px-3 py-2">Bill Code</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Employees in Master</th>
                <th className="px-3 py-2">Pay Total (₹)</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {billCodeMappings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                    No Bill Codes defined. Add them in Bill Settings.
                  </td>
                </tr>
              )}
              {billCodeMappings.map((mapping) => {
                const monthRows = employeeGroups[gtr30GroupKey(monthKey.trim(), mapping.billCode)] ?? [];
                const payTotal = monthRows.reduce((sum, m) => sum + (m.currentPay || 0), 0);
                const existing = existingFor(mapping.billCode);
                return (
                  <tr key={mapping.id} className="border-t border-slate-200">
                    <td className="px-3 py-2 font-bold text-blue-700">{mapping.billCode}</td>
                    <td className="px-3 py-2 text-slate-600">{mapping.description}</td>
                    <td className="px-3 py-2">
                      {monthRows.length === 0 ? (
                        <span className="text-slate-400 text-xs">No entries in master</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-medium">{monthRows.length}</span>
                          <span className="text-xs text-slate-400 truncate max-w-[220px]">
                            {monthRows.map((e) => e.name || e.hrpnNo || 'Unnamed').join(', ')}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {monthRows.length === 0 ? (
                        <span className="text-slate-300 text-xs">—</span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-600">
                          {INR(payTotal)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {existing ? (
                        <span
                          className={`text-xs font-semibold uppercase ${
                            existing.status === 'passed'
                              ? 'text-emerald-600'
                              : existing.status === 'submitted'
                              ? 'text-blue-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {existing.status}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">Not created</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {existing ? (
                        <Button size="sm" variant="outline" onClick={() => navigate(`/gtr30/edit/${existing.id}`)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Bill
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => createBill(mapping.billCode)}>
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
        <p className="text-xs text-slate-500">
          One bill is created per Bill Code for the selected month. Employees entered in Employee
          Master under the same month + bill code are picked up automatically.
        </p>
      </Card>
    </div>
  );
}