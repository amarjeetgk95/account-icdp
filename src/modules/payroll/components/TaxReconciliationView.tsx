import { useState } from 'react';
import { useTaxReconciliation, useSyncPaybillToPayroll } from '../hooks/usePayroll';
import { TaxReconciliationSummary } from './TaxReconciliationSummary';
import { TaxReconciliationTable } from './TaxReconciliationTable';
import { TaxReconciliationSyncModal } from './TaxReconciliationSyncModal';
import { useOfficeDetails } from '@/modules/settings/hooks/useOfficeDetails';
import { exportTaxReconciliationExcel, downloadCsv } from '@/shared/utilities';
import { SkeletonTable } from '@/shared/components/Skeleton';
import { EmptyState } from '@/shared/components/EmptyState';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';

interface TaxReconciliationViewProps {
  fy: number;
}

export function TaxReconciliationView({ fy }: TaxReconciliationViewProps) {
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q1');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncTargetHrpns, setSyncTargetHrpns] = useState<string[]>([]);
  const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const { data: report, isLoading, refetch, isRefetching } = useTaxReconciliation(selectedQuarter, fy);
  const syncMutation = useSyncPaybillToPayroll();
  const { details: officeDetails } = useOfficeDetails();

  const office = officeDetails || {
    officeName: '',
    subtitle: '',
    address: '',
    phone: '',
    email: '',
    gst: '',
    tan: '',
  };

  const fyLabel = `${fy}-${String(fy + 1).slice(-2)}`;

  const handleSyncSingle = (hrpn: string) => {
    setSyncTargetHrpns([hrpn]);
    setIsSyncModalOpen(true);
  };

  const handleSyncBulk = (hrpns: string[]) => {
    setSyncTargetHrpns(hrpns);
    setIsSyncModalOpen(true);
  };

  const handleSyncAllMismatches = () => {
    if (!report) return;
    const allSyncable = report.rows.filter((r) => r.canSync).map((r) => r.hrpn);
    if (allSyncable.length === 0) {
      setActionStatus({ type: 'info', message: 'All records are already 100% synchronized.' });
      setTimeout(() => setActionStatus(null), 4000);
      return;
    }
    setSyncTargetHrpns(allSyncable);
    setIsSyncModalOpen(true);
  };

  const handleConfirmSync = async (hrpns: string[]) => {
    try {
      const result = await syncMutation.mutateAsync({
        fy,
        quarter: selectedQuarter,
        hrpns,
      });
      setActionStatus({ type: 'success', message: result.message });
      refetch();
      setTimeout(() => setActionStatus(null), 5000);
    } catch (err) {
      setActionStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to synchronize with payroll.',
      });
    }
  };

  const handleExportCsv = () => {
    if (!report || report.rows.length === 0) return;

    const m1 = report.monthLabels[0]?.work || 'M1';
    const m2 = report.monthLabels[1]?.work || 'M2';
    const m3 = report.monthLabels[2]?.work || 'M3';

    const headers = [
      'Sr.',
      'HRPN',
      'Employee Name',
      'PAN',
      'Designation',
      `M1 (${m1}) Paybill Gross`,
      `M1 (${m1}) Payroll Gross`,
      `M1 Gross Diff`,
      `M1 (${m1}) Paybill IT`,
      `M1 (${m1}) Payroll IT`,
      `M1 Tax Diff`,
      `M2 (${m2}) Paybill Gross`,
      `M2 (${m2}) Payroll Gross`,
      `M2 Gross Diff`,
      `M2 (${m2}) Paybill IT`,
      `M2 (${m2}) Payroll IT`,
      `M2 Tax Diff`,
      `M3 (${m3}) Paybill Gross`,
      `M3 (${m3}) Payroll Gross`,
      `M3 Gross Diff`,
      `M3 (${m3}) Paybill IT`,
      `M3 (${m3}) Payroll IT`,
      `M3 Tax Diff`,
      'Quarter Paybill Gross',
      'Quarter Payroll Gross',
      'Quarter Gross Diff',
      'Quarter Paybill IT',
      'Quarter Payroll IT',
      'Quarter Tax Diff',
      'Status',
    ];

    const rows = report.rows.map((r, idx) => [
      idx + 1,
      r.hrpn,
      r.employeeName,
      r.pan,
      r.designation || '',
      r.months[0].paybillGross,
      r.months[0].payrollGross,
      r.months[0].grossDiff,
      r.months[0].paybillTax,
      r.months[0].payrollTax,
      r.months[0].taxDiff,
      r.months[1].paybillGross,
      r.months[1].payrollGross,
      r.months[1].grossDiff,
      r.months[1].paybillTax,
      r.months[1].payrollTax,
      r.months[1].taxDiff,
      r.months[2].paybillGross,
      r.months[2].payrollGross,
      r.months[2].grossDiff,
      r.months[2].paybillTax,
      r.months[2].payrollTax,
      r.months[2].taxDiff,
      r.quarterPaybillGross,
      r.quarterPayrollGross,
      r.quarterGrossDiff,
      r.quarterPaybillTax,
      r.quarterPayrollTax,
      r.quarterTaxDiff,
      r.status,
    ]);

    downloadCsv(`Tax_Reconciliation_${selectedQuarter}_FY${fyLabel}.csv`, headers, rows);
  };


  const handleExportExcel = () => {
    if (report) {
      exportTaxReconciliationExcel(report, office);
    }
  };

  const syncableRows = report ? report.rows.filter((r) => r.canSync) : [];

  return (
    <div className="space-y-3">
      {/* Action Notification Alert */}
      {actionStatus && (
        <div
          className={`alert p-3 rounded-xl flex items-center gap-2 text-xs font-bold ${
            actionStatus.type === 'success'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800'
              : actionStatus.type === 'error'
              ? 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800'
              : 'bg-indigo-100 text-indigo-900 border border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-800'
          }`}
        >
          {actionStatus.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : actionStatus.type === 'error' ? (
            <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
          ) : (
            <RefreshCw size={16} className="text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
          )}
          <span>{actionStatus.message}</span>
        </div>
      )}

      {/* Top Controls Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 shadow-xs">
        {/* Left: Quarter Selector Tabs */}
        <div className="flex items-center gap-2.5">
          <FileCheck2 size={16} className="text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
            FY {fyLabel}
          </span>

          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setSelectedQuarter(q)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedQuarter === q
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          {report && (
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden sm:inline-block">
              ({report.quarterMonths.join(', ')})
            </span>
          )}
        </div>

        {/* Right: Export & Sync Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          {syncableRows.length > 0 && (
            <button
              type="button"
              onClick={handleSyncAllMismatches}
              disabled={syncMutation.isPending}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Sync all mismatched or missing records from Paybill into Payroll"
            >
              <RefreshCw size={13} className={syncMutation.isPending ? 'animate-spin' : ''} />
              <span>Sync All to Payroll ({syncableRows.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={!report || report.rows.length === 0}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Download formatted Excel reconciliation report"
          >
            <FileSpreadsheet size={14} />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!report || report.rows.length === 0}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Export raw data to CSV"
          >
            <Download size={14} />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer disabled:opacity-50"
            title="Reload data"
          >
            <RefreshCw size={14} className={isLoading || isRefetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
          <SkeletonTable rows={8} cols={7} />
        </div>
      ) : !report || report.rows.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xs">
          <EmptyState
            icon={FileCheck2}
            title={`No paybill or salary records found for ${selectedQuarter} (FY ${fyLabel}).`}
            hint="Import Pay Bill PDF inner sheets or add salary entries for this quarter to generate reconciliation."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {/* KPI Summary Cards */}
          <TaxReconciliationSummary summary={report.summary} />

          {/* Matrix Table */}
          <TaxReconciliationTable
            report={report}
            onSyncSingle={handleSyncSingle}
            onSyncBulk={handleSyncBulk}
            isSyncing={syncMutation.isPending}
          />
        </div>
      )}

      {/* Sync Confirmation Modal */}
      {isSyncModalOpen && report && (
        <TaxReconciliationSyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          onConfirm={handleConfirmSync}
          targetRows={report.rows.filter((r) => syncTargetHrpns.includes(r.hrpn) && r.canSync)}
          quarter={selectedQuarter}
          fyLabel={fyLabel}
          isLoading={syncMutation.isPending}
        />
      )}
    </div>
  );
}
