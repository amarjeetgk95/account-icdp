import { ReactNode } from 'react';
import { Printer } from 'lucide-react';
import { Modal, type ModalAction } from './Modal';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function PreviewModal({ isOpen, onClose, title, children }: PreviewModalProps) {
  const headerActions: ReactNode = (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all shadow-xs"
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
      {children}
    </Modal>
  );
}
