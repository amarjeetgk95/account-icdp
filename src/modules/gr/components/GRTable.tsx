import { Eye, Download, Edit, RefreshCw, Trash2, Tag } from 'lucide-react';
import { DocumentTypeBadge, StatusBadge } from './GRBadges';
import type { GRRecord } from '../types';

interface GRTableProps {
  records: GRRecord[];
  getDocumentTypeLabel: (id?: string | null) => string;
  onPreview: (gr: GRRecord) => void;
  onDownload: (gr: GRRecord) => void;
  onDetails: (gr: GRRecord) => void;
  onEdit: (gr: GRRecord) => void;
  onReplace: (gr: GRRecord) => void;
  onDelete: (gr: GRRecord) => void;
}

export function GRTable({
  records,
  getDocumentTypeLabel,
  onPreview,
  onDownload,
  onDetails,
  onEdit,
  onReplace,
  onDelete,
}: GRTableProps) {
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <th className="py-3 px-4">GR Number</th>
            <th className="py-3 px-4">Doc Type</th>
            <th className="py-3 px-4">Subject / Title</th>
            <th className="py-3 px-4">Category & Subcategory</th>
            <th className="py-3 px-4">Department</th>
            <th className="py-3 px-4">Issue Date</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
          {records.map((gr) => (
            <tr
              key={gr.id}
              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group"
            >
              <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => onDetails(gr)}
                  className="hover:underline text-left"
                >
                  {gr.gr_number}
                </button>
              </td>

              <td className="py-3 px-4 whitespace-nowrap">
                <DocumentTypeBadge label={getDocumentTypeLabel(gr.document_type_id)} />
              </td>

              <td className="py-3 px-4 max-w-xs xl:max-w-md">
                <button
                  type="button"
                  onClick={() => onDetails(gr)}
                  className="font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-left line-clamp-1"
                >
                  {gr.title}
                </button>
                {gr.keywords && gr.keywords.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {gr.keywords.slice(0, 3).map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-800 text-slate-500"
                      >
                        <Tag size={8} /> {kw}
                      </span>
                    ))}
                    {gr.keywords.length > 3 && (
                      <span className="text-xs text-slate-400">
                        +{gr.keywords.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </td>

              <td className="py-3 px-4 max-w-[170px]">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                  {gr.category_name || gr.category_id || 'General'}
                </span>
                {gr.subcategory_name && (
                  <span className="text-xs text-slate-400 truncate block">
                    ↳ {gr.subcategory_name}
                  </span>
                )}
              </td>

              <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-[140px] truncate">
                {gr.department_name || '—'}
              </td>

              <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                {gr.issue_date
                  ? new Date(gr.issue_date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </td>

              <td className="py-3 px-4 whitespace-nowrap">
                <StatusBadge status={gr.status} />
              </td>

              <td className="py-3 px-4 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onPreview(gr)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Preview PDF"
                    aria-label={`Preview ${gr.gr_number}`}
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownload(gr)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Download PDF"
                    aria-label={`Download ${gr.gr_number}`}
                  >
                    <Download size={15} />
                  </button>

                  {gr.can_manage && (
                    <>
                      <button
                        type="button"
                        onClick={() => onEdit(gr)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit GR"
                        aria-label={`Edit ${gr.gr_number}`}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onReplace(gr)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Replace PDF"
                        aria-label={`Replace PDF for ${gr.gr_number}`}
                      >
                        <RefreshCw size={14} />
                      </button>
                    </>
                  )}

                  {gr.can_delete && (
                    <button
                      type="button"
                      onClick={() => onDelete(gr)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                      title="Permanently Delete GR"
                      aria-label={`Delete ${gr.gr_number}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
