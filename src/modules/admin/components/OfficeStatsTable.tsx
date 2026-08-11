import { ArrowRight } from 'lucide-react';
import type { OfficeStats } from '../types';

interface OfficeStatsTableProps {
  offices: OfficeStats[];
  isLoading: boolean;
  activeOfficeId: string | null;
  onSelectOffice: (officeId: string) => void;
}

export function OfficeStatsTable({ offices, isLoading, activeOfficeId, onSelectOffice }: OfficeStatsTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="spinner h-8 w-8"></div>
      </div>
    );
  }

  if (offices.length === 0) {
    return (
      <div className="empty-state">
        <p>No offices yet. Create one in User Management → Add User.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>#</th>
            <th>Office</th>
            <th className="text-right">Employees</th>
            <th className="text-right">Salary Records</th>
            <th className="text-right">Vendors</th>
            <th className="text-right">Transactions</th>
            <th className="text-right">Users</th>
            <th className="text-right">Reports</th>
          </tr>
        </thead>
        <tbody>
          {offices.map((office, idx) => {
            const isActive = String(office.office_id) === String(activeOfficeId);
            return (
              <tr
                key={office.office_id}
                onClick={() => onSelectOffice(office.office_id)}
                className={`cursor-pointer ${isActive ? 'bg-blue-50' : ''}`}
                title="Open this office's reports"
              >
                <td className="text-slate-500 font-medium">{idx + 1}</td>
                <td className="font-bold">
                  {office.office_name}
                  {isActive && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                      active
                    </span>
                  )}
                </td>
                <td className="text-right">{office.employees.toLocaleString('en-IN')}</td>
                <td className="text-right">{office.salaries.toLocaleString('en-IN')}</td>
                <td className="text-right">{office.parties.toLocaleString('en-IN')}</td>
                <td className="text-right">{office.transactions.toLocaleString('en-IN')}</td>
                <td className="text-right">{office.users}</td>
                <td className="text-right">
                  <span className="inline-flex items-center gap-1 text-blue-600 font-semibold">
                    Open <ArrowRight size={14} />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
