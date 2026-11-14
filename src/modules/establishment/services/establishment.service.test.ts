import { describe, expect, it, vi, beforeEach } from 'vitest';
import { establishmentService } from './establishment.service';
import { establishmentBackendRepository } from '../repositories/establishmentBackend.repository';
import { establishmentLocalRepository } from '../repositories/establishmentLocal.repository';
import type { EstablishmentEmployee } from '../types';

describe('EstablishmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const emp: EstablishmentEmployee = {
    id: 'emp-1',
    hrpnNo: '100123',
    name: 'Suresh Kumar',
    pan: 'ABCDE1234F',
    active: true,
    allowances: {},
    deductions: {},
    payEntries: [],
  };

  it('saveEmployee delegates to backend and updates local repo', async () => {
    const saveBackendSpy = vi
      .spyOn(establishmentBackendRepository, 'saveEmployee')
      .mockResolvedValueOnce(emp);
    const saveLocalSpy = vi.spyOn(establishmentLocalRepository, 'saveEmployee');

    const result = await establishmentService.saveEmployee(emp);

    expect(saveBackendSpy).toHaveBeenCalledWith(emp, { syncPayEntries: true });
    expect(saveLocalSpy).toHaveBeenCalledWith(emp);
    expect(result.id).toBe('emp-1');
  });

  it('skips pay-entry sync when the cached pay history is unchanged', async () => {
    establishmentLocalRepository.saveEmployee(emp);
    const saveBackendSpy = vi
      .spyOn(establishmentBackendRepository, 'saveEmployee')
      .mockResolvedValueOnce({ ...emp, name: 'Suresh Kumar Patel' });

    await establishmentService.saveEmployee({ ...emp, name: 'Suresh Kumar Patel' });

    expect(saveBackendSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'emp-1', name: 'Suresh Kumar Patel' }),
      { syncPayEntries: false }
    );
  });

  it('deleteEmployee delegates to backend and deletes from local repo', async () => {
    const deleteBackendSpy = vi
      .spyOn(establishmentBackendRepository, 'deleteEmployee')
      .mockResolvedValueOnce();
    const deleteLocalSpy = vi.spyOn(establishmentLocalRepository, 'deleteEmployee');

    await establishmentService.deleteEmployee('emp-1');

    expect(deleteBackendSpy).toHaveBeenCalledWith('emp-1');
    expect(deleteLocalSpy).toHaveBeenCalledWith('emp-1');
  });
});
