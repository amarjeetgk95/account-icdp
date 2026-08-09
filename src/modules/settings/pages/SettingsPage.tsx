import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { OfficeForm } from '../components/OfficeForm';

type TabId = 'office';

const TABS: { id: TabId; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'office', label: 'Office Details', icon: Building2, description: 'Manage office address, phone, GSTIN, and TAN details' },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('office');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage office details</p>
        </div>
      </div>

      {/* Sticky top navigation */}
      <div className="payroll-tabs sticky top-0 z-20 flex-shrink-0">
        {TABS.map((tab) => {
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

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'office' && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-slate-800">Office Details</h2>
            </div>
            <div className="card-body">
              <OfficeForm />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
