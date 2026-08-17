import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  gtr30EmployeeMasterService,
  getGtr30SyncStatus,
  subscribeGtr30Sync,
} from './gtr30EmployeeMaster.service';
import type { GTR30EmployeeMasterInput } from '../validation/gtr30EmployeeMaster.schema';
import { gtr30EmployeeMasterBackendRepository } from '../repositories/gtr30EmployeeMasterBackend.repository';

vi.mock('../repositories/gtr30EmployeeMasterBackend.repository', () => ({
  gtr30EmployeeMasterBackendRepository: {
    listGroups: vi.fn(),
    getGroup: vi.fn(),
    replaceGroup: vi.fn(),
  },
}));

const mockedReplaceGroup = vi.mocked(gtr30EmployeeMasterBackendRepository.replaceGroup);

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

describe('gtr30 employee master sync status', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    gtr30EmployeeMasterService.reset();
    mockedReplaceGroup.mockReset();
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