import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function PreviewModal({ isOpen, onClose, title, children }: PreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto no-print">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-3 py-1 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Print to PDF"
              >
                Print to PDF
              </button>
              <button
                onClick={onClose}
                className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
