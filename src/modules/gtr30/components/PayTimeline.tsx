import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Calendar, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { normalizePayHistory, formatDate, getPayTimelineStats, dayAfter } from '../utils/payHistory';
import type { PayEntry } from '../utils/payHistory';
import { payEntrySchema } from '../validation/payHistory.schema';

interface Props {
  value: PayEntry[];
  onChange: (next: PayEntry[]) => void;
  readOnly?: boolean;
}

export function PayTimeline({ value, onChange, readOnly }: Props) {
  const norm = useMemo(() => normalizePayHistory(value), [value]);
  const stats = useMemo(() => getPayTimelineStats(norm), [norm]);
  const [editing, setEditing] = useState<PayEntry | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<Partial<PayEntry>>({ startDate: '', basicPay: 0 as unknown as number, endDate: undefined });
  const [error, setError] = useState('');

  const openAdd = () => {
    setEditing(null);
    const last = norm[norm.length - 1];
    const autoStart = last ? dayAfter(last.endDate ?? last.startDate) : new Date().toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const start = last && !last.endDate && autoStart < today ? today : autoStart;
    const lastPay = last?.basicPay ?? 0;
    setForm({ startDate: start, endDate: undefined, basicPay: lastPay as unknown as number });
    setError('');
    setIsOpen(true);
  };
  const openEdit = (e: PayEntry) => {
    setEditing(e);
    setForm({ ...e });
    setError('');
    setIsOpen(true);
  };
  const handleDelete = (id: string) => {
    const next = norm.filter((e) => e.id !== id);
    onChange(normalizePayHistory(next));
  };
  const handleSave = () => {
    const candidate = {
      id: editing?.id || crypto.randomUUID(),
      startDate: String(form.startDate ?? '').trim(),
      endDate: (form.endDate as string | undefined)?.trim() || undefined,
      basicPay: Number(form.basicPay) || 0,
    };
    const parsed = payEntrySchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid pay entry');
      return;
    }
    try {
      let next: PayEntry[];
      if (editing) {
        const others = norm.filter((e) => e.id !== editing.id);
        next = normalizePayHistory([...others, parsed.data as PayEntry], { strict: true });
      } else {
        if (norm.length > 0) {
          const last = norm[norm.length - 1];
          if (parsed.data.startDate <= last.startDate) {
            setError(`startDate must be after last pay ${formatDate(last.startDate)}`);
            return;
          }
        }
        next = normalizePayHistory([...norm, parsed.data as PayEntry], { strict: true });
      }
      onChange(next);
      setIsOpen(false);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Overlap / duplicate startDate');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 dark:border-indigo-900/30 dark:bg-indigo-950/20">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-800 dark:text-indigo-300">
          <History size={14} /> Pay History
          <span className="hidden sm:inline font-normal text-indigo-600 dark:text-indigo-400">— {norm.length} {norm.length===1?'entry':'entries'} • Current ₹{(stats.current?.basicPay ?? 0).toLocaleString('en-IN')}</span>
        </div>
        {!readOnly && (
            <Button type="button" size="sm" className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAdd(); }}>
              <Plus size={14} className="mr-1" /> Add Pay Change
            </Button>
          )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="max-h-[280px] overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2 text-left">Effective From</th>
                <th className="px-3 py-2 text-left">Effective To</th>
                <th className="px-3 py-2 text-right">Basic Pay (₹)</th>
                {!readOnly && <th className="px-3 py-2 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {norm.length === 0 ? (
                <tr>
                  <td colSpan={readOnly ? 3 : 4} className="px-3 py-8 text-center text-xs text-slate-400">
                    No pay entries yet. Add initial pay with start date.
                  </td>
                </tr>
              ) : (
                norm.map((e, idx) => {
                  const isCurrent = idx === norm.length - 1 && !e.endDate;
                  return (
                    <tr key={e.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isCurrent ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : ''}`}>
                      <td className="px-3 py-2 num text-xs font-semibold">
                        <span className="inline-flex items-center gap-1"><Calendar size={11} className="text-slate-400" /> {formatDate(e.startDate)}</span>
                      </td>
                      <td className="px-3 py-2 num text-xs">
                        {e.endDate ? formatDate(e.endDate) : <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Continuous</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums">₹{e.basicPay.toLocaleString('en-IN')} {isCurrent && <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-700">Current</span>}</td>
                      {!readOnly && (
                        <td className="px-3 py-2 text-right">
                          <span className="inline-flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(ev: React.MouseEvent) => { ev.preventDefault(); ev.stopPropagation(); openEdit(e); }}><Pencil size={12} /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={(ev: React.MouseEvent) => { ev.preventDefault(); ev.stopPropagation(); handleDelete(e.id); }}><Trash2 size={12} /></Button>
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {norm.length > 0 && <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">Blank <span className="font-bold text-emerald-700">Continuous</span> = pay applies until next change. End 30-06-2026 → next auto 01-07-2026.</div>}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Pay' : 'Add Pay Change'}</DialogTitle>
            <DialogDescription>Start inclusive. End blank = continuous. Next auto starts day after end.</DialogDescription>
          </DialogHeader>
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</div>}
          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-xs font-semibold">Effective From *</Label>
              <Input type="date" value={String(form.startDate ?? '')} onChange={(e) => setForm((f: Partial<PayEntry>) => ({ ...f, startDate: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Effective To (End Date)</Label>
              <Input type="date" value={String(form.endDate ?? '')} onChange={(e) => setForm((f: Partial<PayEntry>) => ({ ...f, endDate: e.target.value || undefined }))} className="mt-1" />
              <p className="mt-1 text-xs text-slate-500">Leave blank for continuous</p>
              {form.endDate ? (
                <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">Next auto: <span className="num font-bold">{formatDate(dayAfter(String(form.endDate)))}</span></p>
              ) : (
                <p className="mt-1 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700">Continuous — until next pay change</p>
              )}
            </div>
            <div>
              <Label className="text-xs font-semibold">Basic Pay (₹) *</Label>
              <Input type="number" value={String(form.basicPay ?? 0)} onChange={(e) => setForm((f: Partial<PayEntry>) => ({ ...f, basicPay: Number(e.target.value) }))} className="mt-1 num" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={(ev: React.MouseEvent) => { ev.preventDefault(); ev.stopPropagation(); setIsOpen(false); }}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={(ev: React.MouseEvent) => { ev.preventDefault(); ev.stopPropagation(); handleSave(); }}>{editing ? 'Update' : 'Add'} Pay</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
