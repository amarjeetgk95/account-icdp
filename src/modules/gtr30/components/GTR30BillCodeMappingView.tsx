import { useState } from 'react';
import type { GTR30BillCodeMapping, GTR30BudgetHead } from '../types';
import { BUDGET_HEAD_MAPPING_FIELDS } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import {
  CreditCard,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Tag,
  Layers,
  ChevronDown,
  ChevronUp,
  TreePine,
  ListTree,
  Pencil,
  Settings2,
} from 'lucide-react';
import {
  useGTR30BillCodeMappings,
  useSaveGTR30BillCodeMapping,
  useRemoveGTR30BillCodeMapping,
} from '../hooks/useGTR30BillCodeMappings';
import {
  useGTR30BudgetHeads,
  useSaveGTR30BudgetHead,
  useRemoveGTR30BudgetHead,
} from '../hooks/useGTR30BudgetHeads';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const BILL_CODE_SUGGESTIONS = [
  {
    code: 'GTR30-SAL',
    desc: 'Monthly Regular Pay & Allowances',
    head: '2403001139900',
    demand: '004',
    major: 'Major Head-2403 Animal Husbandry',
    subHead: 'Sub Head-05 Scheme for Strengthening of Statistical Wing (CSS)',
  },
  {
    code: 'GTR30-DA',
    desc: 'Dearness Allowance (DA) Arrears',
    head: '2403001139900',
    demand: '004',
    major: 'Major Head-2403 Animal Husbandry',
    subHead: 'Sub Head-05 Scheme for Strengthening of Statistical Wing (CSS)',
  },
  {
    code: 'GTR30-BONUS',
    desc: 'Ad-hoc Festival Bonus',
    head: '2403001139900',
    demand: '004',
    major: 'Major Head-2403 Animal Husbandry',
    subHead: 'Sub Head-05 Scheme for Strengthening of Statistical Wing (CSS)',
  },
  {
    code: 'GTR30-LEAVE',
    desc: 'Leave Encashment (LTC / Retirement)',
    head: '2403001139900',
    demand: '004',
    major: 'Major Head-2403 Animal Husbandry',
    subHead: 'Sub Head-05 Scheme for Strengthening of Statistical Wing (CSS)',
  },
  {
    code: 'GTR30-SURR',
    desc: 'Earned Leave Surrender Bill',
    head: '2403001139900',
    demand: '004',
    major: 'Major Head-2403 Animal Husbandry',
    subHead: 'Sub Head-05 Scheme for Strengthening of Statistical Wing (CSS)',
  },
  {
    code: 'GTR30-MED',
    desc: 'Medical Reimbursement Bill',
    head: '2403001139900',
    demand: '004',
    major: 'Major Head-2403 Animal Husbandry',
    subHead: 'Sub Head-05 Scheme for Strengthening of Statistical Wing (CSS)',
  },
  {
    code: 'GTR30-ARREARS',
    desc: 'Pay Revision / Promotion Arrears',
    head: '2403001139900',
    demand: '004',
    major: 'Major Head-2403 Animal Husbandry',
    subHead: 'Sub Head-05 Scheme for Strengthening of Statistical Wing (CSS)',
  },
];

const EMPTY_HEAD_FORM: Omit<GTR30BudgetHead, 'id'> = {
  name: '',
  headChargeable: '',
  controllingOfficer: '',
  classOfExpenditure: '1',
  fund: '3',
  drawingOfficer: '299',
  demandNo: '',
  typeOfBudget: '1',
  schemeNo: '0000000',
  sector: 'Sector-C-Economic Service',
  majorHead: '',
  subMajorHead: '-',
  minorHead: '',
  subHead: '',
  budgetYear: '2026-27',
};

