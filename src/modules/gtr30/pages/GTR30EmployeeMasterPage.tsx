import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { GTR30EmployeeMasterView } from '../components/GTR30EmployeeMasterView';
import { GTR30BillCodeMappingView } from '../components/GTR30BillCodeMappingView';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Users } from 'lucide-react';
import { useHydrateGTR30EmployeeMaster } from '../hooks/useGTR30EmployeeMaster';
import { useHydrateGTR30BillCodeMappings } from '../hooks/useGTR30BillCodeMappings';

export function GTR30EmployeeMasterPage() {
  const navigate = useNavigate();
  const hydrateMaster = useHydrateGTR30EmployeeMaster();
  const hydrateMappings = useHydrateGTR30BillCodeMappings();

  useEffect(() => {
    void hydrateMaster.mutateAsync();
    void hydrateMappings.mutateAsync();
  }, [hydrateMaster, hydrateMappings]);

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-20">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/gtr30/list')} title="Back">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4" /> GTR-30 Employee Master
            </h1>
            <p className="text-xs text-slate-500">
              Enter employee salary details per month and bill code, and manage bill code mappings.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <GTR30EmployeeMasterView />
        <GTR30BillCodeMappingView />
      </div>
    </div>
  );
}
