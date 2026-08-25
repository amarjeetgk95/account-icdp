import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ArrowDown,
  CheckCircle2,
  Copy,
  Download,
  Edit,
  Eye,
  FilePlus,
  FileText,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { EmptyState } from '@/shared/components/EmptyState';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { StatCardSkeleton, SkeletonTable } from '@/shared/components/Skeleton';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import { MONTHS } from '@/shared/constants';
import {
  useGtr30Bills,
  useGtr30DeleteBill,
  useGtr30DuplicateBill,
  useGtr30SaveBill,
  useGtr30UpdateBillStatus,
  gtr30BillsService,
} from '../hooks';
import {
  useGTR30EmployeeMasterGroups,
  useHydrateGTR30EmployeeMaster,
} from '../hooks/useGTR30EmployeeMaster';
import { gtr30ResolveEmployees } from '../services/gtr30EmployeeMaster.service';
import { gtr30EmployeeTransformService } from '../services/gtr30EmployeeTransform.service';
import { billTotals, formatMoney } from '../services/gtr30Calc.service';
import { gtr30ParseMonthKey } from '../utils/gtr30MonthKey';
import { GTR30_SETTINGS_STORAGE_KEY } from '../constants/settings';
import type { GTR30Bill, GTR30FormData } from '../types';

interface RowActionsMenuProps {
  bill: GTR30Bill;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUpdateStatus: (status: GTR30Bill['status']) => void;
}

interface MenuPosition {
  left: number;
  top?: number;
  bottom?: number;
}

