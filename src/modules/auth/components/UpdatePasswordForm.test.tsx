import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { UpdatePasswordForm } from './UpdatePasswordForm';

const mockMutate = vi.fn();
let mockIsPending = false;
let mockError: Error | null = null;

vi.mock('../hooks/useAuth', () => ({
  useUpdatePassword: () => ({
    mutate: mockMutate,
    isPending: mockIsPending,
    error: mockError,
  }),
}));

vi.mock('@/core/auth/store', () => ({
  useAuthStore: {
    getState: () => ({
      signOut: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock('@/shared/components/Toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('UpdatePasswordForm Component', () => {
  beforeEach(() => {
    mockMutate.mockClear();
    mockIsPending = false;
    mockError = null;
  });

  it('renders password and confirm password inputs', () => {
    renderWithRouter(<UpdatePasswordForm />);
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save & sign in/i })).toBeInTheDocument();
  });

  it('submits matching passwords', async () => {
    renderWithRouter(<UpdatePasswordForm />);
    const pwdInput = screen.getByLabelText(/^new password$/i);
    const confirmInput = screen.getByLabelText(/confirm new password/i);

    fireEvent.change(pwdInput, { target: { value: 'Secret123!' } });
    fireEvent.change(confirmInput, { target: { value: 'Secret123!' } });

    const submitBtn = screen.getByRole('button', { name: /save & sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith('Secret123!', expect.anything());
    });
  });
});
