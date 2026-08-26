import { useState, useRef, useMemo } from 'react';
import { useGTR44SettingsStore } from '../../store/gtr44SettingsStore';
import { GTR44EDPCode, GTR44DeductionTemplate } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  Download,
  Search,
  RotateCcw,
  Check,
} from 'lucide-react';

const EMPTY_EDP_FORM: GTR44EDPCode = {
  code: '',
  nameEn: '',
  nameGu: '',
  type: 'expenditure',
  isActive: true,
};

const EMPTY_DEDUCTION_FORM: GTR44DeductionTemplate = {
  code: '',
  label: '',
  rateDefault: undefined,
  isGst: false,
};

// CSV Helpers for EDP catalog
const EDP_CSV_HEADERS = ['code', 'nameEn', 'nameGu', 'type', 'isActive'] as const;

function escapeCsv(value: string): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCsvLineSimple(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  result.push(cur.trim());
  return result.map((v) => (v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1).replace(/""/g, '"') : v));
}

function exportEdpCodesToCsv(codes: GTR44EDPCode[]): string {
  const headers = EDP_CSV_HEADERS.join(',');
  const rows = codes.map((c) =>
    EDP_CSV_HEADERS.map((k) => {
      const val = (c as unknown as Record<string, unknown>)[k];
      if (val === undefined || val === null) return '';
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      return escapeCsv(String(val));
    }).join(',')
  );
  return [headers, ...rows].join('\n');
}

function parseEdpCodesFromCsv(csvText: string): { codes: GTR44EDPCode[]; errors: string[] } {
  const codes: GTR44EDPCode[] = [];
  const errors: string[] = [];
  if (!csvText || !csvText.trim()) {
    errors.push('CSV is empty');
    return { codes, errors };
  }
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) {
    errors.push('CSV is empty');
    return { codes, errors };
  }
  const headers = parseCsvLineSimple(lines[0]).map((h) => h.trim());
  const required = ['code', 'nameEn', 'type'];
  for (const r of required) {
    if (!headers.includes(r)) errors.push(`Missing required header: ${r}`);
  }
  if (errors.length > 0) return { codes, errors };
  const idx: Record<string, number> = {};
  headers.forEach((h, i) => {
    idx[h] = i;
  });
  const codeRegex = /^\d{3,4}[+-]?$/;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLineSimple(lines[i]);
    const get = (k: string) => {
      const p = idx[k];
      return p === undefined || p >= cols.length ? '' : cols[p]?.trim() ?? '';
    };
    const codeRaw = get('code');
    const nameEn = get('nameEn');
    const nameGu = get('nameGu');
    const typeRaw = get('type');
    const isActiveRaw = get('isActive');
    const rowNum = i + 1;
    if (!codeRaw) {
      errors.push(`Row ${rowNum}: code is required`);
      continue;
    }
    const normalized = codeRaw.replace(/\s+/g, '').toUpperCase();
    if (!codeRegex.test(normalized)) {
      errors.push(`Row ${rowNum}: code "${codeRaw}" must be 3-4 digits (e.g. 1304+, 9510-)`);
      continue;
    }
    if (!nameEn) {
      errors.push(`Row ${rowNum}: nameEn is required`);
      continue;
    }
    let isActive = true;
    if (isActiveRaw !== '') {
      const low = isActiveRaw.toLowerCase();
      if (low === 'false' || low === '0' || low === 'no') isActive = false;
    }
    codes.push({
      code: normalized,
      nameEn: nameEn.trim(),
      nameGu: nameGu.trim(),
      type: (typeRaw as 'expenditure' | 'deduction') || 'expenditure',
      isActive,
    });
  }
  return { codes, errors };
}

