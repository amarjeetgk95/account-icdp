import { useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useOffices } from '../hooks/useAdmin';
import { AdminReports } from '../components/AdminReports';
import { AdminLayout } from '@/shared/components/AdminLayout';
import { getSectionIcon } from '@/shared/icons';

export function AdminReportsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const reportOfficeId = searchParams.get('office') ?? '';

  const { data: offices } = useOffices();

  useEffect(() => {
    if (!reportOfficeId && offices && offices.length > 0) {
      const params = new URLSearchParams(searchParams);
      params.set('office', offices[0].id);
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    }
  }, [offices, reportOfficeId, searchParams, navigate, location.pathname]);

  const handleOfficeIdChange = (officeId: string) => {
    const params = new URLSearchParams(searchParams);
    if (officeId) params.set('office', officeId);
    else params.delete('office');
    const qs = params.toString();
    navigate(`${location.pathname}${qs ? `?${qs}` : ''}`, { replace: true });
  };

  return (
    <AdminLayout
      title="Data Entry & Reports"
      icon={getSectionIcon('reports')}
    >
      <AdminReports
        offices={offices ?? []}
        officesLoading={!offices}
        officeId={reportOfficeId}
        onOfficeIdChange={handleOfficeIdChange}
      />
    </AdminLayout>
  );
}
