import { useState, useMemo } from 'react';
import type { PartyTransaction, TransactionInput } from '../types';
import { formatCurrency, formatDate } from '@/shared/utilities';
import { useUpdateTransaction, useDeleteTransaction } from '../hooks/useParties';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Edit, Trash2, Check, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface TransactionsTableProps {
  transactions: PartyTransaction[];
  isLoading: boolean;
}

const PAGE_SIZE = 15;

export function TransactionsTable({ transactions, isLoading }: TransactionsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<TransactionInput>>({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  // Filter transactions by search term
  const filtered = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(
      (tx) =>
        tx.party_name.toLowerCase().includes(q) ||
        tx.bill_no.toLowerCase().includes(q)
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
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
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

  const startEdit = (tx: PartyTransaction) => {
    setEditingId(tx.id);
    setEditData({
      billNo: tx.bill_no,
      amount: tx.amount,
      cgst: tx.cgst,
      sgst: tx.sgst,
      igst: tx.igst,
      incomeTax: tx.income_tax,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await updateMutation.mutateAsync({ id: editingId, updates: editData });
      setEditingId(null);
      setEditData({});
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update');
    }
  };

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
            placeholder="Search party or bill no..."
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="tx-count-badge">{filtered.length} transactions</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="tx-table">
          <thead>
            <tr>
              <th className="text-left">Party</th>
              <th className="text-left">Bill No</th>
              <th className="text-right">Amount</th>
              <th className="text-right" style={{ color: '#15803D' }}>CGST</th>
              <th className="text-right" style={{ color: '#15803D' }}>SGST</th>
              <th className="text-right" style={{ color: '#15803D' }}>IGST</th>
              <th className="text-right" style={{ color: '#15803D' }}>Total GST</th>
              <th className="text-right" style={{ color: '#DC2626' }}>Income Tax</th>
              <th className="text-right">Date</th>
              <th className="text-center w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((tx) => {
              const isEditing = editingId === tx.id;
              return (
                <tr key={tx.id} className={isEditing ? 'editing-row' : ''}>
                  <td className="font-medium">{tx.party_name}</td>
                  <td>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.billNo || ''}
                        onChange={(e) => setEditData({ ...editData, billNo: e.target.value })}
                        className="w-24 px-2 py-1 border border-amber-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                      />
                    ) : (
                      tx.bill_no
                    )}
                  </td>
                  <td className="text-right font-bold">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editData.amount || ''}
                        onChange={(e) =>
                          setEditData({ ...editData, amount: parseFloat(e.target.value) || 0 })
                        }
                        className="w-24 px-2 py-1 border border-amber-300 rounded-lg text-right text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                      />
                    ) : (
                      formatCurrency(tx.amount)
                    )}
                  </td>
                  <td className="text-right text-green-700">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editData.cgst || ''}
                        onChange={(e) =>
                          setEditData({ ...editData, cgst: parseFloat(e.target.value) || 0 })
                        }
                        className="w-16 px-2 py-1 border border-amber-300 rounded-lg text-right text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                      />
                    ) : (
                      formatCurrency(tx.cgst)
                    )}
                  </td>
                  <td className="text-right text-green-700">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editData.sgst || ''}
                        onChange={(e) =>
                          setEditData({ ...editData, sgst: parseFloat(e.target.value) || 0 })
                        }
                        className="w-16 px-2 py-1 border border-amber-300 rounded-lg text-right text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                      />
                    ) : (
                      formatCurrency(tx.sgst)
                    )}
                  </td>
                  <td className="text-right text-green-700">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editData.igst || ''}
                        onChange={(e) =>
                          setEditData({ ...editData, igst: parseFloat(e.target.value) || 0 })
                        }
                        className="w-16 px-2 py-1 border border-amber-300 rounded-lg text-right text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                      />
                    ) : (
                      formatCurrency(tx.igst)
                    )}
                  </td>
                  <td className="text-right text-green-700 font-bold">
                    {isEditing ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      formatCurrency(tx.total_gst)
                    )}
                  </td>
                  <td className="text-right text-red-600">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editData.incomeTax || ''}
                        onChange={(e) =>
                          setEditData({ ...editData, incomeTax: parseFloat(e.target.value) || 0 })
                        }
                        className="w-20 px-2 py-1 border border-amber-300 rounded-lg text-right text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-200"
                      />
                    ) : (
                      formatCurrency(tx.income_tax)
                    )}
                  </td>
                  <td className="text-right text-slate-500">{formatDate(tx.transaction_date)}</td>
                  <td className="text-center">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={saveEdit}
                          disabled={updateMutation.isPending}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Save"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => startEdit(tx)}
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
                    )}
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
