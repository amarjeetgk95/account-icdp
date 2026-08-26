import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Button } from '../../../components/ui/button';
import { SubVoucherList, SubVoucher as ComponentSubVoucher } from './SubVoucherList';
import { GTR44FormData, GTR44Entry, GTR44Deductions, GTR44BudgetHead } from '../types';
import { buildNewBillFormData, useGTR44SettingsStore } from '../store/gtr44SettingsStore';
import { EDP_CODE_SUGGESTIONS, formatGTR44BillNo } from '../store/gtr44Defaults';
import { normalizeEDPCode } from '../services/gtr44Calc.service';
import { useToast } from '../../../hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, ChevronRight, AlertCircle, Check } from 'lucide-react';
import { getGrossAmount, getTotalDeductions, applyTotals } from '../services/gtr44Calc.service';
import { formatCurrency } from '@/shared/utilities';
import { GTR44Document } from './GTR44Document';
import { validateStep, GTR44WizardStepId } from '../services/gtr44Validation.service';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import '../styles/gtr44.css';

interface GTR44BillWizardProps {
  initialData?: GTR44FormData;
  onSubmit: (data: GTR44FormData) => void;
  isSubmitting?: boolean;
}

const currentMonthText = () =>
  new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

const generateBillRegisterNo = () => {
  try {
    const state = useGTR44SettingsStore.getState();
    const numbering = state.numbering;
    if (numbering) {
      const billNo = formatGTR44BillNo(numbering);
      state.incrementBillSeq();
      return billNo;
    }
  } catch {
    // fallthrough
  }
  return `GTR44-${Date.now()}`;
};

