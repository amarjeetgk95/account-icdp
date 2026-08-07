import { useQuery } from '@tanstack/react-query';
import { reportService } from '../services/report.service';

export function useFinancialYears() {
  return useQuery({
    queryKey: ['reports-financial-years'],
    queryFn: () => reportService.getFinancialYears(),
  });
}

export function useYearlyReport(fy: number | null) {
  return useQuery({
    queryKey: ['reports-yearly', fy],
    queryFn: () => reportService.getYearlyReport(fy!),
    enabled: !!fy,
  });
}
