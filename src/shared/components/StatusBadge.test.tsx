import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge Component', () => {
  it('renders draft status correctly', () => {
    render(<StatusBadge status="draft" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders submitted status correctly', () => {
    render(<StatusBadge status="submitted" />);
    expect(screen.getByText('Submitted')).toBeInTheDocument();
  });

  it('renders passed status correctly', () => {
    render(<StatusBadge status="passed" />);
    expect(screen.getByText('Passed')).toBeInTheDocument();
  });

  it('renders rejected status correctly', () => {
    render(<StatusBadge status="rejected" />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('handles case-insensitivity and fallbacks to draft', () => {
    render(<StatusBadge status="PASSED" />);
    expect(screen.getByText('Passed')).toBeInTheDocument();

    render(<StatusBadge status="unknown_status" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders without icon when showIcon is false', () => {
    const { container } = render(<StatusBadge status="passed" showIcon={false} />);
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.getByText('Passed')).toBeInTheDocument();
  });
});
