import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUIStore } from '@/core/stores/ui-store';
import { PayBillUploadModal } from '../components/PayBillUploadModal';
import { PayBillAllowanceMatrixReport } from '../components/PayBillAllowanceMatrixReport';
import { PayBillEmployeeLedgerView } from '../components/PayBillEmployeeLedgerView';
import { PayBillSettingsModal } from '../components/PayBillSettingsModal';
import { PayrollComponentMasterPage } from './PayrollComponentMasterPage';
import {
  FileSpreadsheet,
  Upload,
  Calendar,
  BarChart3,
  User,
  Settings,
  Sparkles,
  Layers,
} from 'lucide-react';

type ModuleTab = 'matrix' | 'employee' | 'components';

export function PayBillImportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<ModuleTab>(() => {
    if (tabFromUrl === 'components' || tabFromUrl === 'employee' || tabFromUrl === 'matrix') {
      return tabFromUrl;
    }
    return 'matrix';
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'components' || tab === 'employee' || tab === 'matrix') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: ModuleTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fy = useUIStore((s) => s.activeFinancialYear);
  const fyLabel = `${fy}-${String(fy + 1).slice(-2)}`;

  const handleImportSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const tabClass = (active: boolean) =>
    `flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap text-[0.78rem] ${
      active
        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/70 dark:border-slate-700'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-800/50'
    }`;

  const tabIconClass = (active: boolean) =>
    active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400';

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white shadow-lg">
        <div className="absolute -top-12 -right-8 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 left-1/3 w-48 h-48 rounded-full bg-sky-400/10 blur-2xl pointer-events-none" />

        <div className="relative p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-inner shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Pay Bill PDF Import &amp; Allowance System
              </h1>
              <p className="text-[0.78rem] text-blue-100/90 mt-1 leading-relaxed">
                Government Pay Bill Register, 12-Month Matrix, and Employee HRPN Allowance
                Ledgers &bull; Major Head <span className="font-mono font-semibold">2403</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5 bg-white/15 border border-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold">
              <Calendar size={14} className="text-blue-100" />
              <span>FY {fyLabel}</span>
            </div>

            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm rounded-xl transition-all"
              title="Pay Bill Settings"
            >
              <Settings size={15} />
              <span>Settings</span>
            </button>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-extrabold bg-white text-blue-700 hover:bg-blue-50 rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              <Upload size={15} />
              <span>Upload Pay Bill PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="bg-slate-100/90 dark:bg-slate-800/90 p-1.5 rounded-xl flex border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-x-auto gap-1">
        <button onClick={() => handleTabChange('matrix')} className={tabClass(activeTab === 'matrix')}>
          <BarChart3 size={15} className={tabIconClass(activeTab === 'matrix')} />
          <span>12-Month Matrix</span>
          <span className="hidden md:inline text-[0.62rem] font-medium text-slate-400 ml-0.5">
            (Months &times; Parameters)
          </span>
        </button>

        <button onClick={() => handleTabChange('employee')} className={tabClass(activeTab === 'employee')}>
          <User size={15} className={tabIconClass(activeTab === 'employee')} />
          <span>Employee Ledger</span>
          <span className="hidden md:inline text-[0.62rem] font-medium text-slate-400 ml-0.5">
            (HRPN Search)
          </span>
        </button>

        <button onClick={() => handleTabChange('components')} className={tabClass(activeTab === 'components')}>
          <Layers size={15} className={tabIconClass(activeTab === 'components')} />
          <span>Component Master</span>
          <span className="hidden md:inline text-[0.62rem] font-medium text-slate-400 ml-0.5">
            (Earnings / Deductions)
          </span>
        </button>

        <div className="ml-auto hidden sm:flex items-center gap-1.5 px-2 text-[0.68rem] text-slate-400 font-medium">
          <Sparkles size={12} className="text-blue-400" />
          HRPN-keyed import, audit &amp; posting
        </div>
      </div>

      {/* TAB 1: 12-Month Allowance Matrix Report */}
      {activeTab === 'matrix' && (
        <PayBillAllowanceMatrixReport
          financialYear={fy}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          refreshTrigger={refreshTrigger}
        />
      )}

      {/* TAB 2: Employee Ledger (governed by Employee HRPN search criteria) */}
      {activeTab === 'employee' && (
        <PayBillEmployeeLedgerView financialYear={fy} refreshTrigger={refreshTrigger} />
      )}

      {/* TAB 3: Payroll Component Master (configure PDF header / code aliases) */}
      {activeTab === 'components' && <PayrollComponentMasterPage />}

      {/* Pop-up PDF Upload & Extraction Modal */}
      <PayBillUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      {/* Pay Bill Settings Modal */}
      <PayBillSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSaved={handleImportSuccess}
      />
    </div>
  );
}