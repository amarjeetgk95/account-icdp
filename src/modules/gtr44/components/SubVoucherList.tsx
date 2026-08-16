import { useState } from 'react';
import type { ReactNode } from 'react';
import { Edit2, Trash2, Paperclip, Plus, X, ChevronRight, ArrowLeft, Check } from 'lucide-react';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatCurrency } from '@/shared/utilities';

export interface SubVoucher {
  id: string;
  voucherNo: string;
  payee: string;
  billNo: string;
  date: string;
  details: string;
  amount: number;
  edpCode: string;
}

interface SubVoucherListProps {
  subVouchers: SubVoucher[];
  onAdd: (voucher: SubVoucher) => void;
  onEdit: (id: string, voucher: SubVoucher) => void;
  onDelete: (id: string) => void;
  edpCodeOptions?: string[];
  className?: string;
}

export function SubVoucherList({
  subVouchers,
  onAdd,
  onEdit,
  onDelete,
  edpCodeOptions = [],
  className = ''
}: SubVoucherListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SubVoucher | null>(null);
  const [formData, setFormData] = useState<Partial<SubVoucher>>({});
  const [reviewMode, setReviewMode] = useState(false);

  const STEPS = [
    { id: 'details', label: 'Enter Details' },
    { id: 'review', label: 'Review & Save' },
  ];
  const currentStep = reviewMode ? 1 : 0;

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({});
    setReviewMode(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({});
    setReviewMode(false);
  };

  const openEditModal = (sv: SubVoucher) => {
    setEditingItem(sv);
    setFormData({ ...sv });
    setReviewMode(false);
    setIsModalOpen(true);
  };

  const buildVoucher = (): SubVoucher => ({
    id: formData.id || editingItem?.id || crypto.randomUUID(),
    voucherNo: formData.voucherNo || '',
    payee: formData.payee || '',
    billNo: formData.billNo || '',
    date: formData.date || '',
    details: formData.details || '',
    amount: formData.amount || 0,
    edpCode: formData.edpCode || '',
  });

  const commitVoucher = () => {
    const v = buildVoucher();
    if (editingItem) onEdit(editingItem.id, v);
    else onAdd(v);
    closeModal();
  };

  const isFormValid =
    !!formData.voucherNo?.trim() &&
    !!formData.payee?.trim() &&
    !!formData.billNo?.trim() &&
    !!formData.date &&
    !!formData.details?.trim() &&
    !!formData.amount &&
    !!formData.edpCode?.trim();

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Voucher Entry Details</h3>
        <button
          onClick={openAddModal}
          className="btn btn-primary btn-sm"
        >
          <Plus className="w-4 h-4" />
          Add Voucher
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher No</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Number</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">EDP Code</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (₹)</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {subVouchers.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    icon={Paperclip}
                    title="No vouchers added yet"
                    hint="Add voucher details for each party payment. The EDP code on each voucher decides where its amount appears on Page 1."
                    action={
                      <button onClick={openAddModal} className="btn btn-primary btn-sm">
                        <Plus className="w-4 h-4" />
                        Add your first voucher
                      </button>
                    }
                    compact
                  />
                </td>
              </tr>
            ) : (
              subVouchers.map((sv) => (
                <tr key={sv.id} className="hover:bg-gray-50 transition-colors">
                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sv.voucherNo}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sv.payee}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sv.billNo || '-'}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sv.date || '-'}</td>
                   <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={sv.details}>{sv.details}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-mono font-semibold text-gray-700">{sv.edpCode || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                      {formatCurrency(sv.amount)}
                    </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                     <div className="flex items-center justify-center space-x-3">
                       <button
                         className="text-gray-400 hover:text-blue-600 transition-colors"
