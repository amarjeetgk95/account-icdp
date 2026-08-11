import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { FileSpreadsheet } from 'lucide-react';
import { useDataEntryReport, useOffices } from '../hooks/useAdmin';
import { DataEntryReport } from '../components/DataEntryReport';
import { AdminReports } from '../components/AdminReports';
import { AdminLayout } from '../components/AdminLayout';

export function AdminReportsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const reportOfficeId = searchParams.get('office') ?? '';

  const { data: reportData } = useDataEntryReport();
  const { data: offices } = useOffices();

  const handleOfficeIdChange = (officeId: string) => {
    const params = new URLSearchParams(searchParams);
    if (officeId) params.set('office', officeId);
    else params.delete('office');
    const qs = params.toString();
    navigate(`${location.pathname}${qs ? `?${qs}` : ''}`, { replace: true });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Data Entry Summary</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">Salary entry status across all offices</span>
            </div>
            <FileSpreadsheet size={18} className="text-slate-400" />
          </div>
          <div className="card-body p-0">
            <DataEntryReport data={reportData ?? []} isLoading={!reportData} />
          </div>
        </div>

        <AdminReports
          offices={offices ?? []}
          officesLoading={!offices}
          officeId={reportOfficeId}
          onOfficeIdChange={handleOfficeIdChange}
        />
      </div>
    </AdminLayout>
  );
}
