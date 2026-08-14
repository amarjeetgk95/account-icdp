import { useQuery } from '@tanstack/react-query';
import { adminAuditService } from '../services/adminAudit.service';

export function useAdminAudit(limit = 100, offset = 0) {
  return useQuery({
    queryKey: ['admin-audit', limit, offset],
    queryFn: () => adminAuditService.listAuditLogs(limit, offset),
  });
}
