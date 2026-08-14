import { useQuery } from '@tanstack/react-query';
import { officeService } from '@/modules/settings/services/office.service';
import { payrollService } from '@/modules/payroll/services/payroll.service';
import { partyService } from '@/modules/parties/services/party.service';
import type { QuarterReport } from '@/modules/payroll/types';
import type { GSTReport, IncomeTaxReport } from '@/modules/parties/types';

/**
 * Report data hooks for the Admin module.
 *
 * These deliberately consume the payroll / parties / settings services
 * directly (instead of routing through AdminService) so that the admin
 * module aggregates and presents data without re-encapsulating other
 * modules' business logic.
 */

export function useReportOfficeDetails(officeId: string | null) {
  return useQuery({
    queryKey: ['admin-report-office-details', officeId],
    queryFn: () => officeService.getDetails(officeId!),
    enabled: !!officeId,
  });
}

export function useQuarterReport(officeId: string | null, quarter: string | null, fy: number | null) {
  return useQuery<QuarterReport>({
    queryKey: ['admin-report-24q', officeId, quarter, fy],
    queryFn: () => payrollService.getQuarterReport(quarter!, fy!, officeId!),
    enabled: !!officeId && !!quarter && !!fy,
  });
}

export function useGSTReport(officeId: string | null, quarter: string | null, fy: number | null) {
  return useQuery<GSTReport>({
    queryKey: ['admin-report-gst', officeId, quarter, fy],
    queryFn: () => partyService.getGSTReport(fy!, quarter!, officeId!),
    enabled: !!officeId && !!quarter && !!fy,
  });
}

export function useIncomeTaxReport(officeId: string | null, quarter: string | null, fy: number | null) {
  return useQuery<IncomeTaxReport>({
    queryKey: ['admin-report-it', officeId, quarter, fy],
    queryFn: () => partyService.getIncomeTaxReport(fy!, quarter!, officeId!),
    enabled: !!officeId && !!quarter && !!fy,
  });
}
