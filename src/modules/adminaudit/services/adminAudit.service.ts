import { adminAuditRepository } from '../repositories/adminAudit.repository';
import type { AuditLogEntry } from '../types';

export const adminAuditService = {
  async listAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
    return adminAuditRepository.listAuditLogs(limit);
  },
};
