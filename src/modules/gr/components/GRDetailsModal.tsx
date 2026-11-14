import {
  X,
  FileText,
  Download,
  Eye,
  Edit,
  RefreshCw,
  Archive,
  RotateCcw,
  Trash2,
  Calendar,
  Building2,
  Tag,
  Clock,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GRModal } from './GRModal';
import { StatusBadge, DocumentTypeBadge } from './GRBadges';
import { useGRMetadata } from '../hooks/useGRMetadata';
import type { GRRecord } from '../types';

interface GRDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gr: GRRecord | null;
  onPreview: (gr: GRRecord) => void;
  onDownload: (gr: GRRecord) => void;
  onEdit: (gr: GRRecord) => void;
  onReplacePdf: (gr: GRRecord) => void;
  onArchive: (gr: GRRecord) => void;
  onRestore: (gr: GRRecord) => void;
  onDelete: (gr: GRRecord) => void;
  onViewAudit?: (gr: GRRecord) => void;
}

export function GRDetailsModal({
  isOpen,
  onClose,
  gr,
  onPreview,
  onDownload,
  onEdit,
  onReplacePdf,
  onArchive,
  onRestore,
  onDelete,
  onViewAudit,
}: GRDetailsModalProps) {
  const { getDocumentTypeLabel } = useGRMetadata();

  const canManage = gr?.can_manage ?? false;
  const canDelete = gr?.can_delete ?? false;

  return (
    <GRModal
      isOpen={isOpen && !!gr}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      maxHeightClass="max-h-[90vh]"
      ariaLabelledBy="gr-details-title"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                {gr?.gr_number}
              </span>
              <DocumentTypeBadge label={getDocumentTypeLabel(gr?.document_type_id)} />
              {gr && <StatusBadge status={gr.status} />}
            </div>
            <h2 id="gr-details-title" className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">
              {gr?.title}
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50/70 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-start gap-2.5">
            <Building2 size={16} className="text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block text-xs">Department (વિભાગ)</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {gr?.department_name || 'Not specified'}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Tag size={16} className="text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block text-xs">Category & Subcategory</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                {gr?.category_name || gr?.category_id || 'General'}
              </span>
              {gr?.subcategory_name && (
                <span className="text-slate-500 dark:text-slate-400 text-xs block">
                  ↳ {gr.subcategory_name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Calendar size={16} className="text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block text-xs">Issue Date (તારીખ)</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {gr?.issue_date
                  ? new Date(gr.issue_date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Not specified'}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Clock size={16} className="text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block text-xs">Uploaded On</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {gr ? new Date(gr.created_at).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }) : ''}
              </span>
            </div>
          </div>
        </div>

        {gr?.keywords && gr.keywords.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Tag size={13} /> Keywords & Search Tags
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {gr.keywords.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 rounded-md text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {gr?.description && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Description & Circular Notes
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 whitespace-pre-wrap">
              {gr.description}
            </p>
          </div>
        )}

        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white block truncate max-w-xs sm:max-w-sm">
                {gr?.file_name}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                PDF Document • {((gr?.file_size || 0) / (1024 * 1024)).toFixed(2)} MB • Secure storage
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => gr && onPreview(gr)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
            >
              <Eye size={13} className="mr-1.5" /> Preview PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => gr && onDownload(gr)}
              className="text-xs"
            >
              <Download size={13} className="mr-1.5" /> Download
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between flex-wrap gap-2">
        <div>
          {onViewAudit && canManage && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => gr && onViewAudit(gr)}
              className="text-xs text-slate-500 hover:text-indigo-600"
            >
              <History size={13} className="mr-1.5" /> View Activity History
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canManage && gr && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(gr)}
                className="text-xs font-semibold"
              >
                <Edit size={13} className="mr-1.5" /> Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReplacePdf(gr)}
                className="text-xs font-semibold"
              >
                <RefreshCw size={13} className="mr-1.5" /> Replace PDF
              </Button>
              {gr.status === 'active' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onArchive(gr)}
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                >
                  <Archive size={13} className="mr-1.5" /> Archive
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRestore(gr)}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                >
                  <RotateCcw size={13} className="mr-1.5" /> Restore
                </Button>
              )}
            </>
          )}

          {canDelete && gr && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(gr)}
              className="text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Trash2 size={13} className="mr-1.5" /> Delete
            </Button>
          )}
        </div>
      </div>
    </GRModal>
  );
}
