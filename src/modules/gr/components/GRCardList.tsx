import { Eye, Download, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentTypeBadge } from './GRBadges';
import type { GRRecord } from '../types';

interface GRCardListProps {
  records: GRRecord[];
  getDocumentTypeLabel: (id?: string | null) => string;
  onPreview: (gr: GRRecord) => void;
  onDownload: (gr: GRRecord) => void;
  onDetails: (gr: GRRecord) => void;
  onEdit?: (gr: GRRecord) => void;
}

export function GRCardList({
  records,
  getDocumentTypeLabel,
  onPreview,
  onDownload,
  onDetails,
  onEdit,
}: GRCardListProps) {
  return (
    <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
      {records.map((gr) => (
        <div key={gr.id} className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {gr.gr_number}
                </span>
                <DocumentTypeBadge label={getDocumentTypeLabel(gr.document_type_id)} />
              </div>
              <h4
                onClick={() => onDetails(gr)}
                className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 cursor-pointer line-clamp-2"
              >
                {gr.title}
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
            <div className="min-w-0">
              <span className="block text-xs text-slate-400">Category:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">
                {gr.category_name || gr.category_id || 'General'}
              </span>
            </div>
            <div className="min-w-0">
              <span className="block text-xs text-slate-400">Department:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">
                {gr.department_name || '—'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-400 text-xs">
              {gr.issue_date ? new Date(gr.issue_date).toLocaleDateString('en-GB') : '—'}
            </span>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onPreview(gr)}
                className="h-8 px-2 text-xs text-indigo-600"
              >
                <Eye size={13} className="mr-1" /> Preview
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDownload(gr)}
                className="h-8 px-2 text-xs text-slate-600"
              >
                <Download size={13} className="mr-1" /> PDF
              </Button>
              {onEdit && gr.can_manage && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(gr)}
                  className="h-8 px-2 text-xs text-indigo-600"
                >
                  <Edit size={13} className="mr-1" /> Edit
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDetails(gr)}
                className="h-8 px-2 text-xs text-slate-600"
              >
                More
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
