import { useState } from 'react';
import type { PartyTransaction, TransactionInput } from '../types';
import { formatCurrency } from '@/shared/utilities';
import { useUpdateTransaction, useDeleteTransaction } from '../hooks/useParties';
import { Edit, Trash2, Check, X } from 'lucide-react';

interface TransactionsTableProps {
  transactions: PartyTransaction[];
  isLoading: boolean;
}

export function TransactionsTable({ transactions, isLoading }: TransactionsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<TransactionInput>>({});
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return <div className="text-center py-8 text-slate-500">No transactions yet.</div>;
  }

  const totals = transactions.reduce(
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

  const deleteTx = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete');
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-600">Party</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-600">Bill No</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Amount</th>
            <th className="px-3 py-2 text-right font-semibold text-green-700">CGST</th>
            <th className="px-3 py-2 text-right font-semibold text-green-700">SGST</th>
            <th className="px-3 py-2 text-right font-semibold text-green-700">IGST</th>
            <th className="px-3 py-2 text-right font-semibold text-green-700">Total GST</th>
            <th className="px-3 py-2 text-right font-semibold text-red-600">Income Tax</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">Date</th>
            <th className="px-3 py-2 text-center font-semibold text-slate-600 w-20">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {transactions.map((tx) => {
            const isEditing = editingId === tx.id;
            return (
              <tr key={tx.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">{tx.party_name}</td>
                <td className="px-3 py-2">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.billNo || ''}
                      onChange={(e) => setEditData({ ...editData, billNo: e.target.value })}
                      className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                    />
                  ) : (
                    tx.bill_no
                  )}
                </td>
                <td className="px-3 py-2 text-right font-bold">
                  {isEditing ? (
                    <input
                      type="number"
                      value={editData.amount || ''}
                      onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) || 0 })}
                      className="w-20 px-2 py-1 border border-slate-300 rounded text-right text-sm"
                    />
                  ) : (
                    formatCurrency(tx.amount)
                  )}
                </td>
                <td className="px-3 py-2 text-right text-green-700">
                  {isEditing ? (
                    <input
                      type="number"
                      value={editData.cgst || ''}
                      onChange={(e) => setEditData({ ...editData, cgst: parseFloat(e.target.value) || 0 })}
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-right text-sm"
                    />
                  ) : (
                    formatCurrency(tx.cgst)
                  )}
                </td>
                <td className="px-3 py-2 text-right text-green-700">
                  {isEditing ? (
                    <input
                      type="number"
                      value={editData.sgst || ''}
                      onChange={(e) => setEditData({ ...editData, sgst: parseFloat(e.target.value) || 0 })}
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-right text-sm"
                    />
                  ) : (
                    formatCurrency(tx.sgst)
                  )}
                </td>
                <td className="px-3 py-2 text-right text-green-700">
                  {isEditing ? (
                    <input
                      type="number"
                      value={editData.igst || ''}
                      onChange={(e) => setEditData({ ...editData, igst: parseFloat(e.target.value) || 0 })}
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-right text-sm"
                    />
                  ) : (
                    formatCurrency(tx.igst)
                  )}
                </td>
                <td className="px-3 py-2 text-right text-green-700 font-bold">
                  {isEditing ? (
                    <span className="text-slate-500">—</span>
                  ) : (
                    formatCurrency(tx.total_gst)
                  )}
                </td>
                <td className="px-3 py-2 text-right text-red-600">
                  {isEditing ? (
                    <input
                      type="number"
                      value={editData.incomeTax || ''}
                      onChange={(e) => setEditData({ ...editData, incomeTax: parseFloat(e.target.value) || 0 })}
                      className="w-20 px-2 py-1 border border-slate-300 rounded text-right text-sm"
                    />
                  ) : (
                    formatCurrency(tx.income_tax)
                  )}
                </td>
                <td className="px-3 py-2 text-right text-slate-500">{tx.transaction_date}</td>
                <td className="px-3 py-2 text-center">
                  {isEditing ? (
                    <>
                      <button
                        onClick={saveEdit}
                        disabled={updateMutation.isPending}
                        className="p-1 text-green-600 hover:text-green-700 rounded"
                        title="Save"
                      >
                        <Check size={14} />
                      </button>
                      <button onClick={cancelEdit} className="p-1 text-slate-500 hover:text-slate-700 rounded" title="Cancel">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(tx)}
                        className="p-1 text-indigo-600 hover:text-indigo-700 rounded"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => deleteTx(tx.id)}
                        disabled={deleteMutation.isPending}
                        className="p-1 text-red-500 hover:text-red-700 rounded"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-slate-50 font-bold">
          <tr>
            <td colSpan={2} className="px-3 py-2 text-right">
              Total
            </td>
            <td className="px-3 py-2 text-right">{formatCurrency(totals.amount)}</td>
            <td className="px-3 py-2 text-right text-green-700">{formatCurrency(totals.cgst)}</td>
            <td className="px-3 py-2 text-right text-green-700">{formatCurrency(totals.sgst)}</td>
            <td className="px-3 py-2 text-right text-green-700">{formatCurrency(totals.igst)}</td>
            <td className="px-3 py-2 text-right text-green-700">{formatCurrency(totals.totalGst)}</td>
            <td className="px-3 py-2 text-right text-red-600">{formatCurrency(totals.incomeTax)}</td>
            <td className="px-3 py-2"></td>
            <td className="px-3 py-2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
