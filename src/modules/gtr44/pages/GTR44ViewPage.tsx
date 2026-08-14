import { useParams, useNavigate } from 'react-router-dom';
import { useGTR44Bill } from '../hooks/useGTR44';
import { GTR44PrintableForm } from '../components/GTR44PrintableForm';
import { Button } from '../../../components/ui/button';
import { EmptyState } from '../../../shared/components/EmptyState';
import { SkeletonCard } from '../../../shared/components/Skeleton';
import { ChevronLeft, Printer, Download, Edit, FileQuestion } from 'lucide-react';
import { useToast } from '../../../hooks/use-toast';

export function GTR44ViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { data: bill, isLoading } = useGTR44Bill(id || '');

  const handlePrint = () => {
    window.print();
  };

  const handleExportData = () => {
    if (!bill) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bill, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `gtr44_bill_${bill.billNo || 'export'}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast({ title: 'Export Successful', description: 'Bill data exported as JSON.' });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="container mx-auto py-8">
        <EmptyState
          icon={FileQuestion}
          title="Bill not found."
          hint="It may have been deleted or the link is incorrect."
          action={
            <Button variant="outline" onClick={() => navigate('/gtr44/list')}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to List
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 print:hidden">
        <div className="flex items-center">
          <Button variant="ghost" className="mr-4" onClick={() => navigate('/gtr44/list')}>
            <ChevronLeft className="h-5 w-5 mr-1" /> Return to List
          </Button>
          <h1 className="text-3xl font-bold">View GTR-44 Bill</h1>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExportData}>
            <Download className="mr-2 h-4 w-4" /> Export Data
          </Button>
          <Button variant="outline" onClick={() => navigate(`/gtr44/edit/${id}`)} disabled={bill.status !== 'draft'}>
            <Edit className="mr-2 h-4 w-4" /> Edit Bill
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print GTR-44 PDF
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto bg-gray-50 p-4 rounded-lg print:p-0 print:bg-transparent">
        <GTR44PrintableForm formData={bill.formData} />
      </div>
    </div>
  );
}
