import React, { useState } from 'react';
import {
  useGTR44SettingsStore,
  GTR44DefaultSettings,
} from '../store/gtr44SettingsStore';
import { GTR44BudgetHead } from '../types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { useToast } from '../../../hooks/use-toast';
import {
  Save,
  RotateCcw,
  Building2,
  ListTree,
  Plus,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';

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
};

export const GTR44SettingsView: React.FC = () => {
  const { saveSettings, resetSettings } = useGTR44SettingsStore();
  const { toast } = useToast();

  const [localState, setLocalState] = useState<GTR44DefaultSettings>({
    ...useGTR44SettingsStore.getState().settings,
  });

  const [headFormOpen, setHeadFormOpen] = useState(false);
  const [editingHeadId, setEditingHeadId] = useState<string | null>(null);
  const [headForm, setHeadForm] = useState<Omit<GTR44BudgetHead, 'id'>>({
    ...EMPTY_BUDGET_HEAD_FORM,
  });

  const budgetHeads = useGTR44SettingsStore((state) => state.budgetHeads);
  const addBudgetHead = useGTR44SettingsStore((state) => state.addBudgetHead);
  const updateBudgetHead = useGTR44SettingsStore((state) => state.updateBudgetHead);
  const deleteBudgetHead = useGTR44SettingsStore((state) => state.deleteBudgetHead);

  const handleChange = <K extends keyof GTR44DefaultSettings>(
    field: K,
    value: GTR44DefaultSettings[K]
  ) => {
    setLocalState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveDefaults = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(localState);
    toast({
      title: 'Settings Saved',
      description: 'Default entry details updated successfully.',
    });
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset budget settings to default configuration?')) {
      resetSettings();
      setLocalState({ ...useGTR44SettingsStore.getState().settings });
      toast({
        title: 'Settings Reset',
        description: 'Budget settings restored to default government standards.',
      });
    }
  };

  const openAddHead = () => {
    setEditingHeadId(null);
    setHeadForm({ ...EMPTY_BUDGET_HEAD_FORM });
    setHeadFormOpen(true);
  };

  const openEditHead = (head: GTR44BudgetHead) => {
    setEditingHeadId(head.id);
    setHeadForm({
      name: head.name,
      headChargeableCode: head.headChargeableCode,
      sector: head.sector,
      demandNo: head.demandNo,
      demandNoLabel: head.demandNoLabel,
      majorHead: head.majorHead,
      subMajorHead: head.subMajorHead,
      minorHead: head.minorHead,
      subHead: head.subHead,
      detailedHead: head.detailedHead,
    });
    setHeadFormOpen(true);
  };

  const handleSaveHead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headForm.name.trim()) {
      toast({ title: 'Validation Error', description: 'Budget Head name is required.', variant: 'destructive' });
      return;
    }
    if (editingHeadId) {
      updateBudgetHead(editingHeadId, headForm);
      toast({
        title: 'Budget Head Updated',
        description: 'The modified Budget Head is now available for selection.',
      });
    } else {
      addBudgetHead(headForm);
      toast({
        title: 'Budget Head Added',
        description: 'The new Budget Head is now available for selection in the second tab.',
      });
    }
    setHeadFormOpen(false);
    setEditingHeadId(null);
  };

  const handleDeleteHead = (head: GTR44BudgetHead) => {
    if (confirm(`Delete Budget Head &quot;${head.name}&quot;? This cannot be undone.`)) {
      deleteBudgetHead(head.id);
      toast({ title: 'Budget Head Deleted', description: `${head.name} removed.` });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">GTR-44 Settings</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage Budget Heads and the fixed Default Entry details used for every GTR-44 bill.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Reset Defaults
          </Button>
        </div>
      </div>

      {/* 4.1 Budget Head Insert Module */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 text-indigo-900">
          <div className="flex items-center space-x-2">
            <ListTree className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-md text-gray-900">Budget Head Insert</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Insert new or modify existing Budget Heads. Changes become available for selection
                in the Budget Head Selection tab of the bill form.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={openAddHead} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
            <Plus className="h-4 w-4 mr-1" /> Add Budget Head
          </Button>
        </div>

        {budgetHeads.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            No Budget Heads yet. Click &quot;Add Budget Head&quot; to create one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Head Chargeable</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Major Head</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {budgetHeads.map((head) => (
                  <tr key={head.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{head.name}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{head.headChargeableCode}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{head.majorHead}</td>
                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                      <button
                        onClick={() => openEditHead(head)}
                        className="text-gray-400 hover:text-blue-600 transition-colors mr-3"
                        title="Modify Budget Head"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteHead(head)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Budget Head"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {headFormOpen && (
          <form
            onSubmit={handleSaveHead}
            className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-gray-900">
                {editingHeadId ? 'Modify Budget Head' : 'Insert New Budget Head'}
              </h4>
              <button
                type="button"
                onClick={() => setHeadFormOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="col-span-2">
                <Label className="text-xs font-semibold text-gray-700">Budget Head Name *</Label>
                <Input
                  required
                  value={headForm.name}
                  onChange={(e) => setHeadForm({ ...headForm, name: e.target.value })}
                  className="mt-1 font-medium"
                  placeholder="e.g. ANH-06 Intensive Cattle Development Programme"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">Head Chargeable Code</Label>
                <Input
                  value={headForm.headChargeableCode}
                  onChange={(e) => setHeadForm({ ...headForm, headChargeableCode: e.target.value })}
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">Sector</Label>
                <Input
                  value={headForm.sector}
                  onChange={(e) => setHeadForm({ ...headForm, sector: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">Demand No.</Label>
                <Input
                  value={headForm.demandNo}
                  onChange={(e) => setHeadForm({ ...headForm, demandNo: e.target.value })}
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">Demand No. Label</Label>
                <Input
                  value={headForm.demandNoLabel}
                  onChange={(e) => setHeadForm({ ...headForm, demandNoLabel: e.target.value })}
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">Major Head</Label>
                <Input
                  value={headForm.majorHead}
                  onChange={(e) => setHeadForm({ ...headForm, majorHead: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">Sub-Major Head</Label>
                <Input
                  value={headForm.subMajorHead}
                  onChange={(e) => setHeadForm({ ...headForm, subMajorHead: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">Minor Head</Label>
                <Input
                  value={headForm.minorHead}
                  onChange={(e) => setHeadForm({ ...headForm, minorHead: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">Sub Head</Label>
                <Input
                  value={headForm.subHead}
                  onChange={(e) => setHeadForm({ ...headForm, subHead: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">Detailed Head (2 Digits)</Label>
                <Input
                  maxLength={2}
                  value={headForm.detailedHead}
                  onChange={(e) => setHeadForm({ ...headForm, detailedHead: e.target.value })}
                  className="mt-1 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setHeadFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                <Save className="h-4 w-4 mr-1.5" />
                {editingHeadId ? 'Save Changes' : 'Insert Budget Head'}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* 4.2 Default Entry */}
      <form onSubmit={handleSaveDefaults} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-200 pb-3 text-indigo-900">
            <Building2 className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-md text-gray-900">Default Entry</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Details that are generally fixed and do not change with each voucher entry.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <Label className="text-xs font-semibold text-gray-700">DDO Cardex No.</Label>
              <Input
                type="text"
                value={localState.ddoCardexCode}
                onChange={(e) => handleChange('ddoCardexCode', e.target.value)}
                className="mt-1 font-mono"
                placeholder="Code No.299 - Cardex No.22"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Grant Allocation Year (From)</Label>
              <Input
                type="number"
                value={localState.budgetGrantYearFrom}
                onChange={(e) => handleChange('budgetGrantYearFrom', e.target.value)}
                className="mt-1 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Grant Allocation Year (To)</Label>
              <Input
                type="number"
                maxLength={2}
                value={localState.budgetGrantYearTo}
                onChange={(e) => handleChange('budgetGrantYearTo', e.target.value)}
                className="mt-1 font-mono"
                placeholder="e.g. 27"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Treasury Name</Label>
              <Input
                type="text"
                required
                value={localState.treasuryName}
                onChange={(e) => handleChange('treasuryName', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">District Code (2 Digits)</Label>
              <Input
                type="text"
                maxLength={2}
                value={localState.district}
                onChange={(e) => handleChange('district', e.target.value)}
                className="mt-1 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Pay-To Designation</Label>
              <Input
                type="text"
                value={localState.payToDesignation}
                onChange={(e) => handleChange('payToDesignation', e.target.value)}
                className="mt-1"
                placeholder="e.g. Junior Clerk"
              />
            </div>

            <div className="col-span-2">
              <Label className="text-xs font-semibold text-gray-700">Office / Institution Name</Label>
              <Input
                type="text"
                required
                value={localState.officeName}
                onChange={(e) => handleChange('officeName', e.target.value)}
                className="mt-1 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Office Classification Codes (fixed per office) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-200 pb-3 text-indigo-900">
            <h3 className="font-bold text-md text-gray-900">Office Classification Codes</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Drawing DDO Code (3 Digits)</Label>
              <Input
                type="text"
                maxLength={3}
                value={localState.drawing}
                onChange={(e) => handleChange('drawing', e.target.value)}
                className="mt-1 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Class of Expenditure (1 Digit)</Label>
              <Input
                type="text"
                maxLength={1}
                value={localState.classOfExpenditure}
                onChange={(e) => handleChange('classOfExpenditure', e.target.value)}
                className="mt-1 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Fund (1 Digit)</Label>
              <Input
                type="text"
                maxLength={1}
                value={localState.fund}
                onChange={(e) => handleChange('fund', e.target.value)}
                className="mt-1 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Type of Budget (1 Digit)</Label>
              <Input
                type="text"
                maxLength={1}
                value={localState.typeOfBudget}
                onChange={(e) => handleChange('typeOfBudget', e.target.value)}
                className="mt-1 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Scheme No. (4-6 Digits)</Label>
              <Input
                type="text"
                maxLength={6}
                value={localState.schemeNo}
                onChange={(e) => handleChange('schemeNo', e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6">
              <Save className="h-4 w-4 mr-1.5" /> Save Default Entry
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
