import { useState } from 'react';
import { EmployeeForm } from '../components/EmployeeForm';
import { EmployeeList } from '../components/EmployeeList';
import { OfficeForm } from '../components/OfficeForm';
import { FinancialYearForm } from '../components/FinancialYearForm';
import type { EmployeeInput } from '../validation/settings.schema';

type TabId = 'registration' | 'office' | 'year';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('registration');
  const [editingEmployee, setEditingEmployee] = useState<EmployeeInput | null>(null);

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'registration', label: 'Employee Registration', icon: '👤' },
    { id: 'office', label: 'Office Details', icon: '🏢' },
    { id: 'year', label: 'Financial Year', icon: '📅' },
  ];

  const handleEditEmployee = (employee: EmployeeInput) => {
    setEditingEmployee(employee);
    setActiveTab('registration');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingEmployee(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Settings</h1>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'registration' && (
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h2>
              <EmployeeForm editingEmployee={editingEmployee} onCancel={handleCancelEdit} />
            </div>

            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-800">All Employees</h2>
              </div>
              <EmployeeList onEdit={handleEditEmployee} />
            </div>
          </div>
        )}

        {activeTab === 'office' && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Office Details</h2>
            <OfficeForm />
          </div>
        )}

        {activeTab === 'year' && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Financial Year</h2>
            <FinancialYearForm />
          </div>
        )}
      </div>
    </div>
  );
}
