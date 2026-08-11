import { useQuery } from '@tanstack/react-query';
import { adminAuditService } from '../services/adminAudit.service';

export function useAdminAudit(limit = 100) {
  return useQuery({
    queryKey: ['admin-audit', limit],
    queryFn: () => adminAuditService.listAuditLogs(limit),
  });
}
