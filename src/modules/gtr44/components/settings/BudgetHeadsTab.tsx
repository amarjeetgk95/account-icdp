import { useState, useRef, useMemo } from 'react';
import { useGTR44SettingsStore } from '../../store/gtr44SettingsStore';
import { GTR44BudgetHead } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import {
  ListTree,
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  Download,
  Search,
  Check,
} from 'lucide-react';
import { headChargeableCodeSchema } from '../../services/gtr44Settings.schema';
import {
  parseBudgetHeadsFromCsv,
  downloadBudgetHeadsCsv,
} from '../../utils/gtr44CsvBudgetHead';

const EMPTY_BUDGET_HEAD_FORM: Omit<GTR44BudgetHead, 'id'> = {
  name: '',
  headChargeableCode: '',
  sector: '',
  demandNo: '',
  demandNoLabel: '',
  majorHead: '',
  subMajorHead: '',
  minorHead: '',
  subHead: '',
  detailedHead: '',
  isActive: true,
  effectiveFrom: '',
  effectiveTo: '',
  grantRef: '',
  updatedAt: '',
  updatedBy: '',
};

export function BudgetHeadsTab() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const budgetHeads = useGTR44SettingsStore((s) => s.budgetHeads);
  const addBudgetHead = useGTR44SettingsStore((s) => s.addBudgetHead);
  const updateBudgetHead = useGTR44SettingsStore((s) => s.updateBudgetHead);
  const deleteBudgetHead = useGTR44SettingsStore((s) => s.deleteBudgetHead);
  const bulkUpsertBudgetHeads = useGTR44SettingsStore((s) => s.bulkUpsertBudgetHeads);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingHeadId, setEditingHeadId] = useState<string | null>(null);
  const [headFormData, setHeadFormData] = useState<Omit<GTR44BudgetHead, 'id'>>(EMPTY_BUDGET_HEAD_FORM);
  const [isAddingHead, setIsAddingHead] = useState(false);
  const [headFormErrors, setHeadFormErrors] = useState<Record<string, string>>({});
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const filteredBudgetHeads = useMemo(() => {
    if (!searchQuery.trim()) return budgetHeads;
    const q = searchQuery.toLowerCase().trim();
    return budgetHeads.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.headChargeableCode.includes(q) ||
        h.majorHead.toLowerCase().includes(q) ||
        h.demandNo.toLowerCase().includes(q)
    );
  }, [budgetHeads, searchQuery]);

  const openAddHead = () => {
    setEditingHeadId(null);
    setHeadFormData(EMPTY_BUDGET_HEAD_FORM);
    setHeadFormErrors({});
    setIsAddingHead(true);
  };

  const openEditHead = (head: GTR44BudgetHead) => {
    setIsAddingHead(false);
    setEditingHeadId(head.id);
    setHeadFormData({
      name: head.name,
      headChargeableCode: head.headChargeableCode,
      sector: head.sector || '',
      demandNo: head.demandNo,
      demandNoLabel: head.demandNoLabel || '',
      majorHead: head.majorHead,
      subMajorHead: head.subMajorHead || '',
      minorHead: head.minorHead,
      subHead: head.subHead || '',
      detailedHead: head.detailedHead,
      isActive: head.isActive !== false,
      effectiveFrom: head.effectiveFrom || '',
      effectiveTo: head.effectiveTo || '',
      grantRef: head.grantRef || '',
      updatedAt: head.updatedAt || '',
      updatedBy: head.updatedBy || '',
    });
    setHeadFormErrors({});
  };

  const cancelHeadForm = () => {
    setIsAddingHead(false);
    setEditingHeadId(null);
    setHeadFormData(EMPTY_BUDGET_HEAD_FORM);
    setHeadFormErrors({});
  };

  const validateHeadForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!headFormData.name.trim()) errs.name = 'Name is required';
    if (!headFormData.headChargeableCode.trim()) {
      errs.headChargeableCode = 'Head Chargeable Code is required';
    } else {
      const parsed = headChargeableCodeSchema.safeParse(headFormData.headChargeableCode);
      if (!parsed.success) {
        errs.headChargeableCode = 'Head Chargeable Code must be exactly 13 digits (numbers only)';
      }
    }
    if (!headFormData.demandNo.trim()) errs.demandNo = 'Demand No is required';
    if (!headFormData.majorHead.trim()) errs.majorHead = 'Major Head is required';
    if (!headFormData.minorHead.trim()) errs.minorHead = 'Minor Head is required';
    if (!headFormData.detailedHead.trim()) errs.detailedHead = 'Detailed Head is required';
    setHeadFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveHead = () => {
    if (!validateHeadForm()) return;
    if (editingHeadId) {
      updateBudgetHead(editingHeadId, headFormData);
      toast({ title: 'Budget Head Updated', description: `Updated "${headFormData.name}" successfully.` });
    } else {
      addBudgetHead(headFormData);
      toast({ title: 'Budget Head Added', description: `Added "${headFormData.name}" successfully.` });
    }
    cancelHeadForm();
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetId) return;
    deleteBudgetHead(deleteTargetId);
    toast({ title: 'Budget Head Deleted', description: 'The budget head was removed successfully.' });
    if (editingHeadId === deleteTargetId) cancelHeadForm();
    setDeleteTargetId(null);
  };

  const handleExportCsv = () => {
    downloadBudgetHeadsCsv(budgetHeads, 'gtr44-budget-heads.csv');
    toast({ title: 'CSV Exported', description: `Exported ${budgetHeads.length} budget heads.` });
  };

  const handleImportCsvClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = String(evt.target?.result || '');
      const { heads, errors } = parseBudgetHeadsFromCsv(text);
      if (errors.length > 0) {
        toast({
          title: 'CSV Import Warnings',
          description: `Imported with ${errors.length} error(s): ${errors.slice(0, 2).join('; ')}`,
          variant: 'destructive',
        });
      }
      if (heads.length > 0) {
        const { added, updated } = bulkUpsertBudgetHeads(heads);
        toast({
          title: 'CSV Imported',
          description: `Imported ${heads.length} records (${added} added, ${updated} updated).`,
        });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center space-x-2">
          <ListTree className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-bold text-base text-foreground">Budget Heads Master</h3>
            <p className="text-xs text-muted-foreground">
              Define 13-digit head chargeable codes, major/minor heads, and demand numbers for bill charging.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportCsvFile}
          />
          <Button variant="outline" size="sm" onClick={handleImportCsvClick} title="Import CSV">
            <Upload className="h-4 w-4 mr-1.5" /> Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv} title="Export CSV">
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
          <Button size="sm" onClick={openAddHead} className="font-semibold gap-1">
            <Plus className="h-4 w-4" /> Add Head
          </Button>
        </div>
      </div>

      {/* Search & Counter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, demand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {filteredBudgetHeads.length} of {budgetHeads.length} budget heads
        </span>
      </div>

      {/* Inline Form (Add or Edit) */}
      {(isAddingHead || editingHeadId) && (
        <div className="bg-muted/30 p-5 rounded-xl border border-border space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h4 className="font-bold text-sm text-foreground">
              {editingHeadId ? 'Edit Budget Head' : 'Add New Budget Head'}
            </h4>
            <Button variant="ghost" size="sm" onClick={cancelHeadForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <Label className="text-xs">
                Budget Head Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={headFormData.name}
                onChange={(e) => setHeadFormData({ ...headFormData, name: e.target.value })}
                placeholder="e.g. Office Contingencies - General"
              />
              {headFormErrors.name && <p className="text-xs text-destructive mt-1">{headFormErrors.name}</p>}
            </div>

            <div>
              <Label className="text-xs">
                Head Chargeable (13 digits) <span className="text-destructive">*</span>
              </Label>
              <Input
                value={headFormData.headChargeableCode}
                onChange={(e) => setHeadFormData({ ...headFormData, headChargeableCode: e.target.value })}
                placeholder="2403001020000"
                maxLength={13}
                className="font-mono"
              />
              {headFormErrors.headChargeableCode && (
                <p className="text-xs text-destructive mt-1">{headFormErrors.headChargeableCode}</p>
              )}
            </div>

            <div>
              <Label className="text-xs">
                Demand No <span className="text-destructive">*</span>
              </Label>
              <Input
                value={headFormData.demandNo}
                onChange={(e) => setHeadFormData({ ...headFormData, demandNo: e.target.value })}
                placeholder="04"
                className="font-mono"
              />
              {headFormErrors.demandNo && <p className="text-xs text-destructive mt-1">{headFormErrors.demandNo}</p>}
            </div>

            <div>
              <Label className="text-xs">Demand No Label</Label>
              <Input
                value={headFormData.demandNoLabel}
                onChange={(e) => setHeadFormData({ ...headFormData, demandNoLabel: e.target.value })}
                placeholder="e.g. Agriculture and Co-operation"
              />
            </div>

            <div>
              <Label className="text-xs">
                Major Head <span className="text-destructive">*</span>
              </Label>
              <Input
                value={headFormData.majorHead}
                onChange={(e) => setHeadFormData({ ...headFormData, majorHead: e.target.value })}
                placeholder="2403"
                className="font-mono"
              />
              {headFormErrors.majorHead && (
                <p className="text-xs text-destructive mt-1">{headFormErrors.majorHead}</p>
              )}
            </div>

            <div>
              <Label className="text-xs">Sub-Major Head</Label>
              <Input
                value={headFormData.subMajorHead}
                onChange={(e) => setHeadFormData({ ...headFormData, subMajorHead: e.target.value })}
                placeholder="00"
                className="font-mono"
              />
            </div>

            <div>
              <Label className="text-xs">
                Minor Head <span className="text-destructive">*</span>
              </Label>
              <Input
                value={headFormData.minorHead}
                onChange={(e) => setHeadFormData({ ...headFormData, minorHead: e.target.value })}
                placeholder="102"
                className="font-mono"
              />
              {headFormErrors.minorHead && (
                <p className="text-xs text-destructive mt-1">{headFormErrors.minorHead}</p>
              )}
            </div>

            <div>
              <Label className="text-xs">Sub Head</Label>
              <Input
                value={headFormData.subHead}
                onChange={(e) => setHeadFormData({ ...headFormData, subHead: e.target.value })}
                placeholder="00"
                className="font-mono"
              />
            </div>

            <div>
              <Label className="text-xs">
                Detailed Head <span className="text-destructive">*</span>
              </Label>
              <Input
                value={headFormData.detailedHead}
                onChange={(e) => setHeadFormData({ ...headFormData, detailedHead: e.target.value })}
                placeholder="00"
                className="font-mono"
              />
              {headFormErrors.detailedHead && (
                <p className="text-xs text-destructive mt-1">{headFormErrors.detailedHead}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={cancelHeadForm}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveHead} className="font-semibold gap-1">
              <Check className="h-4 w-4" /> {editingHeadId ? 'Update Head' : 'Add Head'}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        {filteredBudgetHeads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {budgetHeads.length === 0
              ? 'No Budget Heads configured yet. Click "Add Head" to create one.'
              : `No Budget Heads match "${searchQuery}".`}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left">Name</th>
                  <th scope="col" className="px-4 py-3 text-left">Head Chargeable</th>
                  <th scope="col" className="px-4 py-3 text-left">Demand</th>
                  <th scope="col" className="px-4 py-3 text-left">Major/Minor</th>
                  <th scope="col" className="px-4 py-3 text-center">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBudgetHeads.map((head) => (
                  <tr key={head.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{head.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground font-semibold">
                      {head.headChargeableCode}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{head.demandNo}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {head.majorHead} / {head.minorHead}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          head.isActive !== false
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {head.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit"
                          onClick={() => openEditHead(head)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          onClick={() => setDeleteTargetId(head.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="Delete Budget Head"
        message="Are you sure you want to delete this budget head? It will no longer appear in new bill wizards."
        confirmLabel="Delete Head"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
