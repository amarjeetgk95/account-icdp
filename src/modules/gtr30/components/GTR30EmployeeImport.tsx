import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Download, RefreshCw, Search, CheckSquare, Square, Users, UserCheck } from 'lucide-react';
import { useEmployees } from '@/modules/payroll/hooks/useEmployees';
import { useSaveGTR30EmployeeGroup } from '../hooks/useGTR30EmployeeMaster';
import type { GTR30EmployeeMaster } from '../types';

interface GTR30EmployeeImportProps {
  monthKey: string;
  billCode: string;
  employees: GTR30EmployeeMaster[];
}

export function GTR30EmployeeImport({ monthKey, billCode, employees }: GTR30EmployeeImportProps) {
  const { toast } = useToast();
  const { employees: payrollEmployees } = useEmployees();
  const saveGroupMutation = useSaveGTR30EmployeeGroup();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter out employees already present in the current master group
  const importable = useMemo(() => {
    return payrollEmployees.filter((emp) => {
      const hrpn = (emp.hprn_no ?? '').trim().toLowerCase();
      return !employees.some(
        (e) =>
          e.name.trim().toLowerCase() === emp.name.trim().toLowerCase() ||
          (hrpn.length > 0 && (e.hrpnNo ?? '').trim().toLowerCase() === hrpn)
      );
    });
  }, [payrollEmployees, employees]);

  // Open modal and pre-select all importable employees
  const handleOpenDialog = () => {
    if (importable.length === 0) return;
    const allKeys = new Set(
      importable.map((emp) => String(emp.id ?? emp.hprn_no ?? emp.name))
    );
    setSelectedIds(allKeys);
    setSearchTerm('');
    setIsOpen(true);
  };

  // Filtered list based on search query
  const filteredEmployees = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return importable;
    return importable.filter((emp) => {
      const nameMatch = emp.name.toLowerCase().includes(term);
      const hrpnMatch = (emp.hprn_no ?? '').toLowerCase().includes(term);
      const desigMatch = (emp.designation ?? '').toLowerCase().includes(term);
      const payScaleMatch = (emp.pay_scale ?? '').toLowerCase().includes(term);
      return nameMatch || hrpnMatch || desigMatch || payScaleMatch;
    });
  }, [importable, searchTerm]);

  const toggleSelect = (key: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set(
      filteredEmployees.map((emp) => String(emp.id ?? emp.hprn_no ?? emp.name))
    );
    setSelectedIds((prev) => new Set([...prev, ...all]));
  };

  const deselectAll = () => {
    const currentKeys = new Set(
      filteredEmployees.map((emp) => String(emp.id ?? emp.hprn_no ?? emp.name))
    );
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const k of currentKeys) {
        next.delete(k);
      }
      return next;
    });
  };

  const importSelectedEmployees = async () => {
    const selectedList = importable.filter((emp) =>
      selectedIds.has(String(emp.id ?? emp.hprn_no ?? emp.name))
    );

    if (selectedList.length === 0 || isImporting) return;

    try {
      setIsImporting(true);
      const startSrNo = Math.max(0, ...employees.map((e) => e.srNo));
      const rows: GTR30EmployeeMaster[] = selectedList.map((emp, i) => ({
        id: '',
        srNo: startSrNo + i + 1,
        hrpnNo: emp.hprn_no || undefined,
        name: emp.name,
        designation: emp.designation || '',
        designationGujarati: '',
        cadreClass: '૩',
        payScale: emp.pay_scale || '34,500-1,12,400',
        gradePay: 'GP:4200',
        payLevelCell: 'PAY=39900 (LEVEL CELL-7)',
        ppaNo: 'Applied',
        currentPay: 0,
        currentPayDate: '',
        quarterAddress: 'H-7, Government Quarters, Khatodara, Nr. Sub Jail, Surat',
        insuranceGroup: 'ખ',
        insuranceType: 'savings_and_insurance',
        hraPercent: 0,
        da: 0,
        transportAllowance: 3600,
        medicalAllowance: 1000,
        claAllowance: 270,
        rentOfBuilding: 300,
        professionalTax: 200,
        gis1981Insurance: 240,
        gis1981Savings: 560,
        npsPension: 6105,
        societyDeduction: 4154,
        remarks: '',
      }));

      await saveGroupMutation.mutateAsync({
        monthKey,
        billCode,
        employees: [...employees, ...rows],
      });

      toast({
        title: 'Import Complete',
        description: `${rows.length} employee(s) imported from the payroll directory for ${monthKey} / ${billCode}.`,
      });

      setIsOpen(false);
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Could not import employees.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = useMemo(() => {
    return importable.filter((emp) =>
      selectedIds.has(String(emp.id ?? emp.hprn_no ?? emp.name))
    ).length;
  }, [importable, selectedIds]);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={importable.length === 0 || isImporting}
        onClick={handleOpenDialog}
        title={
          importable.length === 0
            ? 'All payroll directory employees are already in this master group'
            : 'Select and import employees from the payroll employee directory'
        }
      >
        {isImporting ? (
          <RefreshCw className="h-4 w-4 mr-1.5 animate-spin text-blue-600" />
        ) : (
          <Download className="h-4 w-4 mr-1.5 text-blue-600" />
        )}
        Import from Employee Directory
        {importable.length > 0 && (
          <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 text-[11px] font-semibold">
            {importable.length}
          </span>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 gap-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Users size={18} />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-slate-900">
                  Select Employees to Import
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Choose specific employees to import into <strong>{monthKey}</strong> / <strong>{billCode}</strong>.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Search Bar & Bulk Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, designation, or HRPN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 text-xs px-2.5"
                onClick={selectAll}
              >
                <CheckSquare className="h-3.5 w-3.5 mr-1 text-slate-600" />
                Select All
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 text-xs px-2.5 text-slate-500 hover:text-slate-900"
                onClick={deselectAll}
              >
                <Square className="h-3.5 w-3.5 mr-1" />
                Deselect All
              </Button>
            </div>
          </div>

          {/* Employee Selection List */}
          <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg min-h-[220px] max-h-[360px] divide-y divide-slate-100 bg-white">
            {filteredEmployees.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                {searchTerm
                  ? `No employees matching "${searchTerm}" found in directory.`
                  : 'No importable employees available.'}
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const key = String(emp.id ?? emp.hprn_no ?? emp.name);
                const isChecked = selectedIds.has(key);
                return (
                  <div
                    key={key}
                    onClick={() => toggleSelect(key)}
                    className={`flex items-center justify-between p-3 cursor-pointer transition-colors text-xs select-none hover:bg-slate-50 ${
                      isChecked ? 'bg-blue-50/70' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelect(key);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate flex items-center gap-2">
                          <span>{emp.name}</span>
                          {emp.hprn_no && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-mono">
                              HRPN: {emp.hprn_no}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {emp.designation || 'No designation'}
                          {emp.pay_scale ? ` • Pay Scale: ${emp.pay_scale}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center pl-2">
                      {isChecked ? (
                        <span className="text-[10px] font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <UserCheck className="h-3 w-3" /> Selected
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Click to select</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with selection summary and action buttons */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <div className="text-xs text-slate-600">
              <strong className="text-slate-900">{selectedCount}</strong> of{' '}
              {importable.length} employee{importable.length === 1 ? '' : 's'} selected
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={isImporting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void importSelectedEmployees()}
                disabled={selectedCount === 0 || isImporting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-1.5" />
                    Import Selected ({selectedCount})
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}