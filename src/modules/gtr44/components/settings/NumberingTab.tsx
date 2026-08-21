import { useState, useMemo } from 'react';
import { useGTR44SettingsStore } from '../../store/gtr44SettingsStore';
import { GTR44NumberingSettings } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { formatGTR44BillNo, formatGTR44VoucherNo, getFinancialYearLabel } from '../../store/gtr44Defaults';
import { Settings2, Save, RotateCcw, Hash, Eye } from 'lucide-react';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';

export function NumberingTab() {
  const { toast } = useToast();
  const numbering = useGTR44SettingsStore((s) => s.numbering);
  const updateNumbering = useGTR44SettingsStore((s) => s.updateNumbering);

  const [formData, setFormData] = useState<GTR44NumberingSettings>({ ...numbering });
  const [showResetBillSeqDialog, setShowResetBillSeqDialog] = useState(false);
  const [showResetVoucherSeqDialog, setShowResetVoucherSeqDialog] = useState(false);

  const handleChange = <K extends keyof GTR44NumberingSettings>(key: K, value: GTR44NumberingSettings[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateNumbering(formData);
    toast({
      title: 'Numbering Settings Saved',
      description: 'Bill and voucher series numbering updated successfully.',
    });
  };

  const billPreview = useMemo(() => {
    return formatGTR44BillNo(formData);
  }, [formData]);

  const voucherPreview = useMemo(() => {
    return formatGTR44VoucherNo(formData);
  }, [formData]);

  const currentFy = useMemo(() => {
    return getFinancialYearLabel();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center space-x-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-bold text-base text-foreground">Auto-Numbering &amp; Series</h3>
            <p className="text-xs text-muted-foreground">
              Configure sequential formatters, prefixes, and annual rollover for bills and vouchers.
            </p>
          </div>
        </div>
        <Button onClick={handleSave} className="font-semibold gap-1.5">
          <Save className="h-4 w-4" /> Save Numbering
        </Button>
      </div>

      {/* Live Preview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> Next Bill Number
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">FY {currentFy}</span>
          </div>
          <div className="font-mono font-bold text-xl text-foreground">{billPreview}</div>
          <p className="text-[11px] text-muted-foreground">
            Pattern: <code className="bg-muted px-1 py-0.5 rounded">{formData.billPrefix}-{formData.financialYearReset ? `${currentFy}-` : ''}XXXX</code>
          </p>
        </div>

        <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> Next Sub-Voucher No
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">Sequence #{formData.nextVoucherSeq}</span>
          </div>
          <div className="font-mono font-bold text-xl text-foreground">{voucherPreview}</div>
          <p className="text-[11px] text-muted-foreground">
            Pattern: <code className="bg-muted px-1 py-0.5 rounded">{formData.voucherPrefix}-XXX</code>
          </p>
        </div>
      </div>

      {/* Bill Number Series Settings */}
      <Card className="p-6 border border-border bg-card space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-primary" />
            <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">Bill Numbering</h4>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResetBillSeqDialog(true)}
            className="text-xs gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset Seq to 1
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <Label className="text-xs">Bill Prefix</Label>
            <Input
              value={formData.billPrefix}
              onChange={(e) => handleChange('billPrefix', e.target.value)}
              placeholder="e.g. GTR44"
              className="font-mono uppercase"
            />
          </div>
          <div>
            <Label className="text-xs">Next Sequence Number</Label>
            <Input
              type="number"
              min="1"
              value={formData.nextBillSeq}
              onChange={(e) => handleChange('nextBillSeq', parseInt(e.target.value) || 1)}
              className="font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
            <input
              type="checkbox"
              checked={formData.financialYearReset}
              onChange={(e) => handleChange('financialYearReset', e.target.checked)}
              className="rounded text-primary focus:ring-primary h-4 w-4"
            />
            Include current Financial Year in bill number (e.g. {formData.billPrefix}-{currentFy}-...) and reset annually
          </label>
        </div>
      </Card>

      {/* Voucher Number Series Settings */}
      <Card className="p-6 border border-border bg-card space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-primary" />
            <h4 className="font-bold text-sm text-foreground uppercase tracking-wider">Sub-Voucher Numbering</h4>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResetVoucherSeqDialog(true)}
            className="text-xs gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset Seq to 1
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <Label className="text-xs">Voucher Prefix</Label>
            <Input
              value={formData.voucherPrefix}
              onChange={(e) => handleChange('voucherPrefix', e.target.value)}
              placeholder="e.g. GTR44V"
              className="font-mono uppercase"
            />
          </div>
          <div>
            <Label className="text-xs">Next Voucher Sequence</Label>
            <Input
              type="number"
              min="1"
              value={formData.nextVoucherSeq}
              onChange={(e) => handleChange('nextVoucherSeq', parseInt(e.target.value) || 1)}
              className="font-mono"
            />
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} className="font-semibold gap-1.5 px-6">
          <Save className="h-4 w-4" /> Save Numbering Settings
        </Button>
      </div>

      <ConfirmDialog
        open={showResetBillSeqDialog}
        title="Reset Bill Sequence?"
        message="This will reset the next bill sequence number to 1. Are you sure?"
        confirmLabel="Reset to 1"
        danger
        onConfirm={() => {
          handleChange('nextBillSeq', 1);
          setShowResetBillSeqDialog(false);
          toast({ title: 'Bill Sequence Reset', description: 'Next bill sequence set to 1.' });
        }}
        onCancel={() => setShowResetBillSeqDialog(false)}
      />

      <ConfirmDialog
        open={showResetVoucherSeqDialog}
        title="Reset Voucher Sequence?"
        message="This will reset the next sub-voucher sequence number to 1. Are you sure?"
        confirmLabel="Reset to 1"
        danger
        onConfirm={() => {
          handleChange('nextVoucherSeq', 1);
          setShowResetVoucherSeqDialog(false);
          toast({ title: 'Voucher Sequence Reset', description: 'Next voucher sequence set to 1.' });
        }}
        onCancel={() => setShowResetVoucherSeqDialog(false)}
      />
    </div>
  );
}
