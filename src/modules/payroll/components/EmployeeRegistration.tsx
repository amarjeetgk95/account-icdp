import { useState, type RefObject } from 'react';
import { EmployeeForm } from './EmployeeForm';
import { EmployeeList } from './EmployeeList';
import type { EmployeeInput } from '../validation/employee.schema';
import { Users } from 'lucide-react';

interface EmployeeRegistrationProps {
  scrollRef?: RefObject<HTMLDivElement | null>;
}

export function EmployeeRegistration({ scrollRef }: EmployeeRegistrationProps) {
  const [editingEmployee, setEditingEmployee] = useState<EmployeeInput | null>(null);

  const handleEditEmployee = (employee: EmployeeInput) => {
    setEditingEmployee(employee);
    if (scrollRef?.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setEditingEmployee(null);
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Users size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h2>
              {editingEmployee && (
                <p className="text-xs text-slate-500 mt-0.5">Update employee details, PAN, and dates</p>
              )}
            </div>
          </div>
        </div>
        <div className="card-body">
          <EmployeeForm editingEmployee={editingEmployee} onCancel={handleCancelEdit} />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
              <Users size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Employee Directory</h2>
              <p className="text-xs text-slate-500 mt-0.5">All registered employees for this office</p>
            </div>
          </div>
        </div>
        <div className="card-body">
          <EmployeeList onEdit={handleEditEmployee} />
        </div>
      </div>
    </div>
  );
}
