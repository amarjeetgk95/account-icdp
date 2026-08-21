import { useState, useId } from 'react';
import type { ReactNode } from 'react';
import {
  Edit2,
  Trash2,
  Paperclip,
  Plus,
  ChevronRight,
  ArrowLeft,
  Check,
  ArrowUp,
  ArrowDown,
  Calculator,
} from 'lucide-react';
import { EmptyState } from '@/shared/components/EmptyState';
import { formatCurrency } from '@/shared/utilities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
  onReorder?: (subVouchers: SubVoucher[]) => void;
  edpCodeOptions?: string[];
  className?: string;
}

export function SubVoucherList({
  subVouchers,
  onAdd,
  onEdit,
  onDelete,
  onReorder,
  edpCodeOptions = [],
  className = '',
}: SubVoucherListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SubVoucher | null>(null);
  const [formData, setFormData] = useState<Partial<SubVoucher>>({});
  const [reviewMode, setReviewMode] = useState(false);

  // Form field IDs for accessible labels
  const formIdPrefix = useId();
  const voucherNoId = `${formIdPrefix}-voucherNo`;
  const payeeId = `${formIdPrefix}-payee`;
  const billNoId = `${formIdPrefix}-billNo`;
  const dateId = `${formIdPrefix}-date`;
  const detailsId = `${formIdPrefix}-details`;
  const amountId = `${formIdPrefix}-amount`;
  const edpCodeId = `${formIdPrefix}-edpCode`;

  const STEPS = [
    { id: 'details', label: 'Enter Details' },
    { id: 'review', label: 'Review & Save' },
  ];
  const currentStep = reviewMode ? 1 : 0;

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      voucherNo: `SV-${subVouchers.length + 1}`,
      date: new Date().toISOString().split('T')[0],
      amount: undefined,
    });
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

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (!onReorder) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= subVouchers.length) return;
    const next = [...subVouchers];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    onReorder(next);
  };

  const buildVoucher = (): SubVoucher => ({
    id: formData.id || editingItem?.id || crypto.randomUUID(),
    voucherNo: formData.voucherNo?.trim() || '',
    payee: formData.payee?.trim() || '',
    billNo: formData.billNo?.trim() || '',
    date: formData.date || '',
    details: formData.details?.trim() || '',
    amount: typeof formData.amount === 'number' && !isNaN(formData.amount) ? formData.amount : 0,
    edpCode: formData.edpCode?.trim() || '',
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
    typeof formData.amount === 'number' &&
    !isNaN(formData.amount) &&
    formData.amount > 0 &&
    !!formData.edpCode?.trim();

  const totalVoucherAmount = subVouchers.reduce(
    (acc, sv) => acc + (typeof sv.amount === 'number' ? sv.amount : 0),
    0
  );

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Voucher Entry Details</h3>
          <p className="text-xs text-muted-foreground">
            {subVouchers.length} sub-voucher{subVouchers.length === 1 ? '' : 's'} recorded
          </p>
        </div>
        <Button
          type="button"
          onClick={openAddModal}
          size="sm"
          className="font-medium gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Voucher
        </Button>
      </div>

      <div className="overflow-x-auto border border-border rounded-xl shadow-xs bg-card">
        <table className="min-w-full divide-y divide-border" aria-label="Sub-vouchers schedule">
          <thead className="bg-muted/50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sr.</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Voucher No</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Party Name</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bill No</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">EDP Code</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount (₹)</th>
              <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {subVouchers.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-4">
                  <EmptyState
                    icon={Paperclip}
                    title="No vouchers added yet"
                    hint="Add voucher details for each party payment. The EDP code on each voucher decides where its amount appears on Page 1."
                    action={
                      <Button type="button" onClick={openAddModal} size="sm">
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add your first voucher
                      </Button>
                    }
                    compact
                  />
                </td>
              </tr>
            ) : (
              subVouchers.map((sv, idx) => (
                <tr key={sv.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground font-mono">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-foreground">
                    {sv.voucherNo}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground font-medium">
                    {sv.payee}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground font-mono">
                    {sv.billNo || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                    {sv.date || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate" title={sv.details}>
                    {sv.details || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    <span className="inline-block px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-muted text-foreground border border-border">
                      {sv.edpCode || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground text-right font-mono font-semibold">
                    {formatCurrency(sv.amount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-center">
                    <div className="flex items-center justify-center space-x-1">
                      {onReorder && (
                        <>
                          <button
                            type="button"
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30"
                            title="Move Up"
                            aria-label={`Move voucher ${sv.voucherNo} up`}
                            onClick={() => moveItem(idx, 'up')}
                            disabled={idx === 0}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30"
                            title="Move Down"
                            aria-label={`Move voucher ${sv.voucherNo} down`}
                            onClick={() => moveItem(idx, 'down')}
                            disabled={idx === subVouchers.length - 1}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                        title="Edit Voucher"
                        aria-label={`Edit voucher ${sv.voucherNo}`}
                        onClick={() => openEditModal(sv)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(sv.id)}
                        className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                        title="Delete Voucher"
                        aria-label={`Delete voucher ${sv.voucherNo}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {subVouchers.length > 0 && (
            <tfoot className="bg-muted/40 border-t-2 border-border font-semibold text-foreground">
              <tr>
                <td colSpan={7} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-muted-foreground">
                  Total Sub-Vouchers ({subVouchers.length}):
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-bold text-foreground">
                  {formatCurrency(totalVoucherAmount)}
                </td>
                <td className="px-4 py-3 text-center">
                  <Calculator className="w-4 h-4 inline-block text-muted-foreground" />
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Accessible Radix Dialog Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden border border-border shadow-2xl">
          <DialogHeader className="px-6 py-4 bg-muted/50 border-b border-border text-left">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                  editingItem ? 'from-amber-500 to-orange-600' : 'from-primary to-primary/80'
                } text-primary-foreground flex items-center justify-center shadow-xs shrink-0`}
              >
                {editingItem ? <Edit2 size={18} /> : <Plus size={20} />}
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  {editingItem ? 'Edit Voucher' : 'Add New Voucher'}
                  <span
                    className={`text-[0.68rem] font-semibold px-2 py-0.5 rounded-full ${
                      editingItem
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    }`}
                  >
                    {editingItem ? 'Editing' : 'New'}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Capture voucher details for each party payment. EDP Code determines placement on Page 1.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="px-6 py-2.5 border-b border-border bg-card">
            <div className="flex items-center">
              {STEPS.map((s, idx) => (
                <div key={s.id} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        idx <= currentStep
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {idx < currentStep ? <Check className="w-3 h-3" /> : idx + 1}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        idx <= currentStep ? 'text-foreground font-semibold' : 'text-muted-foreground'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`w-10 h-0.5 mx-2 ${
                        idx < currentStep ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {reviewMode ? (
              <div className="space-y-4">
                <div className="bg-muted/40 rounded-xl border border-border overflow-hidden">
                  <div className="px-4 py-3 bg-card border-b border-border flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Voucher Summary</div>
                      <div className="font-bold text-foreground">
                        {formData.voucherNo} <span className="text-muted-foreground">·</span> {formData.payee}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Amount</div>
                      <div className="font-mono font-bold text-lg text-foreground">
                        {formatCurrency(formData.amount || 0)}
                      </div>
                    </div>
                  </div>
                  <dl className="divide-y divide-border">
                    {([
                      ['Bill Number', formData.billNo],
                      ['Date', formData.date],
                      ['Details', formData.details],
                      ['EDP Code', <span key="edp" className="font-mono font-bold uppercase">{formData.edpCode}</span>],
                    ] as [string, ReactNode][]).map(([label, value]) => (
                      <div key={label} className="px-4 py-2.5 grid grid-cols-3 gap-4">
                        <dt className="text-xs font-medium text-muted-foreground col-span-1">{label}</dt>
                        <dd className="text-xs font-medium text-foreground col-span-2">{value || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <p className="text-xs text-muted-foreground">
                  The voucher amount is placed on Page 1 under EDP code{' '}
                  <strong className="text-foreground font-mono">{formData.edpCode}</strong>.
                  Vouchers sharing the same EDP code are aggregated automatically.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={voucherNoId} className="block text-xs font-medium text-foreground mb-1">
                      Voucher No <span className="text-destructive">*</span>
                    </label>
                    <input
                      id={voucherNoId}
                      type="text"
                      className="input"
                      placeholder="e.g. SV-1"
                      value={formData.voucherNo || ''}
                      onChange={(e) => setFormData({ ...formData, voucherNo: e.target.value })}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label htmlFor={payeeId} className="block text-xs font-medium text-foreground mb-1">
                      Party Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      id={payeeId}
                      type="text"
                      className="input"
                      placeholder="Vendor / Payee Name"
                      value={formData.payee || ''}
                      onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={billNoId} className="block text-xs font-medium text-foreground mb-1">
                      Bill Number <span className="text-destructive">*</span>
                    </label>
                    <input
                      id={billNoId}
                      type="text"
                      className="input font-mono"
                      placeholder="e.g. INV-2026-001"
                      value={formData.billNo || ''}
                      onChange={(e) => setFormData({ ...formData, billNo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor={dateId} className="block text-xs font-medium text-foreground mb-1">
                      Date <span className="text-destructive">*</span>
                    </label>
                    <input
                      id={dateId}
                      type="date"
                      className="input"
                      value={formData.date || ''}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor={detailsId} className="block text-xs font-medium text-foreground mb-1">
                    Details / Purpose <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    id={detailsId}
                    className="input"
                    rows={2}
                    placeholder="Brief description of contingency charge..."
                    value={formData.details || ''}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={amountId} className="block text-xs font-medium text-foreground mb-1">
                      Amount (₹) <span className="text-destructive">*</span>
                    </label>
                    <input
                      id={amountId}
                      type="number"
                      min="0"
                      step="0.01"
                      className="input font-mono font-semibold"
                      placeholder="0.00"
                      value={formData.amount !== undefined ? formData.amount : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setFormData({ ...formData, amount: undefined });
                        } else {
                          const parsed = parseFloat(val);
                          setFormData({ ...formData, amount: isNaN(parsed) ? 0 : parsed });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor={edpCodeId} className="block text-xs font-medium text-foreground mb-1">
                      EDP Code <span className="text-destructive">*</span>
                    </label>
                    <input
                      id={edpCodeId}
                      type="text"
                      list={`${formIdPrefix}-edp-options`}
                      className="input font-mono uppercase font-bold"
                      placeholder="e.g. 1304+"
                      value={formData.edpCode || ''}
                      onChange={(e) => setFormData({ ...formData, edpCode: e.target.value })}
                    />
                    <datalist id={`${formIdPrefix}-edp-options`}>
                      {edpCodeOptions.map((code) => (
                        <option key={code} value={code} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3.5 bg-muted/40 border-t border-border flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {reviewMode
                ? 'Confirm details before saving.'
                : isFormValid
                ? 'All fields valid — ready to review.'
                : 'Fill all required (*) fields to continue.'}
            </div>
            <div className="flex items-center gap-2">
              {reviewMode ? (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={() => setReviewMode(false)}>
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
                  </Button>
                  <Button type="button" size="sm" onClick={commitVoucher} className="font-semibold gap-1">
                    <Check className="w-3.5 h-3.5" /> {editingItem ? 'Save Changes' : 'Save Voucher'}
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="ghost" size="sm" onClick={closeModal}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setReviewMode(true)}
                    disabled={!isFormValid}
                    className="font-semibold gap-1"
                  >
                    Review &amp; Save <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}