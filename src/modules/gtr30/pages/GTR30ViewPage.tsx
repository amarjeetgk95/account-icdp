import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GTR30Document } from '../components/GTR30Document';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/shared/components/EmptyState';
import { ChevronLeft, Edit, FileQuestion, Printer, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGtr30Bill } from '../hooks/useGTR30Bills';
import { useGTR30Settings } from '../hooks/useGTR30Settings';
import { gtr30BillsService } from '../services/gtr30Bills.service';
import { popupNativePrint } from '@/shared/utilities/nativePrint';

export function GTR30ViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const billQuery = useGtr30Bill(id ?? null);
  const settingsQuery = useGTR30Settings();
  const bill = billQuery.data ?? null;

  const mergedBill = useMemo(() => {
    if (!bill) return null;
    const s = settingsQuery.data?.settings;
    return {
      ...bill,
      officeName: bill.officeName || s?.officeName || '',
      officeFullName: bill.officeFullName || s?.officeFullName || bill.officeName || '',
      branchName: bill.branchName || s?.branchName || '',
      treasuryName: bill.treasuryName || s?.treasuryName || '',
      controllingOfficer: bill.controllingOfficer || s?.controllingOfficer || '',
      drawingOfficerName: bill.drawingOfficerName || s?.drawingOfficerName || '',
      drawingOfficerNameGujarati: bill.drawingOfficerNameGujarati || s?.drawingOfficerNameGujarati || '',
      drawingOfficerDesignation: bill.drawingOfficerDesignation || s?.drawingOfficerDesignation || '',
      drawingOfficerDesignationGujarati: bill.drawingOfficerDesignationGujarati || s?.drawingOfficerDesignationGujarati || '',
      drawingOfficerOffice: bill.drawingOfficerOffice || s?.drawingOfficerOffice || '',
      drawingOfficerOfficeGujarati: bill.drawingOfficerOfficeGujarati || s?.drawingOfficerOfficeGujarati || '',
      messengerName: bill.messengerName || s?.messengerName || '',
      messengerDesignation: bill.messengerDesignation || s?.messengerDesignation || '',
      cardexNo: bill.cardexNo || s?.cardexNo || '',
      ddoCode: bill.ddoCode || s?.ddoCode || '',
      station: bill.station || s?.station || '',
    };
  }, [bill, settingsQuery.data?.settings]);

  const handlePrint = () => {
    const printBtn = document.querySelector('[data-gtr30-print="trigger"]') as HTMLButtonElement | null;
    if (printBtn) {
      printBtn.click();
    } else {
      popupNativePrint({
        viewId: 'gtr30-view-document',
        title: `GTR30_${bill?.billRegisterNo || 'PayBill'}`,
        pageSize: 'A4',
        pageContainerSelector: '.gtr30-page',
      });
    }
  };

  const handleExportJSON = () => {
    if (!bill) return;
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(gtr30BillsService.exportBillAsJson(bill));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `GTR30_Bill_${bill.billRegisterNo || 'export'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast({ title: 'Export Successful', description: 'Bill exported as JSON.' });
  };

  // Avoid flash of "Not Found" while the bill is still loading from IndexedDB/Supabase
  if (billQuery.isPending || billQuery.isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <div className="text-sm font-medium">Loading GTR-30 Pay Bill…</div>
      </div>
    );
  }

  if (billQuery.isError) {
    return (
      <div className="max-w-7xl mx-auto py-10">
        <EmptyState
          icon={FileQuestion}
          title="Failed to load GTR-30 Pay Bill"
          hint={billQuery.error instanceof Error ? billQuery.error.message : 'An error occurred while loading the bill.'}
          action={
            <Button variant="outline" onClick={() => navigate('/gtr30/list')}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to Register
            </Button>
          }
        />
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="max-w-7xl mx-auto py-10">
        <EmptyState
          icon={FileQuestion}
          title="GTR-30 Pay Bill Not Found"
          hint="The requested bill does not exist or may have been removed."
          action={
            <Button variant="outline" onClick={() => navigate('/gtr30/list')}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to Register
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 print:p-0">
      <div className="flex items-center justify-between no-print bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/gtr30/list')}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Register
          </Button>
          <div>
            <h1 className="text-base font-bold text-slate-900">
              GTR-30 Pay Bill · {bill.billRegisterNo || 'Draft'}
            </h1>
            <p className="text-xs text-slate-500">
              {bill.officeName} · {bill.monthOf} · {bill.employees.length} Employees
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            <Download className="mr-1 h-4 w-4" /> Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/gtr30/edit/${bill.id}`)}>
            <Edit className="mr-1 h-4 w-4" /> Edit Bill
          </Button>
          <Button size="sm" onClick={handlePrint} className="font-bold" data-gtr30-print="trigger">
            <Printer className="mr-1 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 overflow-auto print:bg-transparent print:p-0 print:border-none">
        <GTR30Document data={mergedBill || bill} containerId="gtr30-view-document" />
      </div>
    </div>
  );
}
