import { useState } from 'react';
import { useFinancialYears, useYearlyReport } from '../hooks/useReports';
import type { YearlyReport } from '../types';
import { formatCurrency } from '@/shared/utilities';
import { ReportPrintArea } from '@/shared/components/ReportPrintArea';
import { useOfficeDetails } from '@/modules/settings/hooks/useOfficeDetails';

type ReportTab = '24q' | '26q' | 'gst';

export function ReportsPage() {
  const [selectedFY, setSelectedFY] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTab>('24q');

  const { data: years, isLoading: yearsLoading } = useFinancialYears();
  const { data: report, isLoading: reportLoading } = useYearlyReport(selectedFY);
  const { details: officeDetails } = useOfficeDetails();

  const office = officeDetails || { officeName: '', subtitle: '', address: '', phone: '', email: '', gst: '', tan: '' };
  const activeFY = selectedFY ?? (years && years.length > 0 ? years[0] : null);

  const handleFYChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFY(parseInt(e.target.value, 10));
  };

  if (yearsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-12 w-12"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="card p-5 mb-6 no-print">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-800">Annual Yearly Report</h1>
          <div className="flex items-center gap-3">
            <select value={activeFY || ''} onChange={handleFYChange} className="input w-40">
              {(years || []).map((y) => (
                <option key={y} value={y}>{y}-{String(y + 1).slice(-2)}</option>
              ))}
            </select>
            <button onClick={() => window.print()} className="btn btn-secondary">Print PDF</button>
          </div>
        </div>
      </div>

      {report && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6 no-print">
          <div className="card p-4"><div className="text-xs font-bold text-green-600 uppercase">Employees</div><div className="text-xl font-extrabold mt-1">{report.summary.totalEmployees}</div></div>
          <div className="card p-4"><div className="text-xs font-bold text-blue-600 uppercase">Annual Salary</div><div className="text-xl font-extrabold mt-1">{formatCurrency(report.summary.totalGross)}</div></div>
          <div className="card p-4"><div className="text-xs font-bold text-red-600 uppercase">Total TDS (24Q)</div><div className="text-xl font-extrabold mt-1">{formatCurrency(report.summary.totalTax)}</div></div>
          <div className="card p-4"><div className="text-xs font-bold text-amber-600 uppercase">Vendors</div><div className="text-xl font-extrabold mt-1">{report.summary.totalVendors}</div></div>
          <div className="card p-4"><div className="text-xs font-bold text-red-600 uppercase">IT Deducted (26Q)</div><div className="text-xl font-extrabold mt-1">{formatCurrency(report.summary.totalIncomeTax)}</div></div>
          <div className="card p-4"><div className="text-xs font-bold text-green-600 uppercase">GST (Annual)</div><div className="text-xl font-extrabold mt-1">{formatCurrency(report.summary.totalGst)}</div></div>
        </div>
      )}

      <div className="flex border-b border-slate-200 mb-6 no-print">
        <button onClick={() => setActiveTab('24q')} className={"px-4 py-3 text-sm font-medium border-b-2 " + (activeTab === '24q' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500')}>24Q Employee</button>
        <button onClick={() => setActiveTab('26q')} className={"px-4 py-3 text-sm font-medium border-b-2 " + (activeTab === '26q' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-500')}>26Q Vendor IT</button>
        <button onClick={() => setActiveTab('gst')} className={"px-4 py-3 text-sm font-medium border-b-2 " + (activeTab === 'gst' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-500')}>GST Annual</button>
      </div>

      {reportLoading ? (
        <div className="flex items-center justify-center h-64"><div className="spinner h-12 w-12"></div></div>
      ) : report ? (
        <>
          {activeTab === '24q' && <Employee24QReport report={report} office={office} />}
          {activeTab === '26q' && <Vendor26QReport report={report} office={office} />}
          {activeTab === 'gst' && <GSTReportView report={report} office={office} />}
        </>
      ) : (
        <div className="empty-state"><p>Select a financial year.</p></div>
      )}
    </div>
  );
}

function Employee24QReport({ report, office }: { report: YearlyReport; office: { officeName: string; subtitle: string; address: string; phone: string; email: string; gst: string; tan: string } }) {
  if (report.employees.length === 0) return <div className="empty-state"><p>No employee data.</p></div>;
  const totals = report.employees.reduce((acc, emp) => ({ q1: acc.q1 + emp.qTax.Q1, q2: acc.q2 + emp.qTax.Q2, q3: acc.q3 + emp.qTax.Q3, q4: acc.q4 + emp.qTax.Q4, gross: acc.gross + emp.gross, da: acc.da + emp.da, tax: acc.tax + emp.tax }), { q1: 0, q2: 0, q3: 0, q4: 0, gross: 0, da: 0, tax: 0 });
  return (
    <ReportPrintArea
      office={office}
      leftLabel="Tax Deduction No :-"
      leftValue={office.tan || 'SRTDO0979G'}
      rightMeta={<><span>Financial Year: {report.fyLabel} | Assessment Year: {report.ayLabel}</span></>}
      title="24Q Employee Annual TDS Statement"
      badgeClass="report-badge-emp"
    >
      <div className="overflow-x-auto">
        <table className="report-table">
          <thead><tr><th>Sr.</th><th>Name</th><th>PAN No.</th><th>Q1 TDS</th><th>Q2 TDS</th><th>Q3 TDS</th><th>Q4 TDS</th><th>Gross</th><th>DA</th><th>Total TDS</th></tr></thead>
          <tbody>
            {report.employees.map((emp, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td className="font-bold" style={{ textAlign: 'left' }}>{emp.name}</td>
                <td>{emp.pan}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(emp.qTax.Q1)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(emp.qTax.Q2)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(emp.qTax.Q3)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(emp.qTax.Q4)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(emp.gross)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(emp.da)}</td>
                <td className="font-bold" style={{ textAlign: 'right' }}>{formatCurrency(emp.tax)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={3} style={{ textAlign: 'right' }}>Grand Total</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.q1)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.q2)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.q3)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.q4)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.gross)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.da)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.tax)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </ReportPrintArea>
  );
}

