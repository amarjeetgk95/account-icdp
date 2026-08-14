import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ForgotPasswordForm } from './ForgotPasswordForm';

const mockMutate = vi.fn();
let mockIsSuccess = false;
let mockError: Error | null = null;

vi.mock('../hooks/useAuth', () => ({
  useForgotPassword: () => ({
    mutate: mockMutate,
    isPending: false,
    isSuccess: mockIsSuccess,
    error: mockError,
  }),
}));

describe('ForgotPasswordForm Component', () => {
  beforeEach(() => {
    mockMutate.mockClear();
    mockIsSuccess = false;
    mockError = null;
  });

  it('renders email input and submit button', () => {
    render(<ForgotPasswordForm />);
    expect(screen.getByLabelText(/registered email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset instructions/i })).toBeInTheDocument();
  });

  it('submits valid email address for reset instructions', async () => {
    render(<ForgotPasswordForm />);
    const emailInput = screen.getByLabelText(/registered email address/i);
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

    const submitBtn = screen.getByRole('button', { name: /send reset instructions/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith('user@example.com');
    });
  });
});
