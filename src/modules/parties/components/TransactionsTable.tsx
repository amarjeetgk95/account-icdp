import { useState, useMemo } from 'react';
import type { PartyTransaction } from '../types';
import { formatCurrency, formatDate } from '@/shared/utilities';
import { useDeleteTransaction } from '../hooks/useParties';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { SkeletonTable } from '@/shared/components/Skeleton';
import { EditTransactionModal } from './EditTransactionModal';
import { Edit, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface TransactionsTableProps {
  transactions: PartyTransaction[];
  isLoading: boolean;
}

const PAGE_SIZE = 15;

export function TransactionsTable({ transactions, isLoading }: TransactionsTableProps) {
  const [editingTx, setEditingTx] = useState<PartyTransaction | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const deleteMutation = useDeleteTransaction();

  // Filter transactions by search term
  const filtered = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(
      (tx) =>
        tx.party_name.toLowerCase().includes(q) ||
        tx.bill_no.toLowerCase().includes(q) ||
        (tx.ddo_bill_no && tx.ddo_bill_no.toLowerCase().includes(q))
    );
  }, [transactions, search]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totals = filtered.reduce(
    (acc, tx) => ({
      amount: acc.amount + tx.amount,
      cgst: acc.cgst + tx.cgst,
      sgst: acc.sgst + tx.sgst,
      igst: acc.igst + tx.igst,
      totalGst: acc.totalGst + tx.total_gst,
      incomeTax: acc.incomeTax + tx.income_tax,
    }),
    { amount: 0, cgst: 0, sgst: 0, igst: 0, totalGst: 0, incomeTax: 0 }
  );

  if (isLoading) {
    return <SkeletonTable rows={5} cols={5} />;
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">📝</div>
        <p className="text-slate-500 font-medium">No transactions yet.</p>
        <p className="text-xs text-slate-400 mt-1">Add your first transaction above.</p>
      </div>
    );
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete');
    } finally {
      setDeleteTarget(null);
    }
  };

  // Generate page numbers for pagination
  const pageNumbers: number[] = [];
  const maxVisible = 5;
  let startPage = Math.max(1, safePage - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);
  startPage = Math.max(1, endPage - maxVisible + 1);
  for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);

  return (
    <>
      {/* Search bar */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="search-input-wrapper flex-1 max-w-xs">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input input-sm"
            placeholder="Search party, bill or DDO no..."
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="tx-count-badge">{filtered.length} transactions</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="tx-table tabular-nums">
          <thead>
            <tr>
              <th className="text-left">Party</th>
              <th className="text-left">Bill / DDO No</th>
              <th className="text-right">Amount</th>
              <th className="text-right" style={{ color: '#15803D' }}>CGST</th>
              <th className="text-right" style={{ color: '#15803D' }}>SGST</th>
              <th className="text-right" style={{ color: '#15803D' }}>IGST</th>
              <th className="text-right" style={{ color: '#15803D' }}>Total GST</th>
              <th className="text-right" style={{ color: '#DC2626' }}>Income Tax</th>
              <th className="text-right">Settlement / Inv Date</th>
              <th className="text-center w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((tx) => {
              const isEditing = editingTx?.id === tx.id;

              return (
                <tr key={tx.id} className={isEditing ? 'editing-row' : ''}>
                  <td className="font-medium">{tx.party_name}</td>
                  <td>
                    <div>
                      <div className="font-medium text-slate-800">{tx.bill_no}</div>
                      {tx.ddo_bill_no && (
                        <div className="text-[11px] text-blue-600 font-normal">DDO: {tx.ddo_bill_no}</div>
                      )}
                    </div>
                  </td>
                  <td className="text-right font-bold">{formatCurrency(tx.amount)}</td>
                  <td className="text-right text-green-700">{formatCurrency(tx.cgst)}</td>
                  <td className="text-right text-green-700">{formatCurrency(tx.sgst)}</td>
                  <td className="text-right text-green-700">{formatCurrency(tx.igst)}</td>
                  <td className="text-right text-green-700 font-bold">{formatCurrency(tx.total_gst)}</td>
                  <td className="text-right text-red-600">{formatCurrency(tx.income_tax)}</td>
                  <td className="text-right">
                    <div>
                      <div className="text-xs text-slate-700 font-medium">{formatDate(tx.settlement_date || tx.transaction_date)}</div>
                      {tx.invoice_date && tx.invoice_date !== (tx.settlement_date || tx.transaction_date) && (
                        <div className="text-[11px] text-slate-400">Inv: {formatDate(tx.invoice_date)}</div>
                      )}
                    </div>
                  </td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setEditingTx(tx)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(tx.id)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="text-right font-bold">
                Total ({filtered.length})
              </td>
              <td className="text-right">{formatCurrency(totals.amount)}</td>
              <td className="text-right text-green-700">{formatCurrency(totals.cgst)}</td>
              <td className="text-right text-green-700">{formatCurrency(totals.sgst)}</td>
              <td className="text-right text-green-700">{formatCurrency(totals.igst)}</td>
              <td className="text-right text-green-700">{formatCurrency(totals.totalGst)}</td>
              <td className="text-right text-red-600">{formatCurrency(totals.incomeTax)}</td>
              <td></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <span className="pagination-info">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="pagination-buttons">
            <button
              className="pagination-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              <ChevronLeft size={14} />
            </button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                className={`pagination-btn ${n === safePage ? 'active' : ''}`}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              className="pagination-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Edit transaction modal */}
      {editingTx && (
        <EditTransactionModal transaction={editingTx} onClose={() => setEditingTx(null)} />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmLabel="Delete"
        danger
        busy={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
