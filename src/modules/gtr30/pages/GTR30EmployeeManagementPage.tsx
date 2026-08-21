import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import {
  Users,
  UserPlus,
  Search,
  Pencil,
  Trash2,
  Download,
  Settings,
  TrendingUp,
  TrendingDown,
  SlidersHorizontal,
} from 'lucide-react';
import { useUIStore } from '@/core/stores/ui-store';
import {
  useHydrateGTR30EmployeeMaster,
  useGTR30EmployeeMasterGroups,
  useRemoveGTR30EmployeeAcrossGroups,
  useRemoveGTR30EmployeeBatch,
} from '../hooks/useGTR30EmployeeMaster';
import { useHydrateGTR30BillCodeMappings, useGTR30BillCodeMappings } from '../hooks/useGTR30BillCodeMappings';
import { GTR30EmployeeImport } from '../components/GTR30EmployeeImport';
import { GTR30SyncStatusBadge } from '../components/GTR30SyncStatusBadge';
import { exportMasterToCsv, downloadCsvFile } from '../utils/gtr30Csv';
import { calculateEmployeeSalary } from '../utils/gtr30SalaryCalc';
import type { GTR30EmployeeMaster } from '../types';

const PAGE_SIZE = 50;

export function GTR30EmployeeManagementPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const activeFY = useUIStore((state) => state.activeFinancialYear) ?? 2026;

  // Master directory is month-independent: the pay matrix dates decide monthly pay.
  // Employees live in a canonical group that every bill month resolves to.
  const monthKey = `July-${activeFY}`;

  const hydrateMaster = useHydrateGTR30EmployeeMaster();
  const hydrateMappings = useHydrateGTR30BillCodeMappings();
  const groupsQuery = useGTR30EmployeeMasterGroups();
  const mappingsQuery = useGTR30BillCodeMappings();
  const removeMutation = useRemoveGTR30EmployeeAcrossGroups();
  const batchRemoveMutation = useRemoveGTR30EmployeeBatch();

  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    void hydrateMaster.mutateAsync().catch(() => {});
    void hydrateMappings.mutateAsync().catch(() => {});
  }, [hydrateMaster, hydrateMappings]);

  const groups = useMemo(() => groupsQuery.data ?? {}, [groupsQuery.data]);
  const mappings = useMemo(() => mappingsQuery.data ?? [], [mappingsQuery.data]);

  const [selectedBillCode, setSelectedBillCode] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [cadreFilter, setCadreFilter] = useState<string>('ALL');
  const [deleteTarget, setDeleteTarget] = useState<{ employee: GTR30EmployeeMaster; billCode: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [showPayScaleCol, setShowPayScaleCol] = useState(true);
  const [showHrpnCol, setShowHrpnCol] = useState(true);

  // Multi-selection state
  const [selectedEmployeeKeys, setSelectedEmployeeKeys] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Aggregate all employees across bill code groups or for selected bill code
  const allEmployeesWithBillCode = useMemo(() => {
    const list: Array<{ employee: GTR30EmployeeMaster; billCode: string }> = [];
    const seenIds = new Set<string>();

    for (const [key, emps] of Object.entries(groups)) {
      const parts = key.split('|');
      const rawBillCode = parts[1] || 'GTR30-SAL';
      const groupBillCode = rawBillCode.toUpperCase();

      if (
        selectedBillCode !== 'ALL' &&
        groupBillCode.toUpperCase() !== selectedBillCode.toUpperCase()
      ) {
        continue;
      }

      for (const emp of emps) {
        const uniqueKey = `${(emp.hrpnNo || emp.id).trim().toLowerCase()}_${groupBillCode}`;
        if (!seenIds.has(uniqueKey)) {
          seenIds.add(uniqueKey);
          list.push({
            employee: emp,
            billCode: (emp.billCode || groupBillCode).toUpperCase(),
          });
        }
      }
    }
    return list;
  }, [groups, selectedBillCode]);

  const filteredList = useMemo(() => {
    return allEmployeesWithBillCode.filter(({ employee }) => {
      if (cadreFilter !== 'ALL' && employee.cadreClass !== cadreFilter) {
        return false;
      }
      if (!searchTerm.trim()) return true;
      const q = searchTerm.trim().toLowerCase();
      return (
        employee.name.toLowerCase().includes(q) ||
        (employee.hrpnNo ?? '').toLowerCase().includes(q) ||
        (employee.designation ?? '').toLowerCase().includes(q) ||
        (employee.designationGujarati ?? '').toLowerCase().includes(q) ||
        (employee.payScale ?? '').toLowerCase().includes(q)
      );
    });
  }, [allEmployeesWithBillCode, cadreFilter, searchTerm]);

  // Pagination (page resets whenever a filter changes, via the filter handlers)
  const totalPages = Math.ceil(filteredList.length / PAGE_SIZE);
  const paginatedList = filteredList.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Check if all filtered rows are selected
  const isAllFilteredSelected = useMemo(() => {
    if (filteredList.length === 0) return false;
    return filteredList.every((item) =>
      selectedEmployeeKeys.has(`${item.employee.id}__${item.billCode}`)
    );
  }, [filteredList, selectedEmployeeKeys]);

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedEmployeeKeys((prev) => {
        const next = new Set(prev);
        for (const item of filteredList) {
          next.delete(`${item.employee.id}__${item.billCode}`);
        }
        return next;
      });
    } else {
      setSelectedEmployeeKeys((prev) => {
        const next = new Set(prev);
        for (const item of filteredList) {
          next.add(`${item.employee.id}__${item.billCode}`);
        }
        return next;
      });
    }
  };

  const handleToggleSelectRow = (key: string) => {
    setSelectedEmployeeKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Overall totals across filtered list using centralized salary calculator
  const totals = useMemo(() => {
    return filteredList.reduce(
      (acc, { employee }) => {
        const s = calculateEmployeeSalary(employee);
        return {
          totalBasic: acc.totalBasic + s.basic,
          totalGross: acc.totalGross + s.grossPay,
          totalDeds: acc.totalDeds + s.totalDeductions,
          totalNet: acc.totalNet + s.netTakeHome,
        };
      },
      { totalBasic: 0, totalGross: 0, totalDeds: 0, totalNet: 0 }
    );
  }, [filteredList]);

  // SPA navigation instead of window.open
  const handleOpenNewRegistration = () => {
    const code = selectedBillCode !== 'ALL' ? selectedBillCode : mappings[0]?.billCode || 'GTR30-SAL';
    navigate(`/gtr30/employee-management/new?billCode=${encodeURIComponent(code)}`);
  };

  // SPA navigation instead of window.open
  const handleOpenEditEmployee = (emp: GTR30EmployeeMaster, billCode: string) => {
    navigate(
      `/gtr30/employee-management/edit/${encodeURIComponent(emp.id)}?billCode=${encodeURIComponent(
        emp.billCode || billCode
      )}`
    );
  };

  // Delete single employee confirmation (removes from every month group of that bill code)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const result = await removeMutation.mutateAsync({
        billCode: deleteTarget.billCode,
        employeeId: deleteTarget.employee.id,
        hrpnNo: deleteTarget.employee.hrpnNo,
      });
      toast({
        title: 'Employee Removed',
        description:
          result.removedCount > 1
            ? `${deleteTarget.employee.name} deleted from ${deleteTarget.billCode} (${result.removedCount} record(s)).`
            : `${deleteTarget.employee.name} deleted from ${deleteTarget.billCode}.`,
      });
      setSelectedEmployeeKeys((prev) => {
        const next = new Set(prev);
        next.delete(`${deleteTarget.employee.id}__${deleteTarget.billCode}`);
        return next;
      });
      setDeleteTarget(null);
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Could not delete employee.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Batch delete selected employees using the batch mutation
  const handleConfirmBulkDelete = async () => {
    if (selectedEmployeeKeys.size === 0) return;
    try {
      setIsBulkDeleting(true);
      const itemsToDelete = allEmployeesWithBillCode.filter((item) =>
        selectedEmployeeKeys.has(`${item.employee.id}__${item.billCode}`)
      );

      const result = await batchRemoveMutation.mutateAsync({
        monthKey,
        items: itemsToDelete.map((item) => ({
          billCode: item.billCode,
          employeeId: item.employee.id,
          hrpnNo: item.employee.hrpnNo,
        })),
      });

      toast({
        title: 'Bulk Delete Complete',
        description: `Successfully removed ${result.removedCount} employee record(s).`,
      });
      setSelectedEmployeeKeys(new Set());
      setShowBulkDeleteModal(false);
    } catch (error) {
      toast({
        title: 'Bulk Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete selected employees.',
        variant: 'destructive',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExportCsv = () => {
    if (filteredList.length === 0) {
      toast({ title: 'Nothing to Export', description: 'No matching employee entries found.' });
      return;
    }
    const emps = filteredList.map((item) => item.employee);
    const csv = exportMasterToCsv(emps);
    downloadCsvFile(`GTR30_Employees_${selectedBillCode}_${monthKey}.csv`, csv);
    toast({ title: 'Export Complete', description: `Exported ${emps.length} records.` });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-24 animate-in fade-in duration-200">
      {/* 1. Header Banner with New Registration in Top Right Corner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-600/10 text-blue-600 border border-blue-200 dark:border-blue-800">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Employee Management
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-mono">
                {filteredList.length} Active
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive employee directory, 7th Pay Commission scale governance, and statutory bill code assignments.
            </p>
          </div>
        </div>

        {/* Top Right Action Corner */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <GTR30SyncStatusBadge />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/gtr30/settings')}
            className="text-xs font-semibold text-slate-700"
            title="Configure Bill Codes and Settings"
          >
            <Settings className="h-3.5 w-3.5 mr-1 text-slate-500" /> Bill Codes &amp; Settings
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="text-xs font-semibold text-slate-700"
            title="Download CSV"
          >
            <Download className="h-3.5 w-3.5 mr-1 text-slate-500" /> Export CSV
          </Button>

          <Button
            type="button"
            onClick={handleOpenNewRegistration}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 h-9 shadow-md shadow-blue-600/20"
            title="Register a new employee"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            New Registration
          </Button>
        </div>
      </div>

      {/* 2. KPI Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Total Basic Pay
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white mt-1 block">
            ₹{totals.totalBasic.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block flex items-center justify-between">
            Total Gross <TrendingUp className="h-3.5 w-3.5" />
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-emerald-600 mt-1 block">
            ₹{totals.totalGross.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block flex items-center justify-between">
            Total Deductions <TrendingDown className="h-3.5 w-3.5" />
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-rose-600 mt-1 block">
            ₹{totals.totalDeds.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
            Total Take-Home
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-blue-600 mt-1 block">
            ₹{totals.totalNet.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <Card className="border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          {/* Search */}
          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold text-slate-700">Search Employee</Label>
            <div className="relative mt-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by Name, HRPN No., or Designation..."
                className="pl-9 text-xs"
              />
            </div>
          </div>

          {/* Bill Code Filter */}
          <div>
            <Label className="text-xs font-semibold text-slate-700">Bill Code / Category</Label>
            <select
              value={selectedBillCode}
              onChange={(e) => {
                setSelectedBillCode(e.target.value);
                setCurrentPage(1);
              }}
              className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-mono font-bold text-slate-800"
            >
              <option value="ALL">All Bill Codes ({allEmployeesWithBillCode.length})</option>
              {mappings.map((m) => (
                <option key={m.id} value={m.billCode}>
                  {m.billCode} — {m.description}
                </option>
              ))}
            </select>
          </div>

          {/* Cadre Filter */}
          <div>
            <Label className="text-xs font-semibold text-slate-700">Cadre Class</Label>
            <select
              value={cadreFilter}
              onChange={(e) => {
                setCadreFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-serif font-bold text-slate-800"
            >
              <option value="ALL">All Cadre Classes</option>
              <option value="૧">વર્ગ ૧ (Class 1)</option>
              <option value="૨">વર્ગ ૨ (Class 2)</option>
              <option value="૩">વર્ગ ૩ (Class 3)</option>
              <option value="૪">વર્ગ ૪ (Class 4)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* 3b. Multiple Selection Bulk Action Banner */}
      {selectedEmployeeKeys.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              {selectedEmployeeKeys.size}
            </span>
            <span className="text-xs font-bold text-blue-950 dark:text-blue-100">
              {selectedEmployeeKeys.size} employee record{selectedEmployeeKeys.size > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedEmployeeKeys(new Set())}
              className="h-8 text-xs text-slate-600 font-semibold"
            >
              Deselect All
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowBulkDeleteModal(true)}
              className="h-8 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 shadow-xs"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete Selected ({selectedEmployeeKeys.size})
            </Button>
          </div>
        </div>
      )}

      {/* 4. Employee Table with Multi-Select, Edit and Delete Options */}
      <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Registered Employee Directory ({filteredList.length})
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Density toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setDensity('comfortable')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  density === 'comfortable'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
                title="Comfortable row spacing"
              >
                Comfortable
              </button>
              <button
                type="button"
                onClick={() => setDensity('compact')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  density === 'compact'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
                title="Compact dense rows"
              >
                Compact
              </button>
            </div>

            {/* Column Visibility toggle */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowPayScaleCol((v) => !v);
                setShowHrpnCol((v) => !v);
              }}
              className="h-7 text-[11px] font-semibold text-slate-700 dark:text-slate-300 dark:border-slate-700"
              title="Toggle extra columns (HRPN & Scale)"
            >
              <SlidersHorizontal className="h-3 w-3 mr-1" />
              {showPayScaleCol ? 'Simplify Cols' : 'Show All Cols'}
            </Button>

            <GTR30EmployeeImport
              monthKey={monthKey}
              billCode={selectedBillCode !== 'ALL' ? selectedBillCode : 'GTR30-SAL'}
              employees={filteredList.map((i) => i.employee)}
            />
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No Employees Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchTerm || cadreFilter !== 'ALL' || selectedBillCode !== 'ALL'
                ? 'No employee profiles match the current filter criteria.'
                : 'No employees have been registered yet. Click "+ New Registration" in the top right corner to get started.'}
            </p>
            <Button
              type="button"
              onClick={handleOpenNewRegistration}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Register First Employee
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className={`px-3 ${density === 'compact' ? 'py-1.5' : 'py-3'} w-10 text-center`}>
                    <input
                      type="checkbox"
                      aria-label="Select all employees"
                      checked={isAllFilteredSelected}
                      onChange={handleToggleSelectAll}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer align-middle"
                    />
                  </th>
                  <th className={`px-3 ${density === 'compact' ? 'py-1.5' : 'py-3'} w-10 text-center`}>#</th>
                  <th className={`px-4 ${density === 'compact' ? 'py-1.5' : 'py-3'} min-w-[180px]`}>Employee Name</th>
                  {showHrpnCol && <th className={`px-3.5 ${density === 'compact' ? 'py-1.5' : 'py-3'} min-w-[90px]`}>HRPN No.</th>}
                  <th className={`px-4 ${density === 'compact' ? 'py-1.5' : 'py-3'} min-w-[130px]`}>Designation</th>
                  <th className={`px-3 ${density === 'compact' ? 'py-1.5' : 'py-3'} min-w-[100px]`}>Bill Code</th>
                  {showPayScaleCol && <th className={`px-4 ${density === 'compact' ? 'py-1.5' : 'py-3'} min-w-[140px]`}>7th Pay Matrix</th>}
                  <th className={`px-4 ${density === 'compact' ? 'py-1.5' : 'py-3'} min-w-[100px] text-right`}>Basic Pay</th>
                  <th className={`px-4 ${density === 'compact' ? 'py-1.5' : 'py-3'} min-w-[100px] text-right`}>Gross Pay</th>
                  <th className={`px-4 ${density === 'compact' ? 'py-1.5' : 'py-3'} min-w-[100px] text-right`}>Take-Home</th>
                  <th className={`px-4 ${density === 'compact' ? 'py-1.5' : 'py-3'} min-w-[90px] text-center sticky right-0 bg-slate-50 dark:bg-slate-800`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {paginatedList.map(({ employee, billCode }, idx) => {
                  const rowKey = `${employee.id}__${billCode}`;
                  const isSelected = selectedEmployeeKeys.has(rowKey);
                  const salary = calculateEmployeeSalary(employee);
                  const py = density === 'compact' ? 'py-1.5' : 'py-3';

                  return (
                    <tr
                      key={`${employee.id}_${billCode}_${idx}`}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/50'
                          : 'hover:bg-blue-50/40 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className={`px-3 ${py} text-center`}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${employee.name}`}
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(rowKey)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer align-middle"
                        />
                      </td>

                      <td className={`px-3.5 ${py} text-center font-mono font-medium text-slate-400`}>
                        {employee.srNo || (currentPage - 1) * PAGE_SIZE + idx + 1}
                      </td>

                      <td className={`px-4 ${py} font-semibold text-slate-900 dark:text-white`}>
                        <div className="flex items-center gap-2">
                          <span>{employee.name}</span>
                          {employee.cadreClass && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-serif">
                              વર્ગ {employee.cadreClass}
                            </span>
                          )}
                        </div>
                        {employee.designationGujarati && (
                          <div className="text-[11px] font-normal text-slate-500 font-serif">
                            {employee.designationGujarati}
                          </div>
                        )}
                      </td>

                      {showHrpnCol && (
                        <td className={`px-3.5 ${py} font-mono text-slate-600 dark:text-slate-400 font-medium`}>
                          {employee.hrpnNo || '—'}
                        </td>
                      )}

                      <td className={`px-4 ${py} text-slate-700 dark:text-slate-300`}>
                        {employee.designation || '—'}
                      </td>

                      <td className={`px-3 ${py}`}>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {employee.billCode || billCode}
                        </span>
                      </td>

                      {showPayScaleCol && (
                        <td className={`px-4 ${py}`}>
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                            {employee.payScale || '—'}
                          </div>
                          {employee.gradePay && (
                            <div className="text-[10px] font-mono text-slate-500 font-bold">
                              {employee.gradePay}
                            </div>
                          )}
                        </td>
                      )}

                      <td className={`px-4 ${py} text-right font-mono font-bold text-slate-900 dark:text-white`}>
                        ₹{salary.basic.toLocaleString('en-IN')}
                      </td>

                      <td className={`px-4 ${py} text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400`}>
                        ₹{salary.grossPay.toLocaleString('en-IN')}
                      </td>

                      <td className={`px-4 ${py} text-right font-mono font-bold text-blue-600 dark:text-blue-400`}>
                        ₹{salary.netTakeHome.toLocaleString('en-IN')}
                      </td>

                      {/* Rightmost Actions Column: Edit and Delete */}
                      <td className={`px-4 ${py} text-center sticky right-0 bg-white dark:bg-slate-900`}>
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditEmployee(employee, billCode)}
                            className="h-7 w-7 p-0 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg"
                            title="Edit Employee"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget({ employee, billCode })}
                            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg"
                            title="Delete this employee"
                            aria-label="Delete this employee"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
            <span className="text-xs text-slate-500">
              Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filteredList.length)} of {filteredList.length}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="h-7 text-xs px-2.5"
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, currentPage - 3), currentPage + 2)
                .map((page) => (
                  <Button
                    key={page}
                    type="button"
                    variant={page === currentPage ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={`h-7 w-7 text-xs p-0 ${page === currentPage ? 'bg-blue-600 text-white' : ''}`}
                  >
                    {page}
                  </Button>
                ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-7 text-xs px-2.5"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Single Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="Delete Employee Master Record"
          message={`Are you sure you want to remove ${deleteTarget.employee.name} from ${deleteTarget.billCode}? This deletes every monthly copy of this employee (all past and future month groups) and cannot be undone.`}
          confirmLabel="Delete Employee"
          danger={true}
          busy={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Multiple Selection Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <ConfirmDialog
          open={showBulkDeleteModal}
          title="Delete Multiple Employee Records"
          message={`Are you sure you want to permanently remove ${selectedEmployeeKeys.size} selected employee record(s)? This action cannot be undone.`}
          confirmLabel={isBulkDeleting ? 'Deleting...' : `Delete ${selectedEmployeeKeys.size} Employees`}
          danger={true}
          busy={isBulkDeleting}
          onConfirm={handleConfirmBulkDelete}
          onCancel={() => setShowBulkDeleteModal(false)}
        />
      )}
    </div>
  );
}

export default GTR30EmployeeManagementPage;
