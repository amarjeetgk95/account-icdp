import { useParams } from 'react-router-dom';
import { OfficeForm } from '../components/OfficeForm';

type TabId = 'office';

export function SettingsPage() {
  const { tab } = useParams<{ tab: string }>();
  const validTabs: TabId[] = ['office'];
  const activeTab: TabId = validTabs.includes(tab as TabId) ? (tab as TabId) : 'office';

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="page-header">
        <h1 className="page-title">TDS Settings</h1>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Manage office details & TDS identifiers</span>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'office' && (
          <div className="card">
            <div className="card-body">
              <OfficeForm />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
