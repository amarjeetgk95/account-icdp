import React, { useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Button } from '../../../components/ui/button';
import { SubVoucherList, SubVoucher as ComponentSubVoucher } from './SubVoucherList';
import { GTR44FormData, GTR44Entry, GTR44ObjectExpenditureItem, GTR44Deductions } from '../types';
import { useToast } from '../../../hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import '../styles/gtr44.css';

interface GTR44BillWizardProps {
  initialData?: GTR44FormData;
  onSubmit: (data: GTR44FormData) => void;
  isSubmitting?: boolean;
}

const DEFAULT_DEDUCTIONS: GTR44Deductions = { tds9510: 0, surcharge9520: 0, sd9600: 0, misc9910: 0 };

export function GTR44BillWizard({ initialData, onSubmit, isSubmitting = false }: GTR44BillWizardProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<GTR44FormData>(initialData || {
    billTransitRegNo1: '',
    billTransitDate1: '',
    tokenNo1: '',
    tokenDate1: '',
    billTransitRegNo2: '',
    billTransitDate2: '',
    tokenNo2: '',
    tokenDate2: '',
    billRegisterNo: '',
    billRegisterDate: new Date().toISOString().split('T')[0],
    officeName: '',
    monthOf: '',
    treasuryName: '',
    district: '66',
    monthYear: new Date().getFullYear().toString().slice(-2) + String(new Date().getMonth() + 1).padStart(2, '0'),
    voucherNo: '',
    classOfExpenditure: '1',
    fund: '3',
    drawing: '299',
    demandNo: '04',
    typeOfBudget: '1',
    schemeNo: '110263',
    headChargeableCode: '240300102050',
    sector: 'C-Economic Services',
    demandNoLabel: '004',
    majorHead: '2403 Animal Husbandry',
    subMajorHead: '00',
    minorHead: '102 Cattle and Buffalo Development',
    subHead: '05 ANH-06 Intensive Cattle Development Programme',
    detailedHead: '00',
    budgetGrantYearFrom: new Date().getFullYear().toString(),
    budgetGrantYearTo: String(new Date().getFullYear() + 1).slice(-2),
    budgetGrant: null,
    expenditureIncludingBill: null,
    balance: null,
    treasuryPayRs: null,
    treasuryPayRsWords: '',
    treasuryByTc: null,
    treasuryTotalRs: null,
    treasuryDate: '',
    treasuryAccountant: '',
    treasuryOfficer: '',
    expenditureItems: Array(22).fill(null).map(() => ({ code: '', name: '', edpCode: '', amount: null as number | null })),
    deductions: { ...DEFAULT_DEDUCTIONS },
    partyEntries: [],
    underRsAmount: null,
    cert3Amount: null,
    cert3RecoverableType: 'has been',
    payToName: '',
    payToDesignation: '',
    messengerSignatureName: '',
    drawingOfficerSignatureName: '',
    billDated: new Date().toISOString().split('T')[0],
    ddoCardexCode: '',
    passedForAmount: null,
    passedForAmountWords: '',
    countersigningOfficerName: '',
    countersigningOffice: '',
    countersigningDate: '',
    agTotalAmount: null,
    agAdmittedAmount: null,
    agObjectedAmount: null,
    agAuditorName: '',
    agSuperintendentName: '',
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = [
    { id: 'header', label: 'Bill Header', icon: '1' },
    { id: 'classification', label: 'Head of Account', icon: '2' },
    { id: 'budget', label: 'Budget & Treasury', icon: '3' },
    { id: 'expenditure', label: 'Expenditure Items', icon: '4' },
    { id: 'deductions', label: 'Deductions', icon: '5' },
    { id: 'parties', label: 'Party Entries', icon: '6' },
    { id: 'certification', label: 'Certification', icon: '7' },
  ];

  const updateField = <K extends keyof GTR44FormData>(field: K, value: GTR44FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    }
  };

  const updateExpenditureItem = (index: number, field: keyof GTR44ObjectExpenditureItem, value: string | number | null) => {
    setFormData(prev => {
      const items = [...prev.expenditureItems];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, expenditureItems: items };
    });
  };

  const updateDeduction = (field: keyof GTR44Deductions, value: number) => {
    setFormData(prev => ({
      ...prev,
      deductions: { ...prev.deductions, [field]: value }
    }));
  };

  const mapToComponentSubVoucher = (sv: GTR44Entry): ComponentSubVoucher => ({
    id: sv.id,
    voucherNo: sv.subVoucherNo || '',
    payee: sv.partyName,
    description: sv.details,
    sanctionOrder: sv.sanctionOrderNo || '',
    sanctionDate: sv.sanctionDate || '',
    amount: sv.amount
  });

  const handleAddSubVoucher = (csv: ComponentSubVoucher) => {
    const newEntry: GTR44Entry = {
      id: csv.id,
      srNo: formData.partyEntries.length + 1,
      subVoucherNo: csv.voucherNo || String(formData.partyEntries.length + 1),
      partyName: csv.payee,
      billNo: csv.voucherNo || `BILL-${formData.partyEntries.length + 1}`,
      date: csv.sanctionDate || new Date().toISOString().split('T')[0],
      details: csv.description,
      amount: csv.amount,
      sanctionOrderNo: csv.sanctionOrder,
      sanctionDate: csv.sanctionDate,
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
              billNo: csv.voucherNo || sv.billNo,
              date: csv.sanctionDate || sv.date,
              details: csv.description,
              amount: csv.amount,
              sanctionOrderNo: csv.sanctionOrder,
              sanctionDate: csv.sanctionDate,
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
  const grossAmount = (formData.partyEntries || []).reduce((acc: number, e) => acc + Number(e.amount || 0), 0);
  const totalDeduction = Object.values(formData.deductions || DEFAULT_DEDUCTIONS).reduce((acc: number, d) => acc + Number(d || 0), 0);
  const netAmount = grossAmount - totalDeduction;

  const validateStep = (stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};
    const stepId = steps[stepIndex].id;

    if (stepId === 'header') {
      if (!formData.billRegisterNo) newErrors['billRegisterNo'] = 'Bill Register No. is required';
      if (!formData.officeName) newErrors['officeName'] = 'Office Name is required';
      if (!formData.monthOf) newErrors['monthOf'] = 'Month of Bill is required';
      if (!formData.treasuryName) newErrors['treasuryName'] = 'Treasury Name is required';
    }
    if (stepId === 'classification') {
      if (!formData.district) newErrors['district'] = 'District code is required';
      if (!formData.headChargeableCode) newErrors['headChargeableCode'] = 'Head Chargeable Code is required';
    }
    if (stepId === 'budget') {
      if (!formData.budgetGrant || formData.budgetGrant <= 0) newErrors['budgetGrant'] = 'Budget Grant must be greater than 0';
    }
    if (stepId === 'parties') {
      if (formData.partyEntries.length === 0) newErrors['partyEntries'] = 'At least one party entry is required';
      if (netAmount < 0) newErrors['netAmount'] = 'Net amount cannot be negative — check deductions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    for (let i = 0; i < steps.length; i++) {
      if (!validateStep(i)) {
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
    const finalData = {
      ...formData,
      expenditureIncludingBill: grossAmount,
      balance: (Number(formData.budgetGrant) || 0) - grossAmount,
      treasuryTotalRs: grossAmount,
      treasuryPayRs: netAmount,
      treasuryPayRsWords: '',
      passedForAmount: grossAmount,
      agTotalAmount: grossAmount,
      agAdmittedAmount: grossAmount,
    };
    onSubmit(finalData);
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
      case 'header':
        return (
          <div className="space-y-6">
            <Card className="border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 text-sm uppercase mb-4">Bill Header Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Bill Register No. *</Label>
                  <Input
                    value={formData.billRegisterNo}
                    onChange={e => updateField('billRegisterNo', e.target.value)}
                    className={errors['billRegisterNo'] ? 'border-red-500' : ''}
                  />
                  {errors['billRegisterNo'] && <p className="text-red-500 text-xs">{errors['billRegisterNo']}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Bill Register Date *</Label>
                  <Input type="date" value={formData.billRegisterDate} onChange={e => updateField('billRegisterDate', e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Office Name *</Label>
                  <Input
                    value={formData.officeName}
                    onChange={e => updateField('officeName', e.target.value)}
                    className={errors['officeName'] ? 'border-red-500' : ''}
                  />
                  {errors['officeName'] && <p className="text-red-500 text-xs">{errors['officeName']}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Treasury Name *</Label>
                  <Input
                    value={formData.treasuryName}
                    onChange={e => updateField('treasuryName', e.target.value)}
                    className={errors['treasuryName'] ? 'border-red-500' : ''}
                  />
                  {errors['treasuryName'] && <p className="text-red-500 text-xs">{errors['treasuryName']}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Month of Bill *</Label>
                  <Input
                    value={formData.monthOf}
                    onChange={e => updateField('monthOf', e.target.value)}
                    className={errors['monthOf'] ? 'border-red-500' : ''}
                    placeholder="e.g. July 2026"
                  />
                  {errors['monthOf'] && <p className="text-red-500 text-xs">{errors['monthOf']}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Token No</Label>
                  <Input value={formData.tokenNo1} onChange={e => updateField('tokenNo1', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Token Date</Label>
                  <Input type="date" value={formData.tokenDate1} onChange={e => updateField('tokenDate1', e.target.value)} />
                </div>
              </div>
            </Card>

            <Card className="border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 text-sm uppercase mb-4">Computer Input Data</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>District Code (2 digits)</Label>
                  <Input maxLength={2} value={formData.district} onChange={e => updateField('district', e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Month-Year (4 digits)</Label>
                  <Input maxLength={4} value={formData.monthYear} onChange={e => updateField('monthYear', e.target.value)} className="font-mono" placeholder="e.g. 0726" />
                </div>
                <div className="space-y-2">
                  <Label>Voucher No (4 digits)</Label>
                  <Input maxLength={4} value={formData.voucherNo} onChange={e => updateField('voucherNo', e.target.value)} className="font-mono" />
                </div>
              </div>
            </Card>
          </div>
        );

      case 'classification':
        return (
          <div className="space-y-6">
            <Card className="border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 text-sm uppercase mb-4">Head of Account Classification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <Label>Class of Expenditure (1 digit)</Label>
                  <Input maxLength={1} value={formData.classOfExpenditure} onChange={e => updateField('classOfExpenditure', e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Fund (1 digit)</Label>
                  <Input maxLength={1} value={formData.fund} onChange={e => updateField('fund', e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Drawing DDO Code (3 digits)</Label>
                  <Input maxLength={3} value={formData.drawing} onChange={e => updateField('drawing', e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Demand No.</Label>
                  <Input maxLength={3} value={formData.demandNo} onChange={e => updateField('demandNo', e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Type of Budget (1 digit)</Label>
                  <Input maxLength={1} value={formData.typeOfBudget} onChange={e => updateField('typeOfBudget', e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Scheme No.</Label>
                  <Input maxLength={6} value={formData.schemeNo} onChange={e => updateField('schemeNo', e.target.value)} className="font-mono" placeholder="e.g. 110263" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Head Chargeable Code (12 digits)</Label>
                  <Input
                    maxLength={12}
                    value={formData.headChargeableCode}
                    onChange={e => updateField('headChargeableCode', e.target.value)}
                    className="font-mono"
                  />
                  {errors['headChargeableCode'] && <p className="text-red-500 text-xs">{errors['headChargeableCode']}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Detailed Head (2 digits)</Label>
                  <Input maxLength={2} value={formData.detailedHead} onChange={e => updateField('detailedHead', e.target.value)} className="font-mono" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Major Head</Label>
                  <Input value={formData.majorHead} onChange={e => updateField('majorHead', e.target.value)} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Minor Head</Label>
                  <Input value={formData.minorHead} onChange={e => updateField('minorHead', e.target.value)} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Sub Head</Label>
                  <Input value={formData.subHead} onChange={e => updateField('subHead', e.target.value)} />
                </div>
              </div>
            </Card>
          </div>
        );

      case 'budget':
        return (
          <div className="space-y-6">
            <Card className="border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 text-sm uppercase mb-4">Budget & Treasury Pay Order</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-2">
                  <Label>Budget Grant Year From</Label>
                  <Input type="number" value={formData.budgetGrantYearFrom} onChange={e => updateField('budgetGrantYearFrom', e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Budget Grant Year To</Label>
                  <Input maxLength={2} type="number" value={formData.budgetGrantYearTo} onChange={e => updateField('budgetGrantYearTo', e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Budget Grant (₹) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.budgetGrant ?? ''}
                    onChange={e => updateField('budgetGrant', parseFloat(e.target.value) || 0)}
                    className={`font-mono font-bold ${errors['budgetGrant'] ? 'border-red-500' : ''}`}
                  />
                  {errors['budgetGrant'] && <p className="text-red-500 text-xs">{errors['budgetGrant']}</p>}
                </div>
                <div className="space-y-2">
                  <Label>DDO Cardex Code</Label>
                  <Input value={formData.ddoCardexCode} onChange={e => updateField('ddoCardexCode', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Under Rs Amount</Label>
                  <Input type="number" step="0.01" value={formData.underRsAmount ?? ''} onChange={e => updateField('underRsAmount', parseFloat(e.target.value) || 0)} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Treasury Pay Rs (₹)</Label>
                  <Input type="number" step="0.01" readOnly value={formData.treasuryPayRs ?? ''} className="font-mono font-bold bg-gray-50" />
                </div>
                <div className="md:col-span-3 space-y-2">
                  <Label>Treasury Pay Rs in Words</Label>
                  <Input value={formData.treasuryPayRsWords} onChange={e => updateField('treasuryPayRsWords', e.target.value)} placeholder="Auto-filled by system..." />
                </div>
                <div className="space-y-2">
                  <Label>Treasury Date</Label>
                  <Input type="date" value={formData.treasuryDate} onChange={e => updateField('treasuryDate', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Treasury Accountant</Label>
                  <Input value={formData.treasuryAccountant} onChange={e => updateField('treasuryAccountant', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Treasury Officer</Label>
                  <Input value={formData.treasuryOfficer} onChange={e => updateField('treasuryOfficer', e.target.value)} />
                </div>
              </div>
            </Card>
          </div>
        );

      case 'expenditure':
        return (
          <div className="space-y-4">
            <Card className="border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900 text-sm uppercase">EDP Object of Expenditure Items (22)</h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Total: ₹ {formData.expenditureItems.reduce((sum, i) => sum + (i.amount || 0), 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-600 bg-gray-50 p-2 rounded mb-2">
                <div className="col-span-1">Sr.</div>
                <div className="col-span-2">Code</div>
                <div className="col-span-4">Name of Object</div>
                <div className="col-span-3">EDP Code</div>
                <div className="col-span-2 text-right">Amount (₹)</div>
              </div>

              {formData.expenditureItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2 border-b border-gray-100 last:border-0">
                  <span className="col-span-1 text-sm text-gray-500 font-bold">{idx + 1}</span>
                  <Input className="col-span-2 text-xs font-mono" value={item.code} onChange={e => updateExpenditureItem(idx, 'code', e.target.value)} placeholder="Code" maxLength={4} />
                  <Input className="col-span-4 text-xs" value={item.name} onChange={e => updateExpenditureItem(idx, 'name', e.target.value)} placeholder="Name of object" />
                  <Input className="col-span-3 text-xs font-mono" value={item.edpCode} onChange={e => updateExpenditureItem(idx, 'edpCode', e.target.value)} placeholder="EDP code" />
                  <Input type="number" step="0.01" className="col-span-2 text-xs text-right font-mono font-bold" value={item.amount ?? ''} onChange={e => updateExpenditureItem(idx, 'amount', parseFloat(e.target.value) || null)} placeholder="0.00" />
                </div>
              ))}
            </Card>
          </div>
        );

      case 'deductions':
        return (
          <div className="space-y-6">
            <Card className="border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 text-sm uppercase mb-4">Statutory Deductions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <Label>Income Tax / TDS (9510)</Label>
                  <Input type="number" step="0.01" value={formData.deductions.tds9510 || 0} onChange={e => updateDeduction('tds9510', parseFloat(e.target.value) || 0)} className="font-mono font-bold" />
                </div>
                <div className="space-y-2">
                  <Label>Surcharge on IT (9520)</Label>
                  <Input type="number" step="0.01" value={formData.deductions.surcharge9520 || 0} onChange={e => updateDeduction('surcharge9520', parseFloat(e.target.value) || 0)} className="font-mono font-bold" />
                </div>
                <div className="space-y-2">
                  <Label>Security Deposit (9600)</Label>
                  <Input type="number" step="0.01" value={formData.deductions.sd9600 || 0} onChange={e => updateDeduction('sd9600', parseFloat(e.target.value) || 0)} className="font-mono font-bold" />
                </div>
                <div className="space-y-2">
                  <Label>Misc Recoveries (9910)</Label>
                  <Input type="number" step="0.01" value={formData.deductions.misc9910 || 0} onChange={e => updateDeduction('misc9910', parseFloat(e.target.value) || 0)} className="font-mono font-bold" />
                </div>
              </div>
            </Card>
          </div>
        );

      case 'parties':
        return (
          <div className="space-y-4">
            {errors['partyEntries'] && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errors['partyEntries']}</span>
              </div>
            )}
            {errors['netAmount'] && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errors['netAmount']}</span>
              </div>
            )}
            <Card className="border border-gray-200 p-6">
              <SubVoucherList
                subVouchers={formData.partyEntries.map(mapToComponentSubVoucher)}
                onAdd={handleAddSubVoucher}
                onEdit={handleEditSubVoucher}
                onDelete={handleDeleteSubVoucher}
              />
            </Card>
          </div>
        );

      case 'certification':
        return (
          <div className="space-y-6">
            <Card className="border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 text-sm uppercase mb-4">Page 4 - Payment & Passing Details</h3>
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700 text-xs uppercase">Payment Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <Label>Pay To Name</Label>
                    <Input value={formData.payToName} onChange={e => updateField('payToName', e.target.value)} placeholder="Payee name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Pay To Designation</Label>
                    <Input value={formData.payToDesignation} onChange={e => updateField('payToDesignation', e.target.value)} placeholder="Designation" />
                  </div>
                  <div className="space-y-2">
                    <Label>Drawing Officer Signature Name</Label>
                    <Input value={formData.drawingOfficerSignatureName} onChange={e => updateField('drawingOfficerSignatureName', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Bill Dated</Label>
                    <Input type="date" value={formData.billDated} onChange={e => updateField('billDated', e.target.value)} />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 text-sm uppercase mb-4">AG&apos;s Office Verification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <Label>AG Total Amount (₹)</Label>
                  <Input type="number" step="0.01" value={formData.agTotalAmount ?? ''} onChange={e => updateField('agTotalAmount', parseFloat(e.target.value) || 0)} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>AG Admitted Amount (₹)</Label>
                  <Input type="number" step="0.01" value={formData.agAdmittedAmount ?? ''} onChange={e => updateField('agAdmittedAmount', parseFloat(e.target.value) || 0)} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>AG Objected Amount (₹)</Label>
                  <Input type="number" step="0.01" value={formData.agObjectedAmount ?? ''} onChange={e => updateField('agObjectedAmount', parseFloat(e.target.value) || 0)} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Countersigning Officer Name</Label>
                  <Input value={formData.countersigningOfficerName} onChange={e => updateField('countersigningOfficerName', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Countersigning Office</Label>
                  <Input value={formData.countersigningOffice} onChange={e => updateField('countersigningOffice', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Countersigning Date</Label>
                  <Input type="date" value={formData.countersigningDate} onChange={e => updateField('countersigningDate', e.target.value)} />
                </div>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 gtr44-wizard-form">
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
            onClick={() => setCurrentStep(index)}
            className={`gtr44-wizard-tab ${getStepStatusClass(index)}`}
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
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6">
              {isSubmitting ? 'Saving...' : 'Save Bill'}
              {!isSubmitting && <Save className="h-4 w-4 ml-1.5" />}
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5">
              Next Step
              <Plus className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Gross/Net summary fixed to bottom */}
      <div className="gtr44-summary-bar">
        <div className="gtr44-summary-item gtr44-summary-gross">
          <span className="gtr44-summary-label">Gross:</span>
          <span className="gtr44-summary-value">₹ {grossAmount.toLocaleString('en-IN')}</span>
        </div>
        <div className="gtr44-summary-item gtr44-summary-deduct">
          <span className="gtr44-summary-label">Deductions:</span>
          <span className="gtr44-summary-value">₹ {totalDeduction.toLocaleString('en-IN')}</span>
        </div>
        <div className="gtr44-summary-item gtr44-summary-net">
          <span className="gtr44-summary-label">Net Payable:</span>
          <span className="gtr44-summary-value">₹ {Math.max(0, netAmount).toLocaleString('en-IN')}</span>
           {netAmount < 0 && (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
        </div>
      </div>
    </form>
  );
}
