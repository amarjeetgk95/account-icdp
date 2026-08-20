import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  UserPlus,
  Save,
  RefreshCw,
  FilePlus,
  CreditCard,
} from 'lucide-react';
import { useUIStore } from '@/core/stores/ui-store';
import {
  useGTR30EmployeeMasterGroups,
  useSaveGTR30EmployeeGroup,
  gtr30GroupKey,
} from '../hooks/useGTR30EmployeeMaster';
import { useGTR30BillCodeMappings } from '../hooks/useGTR30BillCodeMappings';
import { GTR30EmployeeMasterForm } from './GTR30EmployeeMasterForm';
import { GTR30EmployeeMasterList } from './GTR30EmployeeMasterList';
import { GTR30EmployeeImport } from './GTR30EmployeeImport';
import { GTR30SyncStatusBadge } from './GTR30SyncStatusBadge';
import type { GTR30EmployeeMaster } from '../types';

export function GTR30EmployeeMasterRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const activeFY = useUIStore((state) => state.activeFinancialYear) ?? 2026;
  const groupsQuery = useGTR30EmployeeMasterGroups();
  const mappingsQuery = useGTR30BillCodeMappings();
  const saveGroupMutation = useSaveGTR30EmployeeGroup();

  const groups = groupsQuery.data ?? {};
  const mappings = mappingsQuery.data ?? [];

  // Default persistent monthKey for registration directory
  const monthKey = `July-${activeFY}`;
  const [billCode, setBillCode] = useState(() => mappings[0]?.billCode ?? 'GTR30-SAL');
  const [editingEmployee, setEditingEmployee] = useState<GTR30EmployeeMaster | null>(null);
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  // Match employees for this bill code (fallback across master keys)
  const groupKey = gtr30GroupKey(monthKey, billCode);
  const fallbackKey = gtr30GroupKey('master', billCode);
  const employees = groups[groupKey] ?? groups[fallbackKey] ?? [];

  const handleEdit = (employee: GTR30EmployeeMaster) => {
    setEditingEmployee(employee);
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
        title: 'Master Directory Saved',
        description: `Successfully saved ${employees.length} employee entry/entries for ${billCode}.`,
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
      {/* 1. Bill Code Selection & Header Controls */}
      <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="font-bold text-md text-slate-900">Employee Registration Directory</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage employee salary profiles and master records for GTR-30 Pay Bills.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
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
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <Label className="text-xs font-semibold text-slate-700">Bill Code / Pay Category</Label>
            <select value={billCode} onChange={(e) => changeBillCode(e.target.value)} className={`${selectStyle} font-mono font-bold mt-1`}>
              {mappings.map((m) => (
                <option key={m.id} value={m.billCode}>
                  {m.billCode} — {m.description}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigate('/gtr30/employee-master')}
              className="text-xs h-9 font-medium text-slate-700 border-slate-300"
            >
              <CreditCard className="h-3.5 w-3.5 mr-1 text-blue-600" /> Manage Bill Codes
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => navigate('/gtr30/create')}
              className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
            >
              <FilePlus className="h-3.5 w-3.5 mr-1" /> Create Pay Bill
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. Employee Add / Edit Form */}
      <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <h2 className="font-bold text-md text-slate-900">
              {editingEmployee ? 'Edit Employee Details' : 'Register New Employee'}
            </h2>
          </div>
          {editingEmployee && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingEmployee(null)}
              className="text-xs text-slate-500"
            >
              Cancel Edit
            </Button>
          )}
        </div>

        <GTR30EmployeeMasterForm
          monthKey={monthKey}
          billCode={billCode}
          editingEmployee={editingEmployee}
          onSaved={() => setEditingEmployee(null)}
          onCancel={() => setEditingEmployee(null)}
        />
      </Card>

      {/* 3. Registered Employee List with Quick Grid & CSV Export */}
      <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="font-bold text-md text-slate-900">
                Registered Employees ({employees.length})
              </h2>
              <p className="text-xs text-slate-500">
                Active employee records under {billCode}.
              </p>
            </div>
          </div>
          <GTR30EmployeeImport
            monthKey={monthKey}
            billCode={billCode}
            employees={employees}
          />
        </div>

        <GTR30EmployeeMasterList
          monthKey={monthKey}
          billCode={billCode}
          employees={employees}
          onEdit={handleEdit}
        />
      </Card>
    </div>
  );
}

export default GTR30EmployeeMasterRegistration;
