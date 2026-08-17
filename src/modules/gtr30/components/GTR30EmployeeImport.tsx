import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, RefreshCw } from 'lucide-react';
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
  const [isImporting, setIsImporting] = useState(false);

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

  const importFromDirectory = async () => {
    if (importable.length === 0 || isImporting) return;
    try {
      setIsImporting(true);
      const startSrNo = Math.max(0, ...employees.map((e) => e.srNo));
      const rows: GTR30EmployeeMaster[] = importable.map((emp, i) => ({
        id: '',
        srNo: startSrNo + i + 1,
        hrpnNo: emp.hprn_no || undefined,
        name: emp.name,
        designation: emp.designation || '',
        payScale: emp.pay_scale || '',
        currentPay: 0,
        currentPayDate: '',
        hraPercent: 0,
        transportAllowance: 0,
        medicalAllowance: 0,
        claAllowance: 0,
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

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={importable.length === 0 || isImporting}
      onClick={() => void importFromDirectory()}
      title={
        importable.length === 0
          ? 'All payroll directory employees are already in this master group'
          : 'Copy names, designations, and pay scales from the payroll employee directory'
      }
    >
      {isImporting ? (
        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-1" />
      )}
      Import from Employee Directory
      {importable.length > 0 && (
        <span className="ml-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-bold">
          {importable.length}
        </span>
      )}
    </Button>
  );
}