import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OcrDataEditorModal } from './OcrDataEditorModal';
import {
  SAMPLE_ENGLISH_PAYBILL_DOC,
  SAMPLE_GUJARATI_ORDER_DOC,
} from '../utils/sampleDocuments';

// Mock clipboard and URL createObjectURL
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe('OcrDataEditorModal Component', () => {
  it('renders modal with document title, confidence and page counter', () => {
    const handleClose = vi.fn();
    const handleSave = vi.fn();

    render(
      <OcrDataEditorModal
        isOpen={true}
        onClose={handleClose}
        document={SAMPLE_ENGLISH_PAYBILL_DOC}
        onSave={handleSave}
      />
    );

    expect(screen.getByText('PayBill_Inner_Sheet_July_2026.pdf')).toBeInTheDocument();
    expect(screen.getByText(/99% Confidence/i)).toBeInTheDocument();
    expect(screen.getAllByText(/PDF.js Native Text Engine/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/1 Page Document/i)).toBeInTheDocument();
  });

  it('switches between all 5 view tabs seamlessly', () => {
    render(
      <OcrDataEditorModal
        isOpen={true}
        onClose={vi.fn()}
        document={SAMPLE_ENGLISH_PAYBILL_DOC}
      />
    );

    // Default tab is Visual & OCR Split
    expect(screen.getByText(/1\. Visual & OCR Split/i)).toBeInTheDocument();

    // Switch to Word tab
    fireEvent.click(screen.getByText(/2\. Word Document/i));
    expect(screen.getByText(/Word Mode:/i)).toBeInTheDocument();
    expect(screen.getByText(/Paragraph Blocks/i)).toBeInTheDocument();

    // Switch to Excel tab
    fireEvent.click(screen.getByText(/3\. Excel Table Grid/i));
    expect(screen.getByText(/Employee Name/i)).toBeInTheDocument();

    // Switch to Low Confidence Review tab
    fireEvent.click(screen.getByText(/4\. Low-Conf Review/i));
    expect(screen.getByText(/Low Confidence OCR Flagged Items/i)).toBeInTheDocument();

    // Switch to Raw Text & JSON tab
    fireEvent.click(screen.getByText(/5\. Raw Text & JSON/i));
    expect(screen.getByText(/Plain OCR Text Stream/i)).toBeInTheDocument();
    expect(screen.getByText(/Spatial Layout JSON/i)).toBeInTheDocument();
  });

  it('allows editing Word paragraphs and saves document', () => {
    const handleSave = vi.fn();

    render(
      <OcrDataEditorModal
        isOpen={true}
        onClose={vi.fn()}
        document={SAMPLE_GUJARATI_ORDER_DOC}
        onSave={handleSave}
        initialTab="word"
      />
    );

    // Find heading or paragraph textarea/input
    const textareas = screen.getAllByRole('textbox');
    expect(textareas.length).toBeGreaterThan(0);

    // Edit paragraph text
    fireEvent.change(textareas[0], {
      target: { value: 'સંશોધિત સરકારી ઠરાવ ક્રમાંક: આઈસીડીપી/૨૦૨૬/ટેસ્ટ' },
    });

    // Click Apply & Save
    fireEvent.click(screen.getByText(/Apply & Save Edits/i));
    expect(handleSave).toHaveBeenCalledTimes(1);
    const savedDoc = handleSave.mock.calls[0][0];
    expect(savedDoc.pages[0].paragraphs[0].text).toContain('સંશોધિત સરકારી ઠરાવ');
  });

  it('allows copying text, TSV, and JSON to clipboard', async () => {
    render(
      <OcrDataEditorModal
        isOpen={true}
        onClose={vi.fn()}
        document={SAMPLE_ENGLISH_PAYBILL_DOC}
      />
    );

    fireEvent.click(screen.getByText('Copy Text'));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Copy TSV'));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Copy JSON'));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('opens and closes Search & Replace sub-modal', () => {
    render(
      <OcrDataEditorModal
        isOpen={true}
        onClose={vi.fn()}
        document={SAMPLE_ENGLISH_PAYBILL_DOC}
      />
    );

    fireEvent.click(screen.getByText(/Find \/ Replace/i));
    expect(screen.getByText('Search and Replace')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Text to find/i)).toBeInTheDocument();

    // Close Search & Replace dialog
    fireEvent.click(screen.getByText('Done'));
    expect(screen.queryByPlaceholderText(/Text to find/i)).not.toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <OcrDataEditorModal
        isOpen={false}
        onClose={vi.fn()}
        document={SAMPLE_ENGLISH_PAYBILL_DOC}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
