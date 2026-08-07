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

  const tabs: { id: TabId; label: string }[] = [
    { id: 'registration', label: 'Employee Registration' },
    { id: 'office', label: 'Office Details' },
    { id: 'year', label: 'Financial Year' },
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
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage employee registration, office details, and financial year settings</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="step-nav">
        {tabs.map((tab, idx) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={"step-link " + (activeTab === tab.id ? 'active' : '')}
          >
            <span className="step-num">{idx + 1}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'registration' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-slate-800">
                  {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                </h2>
              </div>
              <div className="card-body">
                <EmployeeForm editingEmployee={editingEmployee} onCancel={handleCancelEdit} />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-slate-800">All Employees</h2>
              </div>
              <div className="card-body">
                <EmployeeList onEdit={handleEditEmployee} />
              </div>
            </div>
          </div>
        )}

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

        {activeTab === 'year' && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-slate-800">Financial Year</h2>
            </div>
            <div className="card-body">
              <FinancialYearForm />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
