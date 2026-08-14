import { useGTR44Store } from '../store/gtr44Store';
import { GTR44DataEntry } from '../components/GTR44DataEntry';
import { GTR44LivePreview } from '../components/GTR44LivePreview';
import { GTR44SettingsView } from '../components/GTR44SettingsView';
import { PrintButton } from '../components/PrintButton';
import { formatIndianCurrency } from '../utils/gtr44Utils';
import { FileEdit, Eye, Settings, Landmark, Building2 } from 'lucide-react';

export function GTR44ModulePage() {
  const { activeTab, setActiveTab, formData } = useGTR44Store();

  const entries = formData.partyEntries || [];
  const grossTotal = entries.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalDeductions =
    (formData.deductions.tds9510 || 0) +
    (formData.deductions.surcharge9520 || 0) +
    (formData.deductions.sd9600 || 0) +
    (formData.deductions.misc9910 || 0);
  const netAmount = Math.max(0, grossTotal - totalDeductions);

  return (
    <div className="container mx-auto py-6 px-4 space-y-6 max-w-7xl print:p-0 print:m-0 print:max-w-none">
      {/* Top Header Banner (Hidden during browser Print/PDF export) */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md print:hidden border border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="bg-indigo-600/80 border border-indigo-400/40 text-indigo-100 text-xs font-bold px-2.5 py-0.5 rounded-md flex items-center">
                <Landmark className="h-3.5 w-3.5 mr-1" /> Treasury Form G.T.R. 44
              </span>
              <span className="text-xs text-slate-300 font-mono">Rule 208 · 4-Page Master</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">G.T.R. 44 Bill Generator</h1>
            <p className="text-sm text-slate-300 flex items-center">
              <Building2 className="h-4 w-4 mr-1.5 text-indigo-400" /> {formData.officeName}
            </p>
          </div>

          {/* Quick Metrics & Print */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700 text-right space-y-0.5 min-w-[200px] hidden sm:block">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Gross / Net Payable</p>
              <p className="text-base font-mono font-bold text-white tabular-nums">₹ {formatIndianCurrency(grossTotal)}</p>
              <p className="text-xs text-emerald-400 font-semibold font-mono tabular-nums">
                Net: ₹ {formatIndianCurrency(netAmount)}
              </p>
            </div>
            <PrintButton className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11" />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('entry')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'entry'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FileEdit className="h-3.5 w-3.5" />
            <span>Data Entry ({entries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Live GTR-44 (4 Pages)</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Settings &amp; Head Setup</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="transition-all print:p-0 print:m-0">
        {activeTab === 'entry' && <GTR44DataEntry />}
        {(activeTab === 'preview' || activeTab === 'pdf') && <GTR44LivePreview />}
        {activeTab === 'settings' && <GTR44SettingsView />}
      </div>
    </div>
  );
}
