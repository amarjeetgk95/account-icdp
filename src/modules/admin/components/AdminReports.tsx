import { useState } from 'react';
import { useOfficeFinancialYears, useReportOfficeDetails, useAdminQuarterReport, useAdminGSTReport, useAdminIncomeTaxReport } from '../hooks/useAdmin';
import { QuarterReportView } from '@/modules/payroll/components/QuarterReport';
import { ReportPrintArea } from '@/shared/components/ReportPrintArea';
import { formatCurrency, downloadCsv } from '@/shared/utilities';
import type { Office } from '../types';

type ReportSub = '24q' | 'gst' | 'it';

interface AdminReportsProps {
  offices: Office[];
  officesLoading: boolean;
  officeId: string;
  onOfficeIdChange: (officeId: string) => void;
}

export function AdminReports({ offices, officesLoading, officeId, onOfficeIdChange }: AdminReportsProps) {
  const [selectedFY, setSelectedFY] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [activeSub, setActiveSub] = useState<ReportSub>('24q');

  const { data: years } = useOfficeFinancialYears(officeId || null);
  const { data: officeDetails } = useReportOfficeDetails(officeId || null);
  const activeFY = selectedFY ?? (years && years.length > 0 ? years[0] : null);
  const { data: quarterReport, isLoading: quarterLoading } = useAdminQuarterReport(activeSub === '24q' ? selectedQuarter : null, activeFY, officeId || null);
  const { data: gstReport, isLoading: gstLoading } = useAdminGSTReport(activeSub === 'gst' ? selectedQuarter : null, activeFY, officeId || null);
  const { data: itReport, isLoading: itLoading } = useAdminIncomeTaxReport(activeSub === 'it' ? selectedQuarter : null, activeFY, officeId || null);

  const office = officeDetails || { officeName: '', subtitle: '', address: '', phone: '', email: '', gst: '', tan: '' };
  const fyLabel = activeFY != null ? `${activeFY}-${String(activeFY + 1).slice(-2)}` : '-';

  const exportCSV = () => {
    if (activeSub === '24q' && quarterReport) {
      downloadCsv(
        `24Q_${fyLabel}_${selectedQuarter}.csv`,
        ['Sr', 'Name', 'PAN No.', 'M1_Gross', 'M2_Gross', 'M3_Gross', 'DA_Other', 'Total_Salary', 'M1_Tax', 'M2_Tax', 'M3_Tax', 'Total_Tax'],
        quarterReport.rows.map((row, idx) => [idx + 1, row.name, row.pan, row.g[0], row.g[1], row.g[2], row.d, row.total, row.t[0], row.t[1], row.t[2], row.tax])
      );
    } else if (activeSub === 'gst' && gstReport) {
      downloadCsv(
        `GST_${fyLabel}_${selectedQuarter}.csv`,
        ['Sr. No.', 'GST No.', 'CPIN No', 'Party Name', 'Bill No', 'Date', 'Amount', 'SGST', 'CGST', 'IGST', 'Total GST'],
        gstReport.rows.map((row, idx) => [idx + 1, row.gstNo, row.cpinNo, row.partyName, row.billNo, row.date, row.amount, row.sgst, row.cgst, row.igst, row.totalGst])
      );
    } else if (activeSub === 'it' && itReport) {
      downloadCsv(
        `IT_26Q_${fyLabel}_${selectedQuarter}.csv`,
        ['Sr. No.', 'Party Name', 'Bill No', 'Settlement Date', 'Amount', 'PAN No.', 'Income Tax (TDS)'],
        itReport.rows.map((row, idx) => [idx + 1, row.partyName, row.billNo, row.date, row.amount, row.panNo, row.incomeTax])
      );
    }
  };

  const officeName = offices.find((o) => o.id === officeId)?.name || '';

  return (
    <div className="space-y-4">
      <div className="card p-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="label">Report Office</label>
            <select
              value={officeId}
              onChange={(e) => {
                onOfficeIdChange(e.target.value);
                setSelectedFY(null);
              }}
              className="input"
              disabled={officesLoading}
            >
              <option value="">{officesLoading ? 'Loading offices...' : 'Select office'}</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Financial Year</label>
            <select value={activeFY ?? ''} onChange={(e) => setSelectedFY(parseInt(e.target.value, 10))} className="input" disabled={!officeId}>
              <option value="">Select FY</option>
              {(years || []).map((y) => (
                <option key={y} value={y}>{y}-{String(y + 1).slice(-2)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Quarter</label>
            <select value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="input">
              <option value="Q1">Q1 (Apr-Jun)</option>
              <option value="Q2">Q2 (Jul-Sep)</option>
              <option value="Q3">Q3 (Oct-Dec)</option>
              <option value="Q4">Q4 (Jan-Mar)</option>
              {activeSub !== '24q' && <option value="Yearly">Yearly</option>}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="btn btn-secondary w-full">Print PDF</button>
            <button onClick={exportCSV} className="btn btn-outline w-full">CSV</button>
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-200 no-print">
        <button onClick={() => { setActiveSub('24q'); setSelectedQuarter((q) => (q === 'Yearly' ? 'Q1' : q)); }} className={"px-4 py-2 text-sm font-medium border-b-2 " + (activeSub === '24q' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500')}>24Q Employee Statement</button>
        <button onClick={() => setActiveSub('gst')} className={"px-4 py-2 text-sm font-medium border-b-2 " + (activeSub === 'gst' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-500')}>GST Report</button>
        <button onClick={() => setActiveSub('it')} className={"px-4 py-2 text-sm font-medium border-b-2 " + (activeSub === 'it' ? 'border-amber-600 text-amber-600' : 'border-transparent text-slate-500')}>26Q Income Tax</button>
      </div>

      {!officeId ? (
        <div className="empty-state"><p>Select an office to generate reports.</p></div>
      ) : activeSub === '24q' ? (
        quarterLoading ? <div className="spinner h-10 w-10 mx-auto"></div> :
        quarterReport && quarterReport.rows.length > 0 ? (
          <ReportPrintArea
            office={office}
            leftLabel="Tax Deduction No :-"
            leftValue={office.tan || 'SRTDO0979G'}
            rightMeta={<><span>Financial Year: {quarterReport.fyLabel} | Assessment Year: {quarterReport.ayLabel} | Period: {quarterReport.quarter} Ending</span></>}
            title="24Q Employee Salary & Tax Deduction Statement"
            badgeClass="report-badge-emp"
          >
            <QuarterReportView report={quarterReport} isLoading={false} showHeader={false} />
          </ReportPrintArea>
        ) : (
          <div className="empty-state"><p>No salary data for this office / period.</p></div>
        )
      ) : activeSub === 'gst' ? (
        gstLoading ? <div className="spinner h-10 w-10 mx-auto"></div> :
        gstReport && gstReport.rows.length > 0 ? (
          <ReportPrintArea
            office={office}
            leftLabel="GSTIN NO :-"
            leftValue={office.gst || '24SRTD00979G1DD'}
            rightMeta={<><span>Financial Year: {fyLabel} | Quarter: {gstReport.quarter} | Office: {officeName}</span></>}
            title="GST TDS STATEMENT SUMMARY REPORT"
            badgeClass="report-badge-gst"
          >
            <div className="overflow-x-auto">
              <table className="report-table">
                <thead>
                  <tr><th>Sr. No.</th><th>GST No.</th><th>CPIN No</th><th style={{ textAlign: 'left' }}>Party Name</th><th>Bill No</th><th>Date</th><th>Amount</th><th>SGST</th><th>CGST</th><th>IGST</th><th>Total GST</th></tr>
                </thead>
                <tbody>
                  {gstReport.rows.map((row, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{row.gstNo}</td>
                      <td className="font-bold">{row.cpinNo}</td>
                      <td className="font-bold" style={{ textAlign: 'left' }}>{row.partyName}</td>
                      <td>{row.billNo}</td>
                      <td>{row.date}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(row.amount)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(row.sgst)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(row.cgst)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(row.igst)}</td>
                      <td className="font-bold" style={{ textAlign: 'right' }}>{formatCurrency(row.totalGst)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td colSpan={7} style={{ textAlign: 'right' }}>Grand Total</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(gstReport.totals.sgst)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(gstReport.totals.cgst)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(gstReport.totals.igst)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(gstReport.totals.totalGst)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </ReportPrintArea>
        ) : (
          <div className="empty-state"><p>No GST data for this office / period.</p></div>
        )
      ) : (
        itLoading ? <div className="spinner h-10 w-10 mx-auto"></div> :
        itReport && itReport.rows.length > 0 ? (
          <ReportPrintArea
            office={office}
            leftLabel="TAN NO :-"
            leftValue={office.tan || 'SRTDO0979G'}
            rightMeta={<><span>Financial Year: {fyLabel} | Quarter: {itReport.quarter} | Office: {officeName}</span></>}
            title="26Q OTHER THAN SALARY STATEMENT"
            badgeClass="report-badge-it"
          >
            <div className="overflow-x-auto">
              <table className="report-table">
                <thead>
                  <tr><th>Sr. No.</th><th style={{ textAlign: 'left' }}>Party Name</th><th>Bill No</th><th>Settlement Date</th><th>Amount</th><th>PAN No.</th><th>Income Tax (TDS)</th></tr>
                </thead>
                <tbody>
                  {itReport.rows.map((row, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td className="font-bold" style={{ textAlign: 'left' }}>{row.partyName}</td>
                      <td>{row.billNo}</td>
                      <td>{row.date}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(row.amount)}</td>
                      <td className="font-bold">{row.panNo}</td>
                      <td className="font-bold" style={{ textAlign: 'right' }}>{formatCurrency(row.incomeTax)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td colSpan={6} style={{ textAlign: 'right' }}>Grand Total</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(itReport.totals.incomeTax)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </ReportPrintArea>
        ) : (
          <div className="empty-state"><p>No Income Tax data for this office / period.</p></div>
        )
      )}
    </div>
  );
}