title="Edit"
                          onClick={() => openEditModal(sv)}
                        >
                         <Edit2 className="w-4 h-4" />
                       </button>
                       <button className="text-gray-400 hover:text-gray-900 transition-colors" title="View Attachment">
                         <Paperclip className="w-4 h-4" />
                       </button>
                       <button
                         onClick={() => onDelete(sv.id)}
                         className="text-gray-400 hover:text-red-600 transition-colors"
                         title="Delete"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${editingItem ? 'from-amber-500 to-orange-600' : 'from-blue-600 to-indigo-600'} text-white flex items-center justify-center shadow-md`}>
                  {editingItem ? <Edit2 size={18} /> : <Plus size={20} />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {editingItem ? 'Edit Voucher' : 'Add New Voucher'}
                    <span className={`text-[0.68rem] font-semibold px-2 py-0.5 rounded-full ${editingItem ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {editingItem ? 'Editing' : 'New'}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Capture voucher details for each party payment. EDP Code decides placement on Page 1.</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-center">
                {STEPS.map((s, idx) => (
                  <div key={s.id} className="flex items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        idx <= currentStep ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                      }`}>
                        {idx < currentStep ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <span className={`text-xs font-medium ${idx <= currentStep ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>{s.label}</span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className={`w-12 h-0.5 mx-2 ${idx < currentStep ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0 app-scroll">
              {reviewMode ? (
                <div className="mx-auto max-w-3xl animate-in fade-in">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-5 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide">Voucher Summary</div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {formData.voucherNo} <span className="text-slate-400">·</span> {formData.payee}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Amount</div>
                        <div className="font-mono font-bold text-lg text-slate-900 dark:text-slate-100">{formatCurrency(formData.amount || 0)}</div>
                      </div>
                    </div>
                    <dl className="divide-y divide-slate-200 dark:divide-slate-700">
                      {([
                        ['Bill Number', formData.billNo],
                        ['Date', formData.date],
                        ['Details', formData.details],
                        ['EDP Code', <span key="edp" className="font-mono uppercase">{formData.edpCode}</span>],
                      ] as [string, ReactNode][]).map(([label, value]) => (
                        <div key={label} className="px-5 py-3 grid grid-cols-3 gap-4">
                          <dt className="text-sm text-slate-500 col-span-1">{label}</dt>
                          <dd className="text-sm font-medium text-slate-900 dark:text-slate-100 col-span-2">{value || '-'}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                    The voucher amount is placed on Page 1 under this EDP Code. Vouchers with the
                    same EDP Code are added together. Confirm the details above before saving.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Voucher No <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. SV-2023-001"
                        value={formData.voucherNo || ''}
                        onChange={e => setFormData({...formData, voucherNo: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Party Name <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Vendor Name"
                        value={formData.payee || ''}
                        onChange={e => setFormData({...formData, payee: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bill Number <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. 3003436383"
                        value={formData.billNo || ''}
                        onChange={e => setFormData({...formData, billNo: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date <span className="text-rose-500">*</span></label>
                      <input
                        type="date"
                        className="input"
                        value={formData.date || ''}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Details <span className="text-rose-500">*</span></label>
                    <textarea
                      className="input"
                      rows={2}
                      placeholder="Brief description of charge..."
                      value={formData.details || ''}
                      onChange={e => setFormData({...formData, details: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹) <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                        value={formData.amount ?? ''}
                        onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        EDP Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        list="gtr44-edp-code-options"
                        className="input font-mono uppercase"
                        placeholder="e.g. 1304+"
                        value={formData.edpCode || ''}
                        onChange={e => setFormData({...formData, edpCode: e.target.value})}
                      />
                      <datalist id="gtr44-edp-code-options">
                        {edpCodeOptions.map((code) => (
                          <option key={code} value={code} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    The voucher amount is placed on Page 1 under this EDP Code. Vouchers with the
                    same EDP Code are added together.
                  </p>
                </>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500">
                {reviewMode
                  ? 'Review the voucher details and confirm to save'
                  : isFormValid
                    ? 'All required fields completed — ready to review'
                    : 'Fill all required (*) fields to continue'}
              </div>
              <div className="flex items-center gap-3">
                {reviewMode ? (
                  <>
                    <button onClick={() => setReviewMode(false)} className="btn btn-secondary">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button onClick={commitVoucher} className="btn btn-primary">
                      <Check className="w-4 h-4" /> {editingItem ? 'Save Changes' : 'Save Voucher'}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={closeModal} className="btn btn-secondary">
                      Cancel
                    </button>
                    <button
                      onClick={() => setReviewMode(true)}
                      disabled={!isFormValid}
                      className="btn btn-primary"
                    >
                      Review &amp; Save <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}