export function EdpCatalogTab() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const edpCodes = useGTR44SettingsStore((s) => s.edpCodes);
  const addEdpCode = useGTR44SettingsStore((s) => s.addEdpCode);
  const updateEdpCode = useGTR44SettingsStore((s) => s.updateEdpCode);
  const deleteEdpCode = useGTR44SettingsStore((s) => s.deleteEdpCode);
  const resetEdpCodes = useGTR44SettingsStore((s) => s.resetEdpCodes);
  const bulkUpsertEdpCodes = useGTR44SettingsStore((s) => s.bulkUpsertEdpCodes);

  const deductionTemplates = useGTR44SettingsStore((s) => s.deductionTemplates);
  const addDeductionTemplate = useGTR44SettingsStore((s) => s.addDeductionTemplate);
  const updateDeductionTemplate = useGTR44SettingsStore((s) => s.updateDeductionTemplate);
  const deleteDeductionTemplate = useGTR44SettingsStore((s) => s.deleteDeductionTemplate);
  const resetDeductionTemplates = useGTR44SettingsStore((s) => s.resetDeductionTemplates);

  const [activeCatalogSubTab, setActiveCatalogSubTab] = useState<'edp' | 'deductions'>('edp');
  const [searchQuery, setSearchQuery] = useState('');

  // EDP Form state
  const [editingEdpCode, setEditingEdpCode] = useState<string | null>(null);
  const [edpFormData, setEdpFormData] = useState<GTR44EDPCode>(EMPTY_EDP_FORM);
  const [isAddingEdp, setIsAddingEdp] = useState(false);
  const [edpFormErrors, setEdpFormErrors] = useState<Record<string, string>>({});
  const [deleteEdpTarget, setDeleteEdpTarget] = useState<string | null>(null);
  const [showEdpResetDialog, setShowEdpResetDialog] = useState(false);

  // Deduction Form state
  const [editingDeductCode, setEditingDeductCode] = useState<string | null>(null);
  const [deductFormData, setDeductFormData] = useState<GTR44DeductionTemplate>(EMPTY_DEDUCTION_FORM);
  const [isAddingDeduct, setIsAddingDeduct] = useState(false);
  const [deductFormErrors, setDeductFormErrors] = useState<Record<string, string>>({});
  const [deleteDeductTarget, setDeleteDeductTarget] = useState<string | null>(null);
  const [showDeductResetDialog, setShowDeductResetDialog] = useState(false);

  const filteredEdpCodes = useMemo(() => {
    if (!searchQuery.trim()) return edpCodes;
    const q = searchQuery.toLowerCase().trim();
    return edpCodes.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        (c.nameGu && c.nameGu.includes(q)) ||
        c.type.toLowerCase().includes(q)
    );
  }, [edpCodes, searchQuery]);

  const filteredDeductions = useMemo(() => {
    if (!searchQuery.trim()) return deductionTemplates;
    const q = searchQuery.toLowerCase().trim();
    return deductionTemplates.filter(
      (d) => d.code.toLowerCase().includes(q) || d.label.toLowerCase().includes(q)
    );
  }, [deductionTemplates, searchQuery]);

  // EDP actions
  const openAddEdp = () => {
    setEditingEdpCode(null);
    setEdpFormData(EMPTY_EDP_FORM);
    setEdpFormErrors({});
    setIsAddingEdp(true);
  };

  const openEditEdp = (c: GTR44EDPCode) => {
    setIsAddingEdp(false);
    setEditingEdpCode(c.code);
    setEdpFormData({ ...c });
    setEdpFormErrors({});
  };

  const cancelEdpForm = () => {
    setIsAddingEdp(false);
    setEditingEdpCode(null);
    setEdpFormData(EMPTY_EDP_FORM);
    setEdpFormErrors({});
  };

  const handleSaveEdp = () => {
    const errs: Record<string, string> = {};
    if (!edpFormData.code.trim()) errs.code = 'Code is required';
    else if (!/^\d{3,4}[+-]?$/.test(edpFormData.code.replace(/\s+/g, ''))) {
      errs.code = 'Code must be 3-4 digits followed by + or -';
    }
    if (!edpFormData.nameEn.trim()) errs.nameEn = 'English name is required';
    setEdpFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (editingEdpCode) {
      updateEdpCode(editingEdpCode, edpFormData);
      toast({ title: 'EDP Code Updated', description: `Updated "${edpFormData.code}" successfully.` });
    } else {
      addEdpCode(edpFormData);
      toast({ title: 'EDP Code Added', description: `Added "${edpFormData.code}" successfully.` });
    }
    cancelEdpForm();
  };

  const handleConfirmDeleteEdp = () => {
    if (!deleteEdpTarget) return;
    deleteEdpCode(deleteEdpTarget);
    toast({ title: 'EDP Code Deleted', description: `Removed code "${deleteEdpTarget}".` });
    if (editingEdpCode === deleteEdpTarget) cancelEdpForm();
    setDeleteEdpTarget(null);
  };

  // Deduction actions
  const openAddDeduct = () => {
    setEditingDeductCode(null);
    setDeductFormData(EMPTY_DEDUCTION_FORM);
    setDeductFormErrors({});
    setIsAddingDeduct(true);
  };

  const openEditDeduct = (d: GTR44DeductionTemplate) => {
    setIsAddingDeduct(false);
    setEditingDeductCode(d.code);
    setDeductFormData({ ...d });
    setDeductFormErrors({});
  };

  const cancelDeductForm = () => {
    setIsAddingDeduct(false);
    setEditingDeductCode(null);
    setDeductFormData(EMPTY_DEDUCTION_FORM);
    setDeductFormErrors({});
  };

  const handleSaveDeduct = () => {
    const errs: Record<string, string> = {};
    if (!deductFormData.code.trim()) errs.code = 'Code is required (e.g. 9510)';
    if (!deductFormData.label.trim()) errs.label = 'Label is required (e.g. Income Tax)';
    setDeductFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (editingDeductCode) {
      updateDeductionTemplate(editingDeductCode, deductFormData);
      toast({ title: 'Template Updated', description: `Updated "${deductFormData.label}".` });
    } else {
      addDeductionTemplate(deductFormData);
      toast({ title: 'Template Added', description: `Added "${deductFormData.label}".` });
    }
    cancelDeductForm();
  };

  const handleConfirmDeleteDeduct = () => {
    if (!deleteDeductTarget) return;
    deleteDeductionTemplate(deleteDeductTarget);
    toast({ title: 'Template Deleted', description: `Removed template "${deleteDeductTarget}".` });
    if (editingDeductCode === deleteDeductTarget) cancelDeductForm();
    setDeleteDeductTarget(null);
  };

  const handleExportEdpCsv = () => {
    const csv = exportEdpCodesToCsv(edpCodes);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gtr44-edp-codes.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'CSV Exported', description: `Exported ${edpCodes.length} EDP codes.` });
  };

  const handleImportEdpCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = String(evt.target?.result || '');
      const { codes, errors } = parseEdpCodesFromCsv(text);
      if (errors.length > 0) {
        toast({
          title: 'CSV Import Warnings',
          description: `Imported with ${errors.length} error(s): ${errors.slice(0, 2).join('; ')}`,
          variant: 'destructive',
        });
      }
      if (codes.length > 0) {
        const { added, updated } = bulkUpsertEdpCodes(codes);
        toast({
          title: 'CSV Imported',
          description: `Imported ${codes.length} EDP codes (${added} added, ${updated} updated).`,
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
          <Tag className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-bold text-base text-foreground">EDP Codes &amp; Deduction Templates</h3>
            <p className="text-xs text-muted-foreground">
              Manage Gujarat EDP classification codes for automatic voucher-to-bill aggregation and deduction line items.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeCatalogSubTab === 'edp' ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportEdpCsv}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                title="Import EDP CSV"
              >
                <Upload className="h-4 w-4 mr-1.5" /> Import
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportEdpCsv} title="Export EDP CSV">
                <Download className="h-4 w-4 mr-1.5" /> Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowEdpResetDialog(true)}>
                <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
              </Button>
              <Button size="sm" onClick={openAddEdp} className="font-semibold gap-1">
                <Plus className="h-4 w-4" /> Add Code
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowDeductResetDialog(true)}>
                <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
              </Button>
              <Button size="sm" onClick={openAddDeduct} className="font-semibold gap-1">
                <Plus className="h-4 w-4" /> Add Template
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <Tabs
        value={activeCatalogSubTab}
        onValueChange={(v) => {
          setActiveCatalogSubTab(v as 'edp' | 'deductions');
          setSearchQuery('');
        }}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
          <TabsList>
            <TabsTrigger value="edp">EDP Codes ({edpCodes.length})</TabsTrigger>
            <TabsTrigger value="deductions">Deduction Templates ({deductionTemplates.length})</TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeCatalogSubTab === 'edp' ? 'EDP codes...' : 'deductions...'}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-sm"
            />
          </div>
        </div>

        {/* EDP Codes Tab Content */}
        <TabsContent value="edp" className="space-y-4 m-0">
          {(isAddingEdp || editingEdpCode) && (
            <div className="bg-muted/30 p-5 rounded-xl border border-border space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="font-bold text-sm text-foreground">
                  {editingEdpCode ? `Edit EDP Code (${editingEdpCode})` : 'Add New EDP Code'}
                </h4>
                <Button variant="ghost" size="sm" onClick={cancelEdpForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <Label className="text-xs">
                    Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={edpFormData.code}
                    onChange={(e) => setEdpFormData({ ...edpFormData, code: e.target.value })}
                    placeholder="e.g. 1304+"
                    disabled={!!editingEdpCode}
                    className="font-mono uppercase font-bold"
                  />
                  {edpFormErrors.code && <p className="text-xs text-destructive mt-1">{edpFormErrors.code}</p>}
                </div>

                <div>
                  <Label className="text-xs">
                    English Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={edpFormData.nameEn}
                    onChange={(e) => setEdpFormData({ ...edpFormData, nameEn: e.target.value })}
                    placeholder="e.g. Office Expenses"
                  />
                  {edpFormErrors.nameEn && (
                    <p className="text-xs text-destructive mt-1">{edpFormErrors.nameEn}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs">Gujarati Name</Label>
                  <Input
                    value={edpFormData.nameGu}
                    onChange={(e) => setEdpFormData({ ...edpFormData, nameGu: e.target.value })}
                    placeholder="કચેરી ખર્ચ"
                  />
                </div>

                <div>
                  <Label className="text-xs">Type</Label>
                  <select
                    className="input text-sm"
                    value={edpFormData.type}
                    onChange={(e) =>
                      setEdpFormData({
                        ...edpFormData,
                        type: e.target.value as 'expenditure' | 'deduction',
                      })
                    }
                  >
                    <option value="expenditure">Expenditure (+)</option>
                    <option value="deduction">Deduction (-)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={cancelEdpForm}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdp} className="font-semibold gap-1">
                  <Check className="h-4 w-4" /> {editingEdpCode ? 'Update Code' : 'Add Code'}
                </Button>
              </div>
            </div>
          )}

          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left">Code</th>
                  <th scope="col" className="px-4 py-3 text-left">English Name</th>
                  <th scope="col" className="px-4 py-3 text-left">Gujarati Name</th>
                  <th scope="col" className="px-4 py-3 text-center">Type</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEdpCodes.map((c) => (
                  <tr key={c.code} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-foreground">{c.code}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{c.nameEn}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.nameGu || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          c.type === 'expenditure'
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {c.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => openEditEdp(c)}>
                          <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          onClick={() => setDeleteEdpTarget(c.code)}
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
        </TabsContent>

        {/* Deductions Tab Content */}
        <TabsContent value="deductions" className="space-y-4 m-0">
          {(isAddingDeduct || editingDeductCode) && (
            <div className="bg-muted/30 p-5 rounded-xl border border-border space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="font-bold text-sm text-foreground">
                  {editingDeductCode
                    ? `Edit Deduction (${editingDeductCode})`
                    : 'Add New Deduction Template'}
                </h4>
                <Button variant="ghost" size="sm" onClick={cancelDeductForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <Label className="text-xs">
                    Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={deductFormData.code}
                    onChange={(e) => setDeductFormData({ ...deductFormData, code: e.target.value })}
                    placeholder="e.g. 9510"
                    disabled={!!editingDeductCode}
                    className="font-mono uppercase font-bold"
                  />
                  {deductFormErrors.code && (
                    <p className="text-xs text-destructive mt-1">{deductFormErrors.code}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs">
                    Label <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={deductFormData.label}
                    onChange={(e) => setDeductFormData({ ...deductFormData, label: e.target.value })}
                    placeholder="Income Tax"
                  />
                  {deductFormErrors.label && (
                    <p className="text-xs text-destructive mt-1">{deductFormErrors.label}</p>
                  )}
                </div>

                <div>
                  <Label className="text-xs">Default Rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={deductFormData.rateDefault !== undefined ? deductFormData.rateDefault : ''}
                    onChange={(e) =>
                      setDeductFormData({
                        ...deductFormData,
                        rateDefault: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="Optional, e.g. 2.0"
                    className="font-mono"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={deductFormData.isGst}
                      onChange={(e) => setDeductFormData({ ...deductFormData, isGst: e.target.checked })}
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    Is GST deduction line?
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={cancelDeductForm}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveDeduct} className="font-semibold gap-1">
                  <Check className="h-4 w-4" /> {editingDeductCode ? 'Update Template' : 'Add Template'}
                </Button>
              </div>
            </div>
          )}

          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left">Code</th>
                  <th scope="col" className="px-4 py-3 text-left">Label</th>
                  <th scope="col" className="px-4 py-3 text-center">Default Rate</th>
                  <th scope="col" className="px-4 py-3 text-center">GST Classification</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDeductions.map((d) => (
                  <tr key={d.code} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-foreground">{d.code}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{d.label}</td>
                    <td className="px-4 py-3 text-center font-mono text-muted-foreground">
                      {d.rateDefault !== undefined ? `${d.rateDefault}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {d.isGst ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                          GST Item
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs font-mono">EDP Standard</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit"
                          onClick={() => openEditDeduct(d)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          onClick={() => setDeleteDeductTarget(d.code)}
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
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteEdpTarget !== null}
        title="Delete EDP Code"
        message={`Are you sure you want to delete EDP code "${deleteEdpTarget}"?`}
        confirmLabel="Delete Code"
        danger
        onConfirm={handleConfirmDeleteEdp}
        onCancel={() => setDeleteEdpTarget(null)}
      />

      <ConfirmDialog
        open={showEdpResetDialog}
        title="Reset EDP Codes to Default?"
        message="This will restore the standard Gujarat EDP code catalog (0201+, 1304+, 9510-, etc.)."
        confirmLabel="Reset Catalog"
        danger
        onConfirm={() => {
          resetEdpCodes();
          setShowEdpResetDialog(false);
          toast({ title: 'EDP Codes Reset', description: 'Restored default EDP catalog.' });
        }}
        onCancel={() => setShowEdpResetDialog(false)}
      />

      <ConfirmDialog
        open={deleteDeductTarget !== null}
        title="Delete Deduction Template"
        message={`Are you sure you want to delete template "${deleteDeductTarget}"?`}
        confirmLabel="Delete Template"
        danger
        onConfirm={handleConfirmDeleteDeduct}
        onCancel={() => setDeleteDeductTarget(null)}
      />

      <ConfirmDialog
        open={showDeductResetDialog}
        title="Reset Deduction Templates?"
        message="This will restore standard Gujarat deduction templates (9510 Income Tax, 9520 Surcharge, 9600 SD, 9910 Misc, GST)."
        confirmLabel="Reset Templates"
        danger
        onConfirm={() => {
          resetDeductionTemplates();
          setShowDeductResetDialog(false);
          toast({ title: 'Deductions Reset', description: 'Restored standard deduction templates.' });
        }}
        onCancel={() => setShowDeductResetDialog(false)}
      />
    </div>
  );
}
