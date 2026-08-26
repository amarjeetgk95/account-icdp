import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserManagementModal, DEFAULT_PERMISSIONS } from './UserManagementModal';

describe('UserManagementModal', () => {
  const offices = [
    { id: 'off-1', name: 'ICDP Surat Office' },
    { id: 'off-2', name: 'ICDP Rajkot Office' },
  ];

  it('renders correctly in Add mode', () => {
    render(
      <UserManagementModal
        isOpen={true}
        onClose={vi.fn()}
        mode="add"
        offices={offices}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText('Add New User')).toBeInTheDocument();
    expect(screen.getByText('Create a new user account and assign access.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Employee ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create User/i })).toBeInTheDocument();
  });

  it('renders correctly in Edit mode and hides password fields', () => {
    const mockUser = {
      id: 'usr-123',
      fullName: 'Ramesh Patel',
      employeeId: 'EMP-1001',
      email: 'ramesh@gujarat.gov.in',
      mobile: '9876543210',
      role: 'office' as const,
      department: 'Accounts & Finance',
      officeId: 'off-1',
      officeName: 'ICDP Surat Office',
      designation: 'Senior Accountant',
      username: 'ramesh.patel',
      status: 'active' as const,
      permissions: DEFAULT_PERMISSIONS,
    };

    render(
      <UserManagementModal
        isOpen={true}
        onClose={vi.fn()}
        mode="edit"
        user={mockUser}
        offices={offices}
        onSave={vi.fn()}
        onResetPassword={vi.fn()}
      />
    );

    expect(screen.getByText('Edit User')).toBeInTheDocument();
    expect(screen.getByText('Update user information and access settings.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ramesh Patel')).toBeInTheDocument();
    expect(screen.getByDisplayValue('EMP-1001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ramesh@gujarat.gov.in')).toBeInTheDocument();
    expect(screen.getByDisplayValue('9876543210')).toBeInTheDocument();

    // Password inputs should NOT be rendered in edit mode
    expect(screen.queryByLabelText(/^Password \*/i)).not.toBeInTheDocument();
    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
  });

  it('validates required fields and email format before submission in Add mode', async () => {
    const saveMock = vi.fn();
    render(
      <UserManagementModal
        isOpen={true}
        onClose={vi.fn()}
        mode="add"
        offices={offices}
        onSave={saveMock}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Create User/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Full name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Employee ID is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Valid email address is required/i)).toBeInTheDocument();
    });

    expect(saveMock).not.toHaveBeenCalled();
  });

  it('toggles permissions matrix checkboxes and categories', () => {
    render(
      <UserManagementModal
        isOpen={true}
        onClose={vi.fn()}
        mode="add"
        offices={offices}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText(/Access Permissions Matrix/i)).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Data Entry')).toBeInTheDocument();
    expect(screen.getByText('MIS Reports')).toBeInTheDocument();

    // Click Grant All
    const grantAllBtn = screen.getByText('Grant All');
    fireEvent.click(grantAllBtn);

    // Click Clear All
    const clearAllBtn = screen.getByText('Clear All');
    fireEvent.click(clearAllBtn);
  });
});
