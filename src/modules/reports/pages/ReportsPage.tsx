import { useState, useEffect } from 'react';
import { useFinancialYears, useYearlyReport } from '../hooks/useReports';
import type { YearlyReport } from '../types';
import { formatCurrency } from '@/shared/utilities';

type ReportTab = '24q' | '26q' | 'gst';

export function ReportsPage() {
  const [selectedFY, setSelectedFY] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTab>('24q');

  const { data: years, isLoading: yearsLoading } = useFinancialYears();
  const { data: report, isLoading: reportLoading } = useYearlyReport(selectedFY);

  useEffect(() => {
    if (years && years.length > 0 && selectedFY === null) {
      setSelectedFY(years[0]);
    }
  }, [years, selectedFY]);

  const handleFYChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFY(parseInt(e.target.value, 10));
  };

  if (yearsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="card p-5 mb-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-800">Annual Yearly Report</h1>
          <div className="flex items-center gap-3">
            <select
              value={selectedFY || ''}
              onChange={handleFYChange}
              className="input w-40"
            >
              {(years || []).map((y) => (
                <option key={y} value={y}>
                  {y}-{String(y + 1).slice(-2)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {report && <KPICards report={report} />}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('24q')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === '24q'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          👤 24Q Employee Statement
        </button>
        <button
          onClick={() => setActiveTab('26q')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === '26q'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          🏢 26Q Vendor IT
        </button>
        <button
          onClick={() => setActiveTab('gst')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'gst'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          📋 GST Annual
        </button>
      </div>

      {/* Tab Content */}
      {reportLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : report ? (
        <>
          {activeTab === '24q' && <Employee24QReport report={report} />}
          {activeTab === '26q' && <Vendor26QReport report={report} />}
          {activeTab === 'gst' && <GSTReport report={report} />}
        </>
      ) : (
        <div className="text-center py-12 text-slate-500">Select a financial year to generate report.</div>
      )}
    </div>
  );
}

function KPICards({ report }: { report: YearlyReport }) {
  const cards = [
    { label: 'Employees', value: report.summary.totalEmployees, color: 'green' },
    { label: 'Annual Salary', value: formatCurrency(report.summary.totalGross), color: 'blue' },
    { label: 'Total TDS (24Q)', value: formatCurrency(report.summary.totalTax), color: 'red' },
    { label: 'Vendors', value: report.summary.totalVendors, color: 'amber' },
    { label: 'IT Deducted (26Q)', value: formatCurrency(report.summary.totalIncomeTax), color: 'red' },
    { label: 'GST (Annual)', value: formatCurrency(report.summary.totalGst), color: 'green' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
      {cards.map((card) => {
        const colors: Record<string, string> = {
          green: 'text-green-600',
          blue: 'text-blue-600',
          red: 'text-red-600',
          amber: 'text-amber-600',
        };
        return (
          <div key={card.label} className="card p-4">
            <div className={`text-xs font-bold uppercase tracking-wide ${colors[card.color]}`}>
              {card.label}
            </div>
            <div className="text-lg font-extrabold text-slate-800 mt-1">{card.value}</div>
          </div>
        );
      })}
    </div>
  );
}

function Employee24QReport({ report }: { report: YearlyReport }) {
  if (report.employees.length === 0) {
    return <div className="text-center py-12 text-slate-500">No employee data for this year.</div>;
  }

  const totals = report.employees.reduce(
    (acc, emp) => ({
      q1: acc.q1 + emp.qTax.Q1,
      q2: acc.q2 + emp.qTax.Q2,
      q3: acc.q3 + emp.qTax.Q3,
      q4: acc.q4 + emp.qTax.Q4,
      gross: acc.gross + emp.gross,
      da: acc.da + emp.da,
      tax: acc.tax + emp.tax,
    }),
    { q1: 0, q2: 0, q3: 0, q4: 0, gross: 0, da: 0, tax: 0 }
  );

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-200 mb-4">
        24Q — Employee Annual TDS Statement
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        FY: {report.fyLabel} | AY: {report.ayLabel}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-2 py-2 text-left">Sr.</th>
              <th className="px-2 py-2 text-left">Employee Name</th>
              <th className="px-2 py-2 text-center">PAN</th>
              <th className="px-2 py-2 text-right">Q1 TDS</th>
              <th className="px-2 py-2 text-right">Q2 TDS</th>
              <th className="px-2 py-2 text-right">Q3 TDS</th>
              <th className="px-2 py-2 text-right">Q4 TDS</th>
              <th className="px-2 py-2 text-right">Gross (Annual)</th>
              <th className="px-2 py-2 text-right">DA (Annual)</th>
              <th className="px-2 py-2 text-right">Total TDS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.employees.map((emp, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-2 py-1">{idx + 1}</td>
                <td className="px-2 py-1 font-medium">{emp.name}</td>
                <td className="px-2 py-1 text-center">{emp.pan}</td>
                <td className="px-2 py-1 text-right">{formatCurrency(emp.qTax.Q1)}</td>
                <td className="px-2 py-1 text-right">{formatCurrency(emp.qTax.Q2)}</td>
                <td className="px-2 py-1 text-right">{formatCurrency(emp.qTax.Q3)}</td>
                <td className="px-2 py-1 text-right">{formatCurrency(emp.qTax.Q4)}</td>
                <td className="px-2 py-1 text-right">{formatCurrency(emp.gross)}</td>
                <td className="px-2 py-1 text-right">{formatCurrency(emp.da)}</td>
                <td className="px-2 py-1 text-right font-bold">{formatCurrency(emp.tax)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 font-bold">
            <tr>
              <td colSpan={3} className="px-2 py-1 text-right">Total</td>
              <td className="px-2 py-1 text-right">{formatCurrency(totals.q1)}</td>
              <td className="px-2 py-1 text-right">{formatCurrency(totals.q2)}</td>
              <td className="px-2 py-1 text-right">{formatCurrency(totals.q3)}</td>
              <td className="px-2 py-1 text-right">{formatCurrency(totals.q4)}</td>
              <td className="px-2 py-1 text-right">{formatCurrency(totals.gross)}</td>
              <td className="px-2 py-1 text-right">{formatCurrency(totals.da)}</td>
              <td className="px-2 py-1 text-right">{formatCurrency(totals.tax)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function Vendor26QReport({ report }: { report: YearlyReport }) {
  if (report.vendors.length === 0) {
    return <div className="text-center py-12 text-slate-500">No vendor data for this year.</div>;
  }

  const totals = report.vendors.reduce(
    (acc, v) => ({
      amount: acc.amount + v.totalAmount,
      it: acc.it + v.totalIncomeTax,
    }),
    { amount: 0, it: 0 }
  );

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-200 mb-4">
        26Q — Vendor Income Tax Statement
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        FY: {report.fyLabel} | AY: {report.ayLabel}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-2 py-2 text-left">Sr.</th>
              <th className="px-2 py-2 text-left">Party Name</th>
              <th className="px-2 py-2 text-center">GST No.</th>
              <th className="px-2 py-2 text-center">PAN</th>
              <th className="px-2 py-2 text-right">Bills</th>
              <th className="px-2 py-2 text-right">Bill Amount</th>
              <th className="px-2 py-2 text-right">Income Tax</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.vendors.map((vendor, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-2 py-1">{idx + 1}</td>
                <td className="px-2 py-1 font-medium">{vendor.name}</td>
                <td className="px-2 py-1 text-center">{vendor.gstNo}</td>
                <td className="px-2 py-1 text-center">{vendor.panNo}</td>
                <td className="px-2 py-1 text-right">{vendor.billCount}</td>
                <td className="px-2 py-1 text-right">{formatCurrency(vendor.totalAmount)}</td>
                <td className="px-2 py-1 text-right font-bold">{formatCurrency(vendor.totalIncomeTax)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 font-bold">
            <tr>
              <td colSpan={5} className="px-2 py-1 text-right">Total</td>
              <td className="px-2 py-1 text-right">{formatCurrency(totals.amount)}</td>
              <td className="px-2 py-1 text-right">{formatCurrency(totals.it)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function GSTReport({ report }: { report: YearlyReport }) {
  if (report.vendors.length === 0) {
    return <div className="text-center py-12 text-slate-500">No GST data for this year.</div>;
  }

  const totals = report.vendors.reduce(
    (acc, v) => ({
      amount: acc.amount + v.totalAmount,
      cgst: acc.cgst + v.totalCgst,
      sgst: acc.sgst + v.totalSgst,
      igst: acc.igst + v.totalIgst,
      total: acc.total + v.totalGst,
    }),
    { amount: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
  );

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-200 mb-4">
        GST Annual Summary
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        FY: {report.fyLabel} | AY: {report.ayLabel}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-2 py-2 text-left">Sr.</th>
              <th className="px-2 py-2 text-left">Party Name</th>
              <th className="px-2 py-2 text-center">GST No.</th>
              <th className="px-2 py-2 text-right">Bills</th>
              <th className="px-2 py-2 text-right">Amount</th>
              <th className="px-2 py-2 text-right">CGST</th>
              <th className="px-2 py-2 text-right">SGST</th>
              <th className="px-2 py-2 text-right">IGST</th>
              <th className="px-2 py-2 text-right">Total GST</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.vendors.map((vendor, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-2 py-1">{idx + 1}</td>
                <td className="px-2 py-1 font-medium">{vendor.name}</td>
                <td className="px-2 py-1 text-center">{vendor.gstNo}</td>
                <td className="px-2 py-1 text-right">{vendor.billCount}</td>
                <td className="px-2 py-1 text-right">{formatCurrency(vendor.totalAmount)}</td>
                <td className="px-2 py-1 text-right">{formatCurrency(vendor.totalCgst)}</td>
                <td className="px-2 py-1 text-right">{formatCurrency(vendor.totalSgst)}</td>
                <td className="px-2 py-1 text-right">{formatCurrency(vendor.totalIgst)}</td>
                <td className="px-2 py-1 text-right font-bold">{formatCurrency(vendor.totalGst)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 font-bold">
            <tr>
              <td colSpan={4} className="px-2 py-1 text-right">Total</td>
              <td className="px-2 py-1 text-right">{formatCurrency(totals.amount)}</td>
              <td className="px-2 py-1 text-right">{formatCurrency(totals.cgst)}</td>
              <td className="px-2 py-1 text-right">{formatCurrency(totals.sgst)}</td>
              <td className="px-2 py-1 text-right">{formatCurrency(totals.igst)}</td>
              <td className="px-2 py-1 text-right">{formatCurrency(totals.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
