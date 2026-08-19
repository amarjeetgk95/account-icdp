import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Sparkles, Layers } from 'lucide-react';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { useUIStore } from '@/core/stores/ui-store';

interface PdfToolsNavHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
  showBack?: boolean;
}

export const PdfToolsNavHeader: React.FC<PdfToolsNavHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  showBack = true,
}) => {
  const navigate = useNavigate();
  const fy = useUIStore((s) => s.activeFinancialYear);
  const fyLabel = `${fy}-${String(fy + 1).slice(-2)}`;

  return (
    <div className="space-y-2">
      {/* Breadcrumb row */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5 font-medium">
          <Link
            to="/pdf-tools"
            className="flex items-center gap-1 hover:text-indigo-600 transition-colors text-slate-600 dark:text-slate-400 font-semibold"
          >
            <Layers size={13} className="text-indigo-500" />
            <span>OCR &amp; PDF Tools Studio</span>
          </Link>
          <ChevronRight size={13} className="text-slate-400" />
          <span className="text-slate-900 dark:text-slate-100 font-bold">{title}</span>
          {badge && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {badge}
            </span>
          )}
        </div>

        {showBack && (
          <button
            type="button"
            onClick={() => navigate('/pdf-tools')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>All PDF Tools</span>
          </button>
        )}
      </div>

      {/* Main workspace header */}
      <WorkspaceHeader
        eyebrow={subtitle || 'Government Document Intelligence &bull; ICDP Surat'}
        title={title}
        context={
          <>
            <Sparkles size={13} className="text-indigo-500" />
            <span>Client-Side High Performance Engine</span>
            <span className="text-slate-300 dark:text-slate-700">&bull;</span>
            <span>FY {fyLabel}</span>
          </>
        }
        actions={actions}
      />
    </div>
  );
};
