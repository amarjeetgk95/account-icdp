import { useState } from 'react';
import { useGTR44SettingsStore, GTR44DefaultSettings } from '../../store/gtr44SettingsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Save, Building2, Landmark, Tag } from 'lucide-react';

export function DefaultsTab() {
  const { toast } = useToast();
  const settings = useGTR44SettingsStore((s) => s.settings);
  const saveSettings = useGTR44SettingsStore((s) => s.saveSettings);

  const [formData, setFormData] = useState<GTR44DefaultSettings>(() => ({ ...settings }));

  const handleChange = <K extends keyof GTR44DefaultSettings>(key: K, value: GTR44DefaultSettings[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveSettings(formData);
    toast({
      title: 'Defaults Saved',
      description: 'Office, treasury, and default entry details updated successfully.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center space-x-2">
          <Building2 className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-bold text-base text-foreground">Office &amp; Form Defaults</h3>
            <p className="text-xs text-muted-foreground">
              These prefilled defaults automatically populate every new GTR-44 Contingent Bill.
            </p>
          </div>
        </div>
        <Button onClick={handleSave} className="font-semibold gap-1.5">
          <Save className="h-4 w-4" /> Save Defaults
        </Button>
      </div>

      {/* 1. Default Entry Details */}
      <Card className="p-6 border border-border bg-card space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Tag className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">Default Entry Details</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <Label className="text-xs">DDO Cardex Code</Label>
            <Input
              value={formData.ddoCardexCode || ''}
              onChange={(e) => handleChange('ddoCardexCode', e.target.value)}
              placeholder="e.g. 66"
              className="font-mono"
            />
          </div>
          <div>
            <Label className="text-xs">District Code</Label>
            <Input
              value={formData.district || ''}
              onChange={(e) => handleChange('district', e.target.value)}
              placeholder="e.g. 07"
              className="font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">FY From</Label>
              <Input
                value={formData.budgetGrantYearFrom || ''}
                onChange={(e) => handleChange('budgetGrantYearFrom', e.target.value)}
                placeholder="2026"
                className="font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">FY To</Label>
              <Input
                value={formData.budgetGrantYearTo || ''}
                onChange={(e) => handleChange('budgetGrantYearTo', e.target.value)}
                placeholder="2027"
                className="font-mono"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Office & Treasury Defaults */}
      <Card className="p-6 border border-border bg-card space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Landmark className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">Office &amp; Treasury Details</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <Label className="text-xs">Treasury Name</Label>
            <Input
              value={formData.treasuryName || ''}
              onChange={(e) => handleChange('treasuryName', e.target.value)}
              placeholder="District Treasury Office"
            />
          </div>
          <div>
            <Label className="text-xs">Office Name</Label>
            <Input
              value={formData.officeName || ''}
              onChange={(e) => handleChange('officeName', e.target.value)}
              placeholder="Office of Deputy Director"
            />
          </div>
          <div>
            <Label className="text-xs">Pay To Designation</Label>
            <Input
              value={formData.payToDesignation || ''}
              onChange={(e) => handleChange('payToDesignation', e.target.value)}
              placeholder="e.g. Senior Clerk"
            />
          </div>
          <div className="md:col-span-3">
            <Label className="text-xs">Office Address</Label>
            <Input
              value={formData.officeAddress || ''}
              onChange={(e) => handleChange('officeAddress', e.target.value)}
              placeholder="Block No. 2, Old Sachivalaya, Gandhinagar"
            />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Signatories &amp; Designations
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <Label className="text-xs">Drawing Officer Name</Label>
              <Input
                value={formData.drawingOfficerName || ''}
                onChange={(e) => handleChange('drawingOfficerName', e.target.value)}
                placeholder="Drawing Officer"
              />
            </div>
            <div>
              <Label className="text-xs">Messenger Name</Label>
              <Input
                value={formData.messengerName || ''}
                onChange={(e) => handleChange('messengerName', e.target.value)}
                placeholder="Messenger"
              />
            </div>
            <div>
              <Label className="text-xs">Countersigning Office</Label>
              <Input
                value={formData.countersigningOffice || ''}
                onChange={(e) => handleChange('countersigningOffice', e.target.value)}
                placeholder="Countersigning Office"
              />
            </div>
            <div>
              <Label className="text-xs">AG Auditor Name</Label>
              <Input
                value={formData.auditorName || ''}
                onChange={(e) => handleChange('auditorName', e.target.value)}
                placeholder="Auditor"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Office Classification Codes (Page 1 Top Box) */}
      <Card className="p-6 border border-border bg-card space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Tag className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">Office Classification Codes (Page 1 Box)</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Pre-printed computer input boxes rendered at the top-left of Page 1.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 text-sm">
          <div>
            <Label className="text-[11px]">Class Exp</Label>
            <Input
              value={formData.classOfExpenditure || ''}
              onChange={(e) => handleChange('classOfExpenditure', e.target.value)}
              placeholder="01"
              maxLength={2}
              className="font-mono text-center"
            />
          </div>
          <div>
            <Label className="text-[11px]">Fund</Label>
            <Input
              value={formData.fund || ''}
              onChange={(e) => handleChange('fund', e.target.value)}
              placeholder="0"
              maxLength={1}
              className="font-mono text-center"
            />
          </div>
          <div>
            <Label className="text-[11px]">Drawing</Label>
            <Input
              value={formData.drawing || ''}
              onChange={(e) => handleChange('drawing', e.target.value)}
              placeholder="66"
              maxLength={4}
              className="font-mono text-center"
            />
          </div>
          <div>
            <Label className="text-[11px]">Demand No</Label>
            <Input
              value={formData.demandNo || ''}
              onChange={(e) => handleChange('demandNo', e.target.value)}
              placeholder="04"
              maxLength={3}
              className="font-mono text-center"
            />
          </div>
          <div>
            <Label className="text-[11px]">Budget Type</Label>
            <Input
              value={formData.typeOfBudget || ''}
              onChange={(e) => handleChange('typeOfBudget', e.target.value)}
              placeholder="0"
              maxLength={1}
              className="font-mono text-center"
            />
          </div>
          <div>
            <Label className="text-[11px]">Scheme No</Label>
            <Input
              value={formData.schemeNo || ''}
              onChange={(e) => handleChange('schemeNo', e.target.value)}
              placeholder="00"
              maxLength={4}
              className="font-mono text-center"
            />
          </div>
          <div>
            <Label className="text-[11px]">Sub-Major</Label>
            <Input
              value={formData.subMajorHead || ''}
              onChange={(e) => handleChange('subMajorHead', e.target.value)}
              placeholder="00"
              maxLength={2}
              className="font-mono text-center"
            />
          </div>
          <div>
            <Label className="text-[11px]">Detailed</Label>
            <Input
              value={formData.detailedHead || ''}
              onChange={(e) => handleChange('detailedHead', e.target.value)}
              placeholder="00"
              maxLength={2}
              className="font-mono text-center"
            />
          </div>
        </div>
      </Card>

      {/* Bottom Save Bar */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} className="font-semibold gap-1.5 px-6">
          <Save className="h-4 w-4" /> Save All Defaults
        </Button>
      </div>
    </div>
  );
}
