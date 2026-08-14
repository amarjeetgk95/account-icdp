import { describe, it, expect } from 'vitest';
import { filterAuditLogs, uniqueAuditUsers, uniqueAuditActions } from './filters';
import type { AuditLogEntry } from '../types';

const SAMPLE: AuditLogEntry[] = [
  { id: 1, admin_email: 'admin@icdp.in', target_email: 'user@icdp.in', action: 'ROLE_UPDATE', details: { role: 'super_admin' }, created_at: '2024-01-01T00:00:00Z' },
  { id: 2, admin_email: 'admin@icdp.in', target_email: 'clerk@icdp.in', action: 'USER_CREATE', details: null, created_at: '2024-01-02T00:00:00Z' },
  { id: 3, admin_email: 'ops@icdp.in', target_email: null, action: 'USER_DELETE', details: { office_code: 'SURAT' }, created_at: '2024-01-03T00:00:00Z' },
];

describe('uniqueAuditUsers', () => {
  it('returns all distinct emails sorted', () => {
    expect(uniqueAuditUsers(SAMPLE)).toEqual(['admin@icdp.in', 'clerk@icdp.in', 'ops@icdp.in', 'user@icdp.in']);
  });
  it('returns [] for null', () => {
    expect(uniqueAuditUsers(null)).toEqual([]);
  });
  it('ignores rows with no email', () => {
    expect(uniqueAuditUsers([{ id: 9, admin_email: null, target_email: null, action: 'X', details: null, created_at: '' }])).toEqual([]);
  });
});

describe('uniqueAuditActions', () => {
  it('returns distinct actions sorted', () => {
    expect(uniqueAuditActions(SAMPLE)).toEqual(['ROLE_UPDATE', 'USER_CREATE', 'USER_DELETE']);
  });
});

describe('filterAuditLogs', () => {
  it('returns the full set with no filters', () => {
    expect(filterAuditLogs(SAMPLE, {})).toHaveLength(3);
  });
  it('filters by user (admin role)', () => {
    expect(filterAuditLogs(SAMPLE, { userFilter: 'ops@icdp.in' })).toHaveLength(1);
    expect(filterAuditLogs(SAMPLE, { userFilter: 'ops@icdp.in' })[0].id).toBe(3);
  });
  it('filters by action', () => {
    expect(filterAuditLogs(SAMPLE, { actionFilter: 'USER_CREATE' })).toHaveLength(1);
  });
  it('is case-insensitive substring search', () => {
    const r = filterAuditLogs(SAMPLE, { searchQuery: 'super' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe(1);
  });
  it('matches target_email search', () => {
    expect(filterAuditLogs(SAMPLE, { searchQuery: 'clerk' })).toHaveLength(1);
  });
  it('matches action search', () => {
    expect(filterAuditLogs(SAMPLE, { searchQuery: 'delete' })).toHaveLength(1);
  });
  it('combines user + action filters', () => {
    expect(filterAuditLogs(SAMPLE, { userFilter: 'admin@icdp.in', actionFilter: 'USER_CREATE' })).toHaveLength(1);
    expect(filterAuditLogs(SAMPLE, { userFilter: 'admin@icdp.in', actionFilter: 'USER_DELETE' })).toHaveLength(0);
  });
  it('returns [] for null logs', () => {
    expect(filterAuditLogs(null, { searchQuery: 'anything' })).toEqual([]);
  });
  it('treats ALL as no-op for user/action filters', () => {
    expect(filterAuditLogs(SAMPLE, { userFilter: 'ALL', actionFilter: 'ALL' })).toHaveLength(3);
  });
});