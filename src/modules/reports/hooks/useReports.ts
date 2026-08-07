import { useQuery } from '@tanstack/react-query';
import { reportService } from '../services/report.service';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';

export function useFinancialYears() {
  const officeId = useActiveOfficeId();

  return useQuery({
    queryKey: ['reports-financial-years', officeId],
    queryFn: () => reportService.getFinancialYears(),
    enabled: !!officeId,
  });
}

export function useYearlyReport(fy: number | null) {
  const officeId = useActiveOfficeId();

  return useQuery({
    queryKey: ['reports-yearly', fy, officeId],
    queryFn: () => reportService.getYearlyReport(fy!),
    enabled: !!fy && !!officeId,
  });
}
