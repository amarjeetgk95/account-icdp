import { useState } from 'react';
import { useUIStore } from '@/core/stores/ui-store';
import { payrollService } from '../services/payroll.service';
import { useRoster, useSaveSalary, useQuarterReport } from '../hooks/usePayroll';
import { SalaryEntryGrid } from '../components/SalaryEntryGrid';
import { QuarterReportView } from '../components/QuarterReport';

type Mode = 'entry' | 'report';

export function PayrollPage() {
  const [mode, setMode] = useState<Mode>('entry');
  const [selectedMonth, setSelectedMonth] = useState(() => payrollService.getEntryMonth());
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [showDA, setShowDA] = useState(false);
  const [autoFill, setAutoFill] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const fy = useUIStore((state) => state.activeFinancialYear);
  const monthOptions = payrollService.getMonthOptions(fy);

  const { data: roster = [], isLoading: rosterLoading } = useRoster(selectedMonth);
  const saveSalary = useSaveSalary();
  const { data: quarterReport, isLoading: reportLoading } = useQuarterReport(selectedQuarter);

  const handleSave = async (entries: Array<{ employeeId: string; gross: number; da: number; tax: number }>) => {
    setSaveStatus({ type: 'info', message: 'Saving...' });
    try {
      const result = await saveSalary.mutateAsync({ month: selectedMonth, entries });
      setSaveStatus({ type: 'success', message: result });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save';
      setSaveStatus({ type: 'error', message });
    }
  };

  const handleLoadRoster = () => {
    setSaveStatus(null);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Mode Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('entry')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'entry'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          📊 Monthly Entry
        </button>
        <button
          onClick={() => setMode('report')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'report'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          📋 Quarterly Report (24Q)
        </button>
      </div>

      {saveStatus && (
        <div
          className={`px-4 py-2 rounded-lg mb-4 ${
            saveStatus.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : saveStatus.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {saveStatus.message}
        </div>
      )}

      {mode === 'entry' && (
        <div className="space-y-4">
          {/* Lag Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            ℹ️ Data entry lag: You're entering the previous month's salary in the current month.
          </div>

          {/* Controls */}
          <div className="card p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="label">Financial Year</label>
                <div className="px-3 py-2 bg-slate-50 border rounded-lg text-center font-semibold">
                  {fy}-{String(fy + 1).slice(-2)}
                </div>
              </div>
              <div>
                <label htmlFor="entryMonth" className="label">
                  Paying Month (salary entered now)
                </label>
                <select
                  id="entryMonth"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="input"
                >
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button onClick={handleLoadRoster} className="btn btn-primary w-full">
                  🔄 Load Roster
                </button>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDA}
                    onChange={(e) => setShowDA(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-amber-700">DA & Other</span>
                </label>
              </div>
            </div>

            <div className="mt-3 flex justify-center">
              <label className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-slate-50 rounded-full border">
                <input
                  type="checkbox"
                  checked={autoFill}
                  onChange={(e) => setAutoFill(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-slate-600">
                  📋 Auto-fill with previous month
                </span>
              </label>
            </div>
          </div>

          {/* Grid */}
          <div className="card p-4">
            <SalaryEntryGrid
              roster={roster}
              isLoading={rosterLoading}
              showDA={showDA}
              onSave={handleSave}
            />
          </div>
        </div>
      )}

      {mode === 'report' && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="label">Financial Year</label>
                <div className="px-3 py-2 bg-slate-50 border rounded-lg text-center font-semibold">
                  {fy}-{String(fy + 1).slice(-2)}
                </div>
              </div>
              <div>
                <label htmlFor="quarterSelect" className="label">Quarter</label>
                <select
                  id="quarterSelect"
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(e.target.value)}
                  className="input"
                >
                  <option value="Q1">Q1 (Apr-Jun)</option>
                  <option value="Q2">Q2 (Jul-Sep)</option>
                  <option value="Q3">Q3 (Oct-Dec)</option>
                  <option value="Q4">Q4 (Jan-Mar)</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="btn btn-secondary w-full">
                  🖨️ Print
                </button>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <QuarterReportView report={quarterReport || null} isLoading={reportLoading} />
          </div>
        </div>
      )}
    </div>
  );
}
