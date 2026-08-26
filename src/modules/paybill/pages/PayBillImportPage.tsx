import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/core/stores/ui-store';
import { PayBillUploadModal } from '../components/PayBillUploadModal';
import { PayBillAllowanceMatrixReport } from '../components/PayBillAllowanceMatrixReport';
import { EmployeeLedgerView } from '../components/employee-ledger/EmployeeLedgerView';
import { PayBillSettingsModal } from '../components/PayBillSettingsModal';
import { invalidatePaybillData } from '../hooks/invalidatePaybillData';
import { PayrollComponentMasterPage } from './PayrollComponentMasterPage';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import {
  Upload,
  Calendar,
  Settings,
} from 'lucide-react';

type ModuleTab = 'matrix' | 'employee' | 'components';

export function PayBillImportPage() {
  const { tab } = useParams<{ tab: string }>();
  const validTabs: ModuleTab[] = ['matrix', 'employee', 'components'];
  const activeTab: ModuleTab = validTabs.includes(tab as ModuleTab) ? (tab as ModuleTab) : 'matrix';
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const fy = useUIStore((s) => s.activeFinancialYear);
  const fyLabel = `${fy}-${String(fy + 1).slice(-2)}`;

  const handleImportSuccess = () => {
    void invalidatePaybillData(queryClient);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-3">
      {activeTab !== 'employee' && (
        <WorkspaceHeader
          eyebrow="Employee IT · Government Pay Bill Register"
          title="Pay Bill PDF Import & Allowance System"
          context={<><Calendar size={13} className="text-slate-500" /> FY {fyLabel}</>}
          actions={<>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              title="Pay Bill Settings"
            >
              <Settings size={13} /> Settings
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
            >
              <Upload size={13} /> Upload PDF
            </button>
          </>}
        />
      )}

      {/* TAB 1: 12-Month Allowance Matrix Report */}
      {activeTab === 'matrix' && (
        <PayBillAllowanceMatrixReport
          financialYear={fy}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
        />
      )}

      {/* TAB 2: Employee Ledger (governed by Employee HRPN search criteria) */}
      {activeTab === 'employee' && (
        <EmployeeLedgerView financialYear={fy} />
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
