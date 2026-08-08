import { useState } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { formatDate } from '@/shared/utilities';
import type { EmployeeInput } from '../validation/employee.schema';
import type { Database } from '@/shared/database.types';
import { Pencil, Trash2 } from 'lucide-react';

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
        <div className="spinner h-8 w-8"></div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">👥</div>
        <p className="empty-state-text">No employees registered yet.</p>
        <p className="text-xs text-slate-400 mt-1">Add employees using the form above to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
            <tr>
              <th className="text-center" style={{ width: '50px' }}>#</th>
              <th className="text-left">HRPN No.</th>
              <th className="text-left">Name</th>
              <th className="text-left">PAN</th>
              <th className="text-center">Join Date</th>
              <th className="text-center">Transfer Date</th>
              <th className="text-center" style={{ width: '140px' }}>Actions</th>
            </tr>
        </thead>
        <tbody>
          {employees.map((employee, index) => (
            <tr key={employee.id}>
              <td className="text-slate-500 text-center">{index + 1}</td>
              <td className="font-mono text-sm">{employee.hprn_no || '-'}</td>
              <td className="font-medium">{employee.name}</td>
              <td className="font-mono text-sm">{employee.pan}</td>
              <td className="text-center">
                {employee.join_date ? formatDate(employee.join_date) : '-'}
              </td>
              <td className="text-center">
                {employee.transfer_date ? formatDate(employee.transfer_date) : '-'}
              </td>
              <td>
                <div className="flex justify-center gap-1.5">
                  <button
                    onClick={() =>
                  onEdit({
                    id: employee.id,
                    hprnNo: employee.hprn_no || '',
                    name: employee.name,
                    pan: employee.pan,
                    joinDate: employee.join_date || '',
                    transferDate: employee.transfer_date || '',
                  })
                    }
                    className="btn btn-icon btn-sm btn-secondary"
                    title="Edit employee"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(employee)}
                    className={`btn btn-icon btn-sm ${
                      deleteConfirm?.id === employee.id ? 'btn-danger' : 'btn-outline'
                    }`}
                    title={deleteConfirm?.id === employee.id ? 'Click again to confirm' : 'Delete employee'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {deleteConfirm?.id === employee.id && (
                  <p className="text-xs text-red-500 mt-1.5 text-center font-medium">
                    This will delete all salary data for {deleteConfirm.name}
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