export function GTR30BillCodeMappingView() {
  const { toast } = useToast();
  const mappingsQuery = useGTR30BillCodeMappings();
  const saveMutation = useSaveGTR30BillCodeMapping();
  const removeMutation = useRemoveGTR30BillCodeMapping();
  const billCodeMappings = mappingsQuery.data ?? [];

  const headsQuery = useGTR30BudgetHeads();
  const saveHeadMutation = useSaveGTR30BudgetHead();
  const removeHeadMutation = useRemoveGTR30BudgetHead();
  const budgetHeads = headsQuery.data ?? [];

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newBudgetHeadId, setNewBudgetHeadId] = useState('');
  const [createError, setCreateError] = useState('');
  const [codeErrors, setCodeErrors] = useState<Record<string, string>>({});

  // Budget Heads master management dialog
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [editingHeadId, setEditingHeadId] = useState<string | null>(null);
  const [headForm, setHeadForm] = useState<Omit<GTR30BudgetHead, 'id'>>(EMPTY_HEAD_FORM);
  const [headFormError, setHeadFormError] = useState('');
  const [deleteHeadTargetId, setDeleteHeadTargetId] = useState<string | null>(null);

  const findHeadById = (id?: string | null): GTR30BudgetHead | null =>
    (id ? budgetHeads.find((h) => h.id === id) : undefined) ?? null;

  const handleOpenCreate = () => {
    setNewCode('');
    setNewDesc('');
    setNewBudgetHeadId(budgetHeads.length === 1 ? budgetHeads[0].id : '');
    setCreateError('');
    setIsCreateOpen(true);
  };

  const handleSelectSuggestion = (s: typeof BILL_CODE_SUGGESTIONS[0]) => {
    setNewCode(s.code);
    setNewDesc(s.desc);
    // Auto-pick a saved budget head whose head-chargeable matches the preset.
    const match = budgetHeads.find((h) => h.headChargeable === s.head);
    if (match) setNewBudgetHeadId(match.id);
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
    if (!newBudgetHeadId) {
      setCreateError('Please select a Budget Head for this bill code.');
      return;
    }
    const selectedHead = findHeadById(newBudgetHeadId);
    if (!selectedHead) {
      setCreateError('Selected budget head no longer exists. Please pick another.');
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
        budgetHeadId: selectedHead.id,
        headChargeable: selectedHead.headChargeable ?? '',
        controllingOfficer: selectedHead.controllingOfficer ?? '',
        classOfExpenditure: selectedHead.classOfExpenditure ?? '1',
        fund: selectedHead.fund ?? '3',
        drawingOfficer: selectedHead.drawingOfficer ?? '299',
        demandNo: selectedHead.demandNo ?? '',
        typeOfBudget: selectedHead.typeOfBudget ?? '1',
        schemeNo: selectedHead.schemeNo ?? '0000000',
        sector: selectedHead.sector ?? 'Sector-C-Economic Service',
        majorHead: selectedHead.majorHead ?? '',
        subMajorHead: selectedHead.subMajorHead ?? '-',
        minorHead: selectedHead.minorHead ?? '',
        subHead: selectedHead.subHead ?? '',
        budgetYear: selectedHead.budgetYear ?? '2026-27',
      });
      toast({
        title: 'Bill Code & Budget Head Created',
        description: `Successfully added ${cleanCode} with "${selectedHead.name}" budget head.`,
      });
      setIsCreateOpen(false);
    } catch {
      setCreateError('Failed to save bill code. Please try again.');
    }
  };

  /** Copy every classification field of a budget head onto the mapping. */
  const applyHeadToMapping = (
    mapping: GTR30BillCodeMapping,
    head: GTR30BudgetHead
  ): GTR30BillCodeMapping => {
    const next: GTR30BillCodeMapping = { ...mapping, budgetHeadId: head.id };
    for (const field of BUDGET_HEAD_MAPPING_FIELDS) {
      next[field] =
        (head as unknown as Record<string, string | undefined>)[field] ?? '';
    }
    return next;
  };

  const handleRowBudgetHeadChange = (mapping: GTR30BillCodeMapping, headId: string) => {
    const head = findHeadById(headId);
    if (!head) {
      // "Custom / manual entry" — keep current values but clear the link
      void saveMutation.mutateAsync({ ...mapping, budgetHeadId: undefined });
      return;
    }
    void saveMutation.mutateAsync(applyHeadToMapping(mapping, head));
    toast({
      title: 'Budget Head Applied',
      description: `"${head.name}" applied to ${mapping.billCode}.`,
    });
  };

  const openAddHeadForm = () => {
    setEditingHeadId(null);
    setHeadForm(EMPTY_HEAD_FORM);
    setHeadFormError('');
  };

  const openEditHeadForm = (head: GTR30BudgetHead) => {
    setEditingHeadId(head.id);
    setHeadForm({ ...EMPTY_HEAD_FORM, ...head });
    setHeadFormError('');
  };

  const setHeadField = (field: keyof Omit<GTR30BudgetHead, 'id'>, value: string) =>
    setHeadForm((f) => ({ ...f, [field]: value }));

  const handleHeadFormSave = async () => {
    if (!headForm.name.trim()) {
      setHeadFormError('Name is required (e.g. "Statistical Wing CSS - Pay & Allowances").');
      return;
    }
    try {
      await saveHeadMutation.mutateAsync({
        id: editingHeadId ?? crypto.randomUUID(),
        ...headForm,
        name: headForm.name.trim(),
      });
      toast({
        title: editingHeadId ? 'Budget Head Updated' : 'Budget Head Added',
        description: headForm.name.trim(),
      });
      openAddHeadForm();
    } catch {
      setHeadFormError('Failed to save budget head. Please try again.');
    }
  };

  const handleConfirmDeleteHead = async () => {
    if (!deleteHeadTargetId) return;
    try {
      await removeHeadMutation.mutateAsync(deleteHeadTargetId);
      if (newBudgetHeadId === deleteHeadTargetId) setNewBudgetHeadId('');
      toast({ title: 'Budget Head Deleted', description: 'Removed from the master list.' });
    } finally {
      setDeleteHeadTargetId(null);
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
            <h2 className="font-bold text-md text-slate-900">Bill Code &amp; Budget Head Configuration</h2>
            <p className="text-xs text-slate-500">
              Configure each Bill Code with its own distinct Budget Head, Scheme, Demand No., and Controlling Officer.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs flex items-center gap-1"
            onClick={() => {
              openAddHeadForm();
              setIsManageOpen(true);
            }}
          >
            <Settings2 className="h-4 w-4" /> Manage Budget Heads
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Bill Code / Budget Head
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {billCodeMappings.map((mapping) => {
          const isExpanded = expandedId === mapping.id;
          return (
            <div
              key={mapping.id}
              className="bg-slate-50/90 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors p-3.5 space-y-3"
            >
              <div className="grid gap-3 sm:grid-cols-7 items-center">
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

                <div className="sm:col-span-3">
                  <Label className="text-xs font-semibold text-slate-700">Description / Bill Purpose</Label>
                  <Input
                    value={mapping.description}
                    onChange={(e) => updateMapping(mapping.id, 'description', e.target.value)}
                    placeholder="e.g. Monthly Regular Salary"
                    className="mt-1 text-sm bg-white border-slate-300"
                  />
                </div>

                <div className="sm:col-span-2 flex justify-end items-center gap-2 sm:mt-5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs flex items-center gap-1 text-blue-700 bg-blue-50/80 hover:bg-blue-100 border-blue-200"
                    onClick={() => setExpandedId(isExpanded ? null : mapping.id)}
                  >
                    <TreePine className="h-3.5 w-3.5" />
                    {isExpanded ? 'Hide Budget Head' : 'Budget Head'}
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5 ml-0.5" /> : <ChevronDown className="h-3.5 w-3.5 ml-0.5" />}
                  </Button>
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

              {/* Expandable Per-Bill-Code Budget Head Details */}
              {isExpanded && (
                <div className="border-t border-slate-200 pt-3 bg-white p-3 rounded-lg grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="sm:col-span-2 lg:col-span-3">
                    <Label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                      <ListTree className="h-3 w-3 text-emerald-600" /> Budget Head
                      <span className="font-normal text-slate-400">(select to auto-fill all classification fields below)</span>
                    </Label>
                    <select
                      value={mapping.budgetHeadId ?? ''}
                      onChange={(e) => handleRowBudgetHeadChange(mapping, e.target.value)}
                      className="w-full h-8 mt-1 rounded-md border border-slate-300 px-2 text-xs font-medium bg-white"
                    >
                      <option value="">— Custom / manual entry —</option>
                      {budgetHeads.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} {h.headChargeable ? `(${h.headChargeable})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Head Chargeable (13 Digits)</Label>
                    <Input
                      value={mapping.headChargeable || ''}
                      onChange={(e) => updateMapping(mapping.id, 'headChargeable', e.target.value)}
                      placeholder="e.g. 2403001139900"
                      className="font-mono mt-1 text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Controlling Officer Code (Field 4)</Label>
                    <Input
                      value={mapping.controllingOfficer || ''}
                      onChange={(e) => updateMapping(mapping.id, 'controllingOfficer', e.target.value)}
                      placeholder="e.g. 0101"
                      className="mt-1 text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Demand No.</Label>
                    <Input
                      value={mapping.demandNo || ''}
                      onChange={(e) => updateMapping(mapping.id, 'demandNo', e.target.value)}
                      placeholder="e.g. 004"
                      className="mt-1 text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Major Head</Label>
                    <Input
                      value={mapping.majorHead || ''}
                      onChange={(e) => updateMapping(mapping.id, 'majorHead', e.target.value)}
                      placeholder="e.g. Major Head-2403 Animal Husbandry"
                      className="mt-1 text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Minor Head</Label>
                    <Input
                      value={mapping.minorHead || ''}
                      onChange={(e) => updateMapping(mapping.id, 'minorHead', e.target.value)}
                      placeholder="e.g. Minor Head-113 Statistics"
                      className="mt-1 text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Sub-Head</Label>
                    <Input
                      value={mapping.subHead || ''}
                      onChange={(e) => updateMapping(mapping.id, 'subHead', e.target.value)}
                      placeholder="e.g. Sub Head-05 Strengthening of..."
                      className="mt-1 text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Sector</Label>
                    <Input
                      value={mapping.sector || ''}
                      onChange={(e) => updateMapping(mapping.id, 'sector', e.target.value)}
                      placeholder="e.g. Sector-C-Economic Service"
                      className="mt-1 text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Class of Expenditure</Label>
                    <Input
                      value={mapping.classOfExpenditure || ''}
                      onChange={(e) => updateMapping(mapping.id, 'classOfExpenditure', e.target.value)}
                      placeholder="e.g. 1"
                      className="mt-1 text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Drawing Officer Code</Label>
                    <Input
                      value={mapping.drawingOfficer || ''}
                      onChange={(e) => updateMapping(mapping.id, 'drawingOfficer', e.target.value)}
                      placeholder="e.g. 299"
                      className="mt-1 text-xs h-8"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
        <span>Active Bill Codes: <strong className="text-slate-800">{billCodeMappings.length}</strong></span>
        <span>Changes save and sync automatically to Supabase</span>
      </div>

      {/* Dialog for Creating New Bill Code */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Layers className="h-5 w-5 text-blue-600" /> Create New Bill Code &amp; Budget Head
            </DialogTitle>
            <DialogDescription>
              Define a new bill code along with its dedicated budget classification parameters.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            {createError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
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
                  placeholder="e.g. GTR30-SCHEME-B"
                  className="font-mono font-bold uppercase mt-1"
                  autoFocus
                />
              </div>

              <div>
                <Label htmlFor="newBillDesc" className="text-xs font-semibold">
                  Description / Purpose
                </Label>
                <Input
                  id="newBillDesc"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="e.g. Scheme B Pay & Allowances"
                  className="mt-1"
                />
              </div>
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
                    onClick={() => handleSelectSuggestion(s)}
                    className="text-[11px] px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-md font-mono transition-colors"
                  >
                    + {s.code}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1">
                <TreePine className="h-3.5 w-3.5 text-blue-600" /> Budget Head
                <span className="font-normal normal-case text-slate-400">— select from saved heads</span>
              </h3>
              <div>
                <Label className="text-xs font-semibold">
                  Select Budget Head <span className="text-red-500">*</span>
                </Label>
                <select
                  value={newBudgetHeadId}
                  onChange={(e) => {
                    setNewBudgetHeadId(e.target.value);
                    setCreateError('');
                  }}
                  className={`w-full h-9 mt-1 rounded-md border px-2 text-sm font-medium bg-white ${
                    createError && !newBudgetHeadId ? 'border-red-400' : 'border-slate-300'
                  }`}
                >
                  <option value="">Select Budget Head</option>
                  {budgetHeads.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} {h.headChargeable ? `(${h.headChargeable})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {(() => {
                const preview = findHeadById(newBudgetHeadId);
                if (!preview) return null;
                return (
                  <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-2.5 grid gap-x-3 gap-y-1 text-[11px] text-slate-600 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <span className="font-semibold text-slate-700">Head Chargeable: </span>
                      <span className="font-mono">{preview.headChargeable || '—'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Demand No.: </span>
                      {preview.demandNo || '—'}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Controlling Officer: </span>
                      {preview.controllingOfficer || '—'}
                    </div>
                    <div className="sm:col-span-2">
                      <span className="font-semibold text-slate-700">Major Head: </span>
                      {preview.majorHead || '—'}
                    </div>
                    <div className="sm:col-span-2">
                      <span className="font-semibold text-slate-700">Minor Head: </span>
                      {preview.minorHead || '—'}
                    </div>
                    <div className="sm:col-span-2">
                      <span className="font-semibold text-slate-700">Sub Head: </span>
                      {preview.subHead || '—'}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Save Bill Code &amp; Budget Head
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for Managing the Budget Heads master list */}
      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <TreePine className="h-5 w-5 text-emerald-600" /> Manage Budget Heads
            </DialogTitle>
            <DialogDescription>
              Saved budget heads appear as selectable options on every bill code. Each bill
              code can point to its own distinct budget head.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Add / Edit form */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-3 bg-slate-50/70">
              <h4 className="text-xs font-bold uppercase text-slate-800">
                {editingHeadId ? 'Edit Budget Head' : 'Add New Budget Head'}
              </h4>
              {headFormError && (
                <div className="p-2 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {headFormError}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={headForm.name}
                    onChange={(e) => setHeadField('name', e.target.value)}
                    placeholder='e.g. "Statistical Wing CSS - Pay & Allowances"'
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Head Chargeable (13 Digits)</Label>
                  <Input
                    value={headForm.headChargeable ?? ''}
                    onChange={(e) => setHeadField('headChargeable', e.target.value)}
                    placeholder="e.g. 2403001139900"
                    className="font-mono mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Demand No.</Label>
                  <Input
                    value={headForm.demandNo ?? ''}
                    onChange={(e) => setHeadField('demandNo', e.target.value)}
                    placeholder="e.g. 004"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Controlling Officer Code</Label>
                  <Input
                    value={headForm.controllingOfficer ?? ''}
                    onChange={(e) => setHeadField('controllingOfficer', e.target.value)}
                    placeholder="e.g. 0101"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Budget Year</Label>
                  <Input
                    value={headForm.budgetYear ?? ''}
                    onChange={(e) => setHeadField('budgetYear', e.target.value)}
                    placeholder="e.g. 2026-27"
                    className="mt-1 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Major Head</Label>
                  <Input
                    value={headForm.majorHead ?? ''}
                    onChange={(e) => setHeadField('majorHead', e.target.value)}
                    placeholder="e.g. Major Head-2403 Animal Husbandry"
                    className="mt-1 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Minor Head</Label>
                  <Input
                    value={headForm.minorHead ?? ''}
                    onChange={(e) => setHeadField('minorHead', e.target.value)}
                    placeholder="e.g. Minor Head-113 Statistics"
                    className="mt-1 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Sub Head</Label>
                  <Input
                    value={headForm.subHead ?? ''}
                    onChange={(e) => setHeadField('subHead', e.target.value)}
                    placeholder="e.g. Sub Head-05 Scheme for Strengthening of..."
                    className="mt-1 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Sector</Label>
                  <Input
                    value={headForm.sector ?? ''}
                    onChange={(e) => setHeadField('sector', e.target.value)}
                    placeholder="e.g. Sector-C-Economic Service"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                {editingHeadId && (
                  <Button type="button" variant="outline" size="sm" onClick={openAddHeadForm}>
                    Cancel Edit
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleHeadFormSave()}
                  disabled={saveHeadMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  {editingHeadId ? 'Update Head' : 'Add Head'}
                </Button>
              </div>
            </div>

            {/* Master list */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-800">
                Saved Budget Heads ({budgetHeads.length})
              </h4>
              {budgetHeads.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">
                  No budget heads saved yet. Add one above — it will become selectable for all bill codes.
                </p>
              ) : (
                budgetHeads.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-start justify-between gap-2 border border-slate-200 rounded-lg p-2.5 hover:border-slate-300 transition-colors bg-white"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{h.name}</p>
                      <p className="text-[11px] font-mono text-slate-500 truncate">
                        {h.headChargeable || '—'} · {h.demandNo || '—'} · {h.majorHead || '—'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{h.minorHead || ''}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Edit"
                        onClick={() => openEditHeadForm(h)}
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        onClick={() => setDeleteHeadTargetId(h.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button type="button" variant="outline" onClick={() => setIsManageOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm deleting a budget head from the master list */}
      <ConfirmDialog
        open={deleteHeadTargetId !== null}
        title="Delete Budget Head"
        message="Are you sure you want to delete this budget head? Bill codes already using it keep their copied values but will show as Custom until another head is selected."
        confirmLabel="Delete Head"
        danger
        onConfirm={() => void handleConfirmDeleteHead()}
        onCancel={() => setDeleteHeadTargetId(null)}
      />
    </Card>
  );
}
