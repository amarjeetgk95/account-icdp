import { useState } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { formatDate } from '@/shared/utilities';
import type { EmployeeInput } from '../validation/settings.schema';
import type { Database } from '@/shared/database.types';

type Employee = Database['public']['Tables']['employees']['Row'];

interface EmployeeListProps {
  onEdit: (employee: EmployeeInput) => void;
}

export function EmployeeList({ onEdit }: EmployeeListProps) {
  const { employees, isLoading, deleteAsync } = useEmployees();
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; pan: string } | null>(null);

  const handleDelete = async (employee: Employee) => {
    if (deleteConfirm?.id === employee.id) {
      try {
        await deleteAsync({ id: employee.id, pan: employee.pan });
        setDeleteConfirm(null);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete employee');
      }
    } else {
      setDeleteConfirm({ id: employee.id, name: employee.name, pan: employee.pan });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No employees registered yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">#</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">PAN</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Join Date</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Transfer Date</th>
            <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {employees.map((employee, index) => (
            <tr key={employee.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-slate-500">{index + 1}</td>
              <td className="px-4 py-3 font-medium">{employee.name}</td>
              <td className="px-4 py-3 font-mono text-sm">{employee.pan}</td>
              <td className="px-4 py-3">
                {employee.join_date ? formatDate(employee.join_date) : '-'}
              </td>
              <td className="px-4 py-3">
                {employee.transfer_date ? formatDate(employee.transfer_date) : '-'}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() =>
                      onEdit({
                        id: employee.id,
                        name: employee.name,
                        pan: employee.pan,
                        joinDate: employee.join_date || '',
                        transferDate: employee.transfer_date || '',
                      })
                    }
                    className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(employee)}
                    className={`px-3 py-1 text-sm rounded ${
                      deleteConfirm?.id === employee.id
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    {deleteConfirm?.id === employee.id ? 'Confirm Delete' : 'Delete'}
                  </button>
                </div>
                {deleteConfirm?.id === employee.id && (
                  <p className="text-xs text-red-500 mt-1 text-center">
                    This will permanently delete all salary data for {deleteConfirm.name}
                  </p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
