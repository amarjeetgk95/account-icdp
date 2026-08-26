import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsPage } from './SettingsPage';

// Mock child components to keep page test fast & focused
vi.mock('../components/OfficeForm', () => ({
  OfficeForm: () => <div data-testid="office-form">Office Form Component</div>,
}));

vi.mock('../components/Form16DefaultsForm', () => ({
  Form16DefaultsForm: () => <div data-testid="form16-defaults-form">Form 16 Defaults Component</div>,
}));

vi.mock('../components/Form16TaxRulesConfigForm', () => ({
  Form16TaxRulesConfigForm: () => <div data-testid="tax-rules-form">Tax Rules Component</div>,
}));

vi.mock('@/modules/gtr30/components/GTR30SettingsView', () => ({
  GTR30SettingsView: () => <div data-testid="gtr30-settings">GTR-30 Settings Component</div>,
}));

vi.mock('@/modules/gtr44/components/GTR44SettingsView', () => ({
  GTR44SettingsView: () => <div data-testid="gtr44-settings">GTR-44 Settings Component</div>,
}));

function renderWithRoute(initialEntry = '/settings/office') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/settings/:tab" element={<SettingsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('SettingsPage', () => {
  it('renders page header and all 5 tabs', () => {
    renderWithRoute('/settings/office');

    expect(screen.getByText(/Master Settings & Module Defaults/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Office & DDO Master/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /GTR-30 Pay Bills/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /GTR-44 DC Bills/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Establishment Posts/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Income Tax Slabs \(115BAC\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Form 16 Deductor/i })).toBeInTheDocument();
  });

  it('renders OfficeForm for office tab', () => {
    renderWithRoute('/settings/office');
    expect(screen.getByTestId('office-form')).toBeInTheDocument();
  });

  it('renders GTR30SettingsView for gtr30 tab', () => {
    renderWithRoute('/settings/gtr30');
    expect(screen.getByTestId('gtr30-settings')).toBeInTheDocument();
  });

  it('renders GTR44SettingsView for gtr44 tab', () => {
    renderWithRoute('/settings/gtr44');
    expect(screen.getByTestId('gtr44-settings')).toBeInTheDocument();
  });

  it('falls back to office tab when an unknown or removed tab like establishment is accessed', () => {
    renderWithRoute('/settings/establishment');
    expect(screen.getByTestId('office-form')).toBeInTheDocument();
  });

  it('renders Form16TaxRulesConfigForm for tax-rules tab', () => {
    renderWithRoute('/settings/tax-rules');
    expect(screen.getByTestId('tax-rules-form')).toBeInTheDocument();
  });

  it('renders Form16DefaultsForm for form16 tab', () => {
    renderWithRoute('/settings/form16');
    expect(screen.getByTestId('form16-defaults-form')).toBeInTheDocument();
  });
});
