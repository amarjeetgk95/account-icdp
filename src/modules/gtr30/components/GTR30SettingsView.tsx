import { useState } from 'react';
import {
  useGTR30Settings,
  useSaveGTR30Settings,
  useResetGTR30Settings,
} from '../hooks/useGTR30Settings';
import type { GTR30DefaultSettings, GTR30DefaultEmployeeTemplate } from '../types/settings';
import type { GTR30PostItem } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Save,
  RotateCcw,
  Building2,
  UserCog,
  TreePine,
  FileText,
  UserRound,
  Plus,
  Trash2,
} from 'lucide-react';
import { GTR30BillCodeMappingView } from './GTR30BillCodeMappingView';

const EMPTY_POST: GTR30PostItem = {
  id: '',
  srNo: '',
  designation: '',
  cadreClass: '૩',
  sanctioned: 1,
  filled: 0,
  vacant: 1,
  total: 1,
};

export function GTR30SettingsView() {
  const { toast } = useToast();
  const settingsQuery = useGTR30Settings();
  const saveMutation = useSaveGTR30Settings();
  const resetMutation = useResetGTR30Settings();

  const initial = settingsQuery.data;
  const [localSettings, setLocalSettings] = useState<GTR30DefaultSettings>(() => ({
    ...(initial?.settings ?? ({} as GTR30DefaultSettings)),
  }));
  const [localTemplate, setLocalTemplate] = useState<GTR30DefaultEmployeeTemplate>(() => ({
    ...(initial?.employeeTemplate ?? ({} as GTR30DefaultEmployeeTemplate)),
  }));
  const [localPosts, setLocalPosts] = useState<GTR30PostItem[]>(() =>
    (initial?.defaultPosts ?? []).map((p) => ({ ...p }))
  );

  const handleSettingChange = <K extends keyof GTR30DefaultSettings>(
    field: K,
    value: GTR30DefaultSettings[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleTemplateChange = <K extends keyof GTR30DefaultEmployeeTemplate>(
    field: K,
    value: GTR30DefaultEmployeeTemplate[K]
  ) => {
    setLocalTemplate((prev) => ({ ...prev, [field]: value }));
  };

  const updatePost = (id: string, field: keyof GTR30PostItem, value: string | number) => {
    setLocalPosts((prev) =>
      prev.map((post) => {
        if (post.id !== id) return post;
        const updated = { ...post, [field]: value };
        if (field === 'sanctioned' || field === 'filled') {
          const sanc = Number(field === 'sanctioned' ? value : post.sanctioned) || 0;
          const fill = Number(field === 'filled' ? value : post.filled) || 0;
          updated.vacant = Math.max(0, sanc - fill);
          updated.total = sanc;
        }
        return updated;
      })
    );
  };

  const addPost = () => {
    setLocalPosts((prev) => [
      ...prev,
      { ...EMPTY_POST, id: crypto.randomUUID(), srNo: String(prev.length + 1) },
    ]);
  };

  const removePost = (id: string) => {
    setLocalPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSave = async () => {
    await saveMutation.mutateAsync({
      settings: localSettings,
      employeeTemplate: localTemplate,
      defaultPosts: localPosts,
    });
    toast({
      title: 'Settings Saved',
      description: 'GTR-30 reusable defaults updated.',
    });
  };

  const handleReset = async () => {
    if (!confirm('Reset all GTR-30 settings to defaults?')) return;
    const reset = await resetMutation.mutateAsync();
    setLocalSettings({ ...reset.settings });
    setLocalTemplate({ ...reset.employeeTemplate });
    setLocalPosts(reset.defaultPosts.map((p) => ({ ...p })));
    toast({ title: 'Settings Reset', description: 'Defaults restored.' });
  };

  return (
    <div className="space-y-6">
      {/* Office & Treasury */}
      <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Building2 className="h-5 w-5 text-blue-600" />
          <h2 className="font-bold text-md text-slate-900">Office &amp; Treasury Defaults</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label className="text-xs">Office Name (Short)</Label>
            <Input
              value={localSettings.officeName}
              onChange={(e) => handleSettingChange('officeName', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Office Full Name</Label>
            <Input
              value={localSettings.officeFullName}
              onChange={(e) => handleSettingChange('officeFullName', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Branch Name (Gujarati)</Label>
            <Input
              value={localSettings.branchName}
              onChange={(e) => handleSettingChange('branchName', e.target.value)}
              className="font-serif"
            />
          </div>
          <div>
            <Label className="text-xs">Treasury Name</Label>
            <Input
              value={localSettings.treasuryName}
              onChange={(e) => handleSettingChange('treasuryName', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Station</Label>
            <Input
              value={localSettings.station}
              onChange={(e) => handleSettingChange('station', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">District Code</Label>
            <Input
              value={localSettings.district}
              onChange={(e) => handleSettingChange('district', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Office Phone</Label>
            <Input
              value={localSettings.phoneNo}
              onChange={(e) => handleSettingChange('phoneNo', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Cardex No.</Label>
            <Input
              value={localSettings.cardexNo}
              onChange={(e) => handleSettingChange('cardexNo', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">DDO Code</Label>
            <Input
              value={localSettings.ddoCode}
              onChange={(e) => handleSettingChange('ddoCode', e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Drawing Officer */}
      <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <UserCog className="h-5 w-5 text-blue-600" />
          <h2 className="font-bold text-md text-slate-900">Drawing Officer &amp; Messenger Defaults</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label className="text-xs">Drawing Officer Name</Label>
            <Input
              value={localSettings.drawingOfficerName}
              onChange={(e) => handleSettingChange('drawingOfficerName', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Drawing Officer Name (Gujarati)</Label>
            <Input
              value={localSettings.drawingOfficerNameGujarati}
              onChange={(e) => handleSettingChange('drawingOfficerNameGujarati', e.target.value)}
              className="font-serif"
            />
          </div>
          <div>
            <Label className="text-xs">Designation</Label>
            <Input
              value={localSettings.drawingOfficerDesignation}
              onChange={(e) => handleSettingChange('drawingOfficerDesignation', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Designation (Gujarati)</Label>
            <Input
              value={localSettings.drawingOfficerDesignationGujarati}
              onChange={(e) =>
                handleSettingChange('drawingOfficerDesignationGujarati', e.target.value)
              }
              className="font-serif"
            />
          </div>
          <div>
            <Label className="text-xs">Office</Label>
            <Input
              value={localSettings.drawingOfficerOffice}
              onChange={(e) => handleSettingChange('drawingOfficerOffice', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Office (Gujarati)</Label>
            <Input
              value={localSettings.drawingOfficerOfficeGujarati}
              onChange={(e) => handleSettingChange('drawingOfficerOfficeGujarati', e.target.value)}
              className="font-serif"
            />
          </div>
          <div>
            <Label className="text-xs">Drawing Officer Code</Label>
            <Input
              value={localSettings.drawingOfficer}
              onChange={(e) => handleSettingChange('drawingOfficer', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Messenger Name</Label>
            <Input
              value={localSettings.messengerName}
              onChange={(e) => handleSettingChange('messengerName', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Messenger Designation</Label>
            <Input
              value={localSettings.messengerDesignation}
              onChange={(e) => handleSettingChange('messengerDesignation', e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Budget Classification */}
      <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <TreePine className="h-5 w-5 text-blue-600" />
          <h2 className="font-bold text-md text-slate-900">Budget Classification Defaults</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label className="text-xs">Class of Expenditure</Label>
            <Input
              value={localSettings.classOfExpenditure}
              onChange={(e) => handleSettingChange('classOfExpenditure', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Fund</Label>
            <Input
              value={localSettings.fund}
              onChange={(e) => handleSettingChange('fund', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Demand No.</Label>
            <Input
              value={localSettings.demandNo}
              onChange={(e) => handleSettingChange('demandNo', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Type of Budget</Label>
            <Input
              value={localSettings.typeOfBudget}
              onChange={(e) => handleSettingChange('typeOfBudget', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Scheme No.</Label>
            <Input
              value={localSettings.schemeNo}
              onChange={(e) => handleSettingChange('schemeNo', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Budget Year</Label>
            <Input
              value={localSettings.budgetYear}
              onChange={(e) => handleSettingChange('budgetYear', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Head Chargeable (13 Digits)</Label>
            <Input
              value={localSettings.headChargeable}
              onChange={(e) => handleSettingChange('headChargeable', e.target.value)}
              className="font-mono"
            />
          </div>
          <div>
            <Label className="text-xs">Sector</Label>
            <Input
              value={localSettings.sector}
              onChange={(e) => handleSettingChange('sector', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Major Head</Label>
            <Input
              value={localSettings.majorHead}
              onChange={(e) => handleSettingChange('majorHead', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Minor Head</Label>
            <Input
              value={localSettings.minorHead}
              onChange={(e) => handleSettingChange('minorHead', e.target.value)}
            />
          </div>
          <div className="sm:col-span-3">
            <Label className="text-xs">Sub Head</Label>
            <Input
              value={localSettings.subHead}
              onChange={(e) => handleSettingChange('subHead', e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Employee Template */}
      <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <UserRound className="h-5 w-5 text-blue-600" />
          <h2 className="font-bold text-md text-slate-900">Default Employee Template</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs">Designation</Label>
            <Input
              value={localTemplate.designation}
              onChange={(e) => handleTemplateChange('designation', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Designation (Gujarati)</Label>
            <Input
              value={localTemplate.designationGujarati}
              onChange={(e) => handleTemplateChange('designationGujarati', e.target.value)}
              className="font-serif"
            />
          </div>
          <div>
            <Label className="text-xs">Cadre Class</Label>
            <Input
              value={localTemplate.cadreClass}
              onChange={(e) => handleTemplateChange('cadreClass', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Pay Scale</Label>
            <Input
              value={localTemplate.payScale}
              onChange={(e) => handleTemplateChange('payScale', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Grade Pay</Label>
            <Input
              value={localTemplate.gradePay}
              onChange={(e) => handleTemplateChange('gradePay', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Pay Level / Cell</Label>
            <Input
              value={localTemplate.payLevelCell}
              onChange={(e) => handleTemplateChange('payLevelCell', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">PPA No.</Label>
            <Input
              value={localTemplate.ppaNo}
              onChange={(e) => handleTemplateChange('ppaNo', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">GIS Group (ક/ખ/ગ/ઘ)</Label>
            <Input
              value={localTemplate.insuranceGroup}
              onChange={(e) => handleTemplateChange('insuranceGroup', e.target.value)}
              className="font-serif"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Label className="text-xs">Default Quarter Address</Label>
            <Input
              value={localTemplate.quarterAddress}
              onChange={(e) => handleTemplateChange('quarterAddress', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Insurance Type</Label>
            <select
              value={localTemplate.insuranceType}
              onChange={(e) =>
                handleTemplateChange(
                  'insuranceType',
                  e.target.value as 'savings_and_insurance' | 'insurance_only'
                )
              }
              className="w-full h-9 rounded-md border border-slate-300 px-2 text-sm"
            >
              <option value="savings_and_insurance">Savings + Insurance</option>
              <option value="insurance_only">Insurance Only</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Establishment Posts */}
      <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="font-bold text-md text-slate-900">Default Establishment Posts</h2>
          </div>
          <Button size="sm" variant="outline" onClick={addPost}>
            <Plus className="h-4 w-4 mr-1" /> Add Post
          </Button>
        </div>

        <div className="space-y-3">
          {localPosts.map((post) => (
            <div key={post.id} className="grid gap-2 sm:grid-cols-7 items-center bg-slate-50 p-3 rounded-lg border">
              <div>
                <Label className="text-xs">Sr.</Label>
                <Input
                  value={post.srNo}
                  onChange={(e) => updatePost(post.id, 'srNo', e.target.value)}
                  className="font-serif"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Designation</Label>
                <Input
                  value={post.designation}
                  onChange={(e) => updatePost(post.id, 'designation', e.target.value)}
                  className="font-serif"
                />
              </div>
              <div>
                <Label className="text-xs">Class</Label>
                <Input
                  value={post.cadreClass}
                onChange={(e) => updatePost(post.id, 'cadreClass', e.target.value)}
                  className="font-serif"
                />
              </div>
              <div>
                <Label className="text-xs">Sanctioned</Label>
                <Input
                  type="number"
                  value={post.sanctioned}
                  onChange={(e) => updatePost(post.id, 'sanctioned', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label className="text-xs">Filled</Label>
                <Input
                  type="number"
                  value={post.filled}
                  onChange={(e) => updatePost(post.id, 'filled', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Vacant</Label>
                  <Input value={post.vacant} disabled className="bg-slate-100" />
                </div>
                {localPosts.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 mt-5"
                    onClick={() => removePost(post.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Government Resolutions */}
      <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <FileText className="h-5 w-5 text-blue-600" />
          <h2 className="font-bold text-md text-slate-900">Government Resolution Texts</h2>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Scheme Permanent Sanction Resolution</Label>
            <Input
              value={localSettings.schemeResolutionText}
              onChange={(e) => handleSettingChange('schemeResolutionText', e.target.value)}
              className="font-serif"
            />
          </div>
          <div>
            <Label className="text-xs">DA Resolution Text</Label>
            <Input
              value={localSettings.daResolutionText}
              onChange={(e) => handleSettingChange('daResolutionText', e.target.value)}
              className="font-serif"
            />
          </div>
        </div>
      </Card>

      {/* Bill Code Mappings */}
      <GTR30BillCodeMappingView />

      {/* Employee Master lives on its own module page (/gtr30/employee-master) */}

      <div className="flex justify-end gap-3 sticky bottom-4 bg-white p-4 rounded-xl border border-slate-200 shadow-lg">
        <Button variant="outline" onClick={handleReset} disabled={resetMutation.isPending}>
          <RotateCcw className="h-4 w-4 mr-1.5" /> Reset Defaults
        </Button>
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
        >
          <Save className="h-4 w-4 mr-1.5" /> Save GTR-30 Settings
        </Button>
      </div>
    </div>
  );
}
