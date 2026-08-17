import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useFinancialYears, useYearlyReport } from '../hooks/useReports';
import type { YearlyReport } from '../types';
import { formatCurrency, export26QExcel, exportGSTExcel } from '@/shared/utilities';
import { ReportPrintArea } from '@/shared/components/ReportPrintArea';
import { EmptyState } from '@/shared/components/EmptyState';
import { SkeletonTable } from '@/shared/components/Skeleton';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { useOfficeDetails } from '@/modules/settings/hooks/useOfficeDetails';
import { FileSpreadsheet, Users, Store, CalendarDays, Receipt } from 'lucide-react';

type ReportTab = '24q' | '26q' | 'gst';

export function ReportsPage() {
  const [selectedFY, setSelectedFY] = useState<number | null>(null);
  const { tab } = useParams<{ tab: string }>();
  const validTabs: ReportTab[] = ['24q', '26q', 'gst'];
  const activeTab: ReportTab = validTabs.includes(tab as ReportTab) ? (tab as ReportTab) : '24q';

  const { data: years, isLoading: yearsLoading } = useFinancialYears();
  const defaultFY = () => {
    const now = new Date();
    return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  };
  const activeFY = selectedFY ?? (years && years.length > 0 ? years[0] : defaultFY());
  const { data: report, isLoading: reportLoading } = useYearlyReport(activeFY);
  const { details: officeDetails } = useOfficeDetails();

  const office = officeDetails || { officeName: '', subtitle: '', address: '', phone: '', email: '', gst: '', tan: '' };

  const fyOptions = (years && years.length > 0 ? years : [activeFY]).slice();
  if (activeFY && !fyOptions.includes(activeFY)) {
    fyOptions.push(activeFY);
    fyOptions.sort((a, b) => b - a);
  }

  const handleFYChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFY(parseInt(e.target.value, 10));
  };

  if (yearsLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <SkeletonTable rows={4} cols={5} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <WorkspaceHeader
        className="no-print"
        eyebrow="Reporting & returns"
        title="Annual reports"
        context={<><CalendarDays size={13} /> FY {activeFY}-{String(activeFY + 1).slice(-2)}</>}
        actions={<div className="flex items-center gap-2">
          <select value={activeFY || ''} onChange={handleFYChange} className="input w-36">
            {fyOptions.map((y) => (
              <option key={y} value={y}>{y}-{String(y + 1).slice(-2)}</option>
            ))}
          </select>
          <button
            onClick={() => {
              if (!report) return;
              if (activeTab === '26q') {
                export26QExcel(
                  {
                    fy: report.fy,
                    quarter: 'Annual',
                    rows: report.vendors.map((v) => ({
                      partyName: v.name,
                      panNo: v.panNo || '-',
                      billNo: '-',
                      date: '',
                      amount: v.totalAmount,
                      incomeTax: v.totalIncomeTax,
                    })),
                    totals: {
                      amount: report.summary.totalVendorAmount,
                      incomeTax: report.summary.totalIncomeTax,
                    },
                  },
                  office
                );
              } else if (activeTab === 'gst') {
                exportGSTExcel(
                  {
                    fy: report.fy,
                    quarter: 'Annual',
                    rows: report.vendors.map((v) => ({
                      partyName: v.name,
                      gstNo: v.gstNo || '-',
                      cpinNo: '-',
                      billNo: '-',
                      date: '',
                      amount: v.totalAmount,
                      cgst: v.totalCgst,
                      sgst: v.totalSgst,
                      igst: v.totalIgst,
                      totalGst: v.totalGst,
                    })),
                    totals: {
                      amount: report.summary.totalVendorAmount,
                      cgst: report.summary.totalCgst,
                      sgst: report.summary.totalSgst,
                      igst: report.summary.totalIgst,
                      totalGst: report.summary.totalGst,
                    },
                  },
                  office
                );
              }
            }}
            disabled={activeTab === '24q'}
            title={activeTab === '24q' ? 'Export 24Q from the Payroll module (per quarter)' : 'Download formatted Excel'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
          <button onClick={() => window.print()} className="btn btn-secondary btn-sm">Print</button>
        </div>}
      />

      {report && (
        <div className="space-y-3 mb-6 no-print">
          {/* Payroll Overview Group */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Users size={14} className="text-indigo-600 dark:text-indigo-400" />
              Payroll Overview (24Q Employee)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="card p-3 border-l-4 border-l-emerald-500">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total Employees</div>
                <div className="text-lg font-extrabold mt-0.5 text-slate-800 dark:text-slate-100">{report.summary.totalEmployees}</div>
              </div>
              <div className="card p-3 border-l-4 border-l-indigo-500">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Annual Gross + DA Salary</div>
                <div className="text-lg font-extrabold mt-0.5 text-indigo-600 dark:text-indigo-400">{formatCurrency(report.summary.totalGross)}</div>
              </div>
              <div className="card p-3 border-l-4 border-l-rose-500">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total TDS (24Q)</div>
                <div className="text-lg font-extrabold mt-0.5 text-rose-600 dark:text-rose-400">{formatCurrency(report.summary.totalTax)}</div>
              </div>
            </div>
          </div>

          {/* Vendor Overview Group */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Store size={14} className="text-amber-600 dark:text-amber-400" />
              Vendor Overview (26Q & GST)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="card p-3 border-l-4 border-l-amber-500">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total Vendors</div>
                <div className="text-lg font-extrabold mt-0.5 text-slate-800 dark:text-slate-100">{report.summary.totalVendors}</div>
              </div>
              <div className="card p-3 border-l-4 border-l-red-500">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Vendor IT Deducted (26Q)</div>
                <div className="text-lg font-extrabold mt-0.5 text-red-600 dark:text-red-400">{formatCurrency(report.summary.totalIncomeTax)}</div>
              </div>
              <div className="card p-3 border-l-4 border-l-teal-500">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total GST (Annual)</div>
                <div className="text-lg font-extrabold mt-0.5 text-teal-600 dark:text-teal-400">{formatCurrency(report.summary.totalGst)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportLoading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : report ? (
        <>
          {activeTab === '24q' && <Employee24QReport report={report} office={office} />}
          {activeTab === '26q' && <Vendor26QReport report={report} office={office} />}
          {activeTab === 'gst' && <GSTReportView report={report} office={office} />}
        </>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="Select a financial year."
          hint="Pick a financial year above to load the report."
        />
      )}
    </div>
  );
}

function Employee24QReport({ report, office }: { report: YearlyReport; office: { officeName: string; subtitle: string; address: string; phone: string; email: string; gst: string; tan: string } }) {
  if (report.employees.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No employee data."
        hint="No salary entries were found for this financial year."
      />
    );
  }

  const totals = report.employees.reduce(
    (acc, emp) => ({
      q1Gross: acc.q1Gross + emp.qGross.Q1,
      q1Tax: acc.q1Tax + emp.qTax.Q1,
      q2Gross: acc.q2Gross + emp.qGross.Q2,
      q2Tax: acc.q2Tax + emp.qTax.Q2,
      q3Gross: acc.q3Gross + emp.qGross.Q3,
      q3Tax: acc.q3Tax + emp.qTax.Q3,
      q4Gross: acc.q4Gross + emp.qGross.Q4,
      q4Tax: acc.q4Tax + emp.qTax.Q4,
      annualGross: acc.annualGross + emp.gross,
      annualTax: acc.annualTax + emp.tax,
    }),
    {
      q1Gross: 0, q1Tax: 0,
      q2Gross: 0, q2Tax: 0,
      q3Gross: 0, q3Tax: 0,
      q4Gross: 0, q4Tax: 0,
      annualGross: 0, annualTax: 0,
    }
  );

  return (
    <ReportPrintArea
      office={office}
      leftLabel="Tax Deduction No :-"
      leftValue={office.tan || 'NOT SET'}
      rightMeta={<><span>Financial Year: {report.fyLabel} | Assessment Year: {report.ayLabel}</span></>}
      title="24Q Employee Annual TDS Statement"
      badgeClass="report-badge-emp"
      pageOrientation="landscape"
    >
      <div className="overflow-x-auto">
        <table className="report-table">
          <thead>
            <tr>
              <th rowSpan={2}>Sr.</th>
              <th rowSpan={2} style={{ textAlign: 'left' }}>Name</th>
              <th rowSpan={2}>PAN No.</th>
              <th colSpan={2}>Q1</th>
              <th colSpan={2}>Q2</th>
              <th colSpan={2}>Q3</th>
              <th colSpan={2}>Q4</th>
              <th colSpan={2}>Annual</th>
            </tr>
            <tr>
              <th>Gross+DA &amp; Other</th>
              <th>TDS</th>
              <th>Gross+DA &amp; Other</th>
              <th>TDS</th>
              <th>Gross+DA &amp; Other</th>
              <th>TDS</th>
              <th>Gross+DA &amp; Other</th>
              <th>TDS</th>
              <th>Gross+DA &amp; Other</th>
              <th>TDS</th>
            </tr>
          </thead>
          <tbody>
            {report.employees.map((emp, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td className="font-bold" style={{ textAlign: 'left' }}>{emp.name}</td>
                <td>{emp.pan}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(emp.qGross.Q1)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(emp.qTax.Q1)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(emp.qGross.Q2)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(emp.qTax.Q2)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(emp.qGross.Q3)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(emp.qTax.Q3)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(emp.qGross.Q4)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(emp.qTax.Q4)}</td>
                <td className="font-bold" style={{ textAlign: 'right' }}>{formatCurrency(emp.gross)}</td>
                <td className="font-bold" style={{ textAlign: 'right' }}>{formatCurrency(emp.tax)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td colSpan={3} style={{ textAlign: 'right' }}>Grand Total</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.q1Gross)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.q1Tax)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.q2Gross)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.q2Tax)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.q3Gross)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.q3Tax)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.q4Gross)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.q4Tax)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.annualGross)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(totals.annualTax)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </ReportPrintArea>
  );
}

