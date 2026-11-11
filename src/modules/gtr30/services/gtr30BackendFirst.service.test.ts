import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../repositories/gtr30EmployeeMasterBackend.repository', () => ({
  gtr30EmployeeMasterBackendRepository: {
    listGroups: vi.fn(),
    getGroup: vi.fn(),
    replaceGroup: vi.fn(),
  },
}));

vi.mock('../repositories/gtr30SettingsBackend.repository', () => ({
  gtr30SettingsBackendRepository: {
    load: vi.fn(),
    save: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock('../repositories/gtr30BillCodeMappingsBackend.repository', () => ({
  gtr30BillCodeMappingsBackendRepository: {
    list: vi.fn(),
    replaceAll: vi.fn(),
  },
}));

vi.mock('../repositories/gtr30BudgetHeadsBackend.repository', () => ({
  gtr30BudgetHeadsBackendRepository: {
    list: vi.fn(),
    replaceAll: vi.fn(),
  },
}));

import {
  gtr30EmployeeMasterService,
  getGtr30SyncStatus,
  getGtr30SyncErrors,
  retryGtr30Sync,
} from './gtr30EmployeeMaster.service';
import type { GTR30EmployeeMasterInput } from '../validation/gtr30EmployeeMaster.schema';
import type { GTR30EmployeeMaster, GTR30MasterGroup } from '../types';
import { gtr30EmployeeMasterBackendRepository } from '../repositories/gtr30EmployeeMasterBackend.repository';
import {
  gtr30SettingsService,
  getGtr30SettingsSyncStatus,
} from './gtr30Settings.service';
import { gtr30SettingsBackendRepository } from '../repositories/gtr30SettingsBackend.repository';
import {
  DEFAULT_GTR30_SETTINGS,
  DEFAULT_GTR30_EMPLOYEE_TEMPLATE,
} from '../constants/settings';
import {
  gtr30BillCodeMappingsService,
  getGTR30BillCodeMappingsSyncStatus,
} from './gtr30BillCodeMappings.service';
import { gtr30BillCodeMappingsBackendRepository } from '../repositories/gtr30BillCodeMappingsBackend.repository';
import {
  gtr30BudgetHeadsService,
  getGTR30BudgetHeadsSyncStatus,
} from './gtr30BudgetHeads.service';
import { gtr30BudgetHeadsBackendRepository } from '../repositories/gtr30BudgetHeadsBackend.repository';

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

function serverRow(id: string, name: string): GTR30EmployeeMaster {
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

describe('gtr30 backend-first write paths', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    gtr30EmployeeMasterService.reset();
    gtr30BillCodeMappingsService.reset();
    gtr30BudgetHeadsService.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    gtr30EmployeeMasterService.reset();
    gtr30BillCodeMappingsService.reset();
    gtr30BudgetHeadsService.reset();
    gtr30SettingsService.resetSettings();
    vi.useRealTimers();
  });

  it('employee master: a failed flush keeps the provisional local input, reports error, and never retries in the background', async () => {
    vi.mocked(gtr30EmployeeMasterBackendRepository.replaceGroup).mockRejectedValue(
      new Error('network down')
    );

    gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e1', 1, 'Shri A'));
    expect(getGtr30SyncStatus().phase).toBe('pending');

    await vi.advanceTimersByTimeAsync(600);
    expect(getGtr30SyncStatus().phase).toBe('error');
    expect(getGtr30SyncErrors()['july-2026|gtr30-sal']).toMatch(/network down/);
    // Provisional local input is kept as the fallback cache.
    expect(gtr30EmployeeMasterService.getGroup('July-2026', 'GTR30-SAL')).toHaveLength(1);

    // No silent background retry timers: far-future time causes no new write.
    await vi.advanceTimersByTimeAsync(60_000);
    expect(vi.mocked(gtr30EmployeeMasterBackendRepository.replaceGroup)).toHaveBeenCalledTimes(1);
    expect(getGtr30SyncStatus().phase).toBe('error');
  });

  it('employee master: retryGtr30Sync flushes errored groups immediately without waiting out the debounce', async () => {
    vi.mocked(gtr30EmployeeMasterBackendRepository.replaceGroup).mockRejectedValueOnce(
      new Error('down')
    );
    gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e1', 1, 'Shri A'));
    await vi.advanceTimersByTimeAsync(600);
    expect(getGtr30SyncStatus().phase).toBe('error');

    vi.mocked(gtr30EmployeeMasterBackendRepository.replaceGroup).mockResolvedValue([
      serverRow('e1', 'Shri A'),
    ]);
    retryGtr30Sync();
    // No timer advance: the manual flush writes straight through.
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.mocked(gtr30EmployeeMasterBackendRepository.replaceGroup)).toHaveBeenCalledTimes(2);
    expect(getGtr30SyncStatus().phase).toBe('synced');
  });

  it('employee master: a successful flush persists the backend echo to the local cache', async () => {
    vi.mocked(gtr30EmployeeMasterBackendRepository.replaceGroup).mockResolvedValue([
      serverRow('e1', 'Server Name'),
    ]);

    gtr30EmployeeMasterService.saveEmployee('July-2026', 'GTR30-SAL', employee('e1', 1, 'Local Name'));
    await vi.advanceTimersByTimeAsync(600);

    expect(getGtr30SyncStatus().phase).toBe('synced');
    expect(gtr30EmployeeMasterService.getGroup('July-2026', 'GTR30-SAL')[0].name).toBe(
      'Server Name'
    );
  });

  it('employee master: hydrate keeps a pending local group (content and phase) instead of claiming synced', async () => {
    vi.mocked(gtr30EmployeeMasterBackendRepository.replaceGroup).mockResolvedValue([]);
    vi.mocked(gtr30EmployeeMasterBackendRepository.listGroups).mockResolvedValue([
      { monthKey: 'July-2026', billCode: 'GTR30-SAL', employees: [serverRow('remote-1', 'Remote One')] } as GTR30MasterGroup,
    ]);

    gtr30EmployeeMasterService.saveEmployee(
      'July-2026',
      'GTR30-SAL',
      employee('local-edit', 1, 'Shri Local')
    );
    expect(getGtr30SyncStatus().phase).toBe('pending');

    await gtr30EmployeeMasterService.hydrateFromBackend();

    expect(gtr30EmployeeMasterService.getGroup('July-2026', 'GTR30-SAL').map((e) => e.id)).toEqual([
      'local-edit',
    ]);
    expect(getGtr30SyncStatus().phase).toBe('pending');
  });

  it('settings: a failed flush keeps the provisional payload cached locally and reports error', async () => {
    vi.mocked(gtr30SettingsBackendRepository.save).mockResolvedValue(null);
    const payload = {
      settings: { ...DEFAULT_GTR30_SETTINGS, officeName: 'Provisional Office' },
      employeeTemplate: { ...DEFAULT_GTR30_EMPLOYEE_TEMPLATE },
      defaultPosts: [],
      daRates: [{ id: 'da1', effectiveFrom: '2024-12-04', rate: 53 }],
    };

    gtr30SettingsService.saveSettings(payload);
    await vi.advanceTimersByTimeAsync(700);

    expect(getGtr30SettingsSyncStatus()).toBe('error');
    expect(gtr30SettingsService.loadSettings().settings.officeName).toBe('Provisional Office');
  });

  it('bill code mappings: a successful flush persists the backend echo; a failure keeps local input and reports error', async () => {
    const echo = [{ id: 'm1', billCode: 'X-1', description: 'Server Desc' }];
    vi.mocked(gtr30BillCodeMappingsBackendRepository.replaceAll).mockResolvedValue(echo);

    gtr30BillCodeMappingsService.saveMapping({ id: 'm1', billCode: 'X-1', description: 'Local Desc' });
    await vi.advanceTimersByTimeAsync(700);

    expect(getGTR30BillCodeMappingsSyncStatus()).toBe('synced');
    expect(gtr30BillCodeMappingsService.list()).toEqual(echo);

    vi.mocked(gtr30BillCodeMappingsBackendRepository.replaceAll).mockRejectedValue(
      new Error('down')
    );
    gtr30BillCodeMappingsService.saveMapping({ id: 'm2', billCode: 'X-2', description: 'Local Two' });
    await vi.advanceTimersByTimeAsync(700);

    expect(getGTR30BillCodeMappingsSyncStatus()).toBe('error');
    const codes = gtr30BillCodeMappingsService.list().map((m) => m.billCode);
    expect(codes).toContain('X-1');
    expect(codes).toContain('X-2');
  });

  it('budget heads: a failed flush keeps local input and reports error; success confirms synced', async () => {
    vi.mocked(gtr30BudgetHeadsBackendRepository.replaceAll).mockRejectedValue(new Error('down'));

    gtr30BudgetHeadsService.saveHead({ id: 'h1', name: 'Head One' });
    await vi.advanceTimersByTimeAsync(700);

    expect(getGTR30BudgetHeadsSyncStatus()).toBe('error');
    expect(gtr30BudgetHeadsService.list().map((h) => h.name)).toContain('Head One');

    const echo = [{ id: 'h1', name: 'Head One (server)' }];
    vi.mocked(gtr30BudgetHeadsBackendRepository.replaceAll).mockResolvedValue(echo);
    gtr30BudgetHeadsService.saveHead({ id: 'h1', name: 'Head One (server)' });
    await vi.advanceTimersByTimeAsync(700);

    expect(getGTR30BudgetHeadsSyncStatus()).toBe('synced');
    expect(gtr30BudgetHeadsService.list()).toEqual(echo);
  });
});
