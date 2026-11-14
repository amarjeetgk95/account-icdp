import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GRAuditService } from './grAudit.service';
import { useAuthStore } from '@/core/auth/store';
import { createFakeSupabaseClient, type FakeSupabaseClient } from '../test/fakeSupabase';

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: () => {
      throw new Error('Real Supabase client must not be used in tests');
    },
    rpc: () => {
      throw new Error('Real Supabase client must not be used in tests');
    },
    auth: {},
  },
}));

describe('GRAuditService', () => {
  let fake: FakeSupabaseClient;
  let service: GRAuditService;

  beforeEach(() => {
    fake = createFakeSupabaseClient();
    service = new GRAuditService(fake.asSupabaseClient());
    useAuthStore.setState({
      user: { id: 'officer-a', email: 'a@icdp.gov.in', role: 'office' },
      isInitialized: true,
      isLoading: false,
      isRoleLoaded: true,
    });
  });

  it('writes audit entries through the gr_log_action RPC', async () => {
    await service.logAction({ grId: 'gr-1', grNumber: 'GR/2026/1', action: 'CREATED' });

    expect(fake.rpcCalls).toHaveLength(1);
    expect(fake.rpcCalls[0].name).toBe('gr_log_action');
    expect(fake.rpcCalls[0].args.p_action).toBe('CREATED');
    expect(fake.getTable('gr_audit_logs')).toHaveLength(0);
  });

  it('does nothing when no user is signed in', async () => {
    useAuthStore.setState({ user: null });
    await service.logAction({ action: 'CREATED' });
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it('falls back to a direct insert when the RPC fails', async () => {
    fake.failNext('rpc', 'rpc', { message: 'function does not exist' });

    await service.logAction({ grId: 'gr-1', grNumber: 'GR/2026/1', action: 'UPDATED' });

    const rows = fake.getTable('gr_audit_logs');
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('UPDATED');
    expect(rows[0].user_id).toBe('officer-a');
    expect(rows[0].user_email).toBe('a@icdp.gov.in');
  });

  it('never throws when both audit paths fail', async () => {
    fake.failNext('rpc', 'rpc', { message: 'rpc down' });
    fake.failNext('gr_audit_logs', 'insert', { message: 'insert down' });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(service.logAction({ action: 'DELETED' })).resolves.not.toThrow();
    warnSpy.mockRestore();
  });

  it('maps audit rows when fetching logs', async () => {
    fake.seed('gr_audit_logs', [
      {
        id: 1,
        gr_id: 'gr-1',
        gr_number: 'GR/2026/1',
        user_id: 'officer-a',
        user_email: 'a@icdp.gov.in',
        user_role: 'office',
        action: 'CREATED',
        previous_visibility: null,
        new_visibility: 'public',
        details: { title: 'X' },
        created_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 2,
        gr_id: 'gr-1',
        gr_number: 'GR/2026/1',
        user_id: 'officer-a',
        user_email: 'a@icdp.gov.in',
        user_role: 'office',
        action: 'UPDATED',
        previous_visibility: null,
        new_visibility: null,
        details: null,
        created_at: '2026-01-02T00:00:00.000Z',
      },
    ]);

    const logs = await service.fetchAuditLogs('gr-1');
    expect(logs).toHaveLength(2);
    expect(logs[0].id).toBe(2);
    expect(logs[1].action).toBe('CREATED');
  });

  it('returns an empty list when fetching logs fails', async () => {
    fake.failNext('gr_audit_logs', 'select', { message: 'select down' });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const logs = await service.fetchAuditLogs('gr-1');
    expect(logs).toEqual([]);
    warnSpy.mockRestore();
  });
});
