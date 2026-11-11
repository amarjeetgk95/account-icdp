import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GRRepositoryService, escapePostgrestTerm } from './grRepository.service';
import { grDocumentStorage } from './grDocumentStorage.service';
import { useAuthStore } from '@/core/auth/store';
import { createFakeSupabaseClient, type FakeSupabaseClient } from '../test/fakeSupabase';
import { DEFAULT_DEPARTMENTS } from '../constants';
import type { GRFormData, GRCurrentUser } from '../types';

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

const officerA: GRCurrentUser = { id: 'officer-a', email: 'a@icdp.gov.in', role: 'office' };
const officerB: GRCurrentUser = { id: 'officer-b', email: 'b@icdp.gov.in', role: 'office' };
const officerC: GRCurrentUser = { id: 'officer-c', email: 'c@icdp.gov.in', role: 'office' };

function createMockPdf(name = 'sample.pdf'): File {
  const blob = new Blob(['%PDF-1.4 mock content for testing resolutions'], {
    type: 'application/pdf',
  });
  return new File([blob], name, { type: 'application/pdf' });
}

function makeRow(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    document_type_id: 'DOC-01',
    department_id: null,
    category_id: null,
    subcategory_id: null,
    department_name: null,
    category_name: null,
    subcategory_name: null,
    issue_date: null,
    issue_year: null,
    description: null,
    keywords: null,
    file_name: 'doc.pdf',
    storage_path: 'gr/seed/doc.pdf',
    file_size: 100,
    mime_type: 'application/pdf',
    visibility: 'public',
    owner_user_id: null,
    status: 'active',
    created_by: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('escapePostgrestTerm', () => {
  it('leaves plain terms untouched', () => {
    expect(escapePostgrestTerm('plain term')).toBe('plain term');
  });

  it('escapes LIKE wildcards and quotes for PostgREST or() filters', () => {
    expect(escapePostgrestTerm('50%')).toBe('50\\\\%');
    expect(escapePostgrestTerm('a_b')).toBe('a\\\\_b');
    expect(escapePostgrestTerm('c\\d')).toBe('c\\\\\\\\d');
    expect(escapePostgrestTerm('say "hi"')).toBe('say \\"hi\\"');
  });
});

describe('GRRepositoryService', () => {
  let fake: FakeSupabaseClient;
  let service: GRRepositoryService;

  beforeEach(() => {
    fake = createFakeSupabaseClient();
    service = new GRRepositoryService(fake.asSupabaseClient());
    vi.restoreAllMocks();
    vi.spyOn(grDocumentStorage, 'uploadPdf').mockImplementation(
      async (_file, fileName: string, grId: string) => ({
        storagePath: `gr/${grId}/${fileName}`,
        fileName,
        fileSize: 10,
        mimeType: 'application/pdf',
      })
    );
    vi.spyOn(grDocumentStorage, 'deletePdf').mockResolvedValue();
    useAuthStore.setState({
      user: { id: officerA.id, email: officerA.email, role: 'office' },
      isInitialized: true,
      isLoading: false,
      isRoleLoaded: true,
    });
  });

  describe('fetchGRs visibility rules', () => {
    beforeEach(() => {
      fake.seed('gr_repository', [
        makeRow({
          id: 'gr-pub',
          gr_number: 'GR/PUB/01',
          title: 'Public General Order',
          visibility: 'public',
          owner_user_id: officerA.id,
          created_by: officerA.id,
        }),
        makeRow({
          id: 'gr-priv-a',
          gr_number: 'GR/PRIV/A',
          title: 'Officer A Private Note',
          visibility: 'private',
          owner_user_id: officerA.id,
          created_by: officerA.id,
        }),
        makeRow({
          id: 'gr-priv-b',
          gr_number: 'GR/PRIV/B',
          title: 'Officer B Secret Resolution',
          visibility: 'private',
          owner_user_id: officerB.id,
          created_by: officerB.id,
        }),
      ]);
      fake.seed('gr_repository_access', [
        { id: 'access-1', gr_id: 'gr-priv-a', user_id: officerC.id },
      ]);
    });

    it('owner sees public plus own private GRs, not other users private GRs', async () => {
      const { data, pagination } = await service.fetchGRs({}, {}, officerA);
      const numbers = data.map((r) => r.gr_number).sort();

      expect(pagination.totalCount).toBe(2);
      expect(numbers).toEqual(['GR/PRIV/A', 'GR/PUB/01']);
    });

    it('grants access to explicitly assigned users', async () => {
      const { data } = await service.fetchGRs({}, {}, officerC);
      const numbers = data.map((r) => r.gr_number).sort();

      expect(numbers).toEqual(['GR/PRIV/A', 'GR/PUB/01']);
    });

    it('private visibility filter returns only permitted private GRs', async () => {
      const { data } = await service.fetchGRs({ visibility: 'private' }, {}, officerB);
      expect(data.map((r) => r.gr_number)).toEqual(['GR/PRIV/B']);
    });

    it('does not leak private GR metadata through search', async () => {
      const { data, pagination } = await service.fetchGRs(
        { searchQuery: 'Secret' },
        {},
        officerC
      );
      expect(pagination.totalCount).toBe(0);
      expect(data).toHaveLength(0);
    });

    it('applies status and pagination filters server-side', async () => {
      fake.setTable(
        'gr_repository',
        fake.getTable('gr_repository').map((row) =>
          row.id === 'gr-priv-b' ? { ...row, status: 'archived' } : row
        )
      );

      const archived = await service.fetchGRs({ status: 'archived' }, {}, officerB);
      expect(archived.data.map((r) => r.gr_number)).toEqual(['GR/PRIV/B']);

      const paged = await service.fetchGRs({}, { page: 2, pageSize: 1 }, officerA);
      expect(paged.pagination.totalCount).toBe(2);
      expect(paged.pagination.totalPages).toBe(2);
      expect(paged.data).toHaveLength(1);
    });

    it('filters by from/to issue_date range', async () => {
      fake.setTable(
        'gr_repository',
        fake.getTable('gr_repository').map((row) =>
          row.id === 'gr-pub'
            ? { ...row, issue_date: '2025-03-10' }
            : row.id === 'gr-priv-a'
            ? { ...row, issue_date: '2024-06-05' }
            : row
        )
      );

      const fromOnly = await service.fetchGRs({ dateFrom: '2025-01-01' }, {}, officerA);
      expect(fromOnly.data.map((r) => r.gr_number)).toEqual(['GR/PUB/01']);

      const toOnly = await service.fetchGRs({ dateTo: '2024-12-31' }, {}, officerA);
      expect(toOnly.data.map((r) => r.gr_number)).toEqual(['GR/PRIV/A']);

      const fullRange = await service.fetchGRs(
        { dateFrom: '2024-01-01', dateTo: '2024-12-31' },
        {},
        officerA
      );
      expect(fullRange.data.map((r) => r.gr_number)).toEqual(['GR/PRIV/A']);
    });

    it('returns an empty result without querying when unauthenticated', async () => {
      const { data, pagination } = await service.fetchGRs({}, {}, null);
      expect(data).toHaveLength(0);
      expect(pagination.totalCount).toBe(0);
      expect(fake.ops).toHaveLength(0);
    });

    it('escapes LIKE wildcards in search terms so they match literally', async () => {
      fake.seed('gr_repository', [
        makeRow({ id: 'gr-pct', gr_number: 'GR-100%', title: 'Percent GR' }),
        makeRow({ id: 'gr-plain', gr_number: 'GR-1005', title: 'Plain GR' }),
      ]);

      const { data } = await service.fetchGRs({ searchQuery: '100%' }, {}, officerA);
      expect(data.map((r) => r.gr_number)).toEqual(['GR-100%']);
    });

    it('throws a friendly error when the repository query fails', async () => {
      fake.failNext('gr_repository', 'select', { message: 'connection refused' });
      await expect(service.fetchGRs({}, {}, officerA)).rejects.toThrow(/connection refused/);
    });
  });

  describe('getGRById', () => {
    beforeEach(() => {
      fake.seed('gr_repository', [
        makeRow({
          id: 'gr-priv-a',
          gr_number: 'GR/PRIV/A',
          title: 'Officer A Private Note',
          visibility: 'private',
          owner_user_id: officerA.id,
          created_by: officerA.id,
        }),
      ]);
      fake.seed('gr_repository_access', []);
    });

    it('blocks users without permission', async () => {
      await expect(service.getGRById('gr-priv-a', officerB)).rejects.toThrow(
        /permission to view/i
      );
    });

    it('returns decorated record for the owner', async () => {
      const record = await service.getGRById('gr-priv-a', officerA);
      expect(record.is_owner).toBe(true);
      expect(record.can_manage).toBe(true);
      expect(record.can_delete).toBe(true);
      expect(record.assigned_users).toEqual([]);
    });

    it('throws when the record does not exist', async () => {
      await expect(service.getGRById('missing-id', officerA)).rejects.toThrow(/was not found/i);
    });
  });

  describe('createGR', () => {
    it('persists the record, decorates it, and writes an audit entry', async () => {
      const formData: GRFormData = {
        gr_number: 'GR/2026/001',
        title: 'Recruitment Rules Amendment',
        visibility: 'public',
        category_id: 'CAT-01',
        file: createMockPdf('Recruitment.pdf'),
      };

      const result = await service.createGR(formData, officerA);

      expect(result.gr_number).toBe('GR/2026/001');
      expect(result.visibility).toBe('public');
      expect(result.owner_user_id).toBe(officerA.id);
      expect(result.can_manage).toBe(true);
      expect(fake.getTable('gr_repository')).toHaveLength(1);
      expect(fake.getTable('gr_repository')[0].storage_path).toMatch(/^gr\//);
      expect(fake.rpcCalls[0]?.name).toBe('gr_log_action');
      expect(fake.rpcCalls[0]?.args.p_action).toBe('CREATED');
    });

    it('forces the creator to remain the owner of a private GR', async () => {
      const result = await service.createGR(
        {
          gr_number: 'GR/2026/002',
          title: 'Confidential Internal Assessment',
          visibility: 'private',
          file: createMockPdf('Confidential.pdf'),
        },
        officerB
      );

      expect(result.visibility).toBe('private');
      expect(result.owner_user_id).toBe(officerB.id);
    });

    it('rejects duplicate GR numbers and cleans up the uploaded file', async () => {
      fake.seed('gr_repository', [makeRow({ id: 'existing', gr_number: 'GR/DUP/01' })]);
      const deleteSpy = vi.spyOn(grDocumentStorage, 'deletePdf').mockResolvedValue();

      await expect(
        service.createGR(
          {
            gr_number: 'GR/DUP/01',
            title: 'Duplicate',
            visibility: 'public',
            file: createMockPdf('dup.pdf'),
          },
          officerA
        )
      ).rejects.toThrow(/already exists/i);

      expect(deleteSpy).toHaveBeenCalledTimes(1);
      expect(fake.getTable('gr_repository')).toHaveLength(1);
    });

    it('rolls back the uploaded file when the insert fails', async () => {
      const deleteSpy = vi.spyOn(grDocumentStorage, 'deletePdf').mockResolvedValue();
      fake.failNext('gr_repository', 'insert', { message: 'insert exploded' });

      await expect(
        service.createGR(
          {
            gr_number: 'GR/2026/003',
            title: 'Will fail',
            visibility: 'public',
            file: createMockPdf('fail.pdf'),
          },
          officerA
        )
      ).rejects.toThrow(/insert exploded/);

      expect(deleteSpy).toHaveBeenCalledTimes(1);
      expect(fake.getTable('gr_repository')).toHaveLength(0);
    });

    it('requires authentication and a PDF file', async () => {
      await expect(
        service.createGR(
          { gr_number: 'GR/2026/004', title: 'No auth', visibility: 'public', file: createMockPdf() },
          null
        )
      ).rejects.toThrow(/signed in/i);

      await expect(
        service.createGR(
          { gr_number: 'GR/2026/005', title: 'No file', visibility: 'public', file: null },
          officerA
        )
      ).rejects.toThrow(/PDF file/i);
    });
  });

  describe('updateGR', () => {
    beforeEach(() => {
      fake.seed('gr_repository', [
        makeRow({
          id: 'gr-1',
          gr_number: 'GR/2026/TEST',
          title: 'Initial Title',
          visibility: 'private',
          owner_user_id: officerA.id,
          created_by: officerA.id,
        }),
      ]);
      fake.seed('gr_repository_access', []);
    });

    it('updates metadata for the owner and logs the change', async () => {
      const updated = await service.updateGR(
        'gr-1',
        { title: 'Updated Resolution Title' },
        officerA
      );

      expect(updated.title).toBe('Updated Resolution Title');
      expect(fake.rpcCalls[0]?.args.p_action).toBe('UPDATED');
    });

    it('logs VISIBILITY_CHANGED when the scope changes', async () => {
      const updated = await service.updateGR('gr-1', { visibility: 'public' }, officerA);
      expect(updated.visibility).toBe('public');
      expect(fake.rpcCalls[0]?.args.p_action).toBe('VISIBILITY_CHANGED');
      expect(fake.rpcCalls[0]?.args.p_prev_visibility).toBe('private');
      expect(fake.rpcCalls[0]?.args.p_new_visibility).toBe('public');
    });

    it('blocks users without permission to edit the private GR', async () => {
      await expect(
        service.updateGR('gr-1', { title: 'Hacked' }, officerB)
      ).rejects.toThrow(/permission/i);
    });

    it('propagates database errors instead of reporting success', async () => {
      fake.failNext('gr_repository', 'update', { message: 'db write failed' });

      await expect(
        service.updateGR('gr-1', { title: 'Should not persist' }, officerA)
      ).rejects.toThrow(/db write failed/);

      expect(fake.getTable('gr_repository')[0].title).toBe('Initial Title');
    });
  });

  describe('replacePDF', () => {
    beforeEach(() => {
      fake.seed('gr_repository', [
        makeRow({
          id: 'gr-1',
          gr_number: 'GR/2026/TEST',
          title: 'Document',
          visibility: 'public',
          owner_user_id: officerA.id,
          created_by: officerA.id,
          storage_path: 'gr/gr-1/old.pdf',
          file_name: 'old.pdf',
        }),
      ]);
      fake.seed('gr_repository_access', []);
    });

    it('swaps the object only after the database update succeeds', async () => {
      const deleteSpy = vi.spyOn(grDocumentStorage, 'deletePdf').mockResolvedValue();

      const updated = await service.replacePDF('gr-1', createMockPdf('new.pdf'), officerA);

      expect(updated.file_name).toBe('new.pdf');
      expect(updated.storage_path).not.toBe('gr/gr-1/old.pdf');
      expect(deleteSpy).toHaveBeenCalledTimes(1);
      expect(deleteSpy).toHaveBeenCalledWith('gr/gr-1/old.pdf');
      expect(fake.rpcCalls[0]?.args.p_action).toBe('PDF_REPLACED');
    });

    it('rolls back the new upload and keeps the old file when the update fails', async () => {
      const deleteSpy = vi.spyOn(grDocumentStorage, 'deletePdf').mockResolvedValue();
      fake.failNext('gr_repository', 'update', { message: 'update failed' });

      await expect(
        service.replacePDF('gr-1', createMockPdf('new.pdf'), officerA)
      ).rejects.toThrow(/update failed/);

      const row = fake.getTable('gr_repository')[0];
      expect(row.storage_path).toBe('gr/gr-1/old.pdf');
      expect(deleteSpy).toHaveBeenCalledTimes(1);
      expect(deleteSpy.mock.calls[0][0]).not.toBe('gr/gr-1/old.pdf');
    });
  });

  describe('archive / restore', () => {
    beforeEach(() => {
      fake.seed('gr_repository', [
        makeRow({
          id: 'gr-1',
          gr_number: 'GR/2026/TEST',
          visibility: 'public',
          created_by: officerA.id,
          owner_user_id: officerA.id,
        }),
      ]);
      fake.seed('gr_repository_access', []);
    });

    it('archives and restores with audit entries', async () => {
      const archived = await service.archiveGR('gr-1', officerA);
      expect(archived.status).toBe('archived');
      expect(fake.rpcCalls[0]?.args.p_action).toBe('ARCHIVED');

      const restored = await service.restoreGR('gr-1', officerA);
      expect(restored.status).toBe('active');
      expect(fake.rpcCalls[1]?.args.p_action).toBe('RESTORED');
    });
  });

  describe('deleteGR', () => {
    beforeEach(() => {
      fake.seed('gr_repository', [
        makeRow({
          id: 'gr-public',
          gr_number: 'GR/PUB/01',
          visibility: 'public',
          created_by: officerA.id,
          owner_user_id: officerA.id,
          storage_path: 'gr/gr-public/file.pdf',
        }),
        makeRow({
          id: 'gr-private',
          gr_number: 'GR/PRIV/B',
          visibility: 'private',
          created_by: officerB.id,
          owner_user_id: officerB.id,
          storage_path: 'gr/gr-private/file.pdf',
        }),
      ]);
      fake.seed('gr_repository_access', []);
    });

    it('deletes the row first and only then removes the stored PDF', async () => {
      const deleteSpy = vi.spyOn(grDocumentStorage, 'deletePdf').mockResolvedValue();

      await service.deleteGR('gr-public', officerA);

      expect(fake.getTable('gr_repository').map((r) => r.id)).toEqual(['gr-private']);
      expect(deleteSpy).toHaveBeenCalledWith('gr/gr-public/file.pdf');
      expect(fake.rpcCalls[0]?.args.p_action).toBe('DELETED');
    });

    it('keeps the stored PDF when the database delete fails', async () => {
      const deleteSpy = vi.spyOn(grDocumentStorage, 'deletePdf').mockResolvedValue();
      fake.failNext('gr_repository', 'delete', { message: 'delete denied' });

      await expect(service.deleteGR('gr-public', officerA)).rejects.toThrow(/delete denied/);

      expect(deleteSpy).not.toHaveBeenCalled();
      expect(fake.getTable('gr_repository')).toHaveLength(2);
    });

    it('rejects unauthenticated and unauthorized deletions', async () => {
      await expect(service.deleteGR('gr-public', null)).rejects.toThrow(/must be signed in/i);
      await expect(service.deleteGR('gr-private', officerA)).rejects.toThrow(/permission/i);
    });
  });

  describe('metadata lookups', () => {
    it('falls back to default departments when the table is empty or errors', async () => {
      const defaults = await service.fetchDepartments();
      expect(defaults).toEqual(DEFAULT_DEPARTMENTS);

      fake.seed('gr_departments', [{ id: 'dept_x', name: 'Custom Dept', code: null, description: null }]);
      const custom = await service.fetchDepartments();
      expect(custom[0].id).toBe('dept_x');
    });
  });
});
