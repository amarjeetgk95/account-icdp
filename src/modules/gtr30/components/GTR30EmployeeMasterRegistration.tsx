import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Users, UserPlus, Save, RefreshCw } from 'lucide-react';
import { useUIStore } from '@/core/stores/ui-store';
import {
  useGTR30EmployeeMasterGroups,
  useSaveGTR30EmployeeGroup,
  gtr30GroupKey,
} from '../hooks/useGTR30EmployeeMaster';
import { useGTR30BillCodeMappings } from '../hooks/useGTR30BillCodeMappings';
import { gtr30MonthKeyFor, gtr30MonthOptions, gtr30YearOptions } from '../utils/gtr30MonthKey';
import { GTR30EmployeeMasterForm } from './GTR30EmployeeMasterForm';
import { GTR30EmployeeMasterList } from './GTR30EmployeeMasterList';
import { GTR30EmployeeImport } from './GTR30EmployeeImport';
import { GTR30SyncStatusBadge } from './GTR30SyncStatusBadge';
import type { GTR30EmployeeMaster } from '../types';

export function GTR30EmployeeMasterRegistration() {
  const { toast } = useToast();
  const activeFY = useUIStore((state) => state.activeFinancialYear) ?? 2026;
  const groupsQuery = useGTR30EmployeeMasterGroups();
  const mappingsQuery = useGTR30BillCodeMappings();
  const saveGroupMutation = useSaveGTR30EmployeeGroup();

  const groups = groupsQuery.data ?? {};
  const mappings = mappingsQuery.data ?? [];

  const [month, setMonth] = useState('July');
  const [year, setYear] = useState(activeFY);
  const [billCode, setBillCode] = useState(() => mappings[0]?.billCode ?? 'GTR30-SAL');
  const [editingEmployee, setEditingEmployee] = useState<GTR30EmployeeMaster | null>(null);
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  const monthKey = gtr30MonthKeyFor(month, year);
  const employees = groups[gtr30GroupKey(monthKey, billCode)] ?? [];

  const handleEdit = (employee: GTR30EmployeeMaster) => {
    setEditingEmployee(employee);
  };

  const changeMonth = (value: string) => {
    setMonth(value);
    setEditingEmployee(null);
  };

  const changeYear = (value: number) => {
    setYear(value);
    setEditingEmployee(null);
  };

  const changeBillCode = (value: string) => {
    setBillCode(value);
    setEditingEmployee(null);
  };

  const handleSaveMasterGroup = async () => {
    try {
      setIsSavingGroup(true);
      await saveGroupMutation.mutateAsync({
        monthKey,
        billCode,
        employees,
      });
      toast({
        title: 'Master Group Saved',
        description: `Successfully saved ${employees.length} employee entry/entries for ${monthKey} / ${billCode}.`,
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Could not save master group.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingGroup(false);
    }
  };

  const selectStyle =
    'w-full h-9 rounded-md border border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700 px-2 text-sm';

  return (
    <div className="space-y-6">
      {/* 1. Master Group Selection & Manual Save */}
      <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="font-bold text-md text-slate-900">Employee Master Group</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose the bill month, year, and bill code for the master entries.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <GTR30SyncStatusBadge />
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={handleSaveMasterGroup}
              disabled={isSavingGroup}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3 font-medium shadow-sm"
              title="Manually save and sync entries for this Master Group"
            >
              {isSavingGroup ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save Group Entries
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Month</Label>
            <select value={month} onChange={(e) => changeMonth(e.target.value)} className={selectStyle}>
              {gtr30MonthOptions().map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Year (FY)</Label>
            <select value={year} onChange={(e) => changeYear(Number(e.target.value))} className={selectStyle}>
              {gtr30YearOptions(activeFY).map((y) => (
                <option key={y} value={y}>
                  {y}-{String(y + 1).slice(-2)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Bill Code</Label>
            <select value={billCode} onChange={(e) => changeBillCode(e.target.value)} className={selectStyle}>
              {mappings.map((m) => (
                <option key={m.id} value={m.billCode}>
                  {m.billCode} - {m.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <p>
            All entries below are saved against <strong>{monthKey}</strong> / <strong>{billCode}</strong>.
            Change the month or bill code to work on another bill.
          </p>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {employees.length} employee{employees.length === 1 ? '' : 's'} registered
          </span>
        </div>
      </Card>

      {/* 2. Add / Edit Single Employee Form */}
      <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <UserPlus size={16} />
          </div>
          <div>
            <h2 className="font-bold text-md text-slate-900">
              {editingEmployee ? `Edit Employee — ${editingEmployee.name}` : 'Add New Employee'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Search the master or employee directory, then enter salary details.
            </p>
          </div>
        </div>
        <GTR30EmployeeMasterForm
          monthKey={monthKey}
          billCode={billCode}
          employees={employees}
          editingEmployee={editingEmployee}
          onCancelEdit={() => setEditingEmployee(null)}
          onSaved={() => setEditingEmployee(null)}
        />
      </Card>

      {/* 3. Master Directory List & Import */}
      <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
              <Users size={16} />
            </div>
            <div>
              <h2 className="font-bold text-md text-slate-900">Master Directory</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Employee salary entries for {monthKey} / {billCode}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSaveMasterGroup}
              disabled={isSavingGroup}
              className="text-xs h-8"
              title="Save all current entries in this master list"
            >
              {isSavingGroup ? (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin text-blue-600" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
              )}
              Save Entries
            </Button>
            <GTR30EmployeeImport monthKey={monthKey} billCode={billCode} employees={employees} />
          </div>
        </div>
        <GTR30EmployeeMasterList
          monthKey={monthKey}
          billCode={billCode}
          employees={employees}
          onEdit={handleEdit}
        />
      </Card>

      <p className="text-xs text-slate-500">
        HRA is auto-calculated as Current Pay × HRA% when a bill is created from this master.
      </p>
    </div>
  );
}
