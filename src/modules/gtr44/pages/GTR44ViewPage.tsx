import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGTR44Bill } from '../hooks/useGTR44';
import { GTR44PrintableForm } from '../components/GTR44PrintableForm';
import { GTR44StatusBadge } from '../components/GTR44StatusBadge';
import { Button } from '../../../components/ui/button';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Skeleton } from '../../../shared/components/Skeleton';
import { ChevronLeft, Printer, Download, Edit, FileQuestion, FileDown } from 'lucide-react';
import { useToast } from '../../../hooks/use-toast';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';

export function GTR44ViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: bill, isLoading } = useGTR44Bill(id || '');

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!bill) return;
    setIsDownloading(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const pages = document.querySelectorAll<HTMLElement>('.gtr-page');
      if (pages.length === 0) {
        const single = document.getElementById('gtr44-printable-form-container') as HTMLElement;
        if (single) {
          const canvas = await html2canvas(single, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = 210;
          const pdfHeight = 297;
          const imgProps = pdf.getImageProperties(imgData);
          const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
          let heightLeft = imgHeight;
          let position = 0;
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
          while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
          }
          pdf.save(`GTR44_${bill.billNo || bill.id}.pdf`);
          toast({ title: 'PDF Downloaded', description: 'GTR-44 bill exported as 4-page PDF.' });
          return;
        }
        throw new Error('No printable pages found');
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i];
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
        const prevBoxShadow = pageEl.style.boxShadow;
        const prevBorder = pageEl.style.border;
        const prevMargin = pageEl.style.margin;
        pageEl.style.boxShadow = 'none';
        pageEl.style.border = 'none';
        pageEl.style.margin = '0';
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        });
        pageEl.style.boxShadow = prevBoxShadow;
        pageEl.style.border = prevBorder;
        pageEl.style.margin = prevMargin;
        const imgData = canvas.toDataURL('image/png');
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      }
      pdf.save(`GTR44_${bill.billNo || bill.id}_${bill.formData?.monthOf || ''}.pdf`);
      toast({
        title: 'PDF Downloaded',
        description: `Exported ${pages.length}-page GTR-44 PDF matching the standard form layout.`,
      });
    } catch (err) {
      console.error('GTR44 PDF export failed', err);
      toast({ title: 'PDF Export Failed', description: String(err), variant: 'destructive' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExportData = () => {
    if (!bill) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bill, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', `gtr44_bill_${bill.billNo || 'export'}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast({ title: 'Export Successful', description: 'Bill data exported as JSON.' });
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <WorkspaceHeader
          eyebrow="Bill preview · GTR-44"
          title="View detailed contingent bill"
        />
        <div className="max-w-4xl mx-auto p-8 bg-card border border-border rounded-xl space-y-6 shadow-sm">
          <div className="space-y-2">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <WorkspaceHeader
          eyebrow="Bill preview · GTR-44"
          title="Bill not found"
        />
        <EmptyState
          icon={FileQuestion}
          title="Bill not found"
          hint="The requested bill does not exist or may have been deleted."
          action={
            <Button variant="outline" onClick={() => navigate('/gtr44/list')} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Back to Register
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 print:p-0">
      <div className="print:hidden">
        <WorkspaceHeader
          eyebrow="Bill preview · GTR-44"
          title={bill.billNo || 'View GTR-44 Bill'}
          context={<GTR44StatusBadge status={bill.status} />}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/gtr44/list')} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Register
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportData} title="Export bill JSON data" className="gap-1">
                <Download className="h-4 w-4" /> Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/gtr44/edit/${id}`)}
                disabled={bill.status !== 'draft'}
                title={bill.status !== 'draft' ? 'Only draft bills can be edited' : 'Edit Bill'}
                className="gap-1"
              >
                <Edit className="h-4 w-4" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                title="Download as 4-page PDF"
                className="gap-1"
              >
                <FileDown className="h-4 w-4" /> {isDownloading ? 'Generating…' : 'Download PDF'}
              </Button>
              <Button size="sm" onClick={handlePrint} title="Print all 4 pages" className="gap-1 font-semibold">
                <Printer className="h-4 w-4" /> Print
              </Button>
            </div>
          }
        />
      </div>

      <div className="max-w-5xl mx-auto bg-muted/40 p-4 rounded-xl border border-border print:p-0 print:bg-transparent print:border-0">
        <GTR44PrintableForm formData={bill.formData} />
      </div>
    </div>
  );
}

