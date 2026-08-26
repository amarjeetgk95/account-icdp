import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGTR44Bills, useDeleteGTR44Bill } from '../hooks/useGTR44';
import { GTR44StatsHeader } from '../components/GTR44StatsHeader';
import { GTR44StatusBadge } from '../components/GTR44StatusBadge';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { EmptyState } from '../../../shared/components/EmptyState';
import { SkeletonCard, SkeletonTable } from '../../../shared/components/Skeleton';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Search, Plus, Eye, Edit, Trash2, FileText, RefreshCw } from 'lucide-react';
import { useToast } from '../../../hooks/use-toast';
import { formatCurrency } from '@/shared/utilities';

export function GTR44ListPage() {
  const { data: bills = [], isLoading, isError, refetch } = useGTR44Bills();
  const deleteBill = useDeleteGTR44Bill();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const stats = useMemo(() => {
    return {
      total: bills.length,
      ytdExpense: bills.reduce((acc, bill) => acc + (bill.grossAmount || 0), 0),
      pendingCount: bills.filter((b) => b.status === 'submitted').length,
      passedTotal: bills
        .filter((b) => b.status === 'passed')
        .reduce((acc, bill) => acc + (bill.netAmount || 0), 0),
    };
  }, [bills]);

  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      const matchesSearch =
        bill.billNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.officeName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === 'all' || bill.status === activeTab;
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

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <WorkspaceHeader
          eyebrow="Bill creation · GTR-44"
          title="Detailed contingent bills"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonTable rows={6} cols={7} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <WorkspaceHeader
          eyebrow="Bill creation · GTR-44"
          title="Detailed contingent bills"
        />
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center space-y-3">
          <p className="text-sm text-destructive font-medium">Failed to load GTR-44 bills.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <WorkspaceHeader
        eyebrow="Bill creation · GTR-44"
        title="Detailed contingent bills"
        actions={
          <Button onClick={() => navigate('/gtr44/create')} className="gap-1.5 font-semibold">
            <Plus className="h-4 w-4" /> Create New Bill
          </Button>
        }
      />

      <GTR44StatsHeader
        totalBills={stats.total}
        ytdExpense={stats.ytdExpense}
        pendingCount={stats.pendingCount}
        passedTotal={stats.passedTotal}
      />

      <div className="bg-card p-2.5 rounded-xl shadow-xs border border-border flex flex-col sm:flex-row justify-between items-center gap-3">
        <Tabs value={activeTab} className="w-full sm:w-auto" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All ({bills.length})</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="submitted">Submitted</TabsTrigger>
            <TabsTrigger value="passed">Passed</TabsTrigger>
            <TabsTrigger value="objected">Objected</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Bill No or Office..."
            className="pl-9 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-xs border border-border overflow-hidden">
        {filteredBills.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={bills.length === 0 ? 'No GTR-44 bills yet' : 'No matching bills found'}
            hint={
              bills.length === 0
                ? 'Create your first Detailed Contingent Bill to start tracking contingent disbursements.'
                : searchTerm
                ? `No bills match "${searchTerm}". Try a different filter or keyword.`
                : 'No bills match the selected status filter.'
            }
            action={
              bills.length === 0 ? (
                <Button onClick={() => navigate('/gtr44/create')} size="sm" className="gap-1.5 font-semibold">
                  <Plus className="h-4 w-4" /> Create Your First Bill
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold">Bill No</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Office</TableHead>
                <TableHead className="font-semibold text-right">Gross Amount</TableHead>
                <TableHead className="font-semibold text-right">Net Amount</TableHead>
                <TableHead className="font-semibold text-center">Status</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {filteredBills.map((bill) => (
                <TableRow key={bill.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-mono font-bold text-foreground">{bill.billNo}</TableCell>
                  <TableCell className="text-muted-foreground">{bill.billDate}</TableCell>
                  <TableCell className="font-medium text-foreground">{bill.officeName || '—'}</TableCell>
                  <TableCell className="tabular-nums font-mono text-right font-semibold text-foreground">
                    {formatCurrency(bill.grossAmount || 0)}
                  </TableCell>
                  <TableCell className="tabular-nums font-mono text-right font-bold text-foreground">
                    {formatCurrency(bill.netAmount || 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    <GTR44StatusBadge status={bill.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="View / Print"
                        aria-label={`View or print bill ${bill.billNo}`}
                        onClick={() => navigate(`/gtr44/view/${bill.id}`)}
                      >
                        <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Edit Bill"
                        aria-label={`Edit bill ${bill.billNo}`}
                        onClick={() => navigate(`/gtr44/edit/${bill.id}`)}
                        disabled={bill.status !== 'draft'}
                      >
                        <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete Bill"
                        aria-label={`Delete bill ${bill.billNo}`}
                        onClick={() => setDeleteTarget(bill.id)}
                        disabled={bill.status !== 'draft'}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
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
        confirmLabel="Delete Bill"
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        message={
          <>
            Are you sure you want to delete bill{' '}
            <strong className="font-mono font-bold text-foreground">
              {bills.find((b) => b.id === deleteTarget)?.billNo ?? ''}
            </strong>
            ? This action cannot be undone.
          </>
        }
      />
    </div>
  );
}
