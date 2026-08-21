import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Copy,
  Download,
  Edit,
  Eye,
  FilePlus,
  FileText,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  ArrowRight,
  Settings,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import {
  useGtr30Bills,
  useGtr30DeleteBill,
  useGtr30DuplicateBill,
  useGtr30SaveBill,
  gtr30BillsService,
} from '../hooks';
import {
  useGTR30EmployeeMasterGroups,
  useHydrateGTR30EmployeeMaster,
} from '../hooks/useGTR30EmployeeMaster';
import { gtr30ResolveEmployees } from '../services/gtr30EmployeeMaster.service';
import { gtr30EmployeeTransformService } from '../services/gtr30EmployeeTransform.service';
import { billTotals, formatMoney } from '../services/gtr30Calc.service';
import type { GTR30Bill, GTR30FormData } from '../types';

export function GTR30ListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const billsQuery = useGtr30Bills();
  const deleteMutation = useGtr30DeleteBill();
  const duplicateMutation = useGtr30DuplicateBill();
  const saveMutation = useGtr30SaveBill();
  const groupsQuery = useGTR30EmployeeMasterGroups();
  const hydrateMaster = useHydrateGTR30EmployeeMaster();
  const bills = useMemo(() => billsQuery.data ?? [], [billsQuery.data]);
  const employeeGroups = groupsQuery.data ?? {};
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    void hydrateMaster.mutateAsync().catch(() => {});
  }, [hydrateMaster]);

  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const stats = useMemo(() => {
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalEmployees = 0;

    for (const b of bills) {
      const t = billTotals(b);
      totalGross += t.gross;
      totalDeductions += t.deductions;
      totalNet += t.net;
      totalEmployees += (b.employees || []).length;
    }

    return {
      count: bills.length,
      totalGross,
      totalDeductions,
      totalNet,
      totalEmployees,
    };
  }, [bills]);

  const filteredBills = useMemo(() => {
    if (!searchTerm.trim()) return bills;
    const term = searchTerm.toLowerCase();
    return bills.filter((b) => {
      const regNo = (b.billRegisterNo || '').toLowerCase();
      const month = (b.monthOf || '').toLowerCase();
      const office = (b.officeName || '').toLowerCase();
      const hasEmp = (b.employees || []).some((e) => (e.name || '').toLowerCase().includes(term));
      return regNo.includes(term) || month.includes(term) || office.includes(term) || hasEmp;
    });
  }, [bills, searchTerm]);

  const handleDuplicate = async (bill: GTR30Bill) => {
    await duplicateMutation.mutateAsync(bill);
    toast({ title: 'Bill Duplicated', description: 'Created a copy of the bill.' });
  };

  const handleRefreshFromMaster = async (bill: GTR30Bill) => {
    const monthKey = (bill.monthOf || '').trim();
    const billCode = (bill.billCode || '').trim();
    if (!monthKey || !billCode) {
      toast({ title: 'Cannot refresh', description: 'Bill is missing month or bill code.', variant: 'destructive' });
      return;
    }
    setRefreshingId(bill.id);
    try {
      const { rows, isFallback, sourceKey } = gtr30ResolveEmployees(employeeGroups, monthKey, billCode);
      if (rows.length === 0) {
        toast({
          title: 'No Master Found',
          description: `No employees found in master for ${billCode} · ${monthKey}.`,
          variant: 'destructive',
        });
        return;
      }
      const refreshedEmployees = rows.map((master, idx) =>
        gtr30EmployeeTransformService.masterToBillEmployee(master, idx + 1, undefined, {
          monthKey,
          forceDaRecalc: true,
        })
      );
      await saveMutation.mutateAsync({
        form: { ...bill, employees: refreshedEmployees },
        existing: bill,
      });
      toast({
        title: 'Bill Refreshed',
        description: isFallback
          ? `${refreshedEmployees.length} employee(s) re-synced from ${sourceKey ?? 'fallback master'}.`
          : `${refreshedEmployees.length} employee(s) re-synced from master.`,
      });
    } catch (error) {
      toast({
        title: 'Refresh failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    setDeleteTarget(null);
    toast({ title: 'Bill Deleted', description: 'The bill has been removed from register.' });
  };

  const handleExportAll = () => {
    if (bills.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(
      gtr30BillsService.exportAllAsJson(bills)
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `GTR30_Register_Export_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast({ title: 'Export Completed', description: 'All bills exported as JSON.' });
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const incoming = gtr30BillsService.parseImportedJson(content);
        if (incoming.length === 0) {
          throw new Error('No valid bills found in file');
        }
        let importedCount = 0;
        for (const incomingBill of incoming) {
          const { id: _id, createdDate: _cd, updatedDate: _ud, ...form } = incomingBill;
          void _id;
          void _cd;
          void _ud;
          await saveMutation.mutateAsync({
            form: form as GTR30FormData,
            existing: null,
          });
          importedCount++;
        }
        toast({
          title: 'Import Successful',
          description: `Imported ${importedCount} bill(s) into the register.`,
        });
      } catch {
        toast({
          title: 'Import Failed',
          description: 'Invalid JSON format.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <WorkspaceHeader
        eyebrow="Bill Creation · Register"
        title="GTR-30 Pay Bill Register"
        actions={
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Import JSON
                </span>
              </Button>
            </label>
            <Button variant="outline" size="sm" onClick={handleExportAll} disabled={bills.length === 0}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export Register
            </Button>
            <Button size="sm" onClick={() => navigate('/gtr30/create')} className="font-bold">
              <FilePlus className="mr-1.5 h-4 w-4" /> Create Pay Bill
            </Button>
          </div>
        }
      />

      {/* KPI Stats Header */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Total Pay Bills</div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{stats.count}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{stats.totalEmployees} total staff members</div>
        </Card>
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Gross Expenditure</div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white font-mono">
            ₹{formatMoney(stats.totalGross)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Salaries &amp; allowances</div>
        </Card>
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="text-xs font-bold uppercase text-rose-600 dark:text-rose-400">Total Deductions</div>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">
            ₹{formatMoney(stats.totalDeductions)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">NPS, Rent, PT, GIS &amp; Taxes</div>
        </Card>
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">Net Disbursed</div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            ₹{formatMoney(stats.totalNet)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Cheques / Bank transfers</div>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Bill No, Month, Office, or Employee name..."
            className="pl-9 text-sm bg-white dark:bg-slate-900 dark:border-slate-800"
          />
        </div>
      </div>

      {/* Bill List Table */}
      {filteredBills.length === 0 ? (
        bills.length === 0 ? (
          /* Guided Onboarding Card for First Time Users */
          <Card className="border border-blue-200 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 p-8 rounded-2xl shadow-sm text-center">
            <div className="max-w-xl mx-auto space-y-6">
              <div className="inline-flex p-3.5 rounded-2xl bg-blue-600/10 text-blue-600 border border-blue-200 dark:border-blue-800">
                <FileText className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Get Started with GTR-30 Pay Bills</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Follow these 3 quick steps to configure and generate your official 10-page government pay bills.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 text-left">
                <div
                  onClick={() => navigate('/gtr30/settings')}
                  className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between text-blue-600 mb-2">
                    <Settings className="h-5 w-5" />
                    <span className="text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">Step 1</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">Bill Settings</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Configure DDO, office, and standard bill codes.</p>
                </div>

                <div
                  onClick={() => navigate('/gtr30/employee-management')}
                  className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between text-indigo-600 mb-2">
                    <Users className="h-5 w-5" />
                    <span className="text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-full">Step 2</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">Employee Directory</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Register staff profiles &amp; 7th Pay Matrix scales.</p>
                </div>

                <div
                  onClick={() => navigate('/gtr30/create')}
                  className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between text-emerald-600 mb-2">
                    <FilePlus className="h-5 w-5" />
                    <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">Step 3</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">Create Pay Bill</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Auto-calculate DA, generate 10-sheet PDF.</p>
                </div>
              </div>

              <div className="pt-2">
                <Button onClick={() => navigate('/gtr30/create')} className="bg-blue-600 hover:bg-blue-700 font-bold text-xs px-6 shadow-md shadow-blue-600/20">
                  <FilePlus className="mr-1.5 h-4 w-4" /> Create First GTR-30 Bill <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={FileText}
            title="No matching bills found"
            hint="Try searching with a different keyword or clear the search filter."
            action={
              <Button variant="outline" onClick={() => setSearchTerm('')}>
                Clear Search
              </Button>
            }
          />
        )
      ) : (
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse" aria-label="GTR-30 Pay Bill Register">
              <thead>
                <tr className="bg-slate-100/75 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                  <th scope="col" className="p-3.5">Bill Reg. No.</th>
                  <th scope="col" className="p-3.5">Office &amp; Month</th>
                  <th scope="col" className="p-3.5 text-center">Status</th>
                  <th scope="col" className="p-3.5 text-center">Staff Count</th>
                  <th scope="col" className="p-3.5 text-right">Gross Amount</th>
                  <th scope="col" className="p-3.5 text-right">Deductions</th>
                  <th scope="col" className="p-3.5 text-right">Net Payable</th>
                  <th scope="col" className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredBills.map((bill) => {
                  const t = billTotals(bill);
                  const status = bill.status || 'draft';
                  return (
                    <tr key={bill.id} className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        <div className="font-mono">{bill.billRegisterNo || 'Draft'}</div>
                        <div className="text-xs font-normal text-slate-400">{bill.billDate || 'No date'}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{bill.officeName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{bill.monthOf}</div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            status === 'passed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                              : status === 'submitted'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              status === 'passed'
                                ? 'bg-emerald-500'
                                : status === 'submitted'
                                ? 'bg-blue-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          {status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                          {(bill.employees || []).length} Staff
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                        ₹{formatMoney(t.gross)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-rose-600 dark:text-rose-400">
                        ₹{formatMoney(t.deductions)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 text-base">
                        ₹{formatMoney(t.net)}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                            title="View Full Bill"
                            aria-label={`View bill ${bill.billRegisterNo || bill.id}`}
                            onClick={() => navigate(`/gtr30/view/${bill.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                            title="Edit Bill"
                            aria-label={`Edit bill ${bill.billRegisterNo || bill.id}`}
                            onClick={() => navigate(`/gtr30/edit/${bill.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                            title="Re-sync employees from Master"
                            aria-label={`Re-sync employees from Master for bill ${bill.billRegisterNo || bill.id}`}
                            disabled={refreshingId === bill.id}
                            onClick={() => handleRefreshFromMaster(bill)}
                          >
                            <RefreshCw className={`h-4 w-4 ${refreshingId === bill.id ? 'animate-spin' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                            title="Duplicate Bill"
                            aria-label={`Duplicate bill ${bill.billRegisterNo || bill.id}`}
                            onClick={() => handleDuplicate(bill)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                            title="Delete Bill"
                            aria-label={`Delete bill ${bill.billRegisterNo || bill.id}`}
                            onClick={() => setDeleteTarget(bill.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Confirm Bill Deletion"
        message="Are you sure you want to delete this GTR-30 pay bill from the register? This action cannot be undone."
        confirmLabel="Delete Bill"
        danger={true}
        busy={deleteMutation.isPending}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
