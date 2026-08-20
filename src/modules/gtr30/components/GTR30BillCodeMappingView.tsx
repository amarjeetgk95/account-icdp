import { useState } from 'react';
import type { GTR30BillCodeMapping } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Plus, Trash2, AlertCircle, CheckCircle2, Sparkles, Tag, Layers } from 'lucide-react';
import {
  useGTR30BillCodeMappings,
  useSaveGTR30BillCodeMapping,
  useRemoveGTR30BillCodeMapping,
} from '../hooks/useGTR30BillCodeMappings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const BILL_CODE_SUGGESTIONS = [
  { code: 'GTR30-SAL', desc: 'Monthly Regular Pay & Allowances' },
  { code: 'GTR30-DA', desc: 'Dearness Allowance (DA) Arrears' },
  { code: 'GTR30-BONUS', desc: 'Ad-hoc Festival Bonus' },
  { code: 'GTR30-LEAVE', desc: 'Leave Encashment (LTC / Retirement)' },
  { code: 'GTR30-SURR', desc: 'Earned Leave Surrender Bill' },
  { code: 'GTR30-MED', desc: 'Medical Reimbursement Bill' },
  { code: 'GTR30-ARREARS', desc: 'Pay Revision / Promotion Arrears' },
];

export function GTR30BillCodeMappingView() {
  const { toast } = useToast();
  const mappingsQuery = useGTR30BillCodeMappings();
  const saveMutation = useSaveGTR30BillCodeMapping();
  const removeMutation = useRemoveGTR30BillCodeMapping();
  const billCodeMappings = mappingsQuery.data ?? [];

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [createError, setCreateError] = useState('');
  const [codeErrors, setCodeErrors] = useState<Record<string, string>>({});

  const handleOpenCreate = () => {
    setNewCode('');
    setNewDesc('');
    setCreateError('');
    setIsCreateOpen(true);
  };

  const handleSelectSuggestion = (code: string, desc: string) => {
    setNewCode(code);
    setNewDesc(desc);
    setCreateError('');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newCode.trim().toUpperCase();
    const cleanDesc = newDesc.trim();

    if (!cleanCode) {
      setCreateError('Bill code is required (e.g. GTR30-SAL).');
      return;
    }
    if (cleanCode.length > 50) {
      setCreateError('Bill code must be 50 characters or less.');
      return;
    }
    const exists = billCodeMappings.some(
      (m) => m.billCode.trim().toUpperCase() === cleanCode
    );
    if (exists) {
      setCreateError(`Bill code "${cleanCode}" already exists.`);
      return;
    }

    try {
      await saveMutation.mutateAsync({
        id: crypto.randomUUID(),
        billCode: cleanCode,
        description: cleanDesc || `${cleanCode} Bill`,
      });
      toast({
        title: 'Bill Code Created',
        description: `Successfully added ${cleanCode} to bill code mappings.`,
      });
      setIsCreateOpen(false);
    } catch {
      setCreateError('Failed to save bill code. Please try again.');
    }
  };

  const updateMapping = (id: string, field: keyof GTR30BillCodeMapping, value: string) => {
    const mapping = billCodeMappings.find((m) => m.id === id);
    if (!mapping) return;

    if (field === 'billCode') {
      const clean = value.trim().toUpperCase();
      if (!clean) {
        setCodeErrors((prev) => ({ ...prev, [id]: 'Bill code is required' }));
        return;
      }
      if (clean.length > 50) {
        setCodeErrors((prev) => ({ ...prev, [id]: 'Bill code must be at most 50 characters' }));
        return;
      }
      setCodeErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      void saveMutation.mutateAsync({ ...mapping, billCode: clean });
      return;
    }

    void saveMutation.mutateAsync({ ...mapping, [field]: value.trim() });
  };

  const removeMapping = (id: string) => {
    const target = billCodeMappings.find((m) => m.id === id);
    void removeMutation.mutateAsync(id).then(() => {
      toast({
        title: 'Bill Code Removed',
        description: target ? `Removed ${target.billCode}.` : 'Removed from mappings.',
      });
    });
  };

  return (
    <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="font-bold text-md text-slate-900">Bill Code Mapping &amp; Configuration</h2>
            <p className="text-xs text-slate-500">
              Manage standard and custom GTR-30 bill codes for monthly employee group segregation.
            </p>
          </div>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> Create New Bill Code
        </Button>
      </div>

      <div className="space-y-3">
        {billCodeMappings.map((mapping) => (
          <div
            key={mapping.id}
            className="grid gap-3 sm:grid-cols-7 items-center bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
          >
            <div className="sm:col-span-2">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Tag className="h-3 w-3 text-blue-600" /> Bill Code
              </Label>
              <Input
                value={mapping.billCode}
                onChange={(e) => updateMapping(mapping.id, 'billCode', e.target.value)}
                placeholder="e.g. GTR30-SAL"
                className={`font-mono font-bold uppercase mt-1 text-sm bg-white ${
                  codeErrors[mapping.id] ? 'border-red-400 focus-visible:ring-red-400' : 'border-slate-300'
                }`}
              />
              {codeErrors[mapping.id] && (
                <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
                  <AlertCircle className="h-3 w-3" /> {codeErrors[mapping.id]}
                </p>
              )}
            </div>

            <div className="sm:col-span-4">
              <Label className="text-xs font-semibold text-slate-700">Description / Bill Purpose</Label>
              <Input
                value={mapping.description}
                onChange={(e) => updateMapping(mapping.id, 'description', e.target.value)}
                placeholder="e.g. Monthly Regular Salary"
                className="mt-1 text-sm bg-white border-slate-300"
              />
            </div>

            <div className="flex justify-end items-center sm:mt-5">
              {billCodeMappings.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title={`Delete ${mapping.billCode}`}
                  onClick={() => removeMapping(mapping.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
        <span>Active Bill Codes: <strong className="text-slate-800">{billCodeMappings.length}</strong></span>
        <span>Changes save and sync automatically</span>
      </div>

      {/* Dialog for Creating New Bill Code */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Layers className="h-5 w-5 text-blue-600" /> Create New Bill Code
            </DialogTitle>
            <DialogDescription>
              Define a new bill code for categorizing and processing GTR-30 Pay Bills.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            {createError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <div>
              <Label htmlFor="newBillCode" className="text-xs font-semibold">
                Bill Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="newBillCode"
                value={newCode}
                onChange={(e) => {
                  setNewCode(e.target.value.toUpperCase());
                  setCreateError('');
                }}
                placeholder="e.g. GTR30-BONUS"
                className="font-mono font-bold uppercase mt-1"
                autoFocus
              />
              <p className="text-[11px] text-slate-500 mt-1">Unique alphanumeric code (e.g. GTR30-DA, GTR30-BONUS)</p>
            </div>

            <div>
              <Label htmlFor="newBillDesc" className="text-xs font-semibold">
                Description / Purpose
              </Label>
              <Input
                id="newBillDesc"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="e.g. Ad-hoc Festival Bonus Bill"
                className="mt-1"
              />
            </div>

            {/* Quick suggestions */}
            <div>
              <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1.5">
                <Sparkles className="h-3 w-3 text-amber-500" /> Common Gujarat Presets
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {BILL_CODE_SUGGESTIONS.filter(
                  (s) => !billCodeMappings.some((m) => m.billCode === s.code)
                ).map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => handleSelectSuggestion(s.code, s.desc)}
                    className="text-[11px] px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-md font-mono transition-colors"
                  >
                    + {s.code}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Save Bill Code
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
