import { Globe, Lock, FileText, Archive, CheckCircle2 } from 'lucide-react';
import type { GRRecord } from '../types';

export function VisibilityBadge({ visibility }: { visibility: GRRecord['visibility'] }) {
  const isPublic = visibility === 'public';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
        isPublic
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/40'
      }`}
    >
      {isPublic ? <Globe size={10} /> : <Lock size={10} />}
      <span>{isPublic ? 'Public' : 'Private'}</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: GRRecord['status'] }) {
  if (status === 'archived') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900/40">
        <Archive size={10} />
        <span>Archived</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
      <CheckCircle2 size={10} />
      <span>{status}</span>
    </span>
  );
}

export function DocumentTypeBadge({ label }: { label: string }) {
  if (!label) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 max-w-[180px] truncate"
      title={label}
    >
      <FileText size={10} className="shrink-0" />
      {label}
    </span>
  );
}
