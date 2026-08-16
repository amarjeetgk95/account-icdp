import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGTR44Bills, useDeleteGTR44Bill, useUpdateGTR44Bill } from '../hooks/useGTR44';
import { GTR44StatsHeader } from '../components/GTR44StatsHeader';
import { GTR44StatusBadge } from '../components/GTR44StatusBadge';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { EmptyState } from '../../../shared/components/EmptyState';
import { SkeletonTable } from '../../../shared/components/Skeleton';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Search, Plus, Eye, Edit, Trash2, Send, FileText } from 'lucide-react';
import { useToast } from '../../../hooks/use-toast';
import { formatCurrency } from '@/shared/utilities';

export function GTR44ListPage() {
  const { data: bills = [], isLoading } = useGTR44Bills();
  const deleteBill = useDeleteGTR44Bill();
  const updateBill = useUpdateGTR44Bill();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [submitTarget, setSubmitTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const stats = useMemo(() => {
    return {
      total: bills.length,
      ytdExpense: bills.reduce((acc, bill) => acc + (bill.grossAmount || 0), 0),
      pendingCount: bills.filter(b => b.status === 'submitted').length,
      passedTotal: bills.filter(b => b.status === 'passed').reduce((acc, bill) => acc + (bill.netAmount || 0), 0),
    };
  }, [bills]);

  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      const matchesSearch = bill.billNo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            bill.officeName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === 'all' || activeTab === 'ytd' || bill.status === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [bills, searchTerm, activeTab]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteBill.mutateAsync(deleteTarget);
      toast({ title: 'Success', description: 'Bill deleted successfully.' });
      setDeleteTarget(null);
    } catch {
      toast({ title: 'Error', description: 'Failed to delete bill.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitToTreasury = async () => {
    if (!submitTarget) return;
    setBusy(true);
    try {
      await updateBill.mutateAsync({ id: submitTarget, bill: { status: 'submitted' } });
      toast({ title: 'Success', description: 'Bill submitted to Treasury.' });
      setSubmitTarget(null);
    } catch {
      toast({ title: 'Error', description: 'Failed to submit bill.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-4">
        <SkeletonTable rows={6} cols={5} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <WorkspaceHeader
        eyebrow="Bill creation · GTR-44"
        title="Detailed contingent bills"
        actions={<Button onClick={() => navigate('/gtr44/create')}>
          <Plus className="mr-2 h-4 w-4" /> Create New Bill
        </Button>}
      />

       <GTR44StatsHeader
         totalBills={stats.total}
         ytdExpense={stats.ytdExpense}
         pendingCount={stats.pendingCount}
         passedTotal={stats.passedTotal}
       />

      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <Tabs value={activeTab} className="w-full sm:w-auto" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="submitted">Submitted</TabsTrigger>
            <TabsTrigger value="passed">Passed</TabsTrigger>
            <TabsTrigger value="objected">Objected</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search Bill No or Office..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        {filteredBills.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No bills found."
            hint={searchTerm ? 'Try a different search term.' : 'Create a new bill to get started.'}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Office</TableHead>
                <TableHead>Gross Amount</TableHead>
                <TableHead>Net Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium">{bill.billNo}</TableCell>
                  <TableCell>{bill.billDate}</TableCell>
                  <TableCell>{bill.officeName}</TableCell>
                  <TableCell className="tabular-nums">{formatCurrency(bill.grossAmount || 0)}</TableCell>
                  <TableCell className="tabular-nums">{formatCurrency(bill.netAmount || 0)}</TableCell>
                  <TableCell>
                    <GTR44StatusBadge status={bill.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button variant="ghost" size="icon" title="View/Print" aria-label={`View or print bill ${bill.billNo}`} onClick={() => navigate(`/gtr44/view/${bill.id}`)}>
                        <Eye className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Edit" aria-label={`Edit bill ${bill.billNo}`} onClick={() => navigate(`/gtr44/edit/${bill.id}`)} disabled={bill.status !== 'draft'}>
                        <Edit className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Delete" aria-label={`Delete bill ${bill.billNo}`} onClick={() => setDeleteTarget(bill.id)} disabled={bill.status !== 'draft'}>
                        <Trash2 className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Submit to Treasury" aria-label={`Submit bill ${bill.billNo} to Treasury`} onClick={() => setSubmitTarget(bill.id)} disabled={bill.status !== 'draft'}>
                        <Send className="h-4 w-4 text-slate-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Bill"
        danger
        confirmLabel="Delete"
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        message={
          <>
            Are you sure you want to delete bill{' '}
            <strong>{bills.find((b) => b.id === deleteTarget)?.billNo ?? ''}</strong>? This cannot
            be undone.
          </>
        }
      />
      <ConfirmDialog
        open={submitTarget !== null}
        title="Submit to Treasury"
        confirmLabel="Submit"
        busy={busy}
        onConfirm={handleSubmitToTreasury}
        onCancel={() => setSubmitTarget(null)}
        message={
          <>
            Submit bill{' '}
            <strong>{bills.find((b) => b.id === submitTarget)?.billNo ?? ''}</strong> to the
            Treasury? The bill will be marked as <strong>Submitted</strong> and can no longer be
            edited.
          </>
        }
      />
    </div>
  );
}
