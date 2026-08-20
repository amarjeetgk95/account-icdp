import { useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  UserPlus,
  UserCheck,
  Users,
  ShieldAlert,
} from 'lucide-react';
import { useUIStore } from '@/core/stores/ui-store';
import {
  useHydrateGTR30EmployeeMaster,
  useGTR30EmployeeMasterGroups,
  gtr30GroupKey,
} from '../hooks/useGTR30EmployeeMaster';
import { useHydrateGTR30BillCodeMappings } from '../hooks/useGTR30BillCodeMappings';
import { gtr30ParseMonthKey } from '../utils/gtr30MonthKey';
import { GTR30EmployeeMasterForm } from '../components/GTR30EmployeeMasterForm';
import { GTR30SyncStatusBadge } from '../components/GTR30SyncStatusBadge';

export function GTR30EmployeeFormPage() {
  const navigate = useNavigate();
  const { employeeId } = useParams<{ employeeId?: string }>();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('id') || employeeId;
  const initialBillCode = searchParams.get('billCode') || 'GTR30-SAL';

  const activeFY = useUIStore((state) => state.activeFinancialYear) ?? 2026;
  const monthKeyParam = searchParams.get('monthKey');
  const monthKey = monthKeyParam && gtr30ParseMonthKey(monthKeyParam) ? monthKeyParam : `July-${activeFY}`;

  const hydrateMaster = useHydrateGTR30EmployeeMaster();
  const hydrateMappings = useHydrateGTR30BillCodeMappings();
  const groupsQuery = useGTR30EmployeeMasterGroups();

  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    void hydrateMaster.mutateAsync().catch(() => {});
    void hydrateMappings.mutateAsync().catch(() => {});
  }, [hydrateMaster, hydrateMappings]);

  const groups = groupsQuery.data ?? {};

  // Find employee across all stored groups if queryId is present
  const { foundEmployee, foundBillCode } = useMemo(() => {
    if (!queryId) return { foundEmployee: null, foundBillCode: initialBillCode };

    for (const [key, emps] of Object.entries(groups)) {
      const match = emps.find((e) => e.id === queryId);
      if (match) {
        // Extract billCode from group key e.g. July-2026|GTR30-SAL
        const parts = key.split('|');
        const code = parts[1] || match.billCode || initialBillCode;
        return { foundEmployee: match, foundBillCode: code };
      }
    }
    return { foundEmployee: null, foundBillCode: initialBillCode };
  }, [groups, queryId, initialBillCode]);

  const isEditMode = Boolean(queryId);
  const activeBillCode = foundBillCode || initialBillCode;

  const currentGroupKey = gtr30GroupKey(monthKey, activeBillCode);
  const fallbackKey = gtr30GroupKey('master', activeBillCode);
  const currentEmployees = groups[currentGroupKey] ?? groups[fallbackKey] ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-24 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/gtr30/employee-management')}
            className="text-xs font-semibold text-slate-700"
            title="Back to Employee Management"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to List
          </Button>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              {isEditMode ? (
                <>
                  <UserCheck className="h-5 w-5 text-indigo-600" />
                  Edit Employee Profile
                  {foundEmployee && (
                    <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200">
                      {foundEmployee.name}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 text-blue-600" />
                  New Employee Registration
                </>
              )}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditMode
                ? 'Update salary matrix, allowances, deductions, and bill code assignment.'
                : 'Register a new employee with 7th Pay Matrix, allowances, deductions, and statutory funds.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <GTR30SyncStatusBadge />
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/gtr30/employee-management')}
            className="text-xs font-semibold text-slate-700"
          >
            <Users className="h-3.5 w-3.5 mr-1 text-blue-600" /> View All Employees
          </Button>
        </div>
      </div>

      {/* If editing and employee was not found after loading */}
      {isEditMode && !foundEmployee && !groupsQuery.isLoading && (
        <Card className="p-6 border-amber-200 bg-amber-50/60 text-amber-900 rounded-2xl flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-sm">Employee Not Found</p>
            <p className="mt-0.5">
              Could not locate the requested employee record with ID &ldquo;{queryId}&rdquo;. You can register a new employee below or return to the directory.
            </p>
          </div>
        </Card>
      )}

      {/* Main 5-Tab Multi-Section Form */}
      <GTR30EmployeeMasterForm
        monthKey={monthKey}
        billCode={activeBillCode}
        employees={currentEmployees}
        editingEmployee={foundEmployee}
        onSaved={() => {
          // Keep on page or provide easy navigation
        }}
        onCancel={() => navigate('/gtr30/employee-management')}
      />
    </div>
  );
}

export default GTR30EmployeeFormPage;
