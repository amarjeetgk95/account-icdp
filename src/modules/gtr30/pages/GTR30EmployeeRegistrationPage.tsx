import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { GTR30EmployeeMasterView } from '../components/GTR30EmployeeMasterView';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, UserPlus, Settings, FileText } from 'lucide-react';
import { useHydrateGTR30EmployeeMaster } from '../hooks/useGTR30EmployeeMaster';
import { useHydrateGTR30BillCodeMappings } from '../hooks/useGTR30BillCodeMappings';

export function GTR30EmployeeRegistrationPage() {
  const navigate = useNavigate();
  const hydrateMaster = useHydrateGTR30EmployeeMaster();
  const hydrateMappings = useHydrateGTR30BillCodeMappings();

  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    void hydrateMaster.mutateAsync().catch(() => {});
    void hydrateMappings.mutateAsync().catch(() => {});
  }, [hydrateMaster, hydrateMappings]);

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/gtr30/list')} title="Back to Register">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-blue-600" /> GTR-30 Employee Registration
            </h1>
            <p className="text-xs text-slate-500">
              Register, edit, and modify employee salary details, 7th pay scales, allowances, and schedule deductions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/gtr30/employee-master')}
            className="text-xs font-semibold text-slate-700"
          >
            <Settings className="h-3.5 w-3.5 mr-1 text-slate-500" /> Manage Bill Codes / Master
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/gtr30/list')}
            className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            <FileText className="h-3.5 w-3.5 mr-1" /> View Pay Bills
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <GTR30EmployeeMasterView />
      </div>
    </div>
  );
}

export default GTR30EmployeeRegistrationPage;
