import { useParams, useNavigate } from 'react-router-dom';
import { GTR30Document } from '../components/GTR30Document';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/shared/components/EmptyState';
import { ChevronLeft, Edit, FileQuestion, Printer, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGtr30Bill } from '../hooks/useGTR30Bills';
import { gtr30BillsService } from '../services/gtr30Bills.service';

export function GTR30ViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const billQuery = useGtr30Bill(id ?? null);
  const bill = billQuery.data ?? null;

  const handlePrint = () => {
    window.print();
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
          <Button size="sm" onClick={handlePrint} className="font-bold">
            <Printer className="mr-1 h-4 w-4" /> Print PDF
          </Button>
        </div>
      </div>

      <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 overflow-auto print:bg-transparent print:p-0 print:border-none">
        <GTR30Document data={bill} containerId="gtr30-view-document" />
      </div>
    </div>
  );
}
