import { useState, useRef, useMemo } from 'react';
import { useGTR44SettingsStore } from '../../store/gtr44SettingsStore';
import { GTR44ObjectExpenditureItem } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  Download,
  Search,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  RotateCcw,
  Check,
} from 'lucide-react';
import {
  parseExpenditureItemsFromCsv,
  downloadExpenditureItemsCsv,
  normalizeEDPForStorage,
} from '../../utils/gtr44CsvExpenditure';

const EMPTY_EXPENDITURE_FORM: Omit<GTR44ObjectExpenditureItem, 'sortOrder'> = {
  code: '',
  name: '',
  nameGu: '',
  edpCode: '',
  isActive: true,
  amount: null,
};

export function ExpenditureItemsTab() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const expenditureItems = useGTR44SettingsStore((s) => s.expenditureItems);
  const addExpenditureItem = useGTR44SettingsStore((s) => s.addExpenditureItem);
  const updateExpenditureItem = useGTR44SettingsStore((s) => s.updateExpenditureItem);
  const deleteExpenditureItem = useGTR44SettingsStore((s) => s.deleteExpenditureItem);
  const reorderExpenditureItems = useGTR44SettingsStore((s) => s.reorderExpenditureItems);
  const resetExpenditureItems = useGTR44SettingsStore((s) => s.resetExpenditureItems);
  const bulkUpsertExpenditureItems = useGTR44SettingsStore((s) => s.bulkUpsertExpenditureItems);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [expFormData, setExpFormData] = useState<Omit<GTR44ObjectExpenditureItem, 'sortOrder'>>(
    EMPTY_EXPENDITURE_FORM
  );
  const [isAdding, setIsAdding] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteTargetIndex, setDeleteTargetIndex] = useState<number | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const activeCount = useMemo(
    () => expenditureItems.filter((it) => it.isActive !== false).length,
    [expenditureItems]
  );

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return expenditureItems.map((item, originalIndex) => ({ item, originalIndex }));
    }
    const q = searchQuery.toLowerCase().trim();
    return expenditureItems
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(
        ({ item }) =>
          item.code.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          (item.nameGu && item.nameGu.includes(q)) ||
          item.edpCode.toLowerCase().includes(q)
      );
  }, [expenditureItems, searchQuery]);

  const openAdd = () => {
    setEditingIndex(null);
    setExpFormData(EMPTY_EXPENDITURE_FORM);
    setFormErrors({});
    setIsAdding(true);
  };

  const openEdit = (item: GTR44ObjectExpenditureItem, originalIndex: number) => {
    setIsAdding(false);
    setEditingIndex(originalIndex);
    setExpFormData({
      code: item.code,
      name: item.name,
      nameGu: item.nameGu || '',
      edpCode: item.edpCode,
      isActive: item.isActive !== false,
      amount: null,
    });
    setFormErrors({});
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingIndex(null);
    setExpFormData(EMPTY_EXPENDITURE_FORM);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!expFormData.code.trim()) errs.code = 'Budget code is required (e.g. 0200, 1300)';
    if (!expFormData.name.trim()) errs.name = 'English name is required';
    if (!expFormData.edpCode.trim()) {
      errs.edpCode = 'EDP code is required (e.g. 0201+, 1304+)';
    } else {
      const normalized = expFormData.edpCode.replace(/\s+/g, '');
      if (!/^\d{3,4}[+-]?$/.test(normalized)) {
        errs.edpCode = 'EDP Code must be 3-4 digits followed by optional + or -';
      }
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    const itemData: Omit<GTR44ObjectExpenditureItem, 'sortOrder'> = {
      ...expFormData,
      edpCode: normalizeEDPForStorage(expFormData.edpCode),
      amount: null,
    };

    if (editingIndex !== null) {
      updateExpenditureItem(editingIndex, itemData);
      toast({ title: 'Item Updated', description: `Updated "${expFormData.name}" successfully.` });
    } else {
      addExpenditureItem(itemData);
      toast({ title: 'Item Added', description: `Added "${expFormData.name}" successfully.` });
    }
    cancelForm();
  };

  const handleConfirmDelete = () => {
    if (deleteTargetIndex === null) return;
    const targetItem = expenditureItems[deleteTargetIndex];
    if (activeCount <= 1 && targetItem?.isActive !== false) {
      toast({
        title: 'Cannot Delete',
        description: 'You must have at least one active expenditure item.',
        variant: 'destructive',
      });
      setDeleteTargetIndex(null);
      return;
    }
    deleteExpenditureItem(deleteTargetIndex);
    toast({ title: 'Item Deleted', description: 'Expenditure item was removed successfully.' });
    if (editingIndex === deleteTargetIndex) cancelForm();
    setDeleteTargetIndex(null);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= expenditureItems.length) return;
    reorderExpenditureItems(index, target);
  };

  const handleToggleActive = (item: GTR44ObjectExpenditureItem, originalIndex: number) => {
    const willBeActive = item.isActive === false;
    if (!willBeActive && activeCount <= 1) {
      toast({
        title: 'Cannot Deactivate',
        description: 'At least one active expenditure item is required.',
        variant: 'destructive',
      });
      return;
    }
    updateExpenditureItem(originalIndex, { isActive: willBeActive });
  };

  const handleExportCsv = () => {
    downloadExpenditureItemsCsv(expenditureItems, 'gtr44-expenditure-master.csv');
    toast({ title: 'CSV Exported', description: `Exported ${expenditureItems.length} expenditure rows.` });
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
      const { items, errors } = parseExpenditureItemsFromCsv(text);
      if (errors.length > 0) {
        toast({
          title: 'CSV Import Warnings',
          description: `Imported with ${errors.length} error(s): ${errors.slice(0, 2).join('; ')}`,
          variant: 'destructive',
        });
      }
      if (items.length > 0) {
        const { added, updated } = bulkUpsertExpenditureItems(items);
        toast({
          title: 'CSV Imported',
          description: `Imported ${items.length} items (${added} added, ${updated} updated).`,
        });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center space-x-2">
          <Building2 className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-bold text-base text-foreground">Expenditure Heads (22 Pre-printed Rows)</h3>
            <p className="text-xs text-muted-foreground">
              Configures the canonical Page 1 Object of Expenditure rows, budget codes, and EDP mappings.
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
          <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)} title="Reset 22 canonical rows">
            <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
          </Button>
          <Button size="sm" onClick={openAdd} className="font-semibold gap-1">
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      {/* Row count status pill */}
      <div
        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
          activeCount === 22
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
        }`}
      >
        <div className="flex items-center gap-2">
          {activeCount !== 22 && <AlertTriangle className="h-4 w-4 shrink-0" />}
          <span>
            <strong>{activeCount}</strong> active rows (Standard GTR-44 form format has <strong>22</strong> rows).
            {activeCount !== 22 && ' Non-standard counts may adjust printed Page 1 table geometry.'}
          </span>
        </div>
        <span className="font-semibold font-mono">{activeCount} / 22</span>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code, English/Gujarati name, EDP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {filteredItems.length} of {expenditureItems.length} items
        </span>
      </div>

      {/* Inline Form */}
      {(isAdding || editingIndex !== null) && (
        <div className="bg-muted/30 p-5 rounded-xl border border-border space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h4 className="font-bold text-sm text-foreground">
              {editingIndex !== null ? `Edit Row (${expFormData.code})` : 'Add New Expenditure Row'}
            </h4>
            <Button variant="ghost" size="sm" onClick={cancelForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <Label className="text-xs">
                Budget Code <span className="text-destructive">*</span>
              </Label>
              <Input
                value={expFormData.code}
                onChange={(e) => setExpFormData({ ...expFormData, code: e.target.value })}
                placeholder="e.g. 1300"
                disabled={editingIndex !== null}
                className="font-mono"
              />
              {formErrors.code && <p className="text-xs text-destructive mt-1">{formErrors.code}</p>}
            </div>

            <div>
              <Label className="text-xs">
                Name (English) <span className="text-destructive">*</span>
              </Label>
              <Input
                value={expFormData.name}
                onChange={(e) => setExpFormData({ ...expFormData, name: e.target.value })}
                placeholder="Office Expenses"
              />
              {formErrors.name && <p className="text-xs text-destructive mt-1">{formErrors.name}</p>}
            </div>

            <div>
              <Label className="text-xs">Name (Gujarati)</Label>
              <Input
                value={expFormData.nameGu}
                onChange={(e) => setExpFormData({ ...expFormData, nameGu: e.target.value })}
                placeholder="કચેરી ખર્ચ"
              />
            </div>

            <div>
              <Label className="text-xs">
                EDP Code <span className="text-destructive">*</span>
              </Label>
              <Input
                value={expFormData.edpCode}
                onChange={(e) => setExpFormData({ ...expFormData, edpCode: e.target.value })}
                placeholder="1304+"
                className="font-mono uppercase font-bold"
              />
              {formErrors.edpCode && <p className="text-xs text-destructive mt-1">{formErrors.edpCode}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={cancelForm}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="font-semibold gap-1">
              <Check className="h-4 w-4" /> {editingIndex !== null ? 'Update Row' : 'Add Row'}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="px-3 py-3 text-center w-12">#</th>
                <th scope="col" className="px-3 py-3 text-left">Code</th>
                <th scope="col" className="px-4 py-3 text-left">Object of Expenditure</th>
                <th scope="col" className="px-4 py-3 text-left">Gujarati Name</th>
                <th scope="col" className="px-4 py-3 text-center">EDP Code</th>
                <th scope="col" className="px-3 py-3 text-center">Status</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.map(({ item, originalIndex }, displayIdx) => (
                <tr key={item.code} className="hover:bg-muted/40 transition-colors">
                  <td className="px-3 py-3 text-center text-xs text-muted-foreground font-mono">
                    {displayIdx + 1}
                  </td>
                  <td className="px-3 py-3 font-mono font-semibold text-foreground">{item.code}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.nameGu || '—'}</td>
                  <td className="px-4 py-3 text-center font-mono text-xs font-bold text-foreground">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-muted border border-border">
                      {item.edpCode}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item, originalIndex)}
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                        item.isActive !== false
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {item.isActive !== false ? 'Active' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      {!searchQuery && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Move Up"
                            disabled={originalIndex === 0}
                            onClick={() => handleMove(originalIndex, 'up')}
                            className="h-7 w-7"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Move Down"
                            disabled={originalIndex === expenditureItems.length - 1}
                            onClick={() => handleMove(originalIndex, 'down')}
                            className="h-7 w-7"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Edit"
                        onClick={() => openEdit(item, originalIndex)}
                        className="h-7 w-7"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        onClick={() => setDeleteTargetIndex(originalIndex)}
                        className="h-7 w-7"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={deleteTargetIndex !== null}
        title="Delete Expenditure Item"
        message={`Are you sure you want to delete expenditure row "${deleteTargetIndex !== null ? expenditureItems[deleteTargetIndex]?.code : ''}"?`}
        confirmLabel="Delete Item"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetIndex(null)}
      />

      <ConfirmDialog
        open={showResetDialog}
        title="Reset to 22 Default Rows?"
        message="This will replace custom expenditure items with the canonical 22 government Gujarat Treasury expenditure rows. Existing bills will remain unchanged."
        confirmLabel="Reset Rows"
        danger
        onConfirm={() => {
          resetExpenditureItems();
          setShowResetDialog(false);
          toast({ title: 'Defaults Restored', description: 'Reset to 22 standard expenditure heads.' });
        }}
        onCancel={() => setShowResetDialog(false)}
      />
    </div>
  );
}
