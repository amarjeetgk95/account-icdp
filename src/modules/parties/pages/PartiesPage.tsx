import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useParties,
  useTransactions,
  useSaveTransaction,
  useSaveBulkTransactions,
  useGSTReport,
  useIncomeTaxReport,
  useOfficeDetails,
} from '../hooks/useParties';
import { TransactionForm } from '../components/TransactionForm';
import { TransactionsTable } from '../components/TransactionsTable';
import { SummaryCards } from '../components/SummaryCards';
import { GSTReportSection } from '../components/GSTReportSection';
import { ITReportSection } from '../components/ITReportSection';
import { ReportPrintArea } from '@/shared/components/ReportPrintArea';
import { PreviewModal } from '@/shared/components/PreviewModal';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { Modal } from '@/shared/components/Modal';
import { downloadCsv, popupNativePrint } from '@/shared/utilities';
import { export26QExcel, exportGSTExcel } from '@/shared/utilities/excelExport';
import { useUIStore } from '@/core/stores/ui-store';
import { FileImage, Plus, FileSpreadsheet } from 'lucide-react';
import type { TransactionInput } from '../types';

type SectionTab = 'overview' | 'gst' | 'it';

export function PartiesPage() {
  const { tab } = useParams<{ tab: string }>();
  const validTabs: SectionTab[] = ['overview', 'gst', 'it'];
  const activeTab: SectionTab = validTabs.includes(tab as SectionTab) ? (tab as SectionTab) : 'overview';
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [showPreview, setShowPreview] = useState(false);
  const [showTxForm, setShowTxForm] = useState(false);

  const fy = useUIStore((state) => state.activeFinancialYear);

  const { data: parties = [] } = useParties();
  const { data: transactions = [], isLoading: txLoading } = useTransactions(fy);
  const saveTransaction = useSaveTransaction();
  const saveBulkTransactions = useSaveBulkTransactions();
  const { data: officeDetails } = useOfficeDetails();
  const { data: gstReport, isLoading: gstLoading } = useGSTReport(
    activeTab === 'gst' ? selectedQuarter : 'Q1'
  );
  const { data: itReport, isLoading: itLoading } = useIncomeTaxReport(
    activeTab === 'it' ? selectedQuarter : 'Q1'
  );

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

  const handleSave = async (input: TransactionInput) => {
    await saveTransaction.mutateAsync(input);
  };

  const handleBulkSave = async (inputs: TransactionInput[]) => {
    const result = await saveBulkTransactions.mutateAsync(inputs);
    return { failed: result.errors.length };
  };

  const exportGstCSV = () => {
    if (!gstReport || gstReport.rows.length === 0) return;
    downloadCsv(
      `GST_Report_${fy}_${selectedQuarter}.csv`,
      [
        'Sr. No.',
        'GST No.',
        'CPIN No',
        'Party Name',
        'DDO Bill No',
        'Invoice No',
        'Invoice Date',
        'Settlement Date',
        'Amount',
        'SGST',
        'CGST',
        'IGST',
        'Total GST',
      ],
      gstReport.rows.map((row, idx) => [
        idx + 1,
        row.gstNo,
        row.cpinNo,
        row.partyName,
        row.ddoBillNo || '-',
        row.billNo,
        row.invoiceDate || row.date,
        row.settlementDate || row.date,
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
      `IT_26Q_${fy}_${selectedQuarter}.csv`,
      [
        'Sr. No.',
        'Party Name',
        'PAN No.',
        'DDO Bill No',
        'Invoice No',
        'Invoice Date',
        'Settlement Date',
        'Amount',
        'Income Tax (TDS)',
      ],
      itReport.rows.map((row, idx) => [
        idx + 1,
        row.partyName,
        row.panNo,
        row.ddoBillNo || '-',
        row.billNo,
        row.invoiceDate || row.date,
        row.settlementDate || row.date,
        row.amount,
        row.incomeTax,
      ])
    );
  };

  const handleExcelExport = async () => {
    if (activeTab === 'gst' && gstReport) {
      await exportGSTExcel(gstReport, {
        officeName: office.officeName,
        subtitle: office.subtitle,
        address: office.address,
        gst: office.gst,
      });
    } else if (activeTab === 'it' && itReport) {
      await export26QExcel(itReport, {
        officeName: office.officeName,
        subtitle: office.subtitle,
        address: office.address,
        tan: office.tan,
      });
    }
  };

  return (
    <>
      <WorkspaceHeader
        title="Vendor & party management"
        context={<>FY {fyLabel}</>}
        actions={
          <button
            type="button"
            onClick={() => setShowTxForm(true)}
            className="btn btn-primary btn-sm"
          >
            <Plus size={14} /> New Transaction
          </button>
        }
      />

        <div className="max-w-7xl mx-auto space-y-3">
        {activeTab === 'overview' && (
          <>
            {/* Summary Stats */}
            <div className="animate-fade-in">
              <SummaryCards transactions={transactions} partiesCount={parties.length} />
            </div>

            {/* Recent Transactions */}
            <div className="card no-print animate-fade-in animate-fade-in-delay-1">
              <div className="card-body">
                <TransactionsTable transactions={transactions} isLoading={txLoading} />
              </div>
            </div>
          </>
        )}

        {(activeTab === 'gst' || activeTab === 'it') && (
          <div className="card animate-fade-in">
            <div className="card-header no-print">
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(e.target.value)}
                  className="input w-24"
                >
                  <option>Q1</option>
                  <option>Q2</option>
                  <option>Q3</option>
                  <option>Q4</option>
                  <option>Yearly</option>
                </select>
                <button
                  onClick={() => {
                    const el = document.querySelector('.card-body .report-print-area') as HTMLElement | null;
                    if (el) {
                      popupNativePrint({
                        elements: [el],
                        title: `${activeTab.toUpperCase()}_Report_${fyLabel}_${selectedQuarter}`,
                        pageSize: 'A4',
                        orientation: 'landscape',
                        pageMargin: '8mm',
                        pageContainerSelector: '.report-print-area',
                      });
                    } else {
                      window.print();
                    }
                  }}
                  className="btn btn-secondary text-xs"
                >
                  Print
                </button>
                <button
                  onClick={activeTab === 'gst' ? exportGstCSV : exportItCSV}
                  className="btn btn-outline text-xs"
                >
                  CSV
                </button>
                <button
                  onClick={handleExcelExport}
                  className="btn btn-outline text-xs"
                  title="Export formatted Excel workbook"
                >
                  <FileSpreadsheet size={14} className="mr-1 text-emerald-600" /> Excel
                </button>
                <button
                  onClick={() => setShowPreview(true)}
                  className="btn btn-outline text-xs"
                >
                  <FileImage size={14} className="mr-1" /> Preview
                </button>
                <span className="text-xs text-slate-500 ml-auto">FY: {fyLabel}</span>
              </div>
            </div>
            <div className="card-body">
              {activeTab === 'gst' && (
                <ReportPrintArea
                  office={office}
                  leftLabel="GSTIN NO :-"
                  leftValue={office.gst || 'NOT SET'}
                  rightMeta={
                    <>
                      <span>
                        Financial Year: {fyLabel} | Quarter: {gstReport?.quarter || selectedQuarter}
                      </span>
                    </>
                  }
                  title="GST TDS STATEMENT SUMMARY REPORT"
                  badgeClass="report-badge-gst"
                  pageOrientation="landscape"
                >
                  <GSTReportSection report={gstReport} isLoading={gstLoading} />
                </ReportPrintArea>
              )}
              {activeTab === 'it' && (
                <ReportPrintArea
                  office={office}
                  leftLabel="TAN NO :-"
                  leftValue={office.tan || 'NOT SET'}
                  rightMeta={
                    <>
                      <span>
                        Financial Year: {fyLabel} | Quarter: {itReport?.quarter || selectedQuarter}
                      </span>
                    </>
                  }
                  title="26Q OTHER THAN SALARY STATEMENT"
                  badgeClass="report-badge-it"
                  pageOrientation="landscape"
                >
                  <ITReportSection report={itReport} isLoading={itLoading} />
                </ReportPrintArea>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal — reuses the same report components (no duplication!) */}
      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Report Preview"
      >
        {activeTab === 'gst' && (
          <ReportPrintArea
            office={office}
            leftLabel="GSTIN NO :-"
            leftValue={office.gst || 'NOT SET'}
            rightMeta={
              <>
                <span>
                  Financial Year: {fyLabel} | Quarter: {gstReport?.quarter || selectedQuarter}
                </span>
              </>
            }
            title="GST TDS STATEMENT SUMMARY REPORT"
            badgeClass="report-badge-gst"
            pageOrientation="landscape"
          >
            <GSTReportSection report={gstReport} isLoading={gstLoading} />
          </ReportPrintArea>
        )}
        {activeTab === 'it' && (
          <ReportPrintArea
            office={office}
            leftLabel="TAN NO :-"
            leftValue={office.tan || 'NOT SET'}
            rightMeta={
              <>
                <span>
                  Financial Year: {fyLabel} | Quarter: {itReport?.quarter || selectedQuarter}
                </span>
              </>
            }
            title="26Q OTHER THAN SALARY STATEMENT"
            badgeClass="report-badge-it"
            pageOrientation="landscape"
          >
            <ITReportSection report={itReport} isLoading={itLoading} />
          </ReportPrintArea>
        )}
      </PreviewModal>

      {/* New Transaction Form — kept in a modal so the workspace stays data-first */}
      <Modal
        open={showTxForm}
        onClose={() => setShowTxForm(false)}
        title="New transaction"
        maxWidth="xl"
      >
        <TransactionForm
          parties={parties}
          onSubmit={handleSave}
          onBulkSubmit={handleBulkSave}
          isLoading={saveTransaction.isPending}
        />
      </Modal>
    </>
  );
}
