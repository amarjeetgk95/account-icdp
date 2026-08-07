import { useState } from 'react';
import { useParties, useTransactions, useSaveTransaction, useGSTReport, useIncomeTaxReport, useOfficeDetails } from '../hooks/useParties';
import { TransactionForm } from '../components/TransactionForm';
import { TransactionsTable } from '../components/TransactionsTable';
import { ReportPrintArea } from '@/shared/components/ReportPrintArea';
import { PreviewModal } from '@/shared/components/PreviewModal';
import { formatCurrency, downloadCsv } from '@/shared/utilities';
import { useUIStore } from '@/core/stores/ui-store';
import { FileImage } from 'lucide-react';

type ReportTab = 'gst' | 'it';

export function PartiesPage() {
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('gst');
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [showPreview, setShowPreview] = useState(false);

  const fy = useUIStore((state) => state.activeFinancialYear);

  const { data: parties = [] } = useParties();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const saveTransaction = useSaveTransaction();
  const { data: officeDetails } = useOfficeDetails();
  const { data: gstReport, isLoading: gstLoading } = useGSTReport(activeReportTab === 'gst' ? selectedQuarter : 'Q1');
  const { data: itReport, isLoading: itLoading } = useIncomeTaxReport(activeReportTab === 'it' ? selectedQuarter : 'Q1');

  const fyLabel = `${fy}-${String(fy + 1).slice(-2)}`;
  const office = officeDetails || {
    officeName: '',
    subtitle: '',
    address: '',
    phone: '',
    email: '',
    gst: '',
    tan: '',
  };

  const handleSave = async (input: any) => {
    try {
      await saveTransaction.mutateAsync(input);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  const exportGstCSV = () => {
    if (!gstReport || gstReport.rows.length === 0) return;
    downloadCsv(
      `GST_Report_${fy}.csv`,
      ['Sr. No.', 'GST No.', 'CPIN No', 'Party Name', 'Bill No', 'Date', 'Amount', 'SGST', 'CGST', 'IGST', 'Total GST'],
      gstReport.rows.map((row, idx) => [
        idx + 1,
        row.gstNo,
        row.cpinNo,
        row.partyName,
        row.billNo,
        row.date,
        row.amount,
        row.sgst,
        row.cgst,
        row.igst,
        row.totalGst,
      ])
    );
  };

  const exportItCSV = () => {
    if (!itReport || itReport.rows.length === 0) return;
    downloadCsv(
      `IT_26Q_${fy}.csv`,
      ['Sr. No.', 'Party Name', 'Bill No', 'Settlement Date', 'Amount', 'PAN No.', 'Income Tax (TDS)'],
      itReport.rows.map((row, idx) => [
        idx + 1,
        row.partyName,
        row.billNo,
        row.date,
        row.amount,
        row.panNo,
        row.incomeTax,
      ])
    );
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Vendor &amp; Party Management</h1>
          <p className="page-subtitle">Manage vendor transactions, GST, and 26Q income tax reports</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">

        <div className="card no-print">
          <div className="card-header"><h2 className="font-semibold">New Transaction</h2></div>
          <div className="card-body"><TransactionForm parties={parties} onSubmit={handleSave} isLoading={saveTransaction.isPending} /></div>
        </div>

        <div className="card no-print">
          <div className="card-header"><h2 className="font-semibold">Recent Transactions</h2></div>
          <div className="card-body"><TransactionsTable transactions={transactions} isLoading={txLoading} /></div>
        </div>

        <div className="step-nav">
          <button
            onClick={() => setActiveReportTab('gst')}
            className={"step-link " + (activeReportTab === 'gst' ? 'active' : '')}
          >
            <span className="step-num">1</span> GST Report
          </button>
          <button
            onClick={() => setActiveReportTab('it')}
            className={"step-link " + (activeReportTab === 'it' ? 'active' : '')}
          >
            <span className="step-num">2</span> 26Q Income Tax
          </button>
        </div>

        <div className="card">
          <div className="card-header no-print">
            <div className="flex flex-wrap gap-2 items-center">
              <select value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)} className="input w-24">
                <option>Q1</option><option>Q2</option><option>Q3</option><option>Q4</option><option>Yearly</option>
              </select>
              <button onClick={window.print} className="btn btn-secondary text-sm">Print</button>
              <button onClick={activeReportTab === 'gst' ? exportGstCSV : exportItCSV} className="btn btn-outline text-sm">CSV</button>
              <button onClick={() => setShowPreview(true)} className="btn btn-outline text-sm">
                <FileImage size={14} className="mr-1" /> Preview
              </button>
              <span className="text-xs text-slate-500 ml-auto">FY: {fyLabel}</span>
            </div>
          </div>
          <div className="card-body">
            {activeReportTab === 'gst' && (
              gstLoading ? <div className="spinner h-8 w-8 mx-auto"></div> :
              !gstReport || gstReport.rows.length === 0 ? <div className="empty-state"><p>No GST data.</p></div> :
              <ReportPrintArea
                office={office}
                leftLabel="GSTIN NO :-"
                leftValue={office.gst || '24SRTD00979G1DD'}
                rightMeta={<><span>Financial Year: {fyLabel} | Quarter: {gstReport.quarter}</span></>}
                title="GST TDS STATEMENT SUMMARY REPORT"
                badgeClass="report-badge-gst"
              >
                <div className="overflow-x-auto">
                  <table className="report-table">
                    <thead>
                      <tr><th>Sr. No.</th><th>GST No.</th><th>CPIN No</th><th style={{ textAlign: 'left' }}>Party Name</th><th>Bill No</th><th>Date</th><th>Amount</th><th>SGST</th><th>CGST</th><th>IGST</th><th>Total GST</th></tr>
                    </thead>
                    <tbody>
                      {gstReport.rows.map((row: any, idx: number) => (
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
            )}
            {activeReportTab === 'it' && (
              itLoading ? <div className="spinner h-8 w-8 mx-auto"></div> :
              !itReport || itReport.rows.length === 0 ? <div className="empty-state"><p>No IT data.</p></div> :
              <ReportPrintArea
                office={office}
                leftLabel="TAN NO :-"
                leftValue={office.tan || 'SRTDO0979G'}
                rightMeta={<><span>Financial Year: {fyLabel} | Quarter: {itReport.quarter}</span></>}
                title="26Q OTHER THAN SALARY STATEMENT"
                badgeClass="report-badge-it"
              >
                <div className="overflow-x-auto">
                  <table className="report-table">
                    <thead>
                      <tr><th>Sr. No.</th><th style={{ textAlign: 'left' }}>Party Name</th><th>Bill No</th><th>Settlement Date</th><th>Amount</th><th>PAN No.</th><th>Income Tax (TDS)</th></tr>
                    </thead>
                    <tbody>
                      {itReport.rows.map((row: any, idx: number) => (
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
            )}
          </div>
        </div>
      </div>

      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Report Preview"
      >
        {activeReportTab === 'gst' && (gstLoading ? (
          <div className="spinner h-8 w-8 mx-auto"></div>
        ) : !gstReport || gstReport.rows.length === 0 ? (
          <div className="empty-state"><p>No GST data.</p></div>
        ) : (
          <ReportPrintArea
            office={office}
            leftLabel="GSTIN NO :-"
            leftValue={office.gst || '24SRTD00979G1DD'}
            rightMeta={<><span>Financial Year: {fyLabel} | Quarter: {gstReport.quarter}</span></>}
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
        ))}
        {activeReportTab === 'it' && (itLoading ? (
          <div className="spinner h-8 w-8 mx-auto"></div>
        ) : !itReport || itReport.rows.length === 0 ? (
          <div className="empty-state"><p>No IT data.</p></div>
        ) : (
          <ReportPrintArea
            office={office}
            leftLabel="TAN NO :-"
            leftValue={office.tan || 'SRTDO0979G'}
            rightMeta={<><span>Financial Year: {fyLabel} | Quarter: {itReport.quarter}</span></>}
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
        ))}
      </PreviewModal>
    </>
  );
}