function Vendor26QReport({ report, office }: { report: YearlyReport; office: { officeName: string; subtitle: string; address: string; phone: string; email: string; gst: string; tan: string } }) {
  if (report.vendors.length === 0) return <div className="empty-state"><p>No vendor data.</p></div>;
  const totals = report.vendors.reduce((acc, v) => ({ amount: acc.amount + v.totalAmount, it: acc.it + v.totalIncomeTax }), { amount: 0, it: 0 });
  return (
    <ReportPrintArea
      office={office}
      leftLabel="TAN NO :-"
      leftValue={office.tan || 'SRTDO0979G'}
      rightMeta={<><span>Financial Year: {report.fyLabel} | Assessment Year: {report.ayLabel}</span></>}
      title="26Q OTHER THAN SALARY STATEMENT"
      badgeClass="report-badge-it"
    >
      <div className="overflow-x-auto">
        <table className="report-table">
          <thead><tr><th>Sr.</th><th style={{ textAlign: 'left' }}>Party Name</th><th>GST No.</th><th>PAN No.</th><th>Bills</th><th>Amount</th><th>Income Tax (TDS)</th></tr></thead>
          <tbody>
            {report.vendors.map((v, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td className="font-bold" style={{ textAlign: 'left' }}>{v.name}</td>
                <td>{v.gstNo}</td>
                <td>{v.panNo}</td>
                <td style={{ textAlign: 'right' }}>{v.billCount}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(v.totalAmount)}</td>
                <td className="font-bold" style={{ textAlign: 'right' }}>{formatCurrency(v.totalIncomeTax)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={5} style={{ textAlign: 'right' }}>Grand Total</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.amount)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.it)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </ReportPrintArea>
  );
}

function GSTReportView({ report, office }: { report: YearlyReport; office: { officeName: string; subtitle: string; address: string; phone: string; email: string; gst: string; tan: string } }) {
  if (report.vendors.length === 0) return <div className="empty-state"><p>No GST data.</p></div>;
  const totals = report.vendors.reduce((acc, v) => ({ amount: acc.amount + v.totalAmount, cgst: acc.cgst + v.totalCgst, sgst: acc.sgst + v.totalSgst, igst: acc.igst + v.totalIgst, total: acc.total + v.totalGst }), { amount: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });
  return (
    <ReportPrintArea
      office={office}
      leftLabel="GSTIN NO :-"
      leftValue={office.gst || '24SRTD00979G1DD'}
      rightMeta={<><span>Financial Year: {report.fyLabel} | Assessment Year: {report.ayLabel}</span></>}
      title="GST TDS STATEMENT SUMMARY REPORT"
      badgeClass="report-badge-gst"
    >
      <div className="overflow-x-auto">
        <table className="report-table">
          <thead><tr><th>Sr.</th><th style={{ textAlign: 'left' }}>Party Name</th><th>GST No.</th><th>Bills</th><th>Amount</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Total GST</th></tr></thead>
          <tbody>
            {report.vendors.map((v, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td className="font-bold" style={{ textAlign: 'left' }}>{v.name}</td>
                <td>{v.gstNo}</td>
                <td style={{ textAlign: 'right' }}>{v.billCount}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(v.totalAmount)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(v.totalCgst)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(v.totalSgst)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(v.totalIgst)}</td>
                <td className="font-bold" style={{ textAlign: 'right' }}>{formatCurrency(v.totalGst)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={4} style={{ textAlign: 'right' }}>Grand Total</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.amount)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.cgst)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.sgst)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.igst)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </ReportPrintArea>
  );
}
