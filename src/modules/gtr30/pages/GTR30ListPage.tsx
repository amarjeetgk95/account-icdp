import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Copy,
  Download,
  Edit,
  Eye,
  FilePlus,
  FileText,
  Printer,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { useToast } from '@/hooks/use-toast';
import {
  useGtr30Bills,
  useGtr30DeleteBill,
  useGtr30DuplicateBill,
  useGtr30SaveBill,
  gtr30BillsService,
} from '../hooks';
import { billTotals, formatMoney } from '../services/gtr30Calc.service';
import type { GTR30Bill, GTR30FormData } from '../types';

export function GTR30ListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const billsQuery = useGtr30Bills();
  const deleteMutation = useGtr30DeleteBill();
  const duplicateMutation = useGtr30DuplicateBill();
  const saveMutation = useGtr30SaveBill();
  const bills = useMemo(() => billsQuery.data ?? [], [billsQuery.data]);

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
        <Card className="border border-slate-200 p-4 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-500">Total Pay Bills</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{stats.count}</div>
          <div className="mt-1 text-xs text-slate-500">{stats.totalEmployees} total staff members</div>
        </Card>
        <Card className="border border-slate-200 p-4 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-500">Gross Expenditure</div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            ₹{formatMoney(stats.totalGross)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Salaries &amp; allowances</div>
        </Card>
        <Card className="border border-slate-200 p-4 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-500">Total Deductions</div>
          <div className="mt-2 text-2xl font-bold text-amber-600 font-mono">
            ₹{formatMoney(stats.totalDeductions)}
          </div>
          <div className="mt-1 text-xs text-slate-500">NPS, Rent, PT, GIS &amp; Taxes</div>
        </Card>
        <Card className="border border-slate-200 p-4 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-500">Net Disbursed</div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 font-mono">
            ₹{formatMoney(stats.totalNet)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Cheques / Bank transfers</div>
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
            className="pl-9 text-sm"
          />
        </div>
      </div>

      {/* Bill List Table */}
      {filteredBills.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={bills.length === 0 ? 'No GTR-30 Pay Bills yet' : 'No matching bills found'}
          hint={
            bills.length === 0
              ? 'Create your first GTR-30 Pay Bill using the complete 10-page official government format.'
              : 'Try searching with a different keyword or clear the search filter.'
          }
          action={
            bills.length === 0 ? (
              <Button onClick={() => navigate('/gtr30/create')}>
                <FilePlus className="mr-1.5 h-4 w-4" /> Create Pay Bill
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setSearchTerm('')}>
                Clear Search
              </Button>
            )
          }
        />
      ) : (
        <Card className="border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-xs font-bold uppercase text-slate-600">
                  <th className="p-3.5">Bill Reg. No.</th>
                  <th className="p-3.5">Office &amp; Month</th>
                  <th className="p-3.5 text-center">Staff Count</th>
                  <th className="p-3.5 text-right">Gross Amount</th>
                  <th className="p-3.5 text-right">Deductions</th>
                  <th className="p-3.5 text-right">Net Payable</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.map((bill) => {
                  const t = billTotals(bill);
                  return (
                    <tr key={bill.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">
                        <div className="font-mono">{bill.billRegisterNo || 'Draft'}</div>
                        <div className="text-xs font-normal text-slate-400">{bill.billDate || 'No date'}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-800">{bill.officeName}</div>
                        <div className="text-xs text-slate-500 font-semibold">{bill.monthOf}</div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {(bill.employees || []).length} Staff
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-slate-700">
                        ₹{formatMoney(t.gross)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium text-amber-600">
                        ₹{formatMoney(t.deductions)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-700 text-base">
                        ₹{formatMoney(t.net)}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:text-blue-600"
                            title="View Full Bill"
                            onClick={() => navigate(`/gtr30/view/${bill.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:text-blue-600"
                            title="Edit Bill"
                            onClick={() => navigate(`/gtr30/edit/${bill.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:text-emerald-600"
                            title="Print 10-Page Document"
                            onClick={() => navigate(`/gtr30/view/${bill.id}`)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:text-indigo-600"
                            title="Duplicate Bill"
                            onClick={() => handleDuplicate(bill)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-600"
                            title="Delete Bill"
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
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Confirm Bill Deletion</h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete this GTR-30 pay bill from the register? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteTarget)}>
                Delete Bill
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
