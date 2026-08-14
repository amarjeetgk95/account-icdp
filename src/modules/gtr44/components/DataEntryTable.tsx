import React, { useState } from 'react';
import { useGTR44Store } from '../store/gtr44Store';
import { GTR44Entry } from '../types';
import { formatIndianCurrency, formatDateDDMMYYYY } from '../utils/gtr44Utils';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { useToast } from '../../../hooks/use-toast';
import {
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  FileText,
  CheckCircle,
  RotateCcw,
  IndianRupee,
  Search,
} from 'lucide-react';

export const DataEntryTable: React.FC = () => {
  const {
    formData,
    addPartyEntry,
    updatePartyEntry,
    deletePartyEntry,
    updateFormField,
    updateDeductions,
    resetToDefault,
  } = useGTR44Store();

  const { toast } = useToast();

  // Modal / Form state for Add/Edit
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [partyName, setPartyName] = useState('');
  const [billNo, setBillNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [details, setDetails] = useState('');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Delete confirmation state
  const [deletingRecord, setDeletingRecord] = useState<GTR44Entry | null>(null);

  // Calculations
  const entries = formData.partyEntries;
  const grossTotal = entries.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalDeductions =
    (formData.deductions.tds9510 || 0) +
    (formData.deductions.surcharge9520 || 0) +
    (formData.deductions.sd9600 || 0) +
    (formData.deductions.misc9910 || 0);
  const netAmount = Math.max(0, grossTotal - totalDeductions);

  const filteredEntries = entries.filter(
    (e) =>
      e.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.billNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAddModal = () => {
    setEditingId(null);
    setPartyName('');
    setBillNo('');
    setDate(new Date().toISOString().split('T')[0]);
    setDetails('');
    setAmount('');
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditModal = (record: GTR44Entry) => {
    setEditingId(record.id);
    setPartyName(record.partyName);
    setBillNo(record.billNo);
    setDate(record.date);
    setDetails(record.details);
    setAmount(record.amount.toString());
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid amount greater than 0.');
      return;
    }

    if (editingId) {
      const result = updatePartyEntry(editingId, {
        partyName,
        billNo,
        date,
        details,
        amount: parsedAmount,
      });

      if (!result.success) {
        setFormError(result.error || 'Failed to update entry.');
        return;
      }

      toast({ title: 'Entry Updated', description: `Bill "${billNo}" successfully updated.` });
    } else {
      const result = addPartyEntry({
        partyName,
        billNo,
        date,
        details,
        amount: parsedAmount,
      });

      if (!result.success) {
        setFormError(result.error || 'Failed to add entry.');
        return;
      }

      toast({ title: 'Entry Added', description: `Bill "${billNo}" successfully added.` });
    }

    setIsDialogOpen(false);
  };

  const confirmDelete = () => {
    if (!deletingRecord) return;
    deletePartyEntry(deletingRecord.id);
    toast({
      title: 'Entry Deleted',
      description: `Bill "${deletingRecord.billNo}" removed.`,
      variant: 'destructive',
    });
    setDeletingRecord(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Party Entries</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{entries.length} Records</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Gross Total</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">₹ {formatIndianCurrency(grossTotal)}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Deductions</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">₹ {formatIndianCurrency(totalDeductions)}</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <IndianRupee className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Net Amount Payable</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">₹ {formatIndianCurrency(netAmount)}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <IndianRupee className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* 2. Main Party Expense Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <h2 className="text-base font-bold text-gray-900">Party / Expense Entries</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Pages 2 &amp; 3 Sub-Vouchers
            </span>
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search party or bill..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <Button onClick={handleOpenAddModal} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              <Plus className="h-4 w-4 mr-1" /> Add Row
            </Button>

            <Button
              onClick={resetToDefault}
              variant="outline"
              size="sm"
              className="text-gray-600 hover:text-gray-900"
              title="Reset form to defaults"
            >
              <RotateCcw className="h-4 w-4 mr-1" /> Reset
            </Button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100/75 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-16 text-center">Sr. No.</th>
                <th className="py-3 px-4 w-1/4">Party Name</th>
                <th className="py-3 px-4 w-28 text-center">Bill No.</th>
                <th className="py-3 px-4 w-28 text-center">Date</th>
                <th className="py-3 px-4">Details / Description</th>
                <th className="py-3 px-4 w-32 text-right">Amount (₹)</th>
                <th className="py-3 px-4 w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-sm">No party entries found.</p>
                    <p className="text-xs mt-1">Click &quot;Add Row&quot; above to add an expense entry.</p>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-gray-700">{entry.srNo}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900">{entry.partyName}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-gray-700 bg-gray-50/50 rounded">
                      {entry.billNo}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-600">{formatDateDDMMYYYY(entry.date)}</td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{entry.details}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                      ₹ {formatIndianCurrency(entry.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleOpenEditModal(entry)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                          title="Edit Row"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingRecord(entry)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                          title="Delete Row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredEntries.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                  <td colSpan={5} className="py-3 px-4 text-right uppercase text-xs text-gray-700 tracking-wider">
                    Total Amount ({entries.length} entries):
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-base text-gray-900">
                    ₹ {formatIndianCurrency(grossTotal)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 3. Form Metadata & Classifications Quick Edit Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bill & Treasury Metadata */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 border-b pb-2">Bill &amp; Treasury Information</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <Label className="text-xs">Office Name</Label>
              <Input
                value={formData.officeName}
                onChange={(e) => updateFormField('officeName', e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Month of Bill</Label>
              <Input
                value={formData.monthOf}
                onChange={(e) => updateFormField('monthOf', e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Treasury Name</Label>
              <Input
                value={formData.treasuryName}
                onChange={(e) => updateFormField('treasuryName', e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Bill Register No.</Label>
              <Input
                value={formData.billRegisterNo}
                onChange={(e) => updateFormField('billRegisterNo', e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">District Code</Label>
              <Input
                value={formData.district}
                onChange={(e) => updateFormField('district', e.target.value)}
                className="mt-1 text-xs"
                maxLength={2}
              />
            </div>
            <div>
              <Label className="text-xs">Month &amp; Year (4-digit)</Label>
              <Input
                value={formData.monthYear}
                onChange={(e) => updateFormField('monthYear', e.target.value)}
                className="mt-1 text-xs"
                maxLength={4}
              />
            </div>
            <div>
              <Label className="text-xs">Drawing (DDO Code)</Label>
              <Input
                value={formData.drawing}
                onChange={(e) => updateFormField('drawing', e.target.value)}
                className="mt-1 text-xs"
                maxLength={3}
              />
            </div>
            <div>
              <Label className="text-xs">Demand No.</Label>
              <Input
                value={formData.demandNo}
                onChange={(e) => updateFormField('demandNo', e.target.value)}
                className="mt-1 text-xs"
                maxLength={3}
              />
            </div>
          </div>
        </div>

        {/* Budget Grant & Deductions */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 border-b pb-2">Budget Grant &amp; Statutory Deductions</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <Label className="text-xs">Budget Grant (₹)</Label>
              <Input
                type="number"
                value={formData.budgetGrant || ''}
                onChange={(e) => updateFormField('budgetGrant', parseFloat(e.target.value) || 0)}
                className="mt-1 text-xs font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Available Balance</Label>
              <Input
                readOnly
                value={`₹ ${formatIndianCurrency(formData.balance)}`}
                className="mt-1 text-xs bg-gray-50 font-mono font-bold"
              />
            </div>
            <div>
              <Label className="text-xs">TDS / Income Tax (9510)</Label>
              <Input
                type="number"
                value={formData.deductions.tds9510 || ''}
                onChange={(e) => updateDeductions({ tds9510: parseFloat(e.target.value) || 0 })}
                className="mt-1 text-xs font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Surcharge on IT (9520)</Label>
              <Input
                type="number"
                value={formData.deductions.surcharge9520 || ''}
                onChange={(e) => updateDeductions({ surcharge9520: parseFloat(e.target.value) || 0 })}
                className="mt-1 text-xs font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Security Deposit (9600)</Label>
              <Input
                type="number"
                value={formData.deductions.sd9600 || ''}
                onChange={(e) => updateDeductions({ sd9600: parseFloat(e.target.value) || 0 })}
                className="mt-1 text-xs font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Misc Recoveries (9910)</Label>
              <Input
                type="number"
                value={formData.deductions.misc9910 || ''}
                onChange={(e) => updateDeductions({ misc9910: parseFloat(e.target.value) || 0 })}
                className="mt-1 text-xs font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal Dialog for Add / Edit Row */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 pb-2 border-b">
              {editingId ? 'Edit Party Expense Row' : 'Add New Party Expense Row'}
            </h3>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEntry} className="space-y-3 text-xs">
              <div>
                <Label className="text-xs font-semibold">Party Name *</Label>
                <Input
                  required
                  placeholder="e.g. Torrent Power Ltd."
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Bill / Invoice No. *</Label>
                  <Input
                    required
                    placeholder="e.g. 3003436383"
                    value={billNo}
                    onChange={(e) => setBillNo(e.target.value)}
                    className="mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Date *</Label>
                  <Input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Details / Description *</Label>
                <textarea
                  rows={3}
                  required
                  placeholder="Description of charges, authority details, etc."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Amount (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 7320"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 font-mono text-sm font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  {editingId ? 'Save Changes' : 'Add Row'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Confirm Deletion</h3>
            <p className="text-xs text-gray-600">
              Are you sure you want to delete bill <strong>{deletingRecord.billNo}</strong> for <strong>{deletingRecord.partyName}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeletingRecord(null)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={confirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
