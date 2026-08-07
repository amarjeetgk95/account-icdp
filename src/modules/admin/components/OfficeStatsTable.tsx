import type { OfficeStats } from '../types';

interface OfficeStatsTableProps {
  offices: OfficeStats[];
  isLoading: boolean;
  activeOfficeId: string | null;
}

export function OfficeStatsTable({ offices, isLoading, activeOfficeId }: OfficeStatsTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (offices.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No offices yet. Create one by typing its name in User Management → Add User.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">#</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Office</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-600">Employees</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-600">Salary Records</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-600">Vendors</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-600">Transactions</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-600">Users</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {offices.map((office, idx) => {
            const isActive = Number(office.office_id) === Number(activeOfficeId);
            return (
              <tr
                key={office.office_id}
                className={`hover:bg-slate-50 ${isActive ? 'bg-blue-50' : ''}`}
              >
                <td className="px-4 py-3 text-slate-500 font-medium">{idx + 1}</td>
                <td className="px-4 py-3 font-bold">
                  {office.office_name}
                  {isActive && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                      active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">{office.employees.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-right">{office.salaries.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-right">{office.parties.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-right">{office.transactions.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-right">{office.users}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
