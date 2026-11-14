import { useState } from 'react';
import { Modal } from '@/shared/components/Modal';
import { AlertCircle } from 'lucide-react';
import { useUpdateTransaction } from '../hooks/useParties';
import type { PartyTransaction } from '../types';

interface EditTransactionModalProps {
  transaction: PartyTransaction;
  onClose: () => void;
}

interface EditFormState {
  ddoBillNo: string;
  billNo: string;
  settlementDate: string;
  invoiceDate: string;
  amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  incomeTax: number;
}

function buildForm(tx: PartyTransaction): EditFormState {
  return {
    ddoBillNo: tx.ddo_bill_no || '',
    billNo: tx.bill_no || '',
    settlementDate: tx.settlement_date || tx.transaction_date || '',
    invoiceDate: tx.invoice_date || tx.transaction_date || '',
    amount: tx.amount,
    cgst: tx.cgst,
    sgst: tx.sgst,
    igst: tx.igst,
    incomeTax: tx.income_tax,
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function EditTransactionModal({ transaction, onClose }: EditTransactionModalProps) {
  const updateMutation = useUpdateTransaction();
  const [form, setForm] = useState<EditFormState>(() => buildForm(transaction));
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof EditFormState>(key: K, value: EditFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const totalGst = form.cgst + form.sgst + form.igst;

  const handleSave = async () => {
    setError(null);
    if (!form.billNo.trim()) {
      setError('Bill No is required');
      return;
    }
    if (!isValidDateString(form.settlementDate)) {
      setError('Invalid settlement date (expected YYYY-MM-DD)');
      return;
    }
    if (!isValidDateString(form.invoiceDate)) {
      setError('Invalid invoice date (expected YYYY-MM-DD)');
      return;
    }
    if (!(form.amount > 0)) {
      setError('Amount must be greater than 0');
      return;
    }
    if ((form.cgst || 0) < 0 || (form.sgst || 0) < 0 || (form.igst || 0) < 0) {
      setError('GST amounts cannot be negative');
      return;
    }
    if ((form.incomeTax || 0) < 0) {
      setError('Income tax cannot be negative');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: transaction.id,
        updates: {
          billNo: form.billNo.trim(),
          ddoBillNo: form.ddoBillNo,
          settlementDate: form.settlementDate,
          date: form.settlementDate,
          invoiceDate: form.invoiceDate,
          amount: form.amount,
          cgst: form.cgst,
          sgst: form.sgst,
          igst: form.igst,
          incomeTax: form.incomeTax,
        },
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit transaction · ${transaction.party_name}`}
      maxWidth="lg"
      footerActions={[
        {
          label: 'Cancel',
          onClick: onClose,
          variant: 'secondary',
          disabled: updateMutation.isPending,
        },
        {
          label: updateMutation.isPending ? 'Saving...' : 'Save changes',
          onClick: handleSave,
          disabled: updateMutation.isPending,
        },
      ]}
    >
      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        <div className="form-section">
          <div className="form-section-title">DDO Office & Settlement Info</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-ddoBillNo" className="label">
                DDO Bill No.
              </label>
              <input
                id="edit-ddoBillNo"
                type="text"
                value={form.ddoBillNo}
                onChange={(e) => setField('ddoBillNo', e.target.value)}
                className="input"
                placeholder="e.g. B-104 / Office Bill Reg No"
              />
            </div>
            <div>
              <label htmlFor="edit-settlementDate" className="label">
                Settlement Date <span className="text-red-400">*</span>
              </label>
              <input
                id="edit-settlementDate"
                type="date"
                value={form.settlementDate}
                onChange={(e) => setField('settlementDate', e.target.value)}
                className={`input ${error && error.startsWith('Invalid settlement') ? 'border-red-300 focus:ring-red-200' : ''}`}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">Party & Vendor Invoice Info</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Party Name</label>
              <input type="text" value={transaction.party_name} disabled className="input opacity-70" />
            </div>
            <div>
              <label htmlFor="edit-billNo" className="label">
                Invoice / Bill No <span className="text-red-400">*</span>
              </label>
              <input
                id="edit-billNo"
                type="text"
                value={form.billNo}
                onChange={(e) => setField('billNo', e.target.value)}
                className={`input ${error && error.startsWith('Bill No') ? 'border-red-300 focus:ring-red-200' : ''}`}
                placeholder="Vendor invoice number"
              />
            </div>
            <div>
              <label htmlFor="edit-invoiceDate" className="label">
                Invoice Date <span className="text-red-400">*</span>
              </label>
              <input
                id="edit-invoiceDate"
                type="date"
                value={form.invoiceDate}
                onChange={(e) => setField('invoiceDate', e.target.value)}
                className={`input ${error && error.startsWith('Invalid invoice') ? 'border-red-300 focus:ring-red-200' : ''}`}
              />
            </div>
            <div>
              <label htmlFor="edit-amount" className="label">
                Amount (₹) <span className="text-red-400">*</span>
              </label>
              <input
                id="edit-amount"
                type="number"
                value={form.amount || ''}
                onChange={(e) => setField('amount', parseFloat(e.target.value) || 0)}
                className={`input ${error && error.startsWith('Amount') ? 'border-red-300 focus:ring-red-200' : ''}`}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">Tax Details</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="edit-cgst" className="label">
                CGST (₹)
              </label>
              <input
                id="edit-cgst"
                type="number"
                value={form.cgst || ''}
                onChange={(e) => setField('cgst', parseFloat(e.target.value) || 0)}
                className={`input ${error && error.startsWith('GST') ? 'border-red-300 focus:ring-red-200' : ''}`}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label htmlFor="edit-sgst" className="label">
                SGST (₹)
              </label>
              <input
                id="edit-sgst"
                type="number"
                value={form.sgst || ''}
                onChange={(e) => setField('sgst', parseFloat(e.target.value) || 0)}
                className={`input ${error && error.startsWith('GST') ? 'border-red-300 focus:ring-red-200' : ''}`}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label htmlFor="edit-igst" className="label">
                IGST (₹)
              </label>
              <input
                id="edit-igst"
                type="number"
                value={form.igst || ''}
                onChange={(e) => setField('igst', parseFloat(e.target.value) || 0)}
                className={`input ${error && error.startsWith('GST') ? 'border-red-300 focus:ring-red-200' : ''}`}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label htmlFor="edit-incomeTax" className="label">
                Income Tax (₹)
              </label>
              <input
                id="edit-incomeTax"
                type="number"
                value={form.incomeTax || ''}
                onChange={(e) => setField('incomeTax', parseFloat(e.target.value) || 0)}
                className={`input ${error && error.startsWith('Income tax') ? 'border-red-300 focus:ring-red-200' : ''}`}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between py-1">
          <div className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
            Total GST: ₹{totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          {error && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-red-50 text-red-700 border border-red-200">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
