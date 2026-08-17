import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GTR30SyncStatusBadge } from './GTR30SyncStatusBadge';
import { useGTR30EmployeeMasterSyncStatus } from '../hooks/useGTR30EmployeeMasterSync';
import type { Gtr30SyncStatus } from '../services/gtr30EmployeeMaster.service';

vi.mock('../hooks/useGTR30EmployeeMasterSync', () => ({
  useGTR30EmployeeMasterSyncStatus: vi.fn(),
}));

const mockedHook = vi.mocked(useGTR30EmployeeMasterSyncStatus);

function renderWith(status: Gtr30SyncStatus) {
  mockedHook.mockReturnValue(status);
  return render(<GTR30SyncStatusBadge />);
}

describe('GTR30SyncStatusBadge', () => {
  it('renders saved state when idle', () => {
    renderWith({ phase: 'idle', pendingCount: 0, errorCount: 0 });
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('All changes saved')).toBeTruthy();
  });

  it('renders pending state with the pending count in the title', () => {
    const { container } = renderWith({ phase: 'pending', pendingCount: 2, errorCount: 0 });
    expect(screen.getByText('Waiting to sync')).toBeTruthy();
    expect(container.querySelector('[title="2 group(s) waiting to sync to the server"]')).toBeTruthy();
  });

  it('renders syncing state', () => {
    renderWith({ phase: 'syncing', pendingCount: 1, errorCount: 0 });
    expect(screen.getByText('Syncing to server')).toBeTruthy();
  });

  it('renders saved state when synced', () => {
    renderWith({ phase: 'synced', pendingCount: 0, errorCount: 0 });
    expect(screen.getByText('All changes saved')).toBeTruthy();
  });

  it('renders the error state with the error count in the title', () => {
    const { container } = renderWith({ phase: 'error', pendingCount: 0, errorCount: 3 });
    expect(screen.getByText(/Sync failed/)).toBeTruthy();
    expect(container.querySelector('[title="3 group(s) failed to sync to the server"]')).toBeTruthy();
  });
});