function RowActionsMenu({ bill, onView, onEdit, onDuplicate, onDelete, onUpdateStatus }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const MENU_WIDTH = 240;
    const MENU_HEIGHT = 340;
    const openUp = rect.bottom + MENU_HEIGHT > window.innerHeight;
    setPos(
      openUp
        ? { left: Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)), bottom: window.innerHeight - rect.top + 8 }
        : { left: Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)), top: rect.bottom + 8 }
    );
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      if (buttonRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handleScroll = () => setOpen(false);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [open]);

  const itemClass =
    'w-full justify-start h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-300';

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        title="More actions"
        aria-label={`More actions for bill ${bill.billRegisterNo || bill.id}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              left: pos.left,
              top: pos.top,
              bottom: pos.bottom,
            }}
            className="fixed z-50 w-60 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 shadow-lg shadow-slate-900/10"
          >
            <Button variant="ghost" className={itemClass} onClick={() => { close(); onView(); }}>
              <Eye className="h-3.5 w-3.5 mr-2" /> View Full Bill
            </Button>
            <Button variant="ghost" className={itemClass} onClick={() => { close(); onEdit(); }}>
              <Edit className="h-3.5 w-3.5 mr-2" /> Edit Bill
            </Button>
            <Button variant="ghost" className={itemClass} onClick={() => { close(); onDuplicate(); }}>
              <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate Bill
            </Button>
            <div className="my-1 h-px bg-slate-200 dark:bg-slate-800" />
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Change Status</div>
            {(bill.status || 'draft') === 'draft' && (
              <Button variant="ghost" className="w-full justify-start h-8 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40" onClick={() => { close(); onUpdateStatus('submitted'); }}>
                <Send className="h-3.5 w-3.5 mr-2" /> Submit Bill
              </Button>
            )}
            {(bill.status || 'draft') === 'submitted' && (
              <>
                <Button variant="ghost" className="w-full justify-start h-8 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40" onClick={() => { close(); onUpdateStatus('passed'); }}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Mark Passed
                </Button>
                <Button variant="ghost" className="w-full justify-start h-8 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40" onClick={() => { close(); onUpdateStatus('rejected'); }}>
                  <XCircle className="h-3.5 w-3.5 mr-2" /> Mark Rejected
                </Button>
              </>
            )}
            {((bill.status || 'draft') === 'passed' || (bill.status || 'draft') === 'rejected') && (
              <Button variant="ghost" className="w-full justify-start h-8 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { close(); onUpdateStatus('draft'); }}>
                <RotateCcw className="h-3.5 w-3.5 mr-2" /> Reopen as Draft
              </Button>
            )}
            {(bill.status || 'draft') === 'draft' && (
              <Button variant="ghost" className="w-full justify-start h-8 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40" onClick={() => { close(); onUpdateStatus('passed'); }}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Quick Pass (Draft → Passed)
              </Button>
            )}
            <div className="my-1 h-px bg-slate-200 dark:bg-slate-800" />
            <Button
              variant="ghost"
              className="w-full justify-start h-8 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              onClick={() => { close(); onDelete(); }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Bill
            </Button>
          </div>,
          document.body
        )}
    </>
  );
}

export function GTR30ListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const billsQuery = useGtr30Bills();
  const deleteMutation = useGtr30DeleteBill();
  const duplicateMutation = useGtr30DuplicateBill();
  const saveMutation = useGtr30SaveBill();
  const updateStatusMutation = useGtr30UpdateBillStatus();
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
  const [sortKey, setSortKey] = useState<'billRegisterNo' | 'officeName' | 'monthOf' | 'net'>('monthOf');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');

  const monthSortValue = (monthKey: string): number => {
    const parsed = gtr30ParseMonthKey(monthKey);
    if (!parsed) return Number.NEGATIVE_INFINITY;
    return parsed.year * 100 + MONTHS.indexOf(parsed.month);
  };

  const settingsConfigured = typeof window !== 'undefined' && localStorage.getItem(GTR30_SETTINGS_STORAGE_KEY) !== null;
  const masterHasEmployees = Object.values(employeeGroups).some((g) => g.length > 0);

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

  // eslint-disable-next-line react-hooks/exhaustive-deps -- pure helper, stable output
  const monthlyTotals = useMemo(() => {
    const map = new Map<string, { sk: number; label: string; gross: number; net: number; count: number }>();
    for (const b of bills) {
      const parsed = gtr30ParseMonthKey(b.monthOf || '');
      if (!parsed) continue;
      const sk = parsed.year * 100 + MONTHS.indexOf(parsed.month);
      const cur = map.get(b.monthOf) ?? { sk, label: b.monthOf, gross: 0, net: 0, count: 0 };
      const t = billTotals(b);
      cur.gross += t.gross;
      cur.net += t.net;
      cur.count += 1;
      map.set(b.monthOf, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.sk - a.sk);
  }, [bills]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- monthSortValue is a pure local helper
  const monthsInRegister = useMemo(() => {
    const set = new Set<string>();
    for (const b of bills) if (b.monthOf) set.add(b.monthOf);
    return Array.from(set).sort((a, b) => monthSortValue(b) - monthSortValue(a));
  }, [bills]);

  const latestMonth = monthlyTotals[0];
  const previousMonth = monthlyTotals[1];

  const filteredBills = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return bills.filter((b) => {
      if (statusFilter !== 'all' && (b.status || 'draft') !== statusFilter) return false;
      if (monthFilter !== 'all' && b.monthOf !== monthFilter) return false;
      if (!term) return true;
      const regNo = (b.billRegisterNo || '').toLowerCase();
      const month = (b.monthOf || '').toLowerCase();
      const office = (b.officeName || '').toLowerCase();
      const hasEmp = (b.employees || []).some((e) => (e.name || '').toLowerCase().includes(term));
      return regNo.includes(term) || month.includes(term) || office.includes(term) || hasEmp;
    });
  }, [bills, searchTerm, statusFilter, monthFilter]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- monthSortValue is a pure local helper
  const sortedBills = useMemo(() => {
    const sorted = [...filteredBills].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'billRegisterNo') cmp = (a.billRegisterNo || '').localeCompare(b.billRegisterNo || '');
      else if (sortKey === 'officeName') cmp = (a.officeName || '').localeCompare(b.officeName || '');
      else if (sortKey === 'monthOf') cmp = monthSortValue(a.monthOf) - monthSortValue(b.monthOf);
      else cmp = billTotals(a).net - billTotals(b).net;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredBills, sortKey, sortDir]);

  const toggleSort = (key: 'billRegisterNo' | 'officeName' | 'monthOf' | 'net') => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'net' || key === 'monthOf' ? 'desc' : 'asc');
    }
  };

  const filtersActive = searchTerm.trim() !== '' || statusFilter !== 'all' || monthFilter !== 'all';
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setMonthFilter('all');
  };

  const handleDuplicate = async (bill: GTR30Bill) => {
    await duplicateMutation.mutateAsync(bill);
    toast({ title: 'Bill Duplicated', description: 'Created a copy of the bill.' });
  };

  const handleUpdateStatus = async (bill: GTR30Bill, status: GTR30Bill['status']) => {
    try {
      await updateStatusMutation.mutateAsync({ id: bill.id, status });
      toast({ title: 'Status Updated', description: `Bill ${bill.billRegisterNo || bill.id} marked as ${status}.` });
    } catch (error) {
      toast({ title: 'Status update failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    }
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

      {billsQuery.isLoading ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <SkeletonTable rows={4} cols={6} />
        </>
      ) : (
        <>
          {/* KPI Stats Header — uses global stat-tile / card tokens + stat-label/value/sub */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className={cn('stat-tile p-4 hover:shadow-md transition-shadow')}>
              <div className="stat-label">Total Pay Bills</div>
              <div className="stat-value">{stats.count}</div>
              <div className="stat-sub">{stats.totalEmployees} total staff members</div>
              {previousMonth && (
                <div className={cn('stat-delta', latestMonth.count >= previousMonth.count ? 'stat-delta-up' : 'stat-delta-down')}>
                  {latestMonth.count >= previousMonth.count ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {latestMonth.count - previousMonth.count >= 0 ? '+' : ''}
                  {latestMonth.count - previousMonth.count}
                  <span className="text-slate-400 font-normal">vs {previousMonth.label}</span>
                </div>
              )}
            </Card>
            <Card className={cn('stat-tile p-4 hover:shadow-md transition-shadow')}>
              <div className="stat-label">Gross Expenditure</div>
              <div className="stat-value text-money">₹{formatMoney(stats.totalGross)}</div>
              <div className="stat-sub">Salaries &amp; allowances</div>
              {previousMonth && previousMonth.gross > 0 && (
                <div className={cn('stat-delta', latestMonth.gross >= previousMonth.gross ? 'stat-delta-up' : 'stat-delta-down')}>
                  {latestMonth.gross >= previousMonth.gross ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {(((latestMonth.gross - previousMonth.gross) / previousMonth.gross) * 100).toFixed(1)}%
                  <span className="text-slate-400 font-normal">vs {previousMonth.label}</span>
                </div>
              )}
            </Card>
            <Card className={cn('stat-tile stat-tile-accent border-l-rose-500 p-4 hover:shadow-md transition-shadow')}>
              <div className="stat-label text-rose-600">Total Deductions</div>
              <div className="stat-value text-money text-rose-600">₹{formatMoney(stats.totalDeductions)}</div>
              <div className="stat-sub">NPS, Rent, PT, GIS &amp; Taxes</div>
            </Card>
            <Card className={cn('stat-tile stat-tile-accent border-l-emerald-500 p-4 hover:shadow-md transition-shadow')}>
              <div className="stat-label text-emerald-600">Net Disbursed</div>
              <div className="stat-value text-money text-emerald-600">₹{formatMoney(stats.totalNet)}</div>
              <div className="stat-sub">Cheques / Bank transfers</div>
              {previousMonth && previousMonth.net > 0 && (
                <div className={cn('stat-delta', latestMonth.net >= previousMonth.net ? 'stat-delta-up' : 'stat-delta-down')}>
                  {latestMonth.net >= previousMonth.net ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {(((latestMonth.net - previousMonth.net) / previousMonth.net) * 100).toFixed(1)}%
                  <span className="text-slate-400 font-normal">vs {previousMonth.label}</span>
                </div>
              )}
            </Card>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Bill No, Month, Office, or Employee name..."
                className="pl-9 text-sm bg-white dark:bg-slate-900 dark:border-slate-800"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                {(
                  [
                    ['all', 'All'],
                    ['draft', 'Draft'],
                    ['submitted', 'Submitted'],
                    ['passed', 'Passed'],
                    ['rejected', 'Rejected'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap',
                      statusFilter === value
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    )}
                    aria-pressed={statusFilter === value}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-semibold text-slate-700 dark:text-slate-300"
                aria-label="Filter by month"
              >
                <option value="all">All months</option>
                {monthsInRegister.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              {filtersActive && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-slate-500">
                  Clear filters
                </Button>
              )}
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
                      className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer group shadow-xs"
                    >
                      <div className="flex items-center justify-between text-blue-600 mb-2">
                        <Settings className="h-5 w-5" />
                        {settingsConfigured ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/60 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" /> Done
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">Step 1</span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">Bill Settings</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Configure DDO, office, and standard bill codes.</p>
                    </div>

                    <div
                      onClick={() => navigate('/gtr30/employee-management')}
                      className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer group shadow-xs"
                    >
                      <div className="flex items-center justify-between text-indigo-600 mb-2">
                        <Users className="h-5 w-5" />
                        {masterHasEmployees ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/60 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" /> Done
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-full">Step 2</span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">Employee Directory</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Register staff profiles &amp; 7th Pay Matrix scales.</p>
                    </div>

                    <div
                      onClick={() => navigate('/gtr30/create')}
                      className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all cursor-pointer group shadow-xs"
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
                hint="Try searching with a different keyword or clear the filters."
                action={
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                }
              />
            )
          ) : (
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden rounded-2xl">
              <div className="max-h-[calc(100vh-15rem)] overflow-auto overscroll-contain">
                <table className="table" aria-label="GTR-30 Pay Bill Register">
                  <thead>
                    <tr>
                      <th scope="col">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 uppercase font-bold text-[0.72rem] tracking-[0.05em] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                          onClick={() => toggleSort('billRegisterNo')}
                        >
                          Bill Reg. No.
                          {sortKey === 'billRegisterNo' ? (
                            sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600" /> : <ArrowDown className="h-3 w-3 text-blue-600" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </button>
                      </th>
                      <th scope="col">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 uppercase font-bold text-[0.72rem] tracking-[0.05em] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                          onClick={() => toggleSort('monthOf')}
                        >
                          Office &amp; Month
                          {sortKey === 'monthOf' ? (
                            sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600" /> : <ArrowDown className="h-3 w-3 text-blue-600" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </button>
                      </th>
                      <th scope="col" className="text-center">Status</th>
                      <th scope="col" className="text-center">Staff Count</th>
                      <th scope="col" className="text-right">Gross Amount</th>
                      <th scope="col" className="text-right">Deductions</th>
                      <th scope="col" className="text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 uppercase font-bold text-[0.72rem] tracking-[0.05em] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                          onClick={() => toggleSort('net')}
                        >
                          Net Payable
                          {sortKey === 'net' ? (
                            sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600" /> : <ArrowDown className="h-3 w-3 text-blue-600" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </button>
                      </th>
                      <th scope="col" className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBills.map((bill) => {
                      const t = billTotals(bill);
                      const status = bill.status || 'draft';
                      return (
                        <tr key={bill.id} className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                            <div className="font-mono">{bill.billRegisterNo || 'Draft'}</div>
                            <div className="text-xs font-normal text-slate-500 dark:text-slate-400">{bill.billDate || 'No date'}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-medium text-slate-800 dark:text-slate-200">{bill.officeName}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{bill.monthOf}</div>
                          </td>
                          <td className="p-3.5 text-center">
                            <StatusBadge status={status} />
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                              {(bill.employees || []).length} Staff
                            </span>
                          </td>
                          <td className="p-3.5 text-right text-money font-medium tabular-nums text-slate-700 dark:text-slate-300">
                            ₹{formatMoney(t.gross)}
                          </td>
                          <td className="p-3.5 text-right text-money font-medium tabular-nums text-rose-600 dark:text-rose-400">
                            ₹{formatMoney(t.deductions)}
                          </td>
                          <td className="p-3.5 text-right text-money font-bold tabular-nums text-emerald-700 dark:text-emerald-400 text-base">
                            ₹{formatMoney(t.net)}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
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
                              <RowActionsMenu
                                bill={bill}
                                onView={() => navigate(`/gtr30/view/${bill.id}`)}
                                onEdit={() => navigate(`/gtr30/edit/${bill.id}`)}
                                onDuplicate={() => handleDuplicate(bill)}
                                onDelete={() => setDeleteTarget(bill.id)}
                                onUpdateStatus={(status) => handleUpdateStatus(bill, status)}
                              />
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
        </>
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
