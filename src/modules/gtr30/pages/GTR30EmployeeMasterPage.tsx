import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GTR30BillCodeMappingView } from '../components/GTR30BillCodeMappingView';
import { GTR30CopyMasterModal } from '../components/GTR30CopyMasterModal';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Users,
  UserPlus,
  Copy,
  FilePlus,
  FolderSync,
  Receipt,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import {
  useHydrateGTR30EmployeeMaster,
  useGTR30EmployeeMasterGroups,
} from '../hooks/useGTR30EmployeeMaster';
import { useHydrateGTR30BillCodeMappings } from '../hooks/useGTR30BillCodeMappings';
import { useGtr30Bills } from '../hooks/useGTR30Bills';
import { useUIStore } from '@/core/stores/ui-store';
import type { GTR30Bill } from '../types';

export function GTR30EmployeeMasterPage() {
  const navigate = useNavigate();
  const activeFY = useUIStore((state) => state.activeFinancialYear) ?? 2026;
  const defaultMonthKey = `July-${activeFY}`;
  const hydrateMaster = useHydrateGTR30EmployeeMaster();
  const hydrateMappings = useHydrateGTR30BillCodeMappings();
  const groupsQuery = useGTR30EmployeeMasterGroups();
  const billsQuery = useGtr30Bills();

  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [selectedTargetMonth, setSelectedTargetMonth] = useState(defaultMonthKey);
  const [selectedTargetBillCode, setSelectedTargetBillCode] = useState('GTR30-SAL');
  const [selectedTargetCount, setSelectedTargetCount] = useState(0);

  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    void hydrateMaster.mutateAsync().catch(() => {});
    void hydrateMappings.mutateAsync().catch(() => {});
  }, [hydrateMaster, hydrateMappings]);

  const groupsMap = groupsQuery.data ?? {};
  const groupKeys = Object.keys(groupsMap);
  const bills: GTR30Bill[] = billsQuery.data ?? [];

  const handleOpenCopyForGroup = (monthKey: string, billCode: string, count: number) => {
    setSelectedTargetMonth(monthKey);
    setSelectedTargetBillCode(billCode);
    setSelectedTargetCount(count);
    setIsCopyOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/gtr30/list')} title="Back to Register">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" /> GTR-30 Employee Master &amp; Bill Codes
            </h1>
            <p className="text-xs text-slate-500">
              Manage bill code mappings, create new bill codes, oversee monthly master groups, and perform month-to-month rollovers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/gtr30/employee-registration')}
            className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Open Employee Registration
          </Button>
        </div>
      </div>

      {/* 1. Bill Code Mapping & Creation */}
      <GTR30BillCodeMappingView />

      {/* 2. Monthly Master Groups Overview */}
      <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <FolderSync className="h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="font-bold text-md text-slate-900">Monthly Master Groups Directory</h2>
              <p className="text-xs text-slate-500">
                All saved monthly groups with employee salary records and quick actions.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedTargetMonth('July-2026');
              setSelectedTargetBillCode('GTR30-SAL');
              setSelectedTargetCount(0);
              setIsCopyOpen(true);
            }}
            className="text-xs font-semibold text-slate-700 border-slate-300"
          >
            <Copy className="h-3.5 w-3.5 mr-1.5 text-blue-600" /> Month Rollover / Copy...
          </Button>
        </div>

        {groupKeys.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Users className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No Employee Master Groups Yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Start by registering employees for a month and bill code.
            </p>
            <Button
              size="sm"
              onClick={() => navigate('/gtr30/employee-registration')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Register Employees Now
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupKeys.map((key) => {
              const employees = groupsMap[key] || [];
              const [monthKey = '', billCode = ''] = key.split('|');
              const totalPay = employees.reduce((s, e) => s + (e.currentPay || 0), 0);
              const activeBill = bills.find(
                (b) =>
                  b.billCode?.trim().toLowerCase() === billCode.trim().toLowerCase() &&
                  b.monthOf?.trim().toLowerCase() === monthKey.trim().toLowerCase()
              );

              return (
                <div
                  key={key}
                  className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 transition-colors shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                        {billCode.toUpperCase()}
                      </div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="h-3.5 w-3.5 text-blue-600" /> {monthKey}
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      <Users className="h-3 w-3" /> {employees.length} {employees.length === 1 ? 'Emp' : 'Emps'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200/80">
                    <span>Total Basic Pay:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      ₹{totalPay.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="text-[11px] flex items-center justify-between text-slate-500">
                    <span>Generated Bill:</span>
                    {activeBill ? (
                      <span className="font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> {activeBill.billRegisterNo || 'Created'} ({activeBill.status})
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Not created</span>
                    )}
                  </div>

                  <div className="pt-2 flex items-center gap-2 border-t border-slate-200/80">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/gtr30/employee-registration')}
                      className="flex-1 text-xs h-7 font-medium text-slate-700 bg-white"
                    >
                      <UserPlus className="h-3 w-3 mr-1 text-blue-600" /> Register / Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenCopyForGroup(monthKey, billCode, employees.length)}
                      title="Copy to another month"
                      className="h-7 px-2 text-slate-500 hover:text-blue-700"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => {
                        if (activeBill) {
                          navigate(`/gtr30/edit/${activeBill.id}`);
                        } else {
                          navigate('/gtr30/create');
                        }
                      }}
                      className="text-xs h-7 px-2.5 bg-blue-600 hover:bg-blue-700 text-white"
                      title={activeBill ? 'Open Generated Bill' : 'Create Pay Bill'}
                    >
                      {activeBill ? <Receipt className="h-3.5 w-3.5" /> : <FilePlus className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Rollover Modal */}
      <GTR30CopyMasterModal
        isOpen={isCopyOpen}
        onClose={() => setIsCopyOpen(false)}
        targetMonthKey={selectedTargetMonth}
        targetBillCode={selectedTargetBillCode}
        targetCount={selectedTargetCount}
      />
    </div>
  );
}

export default GTR30EmployeeMasterPage;
