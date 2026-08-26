import { useState } from 'react';
import { useGTR44SettingsStore } from '../../store/gtr44SettingsStore';
import { GTR44PrintSettings } from '../../types';
import { DEFAULT_GTR44_PRINT_SETTINGS } from '../../store/gtr44Defaults';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Printer, Save, RotateCcw, FileText, Image as ImageIcon } from 'lucide-react';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';

export function PrintSettingsTab() {
  const { toast } = useToast();
  const printSettings = useGTR44SettingsStore((s) => s.printSettings);
  const updatePrintSettings = useGTR44SettingsStore((s) => s.updatePrintSettings);
  const resetPrintSettings = useGTR44SettingsStore((s) => s.resetPrintSettings);

  const [formData, setFormData] = useState<GTR44PrintSettings>(() => ({
    ...DEFAULT_GTR44_PRINT_SETTINGS,
    ...(printSettings || {}),
  }));
  const [showResetDialog, setShowResetDialog] = useState(false);

  const handleChange = <K extends keyof GTR44PrintSettings>(key: K, value: GTR44PrintSettings[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSignatureChange = (
    key: keyof GTR44PrintSettings['signaturePlaceholders'],
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      signaturePlaceholders: {
        ...prev.signaturePlaceholders,
        [key]: value,
      },
    }));
  };

  const handleSave = () => {
    updatePrintSettings(formData);
    toast({
      title: 'Print Settings Saved',
      description: 'Statutory certificate texts and print preferences updated.',
    });
  };

  const certDescriptions: { key: keyof GTR44PrintSettings; label: string; note: string }[] = [
    { key: 'cert1Text', label: 'Certificate 1 (Page 3)', note: 'Sub-voucher custody & cancellation certification' },
    { key: 'cert2Text', label: 'Certificate 2 (Page 3)', note: 'Prior detailed bills submission certification' },
    { key: 'cert3Text', label: 'Certificate 3 (Page 3)', note: 'Amount of charges not included (use {{amount}} for dynamic value)' },
    { key: 'cert4Text', label: 'Certificate 4 (Page 3)', note: 'Sub-voucher possession under ₹100 certification' },
    { key: 'cert5Text', label: 'Certificate 5 (Page 4)', note: 'Tariff and passenger tax certification' },
    { key: 'cert6Text', label: 'Certificate 6 (Page 4)', note: 'Electric energy consumption certification' },
    { key: 'cert7Text', label: 'Certificate 7 (Page 4)', note: 'Section writing and translation certification' },
    { key: 'cert8Text', label: 'Certificate 8 (Page 4)', note: 'Municipal and local taxes certification' },
    { key: 'cert9Text', label: 'Certificate 9 (Page 4)', note: 'Countersigning officer approval certification' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center space-x-2">
          <Printer className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-bold text-base text-foreground">Print &amp; Statutory Certificates</h3>
            <p className="text-xs text-muted-foreground">
              Customize Gujarat Treasury statutory certificate clauses 1–9, paper fidelity, and layout options.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)} className="gap-1">
            <RotateCcw className="h-4 w-4" /> Reset Clauses
          </Button>
          <Button onClick={handleSave} className="font-semibold gap-1.5">
            <Save className="h-4 w-4" /> Save Settings
          </Button>
        </div>
      </div>

      {/* Formatting & Fidelity Options */}
      <Card className="p-6 border border-border bg-card space-y-4">
        <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">Historical Fidelity &amp; Typography</h4>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.showPaperTypos ?? true}
              onChange={(e) => handleChange('showPaperTypos', e.target.checked)}
              className="mt-0.5 rounded text-primary focus:ring-primary h-4 w-4"
            />
            <div>
              <div className="text-xs font-semibold text-foreground">
                Retain Historical Paper Form Spelling (Paper Fidelity Mode)
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                When enabled, maintains literal paper printings (e.g. &apos;registeres&apos;, &apos;defected&apos;, &apos;enterained&apos;)
                matching vintage physical treasury bill stock. Uncheck for modern English spellings.
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.gujaratiFontEnabled ?? true}
              onChange={(e) => handleChange('gujaratiFontEnabled', e.target.checked)}
              className="mt-0.5 rounded text-primary focus:ring-primary h-4 w-4"
            />
            <div>
              <div className="text-xs font-semibold text-foreground">
                Enable Gujarati Serif Typography
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Uses &apos;Noto Serif Gujarati&apos; font for bilingual headers and Page 1 expenditure titles.
              </div>
            </div>
          </label>
        </div>
      </Card>

      {/* Office Stamp & Signatures */}
      <Card className="p-6 border border-border bg-card space-y-4">
        <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">Stamp &amp; Signature Placeholders</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <Label className="text-xs">Drawing Officer Signature Label</Label>
            <Input
              value={formData.signaturePlaceholders?.drawingOfficer || ''}
              onChange={(e) => handleSignatureChange('drawingOfficer', e.target.value)}
              placeholder="Drawing Officer / Head of Office"
            />
          </div>

          <div>
            <Label className="text-xs">Countersigning Officer Signature Label</Label>
            <Input
              value={formData.signaturePlaceholders?.countersigning || ''}
              onChange={(e) => handleSignatureChange('countersigning', e.target.value)}
              placeholder="Countersigning Officer"
            />
          </div>

          <div>
            <Label className="text-xs">Messenger Signature Label</Label>
            <Input
              value={formData.signaturePlaceholders?.messenger || ''}
              onChange={(e) => handleSignatureChange('messenger', e.target.value)}
              placeholder="Signature of Messenger"
            />
          </div>

          <div>
            <Label className="text-xs">Office Stamp Image URL</Label>
            <Input
              value={formData.stampImageUrl || ''}
              onChange={(e) => handleChange('stampImageUrl', e.target.value)}
              placeholder="https://example.com/stamp.png"
            />
          </div>
        </div>

        {formData.stampImageUrl && (
          <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border">
            <ImageIcon className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-foreground">Stamp Preview:</span>
              <div className="mt-1">
                <img
                  src={formData.stampImageUrl}
                  alt="Stamp Preview"
                  className="max-h-16 max-w-xs object-contain border border-border rounded p-1 bg-white"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Statutory Certificates 1-9 Text Areas */}
      <Card className="p-6 border border-border bg-card space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <FileText className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">Statutory Clauses 1 to 9</h4>
        </div>
        <div className="space-y-4">
          {certDescriptions.map(({ key, label, note }) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">{label}</Label>
                <span className="text-[11px] text-muted-foreground">{note}</span>
              </div>
              <textarea
                className="input text-xs font-serif leading-relaxed"
                rows={key === 'cert4Text' ? 4 : 2}
                value={String(formData[key] || '')}
                onChange={(e) => handleChange(key, e.target.value as never)}
              />
            </div>
          ))}

          <div className="space-y-1 pt-2">
            <Label className="text-xs font-bold text-foreground">Footer Note (Bottom of Page 3)</Label>
            <Input
              value={formData.footerNote || ''}
              onChange={(e) => handleChange('footerNote', e.target.value)}
              placeholder="Optional footer note rendered at bottom of Page 3"
              className="text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} className="font-semibold gap-1.5 px-6">
          <Save className="h-4 w-4" /> Save Print Settings
        </Button>
      </div>

      <ConfirmDialog
        open={showResetDialog}
        title="Reset All Certificate Clauses?"
        message="This will restore all 9 statutory certificate texts and signatures to standard Government of Gujarat defaults."
        confirmLabel="Reset Clauses"
        danger
        onConfirm={() => {
          resetPrintSettings();
          setFormData({ ...DEFAULT_GTR44_PRINT_SETTINGS });
          setShowResetDialog(false);
          toast({ title: 'Clauses Reset', description: 'Restored standard certificate defaults.' });
        }}
        onCancel={() => setShowResetDialog(false)}
      />
    </div>
  );
}
