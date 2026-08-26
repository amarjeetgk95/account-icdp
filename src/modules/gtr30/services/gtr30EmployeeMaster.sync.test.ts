import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  gtr30EmployeeMasterService,
  getGtr30SyncStatus,
  reconcileGroups,
  subscribeGtr30Sync,
} from './gtr30EmployeeMaster.service';
import type { GTR30EmployeeMasterInput } from '../validation/gtr30EmployeeMaster.schema';
import type { GTR30EmployeeMaster, GTR30MasterGroup } from '../types';
import { gtr30EmployeeMasterBackendRepository } from '../repositories/gtr30EmployeeMasterBackend.repository';

vi.mock('../repositories/gtr30EmployeeMasterBackend.repository', () => ({
  gtr30EmployeeMasterBackendRepository: {
    listGroups: vi.fn(),
    getGroup: vi.fn(),
    replaceGroup: vi.fn(),
  },
}));

const mockedReplaceGroup = vi.mocked(gtr30EmployeeMasterBackendRepository.replaceGroup);
const mockedListGroups = vi.mocked(gtr30EmployeeMasterBackendRepository.listGroups);

function employee(id: string, srNo: number, name: string): GTR30EmployeeMasterInput {
  return {
    id,
    srNo,
    name,
    designation: 'X',
    payScale: 'P',
    currentPay: 0,
    currentPayDate: '',
    hraPercent: 0,
    transportAllowance: 0,
    medicalAllowance: 0,
    claAllowance: 0,
  };
}

function row(id: string, name = id): GTR30EmployeeMaster {
  return {
    id,
    srNo: 1,
    name,
    designation: 'X',
    payScale: 'P',
    currentPay: 0,
    currentPayDate: '',
    hraPercent: 0,
    transportAllowance: 0,
    medicalAllowance: 0,
    claAllowance: 0,
  };
}

function group(monthKey: string, billCode: string, employees: GTR30EmployeeMaster[]): GTR30MasterGroup {
  return { monthKey, billCode, employees };
}

describe('gtr30 employee master sync status', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    gtr30EmployeeMasterService.reset();
    mockedReplaceGroup.mockReset();
    mockedListGroups.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    gtr30EmployeeMasterService.reset();
  });

  it('starts idle, becomes pending after a local save, then synced after the backend sync', async () => {
    mockedReplaceGroup.mockResolvedValue([]);
    expect(getGtr30SyncStatus().phase).toBe('idle');

    gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e1', 1, 'Shri A'));
    expect(getGtr30SyncStatus().phase).toBe('pending');

    await vi.advanceTimersByTimeAsync(600);
    expect(mockedReplaceGroup).toHaveBeenCalledTimes(1);
    expect(getGtr30SyncStatus().phase).toBe('synced');
  });

  it('marks the group as errored when the backend sync rejects', async () => {
    mockedReplaceGroup.mockRejectedValue(new Error('network down'));
    gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e1', 1, 'Shri A'));

    await vi.advanceTimersByTimeAsync(600);
    expect(getGtr30SyncStatus().phase).toBe('error');
    expect(getGtr30SyncStatus().errorCount).toBe(1);
  });

  it('stays pending while another group is still waiting for its sync', async () => {
    mockedReplaceGroup.mockResolvedValue([]);
    gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e1', 1, 'Shri A'));
    await vi.advanceTimersByTimeAsync(600);
    expect(getGtr30SyncStatus().phase).toBe('synced');

    gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-DA', employee('e2', 1, 'Shri B'));
    expect(getGtr30SyncStatus().phase).toBe('pending');
    expect(getGtr30SyncStatus().pendingCount).toBe(1);

    await vi.advanceTimersByTimeAsync(600);
    expect(getGtr30SyncStatus().phase).toBe('synced');
  });

  it('notifies subscribed listeners on status changes', async () => {
    mockedReplaceGroup.mockResolvedValue([]);
    const listener = vi.fn();
    const unsubscribe = subscribeGtr30Sync(listener);

    gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e1', 1, 'Shri A'));
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    listener.mockClear();
    await vi.advanceTimersByTimeAsync(600);
    expect(listener).not.toHaveBeenCalled();
    expect(getGtr30SyncStatus().phase).toBe('synced');
  });

  it('clears sync status on reset', async () => {
    gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e1', 1, 'Shri A'));
    expect(getGtr30SyncStatus().phase).toBe('pending');
    gtr30EmployeeMasterService.reset();
    expect(getGtr30SyncStatus().phase).toBe('idle');
  });
});

