import { useState } from 'react';
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
import { downloadCsv } from '@/shared/utilities';
import { useUIStore } from '@/core/stores/ui-store';
import { FileImage, FileText, LayoutDashboard, Receipt } from 'lucide-react';
import type { TransactionInput } from '../types';

type SectionTab = 'overview' | 'gst' | 'it';

const SECTION_TABS: { id: SectionTab; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, description: 'Vendor summary, new transactions, and recent activity' },
  { id: 'gst', label: 'GST Report', icon: FileText, description: 'GST TDS statement summary report' },
  { id: 'it', label: '26Q Income Tax', icon: Receipt, description: '26Q other than salary TDS statement' },
];

export function PartiesPage() {
  const [activeTab, setActiveTab] = useState<SectionTab>('overview');
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [showPreview, setShowPreview] = useState(false);

  const fy = useUIStore((state) => state.activeFinancialYear);

  const { data: parties = [] } = useParties();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
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
    if (result.errors.length > 0) {
      console.warn('Bulk import errors:', result.errors);
    }
  };

  const exportGstCSV = () => {
    if (!gstReport || gstReport.rows.length === 0) return;
    downloadCsv(
      `GST_Report_${fy}.csv`,
      [
        'Sr. No.',
        'GST No.',
        'CPIN No',
        'Party Name',
        'Bill No',
        'Date',
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
      [
        'Sr. No.',
        'Party Name',
        'Bill No',
        'Settlement Date',
        'Amount',
        'PAN No.',
        'Income Tax (TDS)',
      ],
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
          <h1 className="page-title">Vendor & Party Management</h1>
          <p className="page-subtitle">
            Manage vendor transactions, GST, and 26Q income tax reports
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Sticky top navigation */}
        <div className="payroll-tabs sticky top-0 z-20 flex-shrink-0">
          {SECTION_TABS.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`payroll-tab ${activeTab === tab.id ? 'active' : ''}`}
                title={tab.description}
              >
                <TabIcon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Summary Stats */}
            <div className="animate-fade-in">
              <SummaryCards transactions={transactions} partiesCount={parties.length} />
            </div>

            {/* New Transaction Form */}
            <div className="card no-print animate-fade-in animate-fade-in-delay-1">
              <div className="card-header">
                <h2 className="font-semibold">New Transaction</h2>
              </div>
              <div className="card-body">
                <TransactionForm
                  parties={parties}
                  onSubmit={handleSave}
                  onBulkSubmit={handleBulkSave}
                  isLoading={saveTransaction.isPending}
                />
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="card no-print animate-fade-in animate-fade-in-delay-2">
              <div className="card-header">
                <h2 className="font-semibold">Recent Transactions</h2>
              </div>
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
                <button onClick={() => window.print()} className="btn btn-secondary text-sm">
                  Print
                </button>
                <button
                  onClick={activeTab === 'gst' ? exportGstCSV : exportItCSV}
                  className="btn btn-outline text-sm"
                >
                  CSV
                </button>
                <button
                  onClick={() => setShowPreview(true)}
                  className="btn btn-outline text-sm"
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
                  leftValue={office.gst || '24SRTD00979G1DD'}
                  rightMeta={
                    <>
                      <span>
                        Financial Year: {fyLabel} | Quarter: {gstReport?.quarter || selectedQuarter}
                      </span>
                    </>
                  }
                  title="GST TDS STATEMENT SUMMARY REPORT"
                  badgeClass="report-badge-gst"
                >
                  <GSTReportSection report={gstReport} isLoading={gstLoading} />
                </ReportPrintArea>
              )}
              {activeTab === 'it' && (
                <ReportPrintArea
                  office={office}
                  leftLabel="TAN NO :-"
                  leftValue={office.tan || 'SRTDO0979G'}
                  rightMeta={
                    <>
                      <span>
                        Financial Year: {fyLabel} | Quarter: {itReport?.quarter || selectedQuarter}
                      </span>
                    </>
                  }
                  title="26Q OTHER THAN SALARY STATEMENT"
                  badgeClass="report-badge-it"
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
            leftValue={office.gst || '24SRTD00979G1DD'}
            rightMeta={
              <>
                <span>
                  Financial Year: {fyLabel} | Quarter: {gstReport?.quarter || selectedQuarter}
                </span>
              </>
            }
            title="GST TDS STATEMENT SUMMARY REPORT"
            badgeClass="report-badge-gst"
          >
            <GSTReportSection report={gstReport} isLoading={gstLoading} />
          </ReportPrintArea>
        )}
        {activeTab === 'it' && (
          <ReportPrintArea
            office={office}
            leftLabel="TAN NO :-"
            leftValue={office.tan || 'SRTDO0979G'}
            rightMeta={
              <>
                <span>
                  Financial Year: {fyLabel} | Quarter: {itReport?.quarter || selectedQuarter}
                </span>
              </>
            }
            title="26Q OTHER THAN SALARY STATEMENT"
            badgeClass="report-badge-it"
          >
            <ITReportSection report={itReport} isLoading={itLoading} />
          </ReportPrintArea>
        )}
      </PreviewModal>
    </>
  );
}