function Vendor26QReport({ report, office }: { report: YearlyReport; office: { officeName: string; subtitle: string; address: string; phone: string; email: string; gst: string; tan: string } }) {
  if (report.vendors.length === 0) return <EmptyState icon={Store} title="No vendor data." hint="No party transactions were found for this financial year." />;
  const totals = report.vendors.reduce((acc, v) => ({ amount: acc.amount + v.totalAmount, it: acc.it + v.totalIncomeTax }), { amount: 0, it: 0 });
  return (
    <ReportPrintArea
      office={office}
      leftLabel="TAN NO :-"
      leftValue={office.tan || 'NOT SET'}
      rightMeta={<><span>Financial Year: {report.fyLabel} | Assessment Year: {report.ayLabel}</span></>}
      title="26Q OTHER THAN SALARY STATEMENT"
      badgeClass="report-badge-it"
      pageOrientation="landscape"
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
  if (report.vendors.length === 0) return <EmptyState icon={Receipt} title="No GST data." hint="No party transactions were found for this financial year." />;
  const totals = report.vendors.reduce((acc, v) => ({ amount: acc.amount + v.totalAmount, cgst: acc.cgst + v.totalCgst, sgst: acc.sgst + v.totalSgst, igst: acc.igst + v.totalIgst, total: acc.total + v.totalGst }), { amount: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });
  return (
    <ReportPrintArea
      office={office}
      leftLabel="GSTIN NO :-"
      leftValue={office.gst || 'NOT SET'}
      rightMeta={<><span>Financial Year: {report.fyLabel} | Assessment Year: {report.ayLabel}</span></>}
      title="GST TDS STATEMENT SUMMARY REPORT"
      badgeClass="report-badge-gst"
      pageOrientation="landscape"
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
