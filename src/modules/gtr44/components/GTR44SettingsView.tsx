import { useState } from 'react';
import { useGTR44SettingsStore } from '../store/gtr44SettingsStore';
import { Button } from '../../../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs';
import { useToast } from '../../../hooks/use-toast';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import {
  RotateCcw,
  ListTree,
  Building2,
  Tag,
  Settings2,
  Printer,
  Sliders,
} from 'lucide-react';

import { BudgetHeadsTab } from './settings/BudgetHeadsTab';
import { ExpenditureItemsTab } from './settings/ExpenditureItemsTab';
import { EdpCatalogTab } from './settings/EdpCatalogTab';
import { DefaultsTab } from './settings/DefaultsTab';
import { NumberingTab } from './settings/NumberingTab';
import { PrintSettingsTab } from './settings/PrintSettingsTab';

export function GTR44SettingsView() {
  const { toast } = useToast();
  const resetSettings = useGTR44SettingsStore((s) => s.resetSettings);
  const resetExpenditureItems = useGTR44SettingsStore((s) => s.resetExpenditureItems);
  const resetEdpCodes = useGTR44SettingsStore((s) => s.resetEdpCodes);
  const resetDeductionTemplates = useGTR44SettingsStore((s) => s.resetDeductionTemplates);
  const resetNumbering = useGTR44SettingsStore((s) => s.resetNumbering);
  const resetPrintSettings = useGTR44SettingsStore((s) => s.resetPrintSettings);

  const [activeTab, setActiveTab] = useState('budget-heads');
  const [showResetAllDialog, setShowResetAllDialog] = useState(false);

  const handleConfirmResetAll = () => {
    resetSettings();
    resetExpenditureItems();
    resetEdpCodes();
    resetDeductionTemplates();
    resetNumbering();
    resetPrintSettings();
    setShowResetAllDialog(false);
    toast({
      title: 'Settings Reset',
      description: 'All GTR-44 settings have been restored to initial defaults.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" />
            GTR-44 Bill Settings
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Configure Budget Heads, 22 standard expenditure items, EDP classification codes, office defaults, and print layout.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setShowResetAllDialog(true)} className="gap-1.5 text-xs font-semibold">
            <RotateCcw className="h-4 w-4" /> Reset All Defaults
          </Button>
        </div>
      </div>

      {/* Main Tabbed Container */}
      <div className="bg-card rounded-2xl border border-border shadow-xs p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto p-1.5 gap-1 bg-muted/60">
            <TabsTrigger value="budget-heads" className="gap-1.5 py-2 text-xs font-semibold">
              <ListTree className="h-4 w-4 shrink-0" />
              <span>Budget Heads</span>
            </TabsTrigger>
            <TabsTrigger value="expenditure-items" className="gap-1.5 py-2 text-xs font-semibold">
              <Building2 className="h-4 w-4 shrink-0" />
              <span>Expenditure (22)</span>
            </TabsTrigger>
            <TabsTrigger value="edp-catalog" className="gap-1.5 py-2 text-xs font-semibold">
              <Tag className="h-4 w-4 shrink-0" />
              <span>EDP &amp; Deductions</span>
            </TabsTrigger>
            <TabsTrigger value="defaults" className="gap-1.5 py-2 text-xs font-semibold">
              <Sliders className="h-4 w-4 shrink-0" />
              <span>Office Defaults</span>
            </TabsTrigger>
            <TabsTrigger value="numbering" className="gap-1.5 py-2 text-xs font-semibold">
              <Settings2 className="h-4 w-4 shrink-0" />
              <span>Numbering</span>
            </TabsTrigger>
            <TabsTrigger value="print-settings" className="gap-1.5 py-2 text-xs font-semibold">
              <Printer className="h-4 w-4 shrink-0" />
              <span>Print &amp; Certs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="budget-heads" className="mt-0 focus-visible:outline-none">
            <BudgetHeadsTab />
          </TabsContent>

          <TabsContent value="expenditure-items" className="mt-0 focus-visible:outline-none">
            <ExpenditureItemsTab />
          </TabsContent>

          <TabsContent value="edp-catalog" className="mt-0 focus-visible:outline-none">
            <EdpCatalogTab />
          </TabsContent>

          <TabsContent value="defaults" className="mt-0 focus-visible:outline-none">
            <DefaultsTab />
          </TabsContent>

          <TabsContent value="numbering" className="mt-0 focus-visible:outline-none">
            <NumberingTab />
          </TabsContent>

          <TabsContent value="print-settings" className="mt-0 focus-visible:outline-none">
            <PrintSettingsTab />
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog
        open={showResetAllDialog}
        title="Reset Entire GTR-44 Module Settings?"
        message="This will reset all budget heads, expenditure items, EDP codes, deduction templates, office details, and certificate clauses back to default factory state. Existing bills will remain intact."
        confirmLabel="Reset All to Defaults"
        danger
        onConfirm={handleConfirmResetAll}
        onCancel={() => setShowResetAllDialog(false)}
      />
    </div>
  );
}
