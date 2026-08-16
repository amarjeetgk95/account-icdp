import React, { useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Button } from '../../../components/ui/button';
import { SubVoucherList, SubVoucher as ComponentSubVoucher } from './SubVoucherList';
import { GTR44FormData, GTR44Entry, GTR44Deductions, GTR44BudgetHead } from '../types';
import { buildNewBillFormData, useGTR44SettingsStore } from '../store/gtr44SettingsStore';
import { EDP_CODE_SUGGESTIONS } from '../store/gtr44Defaults';
import { useToast } from '../../../hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, ChevronRight, AlertCircle, CheckCircle, Check } from 'lucide-react';
import { getGrossAmount, getTotalDeductions, applyTotals } from '../services/gtr44Calc.service';
import { formatCurrency } from '@/shared/utilities';
import { GTR44Document } from './GTR44Document';
import { validateStep, GTR44WizardStepId } from '../services/gtr44Validation.service';
import '../styles/gtr44.css';

interface GTR44BillWizardProps {
  initialData?: GTR44FormData;
  onSubmit: (data: GTR44FormData) => void;
  isSubmitting?: boolean;
}

const currentMonthText = () =>
  new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

const generateBillRegisterNo = () => `GTR44-${Date.now()}`;

export function GTR44BillWizard({ initialData, onSubmit, isSubmitting = false }: GTR44BillWizardProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const budgetHeads = useGTR44SettingsStore((state) => state.budgetHeads);

  const [formData, setFormData] = useState<GTR44FormData>(initialData || buildNewBillFormData());

  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps: { id: GTR44WizardStepId; label: string; icon: string }[] = [
    { id: 'vouchers', label: 'Voucher Entry', icon: '1' },
    { id: 'budgetHead', label: 'Budget Head Selection', icon: '2' },
    { id: 'deductions', label: 'Deduction', icon: '3' },
    { id: 'preview', label: 'Preview', icon: '4' },
  ];

  const updateDeduction = <K extends keyof GTR44Deductions>(field: K, value: GTR44Deductions[K]) => {
    setFormData(prev => ({
      ...prev,
      deductions: { ...prev.deductions, [field]: value }
    }));
    if (errors['netAmount']) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors['netAmount'];
        return newErrors;
      });
    }
  };

  const applyBudgetHead = (head: GTR44BudgetHead) => {
    setFormData(prev => ({
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
      setErrors(prev => {
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
    setFormData(prev => ({ ...prev, partyEntries: [...prev.partyEntries, newEntry] }));
  };

  const handleEditSubVoucher = (id: string, csv: ComponentSubVoucher) => {
    setFormData(prev => ({
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
      )
    }));
  };

  const handleDeleteSubVoucher = (id: string) => {
    setFormData(prev => ({
      ...prev,
      partyEntries: prev.partyEntries.filter((sv: GTR44Entry) => sv.id !== id)
        .map((item, idx) => ({ ...item, srNo: idx + 1, subVoucherNo: item.subVoucherNo || String(idx + 1) }))
    }));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    for (let i = 0; i < steps.length; i++) {
      if (!handleValidateStep(i)) {
        setCurrentStep(i);
        return;
      }
    }
    if (netAmount < 0) {
      toast({ title: "Validation Error", description: "Net amount cannot be negative.", variant: "destructive" });
      return;
    }
    const grant = Number(formData.budgetGrant) || 0;
    if (grant > 0 && grossAmount > grant) {
      toast({ title: "Warning", description: "Gross amount exceeds total budget grant.", variant: "destructive" });
    }

    const readyData: GTR44FormData = {
      ...applyTotals(formData),
      billRegisterNo: formData.billRegisterNo || generateBillRegisterNo(),
      monthOf: formData.monthOf || currentMonthText(),
      payToName: formData.payToName || formData.partyEntries[0]?.partyName || '',
      ddoCardexCode: formData.ddoCardexCode || useGTR44SettingsStore.getState().settings.ddoCardexCode,
    };
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
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm uppercase">Voucher Entry</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Enter all voucher details. The EDP Code on each voucher decides where its amount
                  is placed on Page 1 of GTR-44 — vouchers sharing the same EDP Code are added
                  together.
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs text-gray-500">Gross Total</div>
                <div className="font-mono font-bold text-lg text-gray-900">
                  {formatCurrency(grossAmount)}
                </div>
              </div>
            </div>
            {errors['partyEntries'] && (
              <div className="alert alert-danger text-xs py-2.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errors['partyEntries']}</span>
              </div>
            )}
            <Card className="border border-gray-200 p-6">
              <SubVoucherList
                subVouchers={formData.partyEntries.map(mapToComponentSubVoucher)}
                onAdd={handleAddSubVoucher}
                onEdit={handleEditSubVoucher}
                onDelete={handleDeleteSubVoucher}
                edpCodeOptions={EDP_CODE_SUGGESTIONS}
              />
            </Card>
            {Object.keys(errors).filter((k) => k.startsWith('partyEntries.')).map((k) => (
              <div key={k} className="alert alert-danger text-xs py-2.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errors[k]}</span>
              </div>
            ))}
          </div>
        );

      case 'budgetHead':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm uppercase">Budget Head Selection</h3>
              <p className="text-xs text-gray-500 mt-1">
                Select the Budget Head to be charged. Newly added or modified Budget Heads from
                Settings become available here.
              </p>
            </div>
            {errors['budgetHeadId'] && (
              <div className="alert alert-danger text-xs py-2.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errors['budgetHeadId']}</span>
              </div>
            )}
            {budgetHeads.length === 0 && (
              <Card className="border border-gray-200 p-6 text-center">
                <p className="text-sm text-gray-500">
                  No Budget Heads available. Add one from the GTR-44 Settings page.
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => navigate('/gtr44/settings')}>
                  Open Settings
                </Button>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budgetHeads.map((head) => {
                const selected = formData.budgetHeadId === head.id;
                return (
                  <button
                    key={head.id}
                    type="button"
                    onClick={() => applyBudgetHead(head)}
                    className={`text-left p-5 rounded-xl border-2 transition-all ${
                      selected
                        ? 'border-blue-600 bg-blue-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold text-gray-900 text-sm">{head.name}</div>
                      {selected && (
                        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-600 text-white shrink-0">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-gray-600 font-mono">
                      <div>Head Chargeable: <strong>{head.headChargeableCode}</strong></div>
                      <div>Demand No: <strong>{head.demandNo}</strong> · Detailed Head: <strong>{head.detailedHead}</strong></div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
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

      case 'deductions':
        return (
          <div className="space-y-6">
            {errors['netAmount'] && (
              <div className="alert alert-danger text-xs py-2.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errors['netAmount']}</span>
              </div>
            )}
            <Card className="border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 text-sm uppercase mb-1">Income Tax Deduction</h3>
              <p className="text-xs text-gray-500 mb-4">
                Deducted directly against the relevant EDP Code (9510) on Page 1.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <Label>Income Tax / TDS (EDP 9510) (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.deductions.incomeTax || 0}
                    onChange={e => updateDeduction('incomeTax', parseFloat(e.target.value) || 0)}
                    className="font-mono font-bold"
                  />
                </div>
              </div>
            </Card>

            <Card className="border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 text-sm uppercase mb-1">GST Deduction</h3>
              <p className="text-xs text-gray-500 mb-4">
                GST deduction details are reflected in the checklist on the third page of GTR-44.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <Label>GST Total (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.deductions.gst || 0}
                    onChange={e => updateDeduction('gst', parseFloat(e.target.value) || 0)}
                    className="font-mono font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label>GSTIN</Label>
                  <Input
                    value={formData.deductions.gstNo || ''}
                    onChange={e => updateDeduction('gstNo', e.target.value)}
                    placeholder="e.g. 24ABCDE1234F1Z5"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CGST Component (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.deductions.gstCgst || 0}
                    onChange={e => updateDeduction('gstCgst', parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SGST Component (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.deductions.gstSgst || 0}
                    onChange={e => updateDeduction('gstSgst', parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>
              </div>
            </Card>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm uppercase">Live Preview</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Renders the full GTR-44 bill (all 4 pages) with the current data. Page 1 EDP
                  aggregation and totals update as you edit.
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs text-gray-500">Net Payable</div>
                <div className="font-mono font-bold text-lg text-gray-900">
                  {formatCurrency(Math.max(0, netAmount))}
                </div>
              </div>
            </div>
            <div className="overflow-auto rounded-lg bg-gray-100 border border-gray-200 p-4">
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
    <form onSubmit={handleSubmit} className="space-y-5 gtr44-wizard-form">
      {/* Progress bar */}
      <div className="gtr44-progress">
        <div className="gtr44-progress-fill" style={{ width: `${progressPercent}%` }}></div>
      </div>

      {/* Step navigation tabs */}
      <div className="gtr44-wizard-tabs">
        {steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            onClick={() => {
              if (index <= currentStep || handleValidateStep(currentStep)) {
                setCurrentStep(index);
              }
            }}
            className={`gtr44-wizard-tab ${getStepStatusClass(index)}`}
            aria-current={index === currentStep ? 'step' : undefined}
          >
            <span className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-bold">
              {index < currentStep ? <CheckCircle className="h-3 w-3" /> : step.icon}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="gtr44-wizard-page animate-fade-in">{renderStepContent()}</div>

      {/* Navigation & actions */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="text-xs font-semibold"
        >
          <ChevronLeft className="h-3 w-3 mr-1" /> Back
        </Button>

        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/gtr44/list')} className="text-xs font-semibold">
            Cancel
          </Button>
          {currentStep === steps.length - 1 ? (
            <Button type="submit" disabled={isSubmitting} className="font-bold px-6">
              {isSubmitting ? 'Saving...' : 'Save Bill'}
              {!isSubmitting && <Save className="h-4 w-4 ml-1.5" />}
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={handleNext} className="font-bold px-5">
              Next Step
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Gross/Net summary fixed to bottom */}
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
           {netAmount < 0 && (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
        </div>
      </div>
    </form>
  );
}
