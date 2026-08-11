export interface AuditLogEntry {
  id: number;
  admin_email: string | null;
  action: string;
  target_email: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogFilterOptions {
  searchQuery?: string;
  userFilter?: string;
  actionFilter?: string;
}