describe('reconcileGroups', () => {
  const neverDirty = () => false;

  it('inserts remote groups that are missing locally and reports them as added', () => {
    const local = {};
    const result = reconcileGroups(local, [group('July-2026', 'GTR30-SAL', [row('e1')])], neverDirty);

    expect(result.addedKeys).toEqual(['july-2026|gtr30-sal']);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].employees.map((e) => e.id)).toEqual(['e1']);
  });

  it('normalizes month/bill code casing when matching keys', () => {
    const local = {
      'july-2026|gtr30-sal': group('july-2026', 'gtr30-sal', [row('local-1')]),
    };
    const result = reconcileGroups(local, [group('July-2026', ' GTR30-SAL ', [row('remote-1')])], neverDirty);

    expect(result.addedKeys).toEqual([]);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].employees[0].id).toBe('remote-1');
  });

  it('keeps the dirty local version even when the backend differs', () => {
    const localGroup = group('July-2026', 'GTR30-SAL', [row('local-edit')]);
    const result = reconcileGroups(
      { 'july-2026|gtr30-sal': localGroup },
      [group('July-2026', 'GTR30-SAL', [row('remote-1')])],
      (key) => key === 'july-2026|gtr30-sal'
    );

    expect(result.groups[0]).toBe(localGroup);
    expect(result.groups[0].employees[0].id).toBe('local-edit');
  });

  it('replaces a clean local group with the backend version when content differs', () => {
    const result = reconcileGroups(
      { 'july-2026|gtr30-sal': group('July-2026', 'GTR30-SAL', [row('stale')]) },
      [group('July-2026', 'GTR30-SAL', [row('fresh'), row('fresh-2')])],
      neverDirty
    );

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].employees.map((e) => e.id)).toEqual(['fresh', 'fresh-2']);
  });

  it('keeps the local group untouched when clean content is identical regardless of key order', () => {
    const localRow: GTR30EmployeeMaster = {
      ...row('e1'),
      payEntries: [{ id: 'p1', startDate: '2026-07-01', basicPay: 100 }],
      remarks: 'same',
    };
    const reordered: GTR30EmployeeMaster = {
      remarks: 'same',
      payEntries: [{ basicPay: 100, startDate: '2026-07-01', id: 'p1' }],
      ...row('e1'),
    };
    const result = reconcileGroups(
      { 'july-2026|gtr30-sal': group('July-2026', 'GTR30-SAL', [localRow]) },
      [group('July-2026', 'GTR30-SAL', [reordered])],
      neverDirty
    );

    expect(result.groups[0].employees[0]).toBe(localRow);
  });

  it('preserves local groups that are absent from the backend (offline-created data)', () => {
    const offline = group('August-2026', 'GTR30-DA', [row('offline-1')]);
    const result = reconcileGroups(
      { 'july-2026|gtr30-sal': group('July-2026', 'GTR30-SAL', [row('e1')]), 'august-2026|gtr30-da': offline },
      [group('July-2026', 'GTR30-SAL', [row('e1')])],
      neverDirty
    );

    expect(result.groups).toHaveLength(2);
    expect(result.groups.find((g) => g.billCode === 'GTR30-DA')).toBe(offline);
  });
});

describe('gtr30 employee master hydration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    gtr30EmployeeMasterService.reset();
    mockedReplaceGroup.mockReset();
    mockedListGroups.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    gtr30EmployeeMasterService.reset();
  });

  it('inserts backend groups into empty local storage and marks them synced', async () => {
    mockedListGroups.mockResolvedValue([group('July-2026', 'GTR30-SAL', [row('remote-1')])]);

    await gtr30EmployeeMasterService.hydrateFromBackend();

    const employees = gtr30EmployeeMasterService.getGroup('July-2026', 'GTR30-SAL');
    expect(employees).toHaveLength(1);
    expect(employees[0].id).toBe('remote-1');
    expect(getGtr30SyncStatus().phase).toBe('synced');
  });

  it('does not clobber a pending local group with backend edits', async () => {
    mockedReplaceGroup.mockResolvedValue([]);
    mockedListGroups.mockResolvedValue([group('July-2026', 'GTR30-SAL', [row('backend-1')])]);

    gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('local-edit', 1, 'Shri Local'));
    expect(getGtr30SyncStatus().phase).toBe('pending');

    await gtr30EmployeeMasterService.hydrateFromBackend();

    const employees = gtr30EmployeeMasterService.getGroup('July-2026', 'GTR30-SAL');
    expect(employees.map((e) => e.id)).toEqual(['local-edit']);
  });

  it('refreshes a synced local group when the backend version differs', async () => {
    mockedReplaceGroup.mockResolvedValue([]);
    gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e1', 1, 'Shri A'));
    await vi.advanceTimersByTimeAsync(600);
    expect(getGtr30SyncStatus().phase).toBe('synced');

    mockedListGroups.mockResolvedValue([group('July-2026', 'GTR30-SAL', [row('e1', 'Edited elsewhere'), row('e2', 'New hire')])]);

    await gtr30EmployeeMasterService.hydrateFromBackend();

    const employees = gtr30EmployeeMasterService.getGroup('July-2026', 'GTR30-SAL');
    expect(employees.map((e) => e.name)).toEqual(['Edited elsewhere', 'New hire']);
  });

  it('leaves offline-created local groups that the backend does not know about', async () => {
    mockedReplaceGroup.mockResolvedValue([]);
    gtr30EmployeeMasterService.saveEmployee('August-2026', 'GTR30-DA', employee('offline-1', 1, 'Offline Person'));
    await vi.advanceTimersByTimeAsync(600);

    mockedListGroups.mockResolvedValue([]);

    await gtr30EmployeeMasterService.hydrateFromBackend();

    expect(gtr30EmployeeMasterService.getGroup('August-2026', 'GTR30-DA')).toHaveLength(1);
  });

  it('surfaces an error phase when the backend list fails while local data exists', async () => {
    mockedReplaceGroup.mockResolvedValue([]);
    gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e1', 1, 'Shri A'));
    await vi.advanceTimersByTimeAsync(600);
    expect(getGtr30SyncStatus().phase).toBe('synced');

    mockedListGroups.mockResolvedValue(null);

    await gtr30EmployeeMasterService.hydrateFromBackend();

    expect(getGtr30SyncStatus().phase).toBe('error');
    expect(getGtr30SyncStatus().errorCount).toBe(1);
    expect(gtr30EmployeeMasterService.getGroup('July-2026', 'GTR30-SAL')).toHaveLength(1);
  });

  it('stays idle on backend failure when there is no local data', async () => {
    mockedListGroups.mockResolvedValue(null);

    await gtr30EmployeeMasterService.hydrateFromBackend();

    expect(getGtr30SyncStatus().phase).toBe('idle');
  });
});