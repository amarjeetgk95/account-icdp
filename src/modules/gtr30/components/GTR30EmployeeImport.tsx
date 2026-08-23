import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Download,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
} from 'lucide-react';
import { useSaveGTR30EmployeeGroup } from '../hooks/useGTR30EmployeeMaster';
import {
  importMasterFromCsv,
  generateSampleCsvTemplate,
  downloadCsvFile,
} from '../utils/gtr30Csv';
import type { GTR30EmployeeMaster } from '../types';

interface GTR30EmployeeImportProps {
  monthKey: string;
  billCode: string;
  employees?: GTR30EmployeeMaster[];
}

export function GTR30EmployeeImport({ monthKey, billCode, employees = [] }: GTR30EmployeeImportProps) {
  const { toast } = useToast();
  const saveGroupMutation = useSaveGTR30EmployeeGroup();

  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [csvEmployees, setCsvEmployees] = useState<Partial<GTR30EmployeeMaster>[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenDialog = () => {
    setCsvEmployees([]);
    setCsvFileName('');
    setIsOpen(true);
  };

  const handleCsvFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        const result = importMasterFromCsv(text, monthKey);
        const parsed = result.employees;
        if (parsed.length === 0) {
          let desc = 'Could not find valid employee rows in the CSV file.';
          if (result.skippedRows > 0 || result.errors.length > 0) {
            desc = `Skipped ${result.skippedRows} row(s). Errors: ${result.errors.slice(0, 3).join('; ')}${result.errors.length > 3 ? '...' : ''}`;
          }
          toast({
            title: 'No Rows Found',
            description: desc,
            variant: 'destructive',
          });
          return;
        }
        setCsvEmployees(parsed);
        let desc = `Found ${parsed.length} employee record(s) ready to import.`;
        if (result.skippedRows > 0) {
          desc += ` Skipped ${result.skippedRows} invalid row(s).`;
        }
        toast({
          title: 'CSV File Parsed',
          description: desc,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleImportFromCsv = async () => {
    if (csvEmployees.length === 0 || isImporting) return;

    try {
      setIsImporting(true);
      const startSrNo = Math.max(0, ...employees.map((e) => e.srNo));
      const fullRows: GTR30EmployeeMaster[] = csvEmployees.map((emp, i) => ({
        id: emp.id || crypto.randomUUID(),
        srNo: emp.srNo || startSrNo + i + 1,
        hrpnNo: emp.hrpnNo,
        name: emp.name || 'Unnamed',
        designation: emp.designation || '',
        designationGujarati: emp.designationGujarati || '',
        cadreClass: emp.cadreClass || '૩',
        payScale: emp.payScale || '34,500-1,12,400',
        gradePay: emp.gradePay || 'GP:4200',
        payLevelCell: emp.payLevelCell || '',
        ppaNo: emp.ppaNo || 'Applied',
        currentPay: emp.currentPay || 0,
        currentPayDate: emp.currentPayDate || '',
        quarterAddress: emp.quarterAddress || '',
        insuranceGroup: emp.insuranceGroup || 'ખ',
        insuranceType: emp.insuranceType || 'savings_and_insurance',
        hraPercent: emp.hraPercent || 0,
        da: emp.da || 0,
        transportAllowance: emp.transportAllowance || 0,
        medicalAllowance: emp.medicalAllowance || 0,
        claAllowance: emp.claAllowance || 0,
        rentOfBuilding: emp.rentOfBuilding || 0,
        professionalTax: emp.professionalTax || 0,
        gis1981Insurance: emp.gis1981Insurance || 0,
        gis1981Savings: emp.gis1981Savings || 0,
        npsPension: emp.npsPension || 0,
        societyDeduction: emp.societyDeduction || 0,
        remarks: emp.remarks || '',
        billCode: emp.billCode || billCode,
      }));

      await saveGroupMutation.mutateAsync({
        monthKey,
        billCode,
        employees: [...employees, ...fullRows],
      });

      toast({
        title: 'CSV Import Complete',
        description: `Imported ${fullRows.length} employee(s) into ${monthKey} / ${billCode}.`,
      });

      setIsOpen(false);
    } catch (error) {
      toast({
        title: 'CSV Import Failed',
        description: error instanceof Error ? error.message : 'Could not import CSV records.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = generateSampleCsvTemplate();
    downloadCsvFile('GTR30_Employee_Master_Template.csv', template);
    toast({ title: 'Template Downloaded', description: 'Fill and upload this CSV template.' });
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={handleOpenDialog}
        title="Import employees via CSV file"
        className="h-8 text-xs font-medium"
      >
        <Download className="h-4 w-4 mr-1.5 text-blue-600" />
        Import CSV
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xl flex flex-col p-6 gap-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-slate-900">
                  Import GTR-30 Employee Master CSV
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Bulk import salary master records for <strong>{monthKey}</strong> / <strong>{billCode}</strong>.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* CSV File Upload Section */}
          <div className="space-y-4 pt-1">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">CSV Template Format</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Download the official GTR-30 employee master spreadsheet template.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  className="h-8 text-xs font-semibold text-blue-700 border-blue-200 hover:bg-blue-50"
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> Template (.csv)
                </Button>
              </div>
            </div>

            {/* Drop / Choose File */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/30"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvFileUpload}
                className="hidden"
              />
              <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                {csvFileName ? `Selected: ${csvFileName}` : 'Click or drag a .csv file to upload'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Standard GTR-30 CSV containing employee details, basic pay, and allowances
              </p>
            </div>

            {csvEmployees.length > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold">
                    Ready to import {csvEmployees.length} employee record(s)
                  </span>
                </div>
                <span className="text-[11px] text-emerald-600 font-mono">{csvFileName}</span>
              </div>
            )}
          </div>

          {/* Dialog Actions */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-600"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={csvEmployees.length === 0 || isImporting}
              onClick={handleImportFromCsv}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 px-4"
            >
              {isImporting ? 'Importing...' : `Import ${csvEmployees.length} Employees`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default GTR30EmployeeImport;