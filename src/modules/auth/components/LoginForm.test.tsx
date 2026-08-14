import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginForm } from './LoginForm';

const mockMutate = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useLogin: () => ({
    mutate: mockMutate,
    isPending: false,
    error: null,
  }),
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('LoginForm Component', () => {
  beforeEach(() => {
    mockMutate.mockClear();
    localStorage.clear();
  });

  it('renders email and password inputs with sign in button', () => {
    renderWithRouter(<LoginForm />);

    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/remember my email/i)).toBeInTheDocument();
  });

  it('toggles password visibility when eye icon button is clicked', () => {
    renderWithRouter(<LoginForm />);

    const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    const toggleBtn = screen.getByLabelText(/show password/i);
    fireEvent.click(toggleBtn);

    expect(passwordInput.type).toBe('text');

    const hideBtn = screen.getByLabelText(/hide password/i);
    fireEvent.click(hideBtn);

    expect(passwordInput.type).toBe('password');
  });

  it('submits credentials on valid form submission', async () => {
    renderWithRouter(<LoginForm />);

    const emailInput = screen.getByLabelText(/^email$/i);
    const passwordInput = screen.getByLabelText(/^password$/i);

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        password: 'password123',
      })
    );
  });

  it('stores email in localStorage when Remember my email is checked', async () => {
    renderWithRouter(<LoginForm />);

    const emailInput = screen.getByLabelText(/^email$/i);
    const passwordInput = screen.getByLabelText(/^password$/i);

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const rememberCheckbox = screen.getByRole('checkbox');
    fireEvent.click(rememberCheckbox);

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });

    expect(localStorage.getItem('icdp_remembered_email')).toBe('user@example.com');
  });
});
