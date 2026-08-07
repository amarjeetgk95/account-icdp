import { useState } from 'react';
import { useParties, useTransactions, useSaveTransaction, useGSTReport, useIncomeTaxReport } from '../hooks/useParties';
import { TransactionForm } from '../components/TransactionForm';
import { TransactionsTable } from '../components/TransactionsTable';
import { formatCurrency } from '@/shared/utilities';

type ReportTab = 'gst' | 'it';

export function PartiesPage() {
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('gst');
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');

  const { data: parties = [] } = useParties();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const saveTransaction = useSaveTransaction();
  const { data: gstReport, isLoading: gstLoading } = useGSTReport(activeReportTab === 'gst' ? selectedQuarter : 'Q1');
  const { data: itReport, isLoading: itLoading } = useIncomeTaxReport(activeReportTab === 'it' ? selectedQuarter : 'Q1');

  const handleSave = async (input: any) => {
    try {
      await saveTransaction.mutateAsync(input);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Vendor & Party Management</h1>

      {/* Transaction Entry */}
      <div className="card p-5">
        <h2 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-200 mb-4">
          📝 New Transaction
        </h2>
        <TransactionForm
          parties={parties}
          onSubmit={handleSave}
          isLoading={saveTransaction.isPending}
        />
      </div>

      {/* Transactions List */}
      <div className="card p-5">
        <h2 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-200 mb-4">
          📊 Recent Transactions
        </h2>
        <TransactionsTable transactions={transactions} isLoading={txLoading} />
      </div>

      {/* Reports */}
      <div className="card p-5">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveReportTab('gst')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeReportTab === 'gst'
                ? 'bg-green-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            📋 GST Report
          </button>
          <button
            onClick={() => setActiveReportTab('it')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeReportTab === 'it'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            🏦 26Q Income Tax
          </button>
          <select
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="input w-32 ml-auto"
          >
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Q3">Q3</option>
            <option value="Q4">Q4</option>
          </select>
        </div>

        {activeReportTab === 'gst' && (
          <GSTReportView report={gstReport} isLoading={gstLoading} />
        )}

        {activeReportTab === 'it' && (
          <IncomeTaxReportView report={itReport} isLoading={itLoading} />
        )}
      </div>
    </div>
  );
}

function GSTReportView({ report, isLoading }: { report: any; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!report || report.rows.length === 0) {
    return <div className="text-center py-8 text-slate-500">No GST data for this quarter.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-blue-50">
            <th className="px-2 py-1 border border-blue-200">Party</th>
            <th className="px-2 py-1 border border-blue-200">GST No</th>
            <th className="px-2 py-1 border border-blue-200">Bill No</th>
            <th className="px-2 py-1 border border-blue-200">Date</th>
            <th className="px-2 py-1 border border-blue-200 text-right">Amount</th>
            <th className="px-2 py-1 border border-blue-200 text-right">CGST</th>
            <th className="px-2 py-1 border border-blue-200 text-right">SGST</th>
            <th className="px-2 py-1 border border-blue-200 text-right">IGST</th>
            <th className="px-2 py-1 border border-blue-200 text-right">Total GST</th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row: any, idx: number) => (
            <tr key={idx} className="hover:bg-slate-50">
              <td className="px-2 py-1 border border-slate-200">{row.partyName}</td>
              <td className="px-2 py-1 border border-slate-200">{row.gstNo}</td>
              <td className="px-2 py-1 border border-slate-200">{row.billNo}</td>
              <td className="px-2 py-1 border border-slate-200">{row.date}</td>
              <td className="px-2 py-1 border border-slate-200 text-right">{formatCurrency(row.amount)}</td>
              <td className="px-2 py-1 border border-slate-200 text-right">{formatCurrency(row.cgst)}</td>
              <td className="px-2 py-1 border border-slate-200 text-right">{formatCurrency(row.sgst)}</td>
              <td className="px-2 py-1 border border-slate-200 text-right">{formatCurrency(row.igst)}</td>
              <td className="px-2 py-1 border border-slate-200 text-right font-bold">{formatCurrency(row.totalGst)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-blue-100 font-bold">
            <td colSpan={4} className="px-2 py-1 border border-blue-200 text-right">Total</td>
            <td className="px-2 py-1 border border-blue-200 text-right">{formatCurrency(report.totals.amount)}</td>
            <td className="px-2 py-1 border border-blue-200 text-right">{formatCurrency(report.totals.cgst)}</td>
            <td className="px-2 py-1 border border-blue-200 text-right">{formatCurrency(report.totals.sgst)}</td>
            <td className="px-2 py-1 border border-blue-200 text-right">{formatCurrency(report.totals.igst)}</td>
            <td className="px-2 py-1 border border-blue-200 text-right">{formatCurrency(report.totals.totalGst)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function IncomeTaxReportView({ report, isLoading }: { report: any; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!report || report.rows.length === 0) {
    return <div className="text-center py-8 text-slate-500">No income tax data for this quarter.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-amber-50">
            <th className="px-2 py-1 border border-amber-200">Party</th>
            <th className="px-2 py-1 border border-amber-200">PAN No</th>
            <th className="px-2 py-1 border border-amber-200">Bill No</th>
            <th className="px-2 py-1 border border-amber-200">Date</th>
            <th className="px-2 py-1 border border-amber-200 text-right">Amount</th>
            <th className="px-2 py-1 border border-amber-200 text-right">Income Tax</th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row: any, idx: number) => (
            <tr key={idx} className="hover:bg-slate-50">
              <td className="px-2 py-1 border border-slate-200">{row.partyName}</td>
              <td className="px-2 py-1 border border-slate-200">{row.panNo}</td>
              <td className="px-2 py-1 border border-slate-200">{row.billNo}</td>
              <td className="px-2 py-1 border border-slate-200">{row.date}</td>
              <td className="px-2 py-1 border border-slate-200 text-right">{formatCurrency(row.amount)}</td>
              <td className="px-2 py-1 border border-slate-200 text-right font-bold">{formatCurrency(row.incomeTax)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-amber-100 font-bold">
            <td colSpan={4} className="px-2 py-1 border border-amber-200 text-right">Total</td>
            <td className="px-2 py-1 border border-amber-200 text-right">{formatCurrency(report.totals.amount)}</td>
            <td className="px-2 py-1 border border-amber-200 text-right">{formatCurrency(report.totals.incomeTax)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