export function GTR44BillWizard({ initialData, onSubmit, isSubmitting = false }: GTR44BillWizardProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const budgetHeadsAll = useGTR44SettingsStore((state) => state.budgetHeads);
  const budgetHeads = budgetHeadsAll.filter((h) => h.isActive !== false);
  const expenditureItemsAll = useGTR44SettingsStore((state) => state.expenditureItems);
  const edpCodesStore = useGTR44SettingsStore((state) => state.edpCodes);
  const deductionTemplatesStore = useGTR44SettingsStore((state) => state.deductionTemplates);

  const edpCodeOptions = useMemo(() => {
    const activeEdps = (expenditureItemsAll || [])
      .filter((it) => it.isActive !== false)
      .map((it) => normalizeEDPCode(it.edpCode))
      .filter(Boolean);
    const catalogEdps = (edpCodesStore || [])
      .filter((c) => c.isActive !== false)
      .map((c) => normalizeEDPCode(c.code))
      .filter(Boolean);
    const deductionEdps = (deductionTemplatesStore || [])
      .filter((t) => !t.isGst)
      .map((t) => normalizeEDPCode(`${t.code}-`))
      .filter(Boolean);
    const set = new Set<string>([...EDP_CODE_SUGGESTIONS, ...activeEdps, ...catalogEdps, ...deductionEdps]);
    return Array.from(set);
  }, [expenditureItemsAll, edpCodesStore, deductionTemplatesStore]);

  const [formData, setFormData] = useState<GTR44FormData>(initialData || buildNewBillFormData());
  const [isDirty, setIsDirty] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Warn on browser tab close or reload when changes are made
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Focus step heading on step transition for screen readers
  useEffect(() => {
    stepHeadingRef.current?.focus();
  }, [currentStep]);

  const steps: { id: GTR44WizardStepId; label: string; icon: string }[] = [
    { id: 'vouchers', label: 'Voucher Entry', icon: '1' },
    { id: 'budgetHead', label: 'Budget Head Selection', icon: '2' },
    { id: 'deductions', label: 'Deduction', icon: '3' },
    { id: 'preview', label: 'Preview', icon: '4' },
  ];

  const updateDeduction = <K extends keyof GTR44Deductions>(field: K, value: GTR44Deductions[K]) => {
    setIsDirty(true);
    setFormData((prev) => {
      const next: GTR44Deductions = { ...prev.deductions, [field]: value };
      if (field === 'incomeTax') {
        next.tds9510 = typeof value === 'number' ? value : 0;
      }
      if (field === 'tds9510') {
        next.incomeTax = typeof value === 'number' ? value : 0;
      }
      return { ...prev, deductions: next };
    });
    if (errors['netAmount'] || errors['totalDeduction']) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors['netAmount'];
        delete newErrors['totalDeduction'];
        return newErrors;
      });
    }
  };

  const applyBudgetHead = (head: GTR44BudgetHead) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      budgetHeadId: head.id,
      headChargeableCode: head.headChargeableCode,
      sector: head.sector,
      demandNo: head.demandNo,
      demandNoLabel: head.demandNoLabel,
      majorHead: head.majorHead,
      subMajorHead: head.subMajorHead,
      minorHead: head.minorHead,
      subHead: head.subHead,
      detailedHead: head.detailedHead,
    }));
    if (errors['budgetHeadId']) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors['budgetHeadId'];
        return newErrors;
      });
    }
  };

  const mapToComponentSubVoucher = (sv: GTR44Entry): ComponentSubVoucher => ({
    id: sv.id,
    voucherNo: sv.subVoucherNo || '',
    payee: sv.partyName,
    billNo: sv.billNo || '',
    date: sv.date || sv.sanctionDate || '',
    details: sv.details,
    amount: sv.amount,
    edpCode: sv.edpCode || '',
  });

  const handleAddSubVoucher = (csv: ComponentSubVoucher) => {
    setIsDirty(true);
    const newEntry: GTR44Entry = {
      id: csv.id,
      srNo: formData.partyEntries.length + 1,
      subVoucherNo: csv.voucherNo || String(formData.partyEntries.length + 1),
      partyName: csv.payee,
      billNo: csv.billNo || csv.voucherNo || `BILL-${formData.partyEntries.length + 1}`,
      date: csv.date || new Date().toISOString().split('T')[0],
      details: csv.details,
      amount: csv.amount,
      sanctionDate: csv.date || undefined,
      edpCode: csv.edpCode,
    };
    setFormData((prev) => ({ ...prev, partyEntries: [...prev.partyEntries, newEntry] }));
  };

  const handleEditSubVoucher = (id: string, csv: ComponentSubVoucher) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      partyEntries: prev.partyEntries.map((sv: GTR44Entry) =>
        sv.id === id
          ? {
              ...sv,
              subVoucherNo: csv.voucherNo,
              partyName: csv.payee,
              billNo: csv.billNo || sv.billNo,
              date: csv.date || sv.date,
              details: csv.details,
              amount: csv.amount,
              sanctionDate: csv.date || undefined,
              edpCode: csv.edpCode,
            }
          : sv
      ),
    }));
  };

  const handleDeleteSubVoucher = (id: string) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      partyEntries: prev.partyEntries
        .filter((sv: GTR44Entry) => sv.id !== id)
        .map((item, idx) => ({ ...item, srNo: idx + 1, subVoucherNo: item.subVoucherNo || String(idx + 1) })),
    }));
  };

  const handleReorderSubVouchers = (reordered: ComponentSubVoucher[]) => {
    setIsDirty(true);
    const updatedEntries: GTR44Entry[] = reordered.map((csv, idx) => {
      const existing = formData.partyEntries.find((e) => e.id === csv.id);
      return {
        id: csv.id,
        srNo: idx + 1,
        subVoucherNo: csv.voucherNo || String(idx + 1),
        partyName: csv.payee,
        billNo: csv.billNo || existing?.billNo || `BILL-${idx + 1}`,
        date: csv.date || existing?.date || new Date().toISOString().split('T')[0],
        details: csv.details,
        amount: csv.amount,
        sanctionDate: csv.date || existing?.sanctionDate,
        edpCode: csv.edpCode,
      };
    });
    setFormData((prev) => ({ ...prev, partyEntries: updatedEntries }));
  };

  // Calculations
  const grossAmount = getGrossAmount(formData);
  const totalDeduction = getTotalDeductions(formData.deductions);
  const netAmount = grossAmount - totalDeduction;

  const handleValidateStep = (stepIndex: number): boolean => {
    const stepId = steps[stepIndex].id;
    const newErrors = validateStep(formData, stepId);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (handleValidateStep(currentStep) && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleCancelClick = () => {
    if (isDirty) {
      setShowCancelDialog(true);
    } else {
      navigate('/gtr44/list');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    for (let i = 0; i < steps.length; i++) {
      if (!handleValidateStep(i)) {
        setCurrentStep(i);
        return;
      }
    }
    if (netAmount < 0) {
      toast({ title: 'Validation Error', description: 'Net amount cannot be negative.', variant: 'destructive' });
      return;
    }
    const grant = Number(formData.budgetGrant) || 0;
    if (grant > 0 && grossAmount > grant) {
      toast({ title: 'Warning', description: 'Gross amount exceeds total budget grant.', variant: 'destructive' });
    }

    const syncedDeductions: GTR44Deductions = {
      ...formData.deductions,
      incomeTax: formData.deductions.incomeTax || formData.deductions.tds9510 || 0,
      tds9510: formData.deductions.incomeTax || formData.deductions.tds9510 || 0,
      surcharge9520: formData.deductions.surcharge9520 || 0,
      sd9600: formData.deductions.sd9600 || 0,
      misc9910: formData.deductions.misc9910 || 0,
      gst: formData.deductions.gst || 0,
      gstCgst: formData.deductions.gstCgst || 0,
      gstSgst: formData.deductions.gstSgst || 0,
    };
    const withSynced = { ...formData, deductions: syncedDeductions };
    const readyData: GTR44FormData = {
      ...applyTotals(withSynced),
      billRegisterNo: formData.billRegisterNo || generateBillRegisterNo(),
      monthOf: formData.monthOf || currentMonthText(),
      payToName: formData.payToName || formData.partyEntries[0]?.partyName || '',
      ddoCardexCode: formData.ddoCardexCode || useGTR44SettingsStore.getState().settings.ddoCardexCode,
      deductions: syncedDeductions,
    };

    setIsDirty(false);
    onSubmit(readyData);
  };

  const progressPercent = ((currentStep + 1) / steps.length) * 100;

  const getStepStatusClass = (index: number) => {
    if (index === currentStep) return 'active';
    if (index < currentStep) return 'done';
    return 'pending';
  };

  const renderStepContent = () => {
    const s = steps[currentStep].id;
    switch (s) {
      case 'vouchers':
        return (
          <div className="space-y-4" role="tabpanel" id="gtr44-step-vouchers" aria-labelledby="gtr44-tab-vouchers">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="font-semibold text-foreground text-sm uppercase focus:outline-none"
                >
                  Voucher Entry
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter all voucher details. The EDP Code on each voucher decides where its amount
                  is placed on Page 1 of GTR-44 — vouchers sharing the same EDP Code are aggregated
                  together.
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs text-muted-foreground">Gross Total</div>
                <div className="font-mono font-bold text-lg text-foreground">
                  {formatCurrency(grossAmount)}
                </div>
              </div>
            </div>
            {errors['partyEntries'] && (
              <div className="alert alert-danger text-xs py-2.5" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errors['partyEntries']}</span>
              </div>
            )}
            <Card className="border border-border p-6 bg-card">
              <SubVoucherList
                subVouchers={formData.partyEntries.map(mapToComponentSubVoucher)}
                onAdd={handleAddSubVoucher}
                onEdit={handleEditSubVoucher}
                onDelete={handleDeleteSubVoucher}
                onReorder={handleReorderSubVouchers}
                edpCodeOptions={edpCodeOptions}
              />
            </Card>
            {Object.keys(errors)
              .filter((k) => k.startsWith('partyEntries.'))
              .map((k) => (
                <div key={k} className="alert alert-danger text-xs py-2.5" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errors[k]}</span>
                </div>
              ))}
          </div>
        );

      case 'budgetHead':
        return (
          <div className="space-y-4" role="tabpanel" id="gtr44-step-budgetHead" aria-labelledby="gtr44-tab-budgetHead">
            <div>
              <h3
                ref={stepHeadingRef}
                tabIndex={-1}
                className="font-semibold text-foreground text-sm uppercase focus:outline-none"
              >
                Budget Head Selection
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Select the Budget Head to be charged. Newly added or modified Budget Heads from
                Settings become available here.
              </p>
            </div>
            {errors['budgetHeadId'] && (
              <div className="alert alert-danger text-xs py-2.5" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errors['budgetHeadId']}</span>
              </div>
            )}
            {budgetHeads.length === 0 && (
              <Card className="border border-border p-6 text-center bg-card">
                <p className="text-sm text-muted-foreground">
                  No Budget Heads available. Add one from the GTR-44 Settings page.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate('/gtr44/settings')}
                >
                  Open Settings
                </Button>
              </Card>
            )}
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              role="radiogroup"
              aria-label="Select Budget Head"
            >
              {budgetHeads.map((head) => {
                const selected = formData.budgetHeadId === head.id;
                return (
                  <button
                    key={head.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => applyBudgetHead(head)}
                    className={`text-left p-5 rounded-xl border-2 transition-all cursor-pointer ${
                      selected
                        ? 'border-primary bg-primary/5 shadow-xs'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold text-foreground text-sm">{head.name}</div>
                      {selected && (
                        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground shrink-0">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground font-mono">
                      <div>
                        Head Chargeable:{' '}
                        <strong className="text-foreground font-bold">{head.headChargeableCode}</strong>
                      </div>
                      <div>
                        Demand No: <strong className="text-foreground">{head.demandNo}</strong> · Detailed
                        Head: <strong className="text-foreground">{head.detailedHead}</strong>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {head.majorHead}
                      {head.subMajorHead ? ` / ${head.subMajorHead}` : ''}
                      {head.minorHead ? ` / ${head.minorHead}` : ''}
                      {head.subHead ? ` / ${head.subHead}` : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'deductions': {
        const templates = deductionTemplatesStore;
        const labelFor = (code: string, fallback: string) =>
          templates?.find((t) => t.code === code)?.label || fallback;
        const gstTotalComputed =
          (formData.deductions.gst || 0) +
          (formData.deductions.gstCgst || 0) +
          (formData.deductions.gstSgst || 0);
        const totalA =
          (formData.deductions.incomeTax || formData.deductions.tds9510 || 0) +
          (formData.deductions.surcharge9520 || 0) +
          (formData.deductions.sd9600 || 0);
        return (
          <div className="space-y-6" role="tabpanel" id="gtr44-step-deductions" aria-labelledby="gtr44-tab-deductions">
            <h3
              ref={stepHeadingRef}
              tabIndex={-1}
              className="sr-only focus:outline-none"
            >
              Deductions
            </h3>
            {errors['netAmount'] && (
              <div className="alert alert-danger text-xs py-2.5" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errors['netAmount']}</span>
              </div>
            )}
            {errors['totalDeduction'] && (
              <div className="alert alert-danger text-xs py-2.5" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errors['totalDeduction']}</span>
              </div>
            )}
            {/* Summary metrics bar */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-muted/50 border border-border rounded-xl p-3">
                <div className="text-muted-foreground">Gross Amount</div>
                <div className="font-mono font-bold text-sm text-foreground">{formatCurrency(grossAmount)}</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-3">
                <div className="text-amber-800 dark:text-amber-300">Total Deductions</div>
                <div className="font-mono font-bold text-sm text-amber-900 dark:text-amber-200">{formatCurrency(totalDeduction)}</div>
                <div className="text-[11px] text-muted-foreground mt-1">GST total {formatCurrency(gstTotalComputed)} incl. CGST/SGST</div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-3">
                <div className="text-emerald-800 dark:text-emerald-300">Net Payable</div>
                <div className="font-mono font-bold text-sm text-emerald-900 dark:text-emerald-200">{formatCurrency(Math.max(0, netAmount))}</div>
                <div className="text-[11px] text-muted-foreground mt-1">Total A (9510+9520+9600) {formatCurrency(totalA)}</div>
              </div>
            </div>

            <Card className="border border-border p-6 bg-card">
              <h3 className="font-semibold text-foreground text-sm uppercase mb-1">
                Deductions — Page 1 (EDP 9510 / 9520 / 9600 / 9910)
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                All 5 deduction rows from Page 1 of GTR-44. Values flow to the expenditure table deduction
                rows and to totals.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <Label>{labelFor('9510', 'Income Tax')} (EDP 9510-) (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.deductions.incomeTax || formData.deductions.tds9510 || 0}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      updateDeduction('incomeTax', v);
                    }}
                    className="font-mono font-bold"
                    placeholder="0.00"
                  />
                  <p className="text-[11px] text-muted-foreground">Maps to incomeTax + tds9510 (legacy)</p>
                </div>
                <div className="space-y-2">
                  <Label>{labelFor('9520', 'Surcharge')} (EDP 9520-) (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.deductions.surcharge9520 || 0}
                    onChange={(e) => updateDeduction('surcharge9520', parseFloat(e.target.value) || 0)}
                    className="font-mono font-bold"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{labelFor('9600', 'Security Deposit')} (EDP 9600-) (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.deductions.sd9600 || 0}
                    onChange={(e) => updateDeduction('sd9600', parseFloat(e.target.value) || 0)}
                    className="font-mono font-bold"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{labelFor('9910', 'Misc Recoveries')} (EDP 9910-) (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.deductions.misc9910 || 0}
                    onChange={(e) => updateDeduction('misc9910', parseFloat(e.target.value) || 0)}
                    className="font-mono font-bold"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-muted/50 border border-border rounded-lg p-2.5">
                  <div className="text-muted-foreground">Total A (9510+9520+9600)</div>
                  <div className="font-mono font-bold text-foreground">{formatCurrency(totalA)}</div>
                </div>
                <div className="bg-muted/50 border border-border rounded-lg p-2.5">
                  <div className="text-muted-foreground">Misc (9910)</div>
                  <div className="font-mono font-bold text-foreground">{formatCurrency(formData.deductions.misc9910 || 0)}</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-2.5">
                  <div className="text-amber-800 dark:text-amber-300">GST Total (incl. splits)</div>
                  <div className="font-mono font-bold text-amber-900 dark:text-amber-200">{formatCurrency(gstTotalComputed)}</div>
                </div>
              </div>
            </Card>

            <Card className="border border-border p-6 bg-card">
              <h3 className="font-semibold text-foreground text-sm uppercase mb-1">
                GST Deduction — splits &amp; GSTIN
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                GST deduction is reflected in the checklist on Page 3. Total GST = GST base + CGST + SGST.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <Label>GST Base (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.deductions.gst || 0}
                    onChange={(e) => updateDeduction('gst', parseFloat(e.target.value) || 0)}
                    className="font-mono font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label>GSTIN</Label>
                  <Input
                    value={formData.deductions.gstNo || ''}
                    onChange={(e) => updateDeduction('gstNo', e.target.value)}
                    placeholder="e.g. 24ABCDE1234F1Z5"
                    className="font-mono uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CGST Component (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.deductions.gstCgst || 0}
                    onChange={(e) => updateDeduction('gstCgst', parseFloat(e.target.value) || 0)}
                    className="font-mono font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SGST Component (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.deductions.gstSgst || 0}
                    onChange={(e) => updateDeduction('gstSgst', parseFloat(e.target.value) || 0)}
                    className="font-mono font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <div className="flex items-center justify-between bg-muted/50 border border-border rounded-lg p-2.5 text-xs">
                    <span className="text-muted-foreground">Computed GST Total (gst + CGST + SGST)</span>
                    <span className="font-mono font-bold text-foreground">{formatCurrency(gstTotalComputed)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );
      }

      case 'preview':
        return (
          <div className="space-y-4" role="tabpanel" id="gtr44-step-preview" aria-labelledby="gtr44-tab-preview">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="font-semibold text-foreground text-sm uppercase focus:outline-none"
                >
                  Live Preview
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Renders the full GTR-44 bill (all 4 pages) with the current data. Page 1 EDP
                  aggregation and totals update as you edit.
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs text-muted-foreground">Net Payable</div>
                <div className="font-mono font-bold text-lg text-foreground">
                  {formatCurrency(Math.max(0, netAmount))}
                </div>
              </div>
            </div>
            <div className="overflow-auto rounded-xl bg-muted/30 border border-border p-4">
              <div className="max-w-5xl mx-auto">
                <GTR44Document data={applyTotals(formData)} containerId="gtr44-wizard-live-preview" />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5 gtr44-wizard-form">
        {/* Progress bar */}
        <div className="gtr44-progress" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
          <div className="gtr44-progress-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>

        {/* Step navigation tabs with ARIA semantics */}
        <div className="gtr44-wizard-tabs" role="tablist" aria-label="GTR-44 bill creation steps">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            return (
              <button
                key={step.id}
                id={`gtr44-tab-${step.id}`}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                aria-controls={`gtr44-step-${step.id}`}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => {
                  if (index <= currentStep || handleValidateStep(currentStep)) {
                    setCurrentStep(index);
                  }
                }}
                className={`gtr44-wizard-tab ${getStepStatusClass(index)} cursor-pointer`}
              >
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                  {isCompleted ? <Check className="h-3 w-3 text-primary" /> : step.icon}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* Step content container */}
        <div className="gtr44-wizard-page animate-fade-in">{renderStepContent()}</div>

        {/* Navigation & actions bar */}
        <div className="flex justify-between items-center pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="text-xs font-semibold"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancelClick}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            {currentStep === steps.length - 1 ? (
              <Button type="submit" disabled={isSubmitting} className="font-bold px-6 gap-1.5">
                {isSubmitting ? 'Saving...' : 'Save Bill'}
                {!isSubmitting && <Save className="h-4 w-4" />}
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={handleNext} className="font-bold px-5 gap-1">
                Next Step
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Gross/Net summary sticky bottom bar */}
        <div className="gtr44-summary-bar">
          <div className="gtr44-summary-item gtr44-summary-gross">
            <span className="gtr44-summary-label">Gross:</span>
            <span className="gtr44-summary-value">{formatCurrency(grossAmount)}</span>
          </div>
          <div className="gtr44-summary-item gtr44-summary-deduct">
            <span className="gtr44-summary-label">Deductions:</span>
            <span className="gtr44-summary-value">{formatCurrency(totalDeduction)}</span>
          </div>
          <div className="gtr44-summary-item gtr44-summary-net">
            <span className="gtr44-summary-label">Net Payable:</span>
            <span className="gtr44-summary-value">{formatCurrency(Math.max(0, netAmount))}</span>
            {netAmount < 0 && <AlertCircle className="h-4 w-4 text-destructive shrink-0" />}
          </div>
        </div>
      </form>

      {/* Discard changes dialog */}
      <ConfirmDialog
        open={showCancelDialog}
        title="Discard Unsaved Changes?"
        message="You have unsaved changes in this bill. Are you sure you want to leave? All uncommitted edits will be lost."
        confirmLabel="Discard & Leave"
        danger
        onConfirm={() => {
          setShowCancelDialog(false);
          navigate('/gtr44/list');
        }}
        onCancel={() => setShowCancelDialog(false)}
      />
    </>
  );
}

