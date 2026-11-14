import { ReactNode, useRef } from 'react';
import { Printer } from 'lucide-react';
import { Modal, type ModalAction } from './Modal';
import { popupNativePrint } from '@/shared/utilities/nativePrint';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function PreviewModal({ isOpen, onClose, title, children }: PreviewModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const rootEl = contentRef.current;
    if (!rootEl) {
      window.print();
      return;
    }
    const reportEl =
      (rootEl.querySelector('.report-print-area, .page-container, .gtr-page, .gtr30-page') as HTMLElement | null) ||
      rootEl;
    const isLandscape =
      reportEl.classList.contains('report-landscape') ||
      reportEl.classList.contains('page-landscape') ||
      rootEl.querySelector('.report-landscape, .page-landscape') !== null;

    popupNativePrint({
      elements: [reportEl],
      title: title || 'Report_Document',
      pageSize: 'A4',
      orientation: isLandscape ? 'landscape' : 'portrait',
      pageMargin: '8mm',
      pageContainerSelector: '.report-print-area, .page-container, .gtr-page, .gtr30-page',
    });
  };

  const headerActions: ReactNode = (
    <button
      onClick={handlePrint}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all shadow-xs cursor-pointer"
      title="Print to PDF"
    >
      <Printer size={14} />
      Print to PDF
    </button>
  );

  const footerActions: ModalAction[] = [
    { label: 'Close', onClick: onClose, variant: 'secondary' },
  ];

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="full"
      headerActions={headerActions}
      footerActions={footerActions}
    >
      <div ref={contentRef}>{children}</div>
    </Modal>
  );
}

