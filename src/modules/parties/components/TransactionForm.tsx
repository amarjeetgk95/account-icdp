import { useState, useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Party, TransactionInput } from '../types';
import { formatCurrency } from '@/shared/utilities';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';

const transactionSchema = z.object({
  partyName: z.string().min(1, 'Party name is required'),
  billNo: z.string().min(1, 'Bill number is required'),
  date: z.string().min(1, 'Date is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  cgst: z.coerce.number().min(0),
  sgst: z.coerce.number().min(0),
  igst: z.coerce.number().min(0),
  incomeTax: z.coerce.number().min(0),
  cpinNo: z.string(),
  gstNo: z
    .string()
    .refine(
      (val) => !val || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(val),
      'Invalid GST format (e.g. 22AAAAA0000A1Z5)'
    ),
  panNo: z
    .string()
    .refine(
      (val) => !val || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(val),
      'Invalid PAN format (e.g. ABCDE1234F)'
    ),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  parties: Party[];
  onSubmit: (input: TransactionInput) => Promise<void> | void;
  onBulkSubmit?: (inputs: TransactionInput[]) => Promise<void> | void;
  isLoading: boolean;
}

export function TransactionForm({ parties, onSubmit, onBulkSubmit, isLoading }: TransactionFormProps) {
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isDropdownDismissed, setIsDropdownDismissed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit: handleFormSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      partyName: '',
      billNo: '',
      date: today,
      amount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      incomeTax: 0,
      cpinNo: '',
      gstNo: '',
      panNo: '',
    },
  });

  const partyName = useWatch({ control, name: 'partyName' });
  const cgstVal = useWatch({ control, name: 'cgst' }) || 0;
  const sgstVal = useWatch({ control, name: 'sgst' }) || 0;
  const igstVal = useWatch({ control, name: 'igst' }) || 0;
  const totalGst = cgstVal + sgstVal + igstVal;

  const searchResults: Party[] =
    partyName && partyName.length >= 1
      ? parties
          .filter((p) => p.name.toLowerCase().includes(partyName.toLowerCase()))
          .slice(0, 8)
      : [];

  const showDropdown = searchResults.length > 0 && !isDropdownDismissed;

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownDismissed(true);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-clear status messages
  useEffect(() => {
    if (status && (status.type === 'success' || status.type === 'error')) {
      const timer = setTimeout(() => setStatus(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const selectParty = (party: Party) => {
    setValue('partyName', party.name);
    setValue('gstNo', party.gst_no || '');
    setValue('panNo', party.pan_no || '');
    setIsDropdownDismissed(true);
  };

  const onFormSubmit = async (data: TransactionFormData) => {
    setStatus({ type: 'info', message: 'Saving...' });
    try {
      await onSubmit({
        partyName: data.partyName.trim(),
        billNo: data.billNo.trim(),
        date: data.date,
        amount: data.amount,
        cgst: data.cgst,
        sgst: data.sgst,
        igst: data.igst,
        incomeTax: data.incomeTax,
        cpinNo: data.cpinNo?.trim(),
        gstNo: data.gstNo?.trim(),
        panNo: data.panNo?.trim(),
      });
      setStatus({ type: 'success', message: '✓ Transaction saved successfully' });
      reset({
        partyName: '',
        billNo: '',
        date: today,
        amount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        incomeTax: 0,
        cpinNo: '',
        gstNo: '',
        panNo: '',
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save',
      });
    }
  };

  const handleClear = () => {
    reset();
    setStatus(null);
  };

  function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) {
        setCsvError('File appears to be empty or has no data rows.');
        return;
      }

      const headers =
        lines[0]?.split(',').map((h) => h.trim().toLowerCase()) || [];
      const hasHeader =
        headers.includes('party') ||
        headers.includes('name') ||
        headers.includes('amount') ||
        headers.includes('bill');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      const entries: TransactionInput[] = [];
      for (const line of dataLines) {
        const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length < 3) continue;

        const entry: TransactionInput = {
          partyName: cols[0] || '',
          billNo: cols[1] || '',
          date: cols[2] || today,
          amount: parseFloat(cols[3] || '0') || 0,
          cgst: parseFloat(cols[4] || '0') || 0,
          sgst: parseFloat(cols[5] || '0') || 0,
          igst: parseFloat(cols[6] || '0') || 0,
          incomeTax: parseFloat(cols[7] || '0') || 0,
        };

        if (entry.partyName && entry.billNo && entry.amount > 0) {
          entries.push(entry);
        }
      }

      if (entries.length > 0) {
        if (onBulkSubmit) {
          setStatus({ type: 'info', message: `Importing ${entries.length} transactions...` });
          try {
            await onBulkSubmit(entries);
            setStatus({
              type: 'success',
              message: `✓ Successfully imported ${entries.length} transactions`,
            });
          } catch (error) {
            setStatus({
              type: 'error',
              message: error instanceof Error ? error.message : 'Bulk import failed',
            });
          }
        } else {
          setStatus({
            type: 'info',
            message: `Parsed ${entries.length} transactions — bulk import not available`,
          });
        }
      } else {
        setCsvError(
          'No valid transactions found. Ensure columns are: Party Name, Bill No, Date, Amount, CGST, SGST, IGST, Income Tax'
        );
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const fieldError = (field: keyof TransactionFormData) =>
    errors[field] ? (
      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
        <AlertCircle size={12} />
        {errors[field]?.message}
      </p>
    ) : null;

  return (
    <form onSubmit={handleFormSubmit(onFormSubmit)} className="space-y-5">
      {/* Section: Party & Bill Info */}
      <div className="form-section">
        <div className="form-section-title">Party & Bill Info</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative" ref={dropdownRef}>
            <label htmlFor="partyName" className="label">
              Party Name <span className="text-red-400">*</span>
            </label>
            <input
              id="partyName"
              type="text"
              {...register('partyName')}
              className={`input ${errors.partyName ? 'border-red-300 focus:ring-red-200' : ''}`}
              placeholder="Type to search..."
              autoComplete="off"
            />
            {fieldError('partyName')}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((party) => (
                  <button
                    key={party.id}
                    type="button"
                    onClick={() => selectParty(party)}
                    className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-slate-100 last:border-0 transition-colors"
                  >
                    <div className="font-medium text-sm">{party.name}</div>
                    <div className="flex gap-3 mt-0.5">
                      {party.gst_no && (
                        <span className="text-xs text-slate-500">GST: {party.gst_no}</span>
                      )}
                      {party.pan_no && (
                        <span className="text-xs text-slate-500">PAN: {party.pan_no}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="billNo" className="label">
              Bill No <span className="text-red-400">*</span>
            </label>
            <input
              id="billNo"
              type="text"
              {...register('billNo')}
              className={`input ${errors.billNo ? 'border-red-300 focus:ring-red-200' : ''}`}
              placeholder="Bill number"
            />
            {fieldError('billNo')}
          </div>

          <div>
            <label htmlFor="txnDate" className="label">
              Date <span className="text-red-400">*</span>
            </label>
            <input
              id="txnDate"
              type="date"
              {...register('date')}
              className={`input ${errors.date ? 'border-red-300 focus:ring-red-200' : ''}`}
            />
            {fieldError('date')}
          </div>

          <div>
            <label htmlFor="amount" className="label">
              Amount (₹) <span className="text-red-400">*</span>
            </label>
            <input
              id="amount"
              type="number"
              {...register('amount')}
              className={`input ${errors.amount ? 'border-red-300 focus:ring-red-200' : ''}`}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
            {fieldError('amount')}
          </div>
        </div>
      </div>

      {/* Section: Tax Details */}
      <div className="form-section">
        <div className="form-section-title">Tax Details</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="cgst" className="label">
              CGST (₹)
            </label>
            <input
              id="cgst"
              type="number"
              {...register('cgst')}
              className="input"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label htmlFor="sgst" className="label">
              SGST (₹)
            </label>
            <input
              id="sgst"
              type="number"
              {...register('sgst')}
              className="input"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label htmlFor="igst" className="label">
              IGST (₹)
            </label>
            <input
              id="igst"
              type="number"
              {...register('igst')}
              className="input"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label htmlFor="incomeTax" className="label">
              Income Tax (₹)
            </label>
            <input
              id="incomeTax"
              type="number"
              {...register('incomeTax')}
              className="input"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {/* Section: Additional Info */}
      <div className="form-section">
        <div className="form-section-title">Additional Info</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="cpinNo" className="label">
              CPIN No
            </label>
            <input
              id="cpinNo"
              type="text"
              {...register('cpinNo')}
              className="input"
              placeholder="Optional"
            />
          </div>

          <div>
            <label htmlFor="gstNo" className="label">
              GST No
            </label>
            <input
              id="gstNo"
              type="text"
              {...register('gstNo', {
                onChange: (e) => setValue('gstNo', e.target.value.toUpperCase()),
              })}
              className={`input uppercase ${errors.gstNo ? 'border-red-300 focus:ring-red-200' : ''}`}
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
            />
            {fieldError('gstNo')}
          </div>

          <div>
            <label htmlFor="panNo" className="label">
              PAN No
            </label>
            <input
              id="panNo"
              type="text"
              {...register('panNo', {
                onChange: (e) => setValue('panNo', e.target.value.toUpperCase()),
              })}
              className={`input uppercase ${errors.panNo ? 'border-red-300 focus:ring-red-200' : ''}`}
              placeholder="ABCDE1234F"
              maxLength={10}
            />
            {fieldError('panNo')}
          </div>
        </div>
      </div>

      {/* GST Total + Status */}
      <div className="flex items-center gap-4 py-1">
        <div className="text-sm font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
          Total GST: {formatCurrency(totalGst)}
        </div>
      </div>

      {status && (
        <div
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            status.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : status.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {status.type === 'success' && <CheckCircle size={16} />}
          {status.type === 'error' && <AlertCircle size={16} />}
          {status.message}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button type="submit" disabled={isLoading} className="btn btn-primary">
          {isLoading ? 'Saving...' : '💾 Save Transaction'}
        </button>
        <button type="button" onClick={handleClear} className="btn btn-secondary">
          Clear
        </button>
      </div>

      {/* Bulk Import */}
      <div className="border-t border-slate-200 pt-4 mt-4">
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
          <FileSpreadsheet size={16} />
          <span className="font-medium">Bulk Import</span>
        </div>
        <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-slate-300 rounded-xl p-4 cursor-pointer hover:bg-slate-50 hover:border-blue-300 transition-all duration-200">
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvImport}
            className="hidden"
          />
          <Upload size={24} className="text-slate-400 mb-1" />
          <span className="text-sm text-slate-600">
            Click to upload CSV
          </span>
          <span className="text-xs text-slate-400 mt-1">
            Columns: Party Name, Bill No, Date, Amount, CGST, SGST, IGST, Income Tax
          </span>
        </label>
        {csvError && <div className="mt-2 text-sm text-red-600">{csvError}</div>}
      </div>
    </form>
  );
}
