import { useState, useEffect, useRef } from 'react';
import type { Party, TransactionInput } from '../types';
import { formatCurrency } from '@/shared/utilities';
import { Upload, FileSpreadsheet } from 'lucide-react';

interface TransactionFormProps {
  parties: Party[];
  onSubmit: (input: TransactionInput) => void;
  isLoading: boolean;
}

export function TransactionForm({ parties, onSubmit, isLoading }: TransactionFormProps) {
  const [partyName, setPartyName] = useState('');
  const [billNo, setBillNo] = useState('');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [cgst, setCgst] = useState('');
  const [sgst, setSgst] = useState('');
  const [igst, setIgst] = useState('');
  const [incomeTax, setIncomeTax] = useState('');
  const [cpinNo, setCpinNo] = useState('');
  const [gstNo, setGstNo] = useState('');
  const [panNo, setPanNo] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Party[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split('T')[0];
  useEffect(() => {
    setDate(today);
  }, [today]);

  useEffect(() => {
    if (partyName && partyName.length >= 1) {
      const matches = parties
        .filter((p) => p.name.toLowerCase().includes(partyName.toLowerCase()))
        .slice(0, 8);
      setSearchResults(matches);
      setShowDropdown(matches.length > 0);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [partyName, parties]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectParty = (party: Party) => {
    setPartyName(party.name);
    setGstNo(party.gst_no || '');
    setPanNo(party.pan_no || '');
    setShowDropdown(false);
  };

  const totalGst = (parseFloat(cgst) || 0) + (parseFloat(sgst) || 0) + (parseFloat(igst) || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!partyName.trim()) {
      setStatus({ type: 'error', message: 'Party Name is required' });
      return;
    }
    if (!billNo.trim()) {
      setStatus({ type: 'error', message: 'Bill No is required' });
      return;
    }
    if (!date) {
      setStatus({ type: 'error', message: 'Date is required' });
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setStatus({ type: 'error', message: 'Amount must be greater than 0' });
      return;
    }

    setStatus({ type: 'info', message: 'Saving...' });

    onSubmit({
      partyName: partyName.trim(),
      billNo: billNo.trim(),
      date,
      amount: parseFloat(amount),
      cgst: parseFloat(cgst) || 0,
      sgst: parseFloat(sgst) || 0,
      igst: parseFloat(igst) || 0,
      incomeTax: parseFloat(incomeTax) || 0,
      cpinNo: cpinNo.trim(),
      gstNo: gstNo.trim(),
      panNo: panNo.trim(),
    });
  };

  const handleClear = () => {
    setPartyName('');
    setBillNo('');
    setDate(today);
    setAmount('');
    setCgst('');
    setSgst('');
    setIgst('');
    setIncomeTax('');
    setCpinNo('');
    setGstNo('');
    setPanNo('');
    setStatus(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative" ref={dropdownRef}>
          <label htmlFor="partyName" className="label">Party Name</label>
          <input
            id="partyName"
            type="text"
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            className="input"
            placeholder="Type to search..."
            autoComplete="off"
            required
          />
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map((party) => (
                <button
                  key={party.id}
                  type="button"
                  onClick={() => selectParty(party)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-slate-100 last:border-0"
                >
                  <div className="font-medium">{party.name}</div>
                  {party.gst_no && <div className="text-xs text-slate-500">GST: {party.gst_no}</div>}
                  {party.pan_no && <div className="text-xs text-slate-500">PAN: {party.pan_no}</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="billNo" className="label">Bill No</label>
          <input
            id="billNo"
            type="text"
            value={billNo}
            onChange={(e) => setBillNo(e.target.value)}
            className="input"
            placeholder="Bill number"
            required
          />
        </div>

        <div>
          <label htmlFor="txnDate" className="label">Date</label>
          <input
            id="txnDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
            required
          />
        </div>

        <div>
          <label htmlFor="amount" className="label">Amount (₹)</label>
          <input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input"
            placeholder="0.00"
            min="0"
            step="0.01"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label htmlFor="cgst" className="label">CGST (₹)</label>
          <input
            id="cgst"
            type="number"
            value={cgst}
            onChange={(e) => setCgst(e.target.value)}
            className="input"
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label htmlFor="sgst" className="label">SGST (₹)</label>
          <input
            id="sgst"
            type="number"
            value={sgst}
            onChange={(e) => setSgst(e.target.value)}
            className="input"
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label htmlFor="igst" className="label">IGST (₹)</label>
          <input
            id="igst"
            type="number"
            value={igst}
            onChange={(e) => setIgst(e.target.value)}
            className="input"
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label htmlFor="incomeTax" className="label">Income Tax (₹)</label>
          <input
            id="incomeTax"
            type="number"
            value={incomeTax}
            onChange={(e) => setIncomeTax(e.target.value)}
            className="input"
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="cpinNo" className="label">CPIN No</label>
          <input
            id="cpinNo"
            type="text"
            value={cpinNo}
            onChange={(e) => setCpinNo(e.target.value)}
            className="input"
            placeholder="Optional"
          />
        </div>

        <div>
          <label htmlFor="gstNo" className="label">GST No</label>
          <input
            id="gstNo"
            type="text"
            value={gstNo}
            onChange={(e) => setGstNo(e.target.value.toUpperCase())}
            className="input uppercase"
            placeholder="22AAAAA0000A1Z5"
            maxLength={15}
          />
        </div>

        <div>
          <label htmlFor="panNo" className="label">PAN No</label>
          <input
            id="panNo"
            type="text"
            value={panNo}
            onChange={(e) => setPanNo(e.target.value.toUpperCase())}
            className="input uppercase"
            placeholder="ABCDE1234F"
            maxLength={10}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 py-2">
        <div className="text-sm text-blue-700 font-bold">
          Total GST: {formatCurrency(totalGst)}
        </div>
      </div>

      {status && (
        <div
          className={`px-4 py-2 rounded-lg ${
            status.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : status.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {status.message}
        </div>
      )}

  <div className="flex gap-2">
        <button type="submit" disabled={isLoading} className="btn btn-primary">
          {isLoading ? 'Saving...' : '💾 Save Transaction'}
        </button>
        <button type="button" onClick={handleClear} className="btn btn-secondary">
          Clear
        </button>
      </div>

      <div className="border-t border-slate-200 pt-4 mt-4">
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
          <FileSpreadsheet size={16} />
          <span className="font-medium">Bulk Import</span>
        </div>
        <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-slate-300 rounded-lg p-4 cursor-pointer hover:bg-slate-50 transition-colors">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleCsvImport}
            className="hidden"
          />
          <Upload size={24} className="text-slate-400 mb-1" />
          <span className="text-sm text-slate-600">Click to upload CSV or paste from Excel</span>
        </label>
        {csvError && (
          <div className="mt-2 text-sm text-red-600">{csvError}</div>
        )}
      </div>
    </form>
  );

  function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) {
        setCsvError('File appears to be empty or has no data rows.');
        return;
      }

      const headers = lines[0]?.split(',').map((h) => h.trim().toLowerCase()) || [];
      const hasHeader = headers.includes('party') || headers.includes('name') || headers.includes('amount') || headers.includes('bill');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      let parsedCount = 0;
      for (const line of dataLines) {
        const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length < 3) continue;

        const entry: TransactionInput = {
          partyName: cols[0] || '',
          billNo: cols[1] || '',
          date: cols[2] || '',
          amount: parseFloat(cols[3] || cols[2]) || 0,
          cgst: parseFloat(cols[4] || '0') || 0,
          sgst: parseFloat(cols[5] || '0') || 0,
          igst: parseFloat(cols[6] || '0') || 0,
          incomeTax: parseFloat(cols[7] || '0') || 0,
        };

        if (entry.partyName && entry.billNo && entry.amount > 0) {
          parsedCount++;
        }
      }

      if (parsedCount > 0) {
        alert(`Parsed ${parsedCount} transactions from CSV. Please save them individually.`);
      } else {
        setCsvError('No valid transactions found. Ensure columns are: Party Name, Bill No, Date, Amount, CGST, SGST, IGST, Income Tax');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }
}
