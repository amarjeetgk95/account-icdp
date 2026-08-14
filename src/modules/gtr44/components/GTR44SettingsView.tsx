import React, { useState } from 'react';
import { useGTR44Store } from '../store/gtr44Store';
import { GTR44FormData } from '../types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { useToast } from '../../../hooks/use-toast';
import { Save, RotateCcw, Building2, BookOpen } from 'lucide-react';

export const GTR44SettingsView: React.FC = () => {
  const { formData, updateFormFields, resetToDefault } = useGTR44Store();
  const { toast } = useToast();

  const [localState, setLocalState] = useState<GTR44FormData>({ ...formData });

  const handleChange = <K extends keyof GTR44FormData>(field: K, value: GTR44FormData[K]) => {
    setLocalState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateFormFields(localState);
    toast({
      title: 'Settings Saved',
      description: 'Budget Head configuration & office details updated successfully.',
    });
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset budget settings to default configuration?')) {
      resetToDefault();
      setLocalState(useGTR44Store.getState().formData);
      toast({
        title: 'Settings Reset',
        description: 'Budget settings restored to default government standards.',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">GTR-44 Budget Head Configuration &amp; Office Setup</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure default office identifiers, DDO Cardex code, and classification heads.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Reset Defaults
          </Button>
          <Button size="sm" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
            <Save className="h-4 w-4 mr-1.5" /> Save Configuration
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Office & Treasury Metadata */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-200 pb-3 text-indigo-900">
            <Building2 className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-md text-gray-900">Office &amp; Treasury Metadata</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="col-span-2">
              <Label className="text-xs font-semibold text-gray-700">Office / Institution Name *</Label>
              <Input
                type="text"
                required
                value={localState.officeName}
                onChange={(e) => handleChange('officeName', e.target.value)}
                className="mt-1 font-medium"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Treasury Name *</Label>
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
              <Label className="text-xs font-semibold text-gray-700">DDO Cardex Full Identifier</Label>
              <Input
                type="text"
                value={localState.ddoCardexCode}
                onChange={(e) => handleChange('ddoCardexCode', e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Head of Account Classifications */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-gray-200 pb-3 text-indigo-900">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-md text-gray-900">Head of Account Classifications (Page 1)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
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
              <Label className="text-xs font-semibold text-gray-700">Demand No. (2-3 Digits)</Label>
              <Input
                type="text"
                maxLength={3}
                value={localState.demandNo}
                onChange={(e) => handleChange('demandNo', e.target.value)}
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

            <div>
              <Label className="text-xs font-semibold text-gray-700">Detailed Head (2 Digits)</Label>
              <Input
                type="text"
                maxLength={2}
                value={localState.detailedHead}
                onChange={(e) => handleChange('detailedHead', e.target.value)}
                className="mt-1 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Sector</Label>
              <Input
                type="text"
                value={localState.sector}
                onChange={(e) => handleChange('sector', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Major Head</Label>
              <Input
                type="text"
                value={localState.majorHead}
                onChange={(e) => handleChange('majorHead', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Sub-Major Head</Label>
              <Input
                type="text"
                value={localState.subMajorHead}
                onChange={(e) => handleChange('subMajorHead', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Minor Head</Label>
              <Input
                type="text"
                value={localState.minorHead}
                onChange={(e) => handleChange('minorHead', e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="col-span-2">
              <Label className="text-xs font-semibold text-gray-700">Sub Head</Label>
              <Input
                type="text"
                value={localState.subHead}
                onChange={(e) => handleChange('subHead', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6">
            <Save className="h-4 w-4 mr-1.5" /> Save All Configuration
          </Button>
        </div>
      </form>
    </div>
  );
};
