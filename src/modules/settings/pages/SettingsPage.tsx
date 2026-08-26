import { useParams, useNavigate } from 'react-router-dom';
import { OfficeForm } from '../components/OfficeForm';
import { Form16DefaultsForm } from '../components/Form16DefaultsForm';
import { Form16TaxRulesConfigForm } from '../components/Form16TaxRulesConfigForm';
import { GTR30SettingsView } from '@/modules/gtr30/components/GTR30SettingsView';
import { GTR44SettingsView } from '@/modules/gtr44/components/GTR44SettingsView';
import {
  Building2,
  FileBadge,
  Calculator,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';

export type SettingTabId = 'office' | 'gtr30' | 'gtr44' | 'tax-rules' | 'form16';

export function SettingsPage() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const validTabs: SettingTabId[] = ['office', 'gtr30', 'gtr44', 'tax-rules', 'form16'];
  const activeTab: SettingTabId = validTabs.includes(tab as SettingTabId) ? (tab as SettingTabId) : 'office';

  const tabs: Array<{ id: SettingTabId; label: string; icon: React.ElementType }> = [
    { id: 'office', label: 'Office & DDO Master', icon: Building2 },
    { id: 'gtr30', label: 'GTR-30 Pay Bills', icon: FileSpreadsheet },
    { id: 'gtr44', label: 'GTR-44 DC Bills', icon: Receipt },
    { id: 'tax-rules', label: 'Income Tax Slabs (115BAC)', icon: Calculator },
    { id: 'form16', label: 'Form 16 Deductor', icon: FileBadge },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="page-header flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title text-xl font-bold text-slate-800 dark:text-slate-100">
            Master Settings &amp; Module Defaults
          </h1>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Centralized configuration hub for office profile, bill creation defaults, cadre strength, and taxation rules
          </span>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => navigate(`/settings/${t.id}`)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'office' && (
          <div className="card">
            <div className="card-body">
              <h2 className="text-base font-heading font-semibold text-slate-800 dark:text-slate-100 mb-3">
                Office Information &amp; Identifiers
              </h2>
              <OfficeForm />
            </div>
          </div>
        )}

        {activeTab === 'gtr30' && (
          <div className="space-y-4">
            <GTR30SettingsView />
          </div>
        )}

        {activeTab === 'gtr44' && (
          <div className="space-y-4">
            <GTR44SettingsView />
          </div>
        )}

        {activeTab === 'tax-rules' && (
          <div className="card">
            <div className="card-body">
              <h2 className="text-base font-heading font-semibold text-slate-800 dark:text-slate-100 mb-3">
                New Tax Regime (u/s 115BAC) Slabs &amp; Exemption Rules
              </h2>
              <Form16TaxRulesConfigForm />
            </div>
          </div>
        )}

        {activeTab === 'form16' && (
          <div className="card">
            <div className="card-body">
              <h2 className="text-base font-heading font-semibold text-slate-800 dark:text-slate-100 mb-3">
                Form 16 — Common Deductor &amp; Signatory Details
              </h2>
              <Form16DefaultsForm />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
