import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Printer, Save, Settings, Trash2, Users, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { createDefaultEmployee } from '../constants';
import { gtr30BillFormService } from '../services/gtr30BillForm.service';
import { gtr30EmployeeTransformService } from '../services/gtr30EmployeeTransform.service';
import { useGTR30Settings } from '../hooks/useGTR30Settings';
import { useGTR30BillCodeMappings } from '../hooks/useGTR30BillCodeMappings';
import { useGTR30EmployeeMasterGroups, gtr30GroupKey } from '../hooks/useGTR30EmployeeMaster';
import { useGtr30Bill } from '../hooks/useGTR30Bills';
import { useGtr30SaveBill } from '../hooks/useGTR30BillMutations';
import type { GTR30Employee, GTR30FormData, GTR30PostItem } from '../types';
import { billTotals, earningsTotal, deductionsTotal, formatMoney } from '../services/gtr30Calc.service';
import { GTR30Document } from '../components/GTR30Document';
import { useToast } from '@/hooks/use-toast';

export function GTR30CreatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const billQuery = useGtr30Bill(id ?? null);
  const saveMutation = useGtr30SaveBill();
  const settingsQuery = useGTR30Settings();
  const mappingsQuery = useGTR30BillCodeMappings();
  const groupsQuery = useGTR30EmployeeMasterGroups();
  const existing = billQuery.data ?? null;

  const initialBundle = settingsQuery.data;
  const [data, setData] = useState<GTR30FormData>(() =>
    existing ??
    (initialBundle
      ? gtr30BillFormService.buildNewBillFormData({
          settings: initialBundle.settings,
          employeeTemplate: initialBundle.employeeTemplate,
          defaultPosts: initialBundle.defaultPosts,
        })
      : gtr30BillFormService.emptyFormData())
  );
  const [activeTab, setActiveTab] = useState('employees');

  const billCodeOptions = mappingsQuery.data ?? [];

  const loadEmployeesFromMaster = () => {
    const month = data.monthOf;
    const code = data.billCode;
    if (!month || !code) {
      toast({ title: 'Missing Data', description: 'Enter Month and Bill Code first.' });
      return;
    }
    const groups = groupsQuery.data ?? {};
    const rows = groups[gtr30GroupKey(month, code)] ?? [];
    if (rows.length === 0) {
      toast({
        title: 'No Master Found',
        description: `No employees assigned to bill code "${code}". Assign Bill Codes in Master Directory.`,
      });
      return;
    }
    setData((current) => ({
      ...current,
      employees: rows.map((master, idx) => gtr30EmployeeTransformService.masterToBillEmployee(master, idx + 1)),
    }));
    toast({
      title: 'Employees Loaded',
      description: `${rows.length} employee(s) loaded from master for ${code} · ${month}.`,
    });
  };

  const totals = billTotals(data);

  const setField = (field: keyof GTR30FormData, value: string | number) =>
    setData((current) => ({ ...current, [field]: value }));

  const updateEmployee = (employeeId: string, field: keyof GTR30Employee, value: string | number) => {
    setData((current) => ({
      ...current,
      employees: current.employees.map((emp) => {
        if (emp.id !== employeeId) return emp;
        const updated = { ...emp, [field]: value };

        // Auto-recalculate DA (53%) and NPS (10%) when pay changes
        if (field === 'payOfEstablishment' || field === 'payOfOfficer') {
          const pay = Number(value) || 0;
          if (pay > 0 && emp.da === 0) {
            const da = Math.round(pay * 0.53);
            updated.da = da;
            updated.npsPension = Math.round((pay + da) * 0.1);
            updated.payLevelCell = `PAY=${pay} (LEVEL CELL-7)`;
          }
        }
        return updated;
      }),
    }));
  };

  const autoRecalculateEmployee = (employeeId: string) => {
    setData((current) => ({
      ...current,
      employees: current.employees.map((emp) => {
        if (emp.id !== employeeId) return emp;
        const pay = (emp.payOfEstablishment || emp.payOfOfficer || 0);
        const da = Math.round(pay * 0.53);
        const nps = Math.round((pay + da) * 0.1);
        return {
          ...emp,
          da,
          npsPension: nps,
          payLevelCell: `PAY=${pay} (LEVEL CELL-7)`,
        };
      }),
    }));
    toast({ title: 'Recalculated', description: 'DA (53%) and NPS (10%) updated.' });
  };

  const addEmployee = () => {
    const nextSr = data.employees.length + 1;
    setData((current) => ({
      ...current,
      employees: [
        ...current.employees,
        createDefaultEmployee(nextSr),
      ],
    }));
  };

  const removeEmployee = (empId: string) => {
    setData((current) => ({
      ...current,
      employees: current.employees
        .filter((emp) => emp.id !== empId)
        .map((emp, idx) => ({ ...emp, srNo: idx + 1 })),
    }));
  };

  const updatePost = (postId: string, field: keyof GTR30PostItem, value: string | number) => {
    setData((current) => ({
      ...current,
      establishmentPosts: current.establishmentPosts.map((post) => {
        if (post.id === postId) {
          const updated = { ...post, [field]: value };
          if (field === 'sanctioned' || field === 'filled') {
            const sanc = Number(field === 'sanctioned' ? value : post.sanctioned) || 0;
            const fill = Number(field === 'filled' ? value : post.filled) || 0;
            updated.vacant = Math.max(0, sanc - fill);
            updated.total = sanc;
          }
          return updated;
        }
        return post;
      }),
    }));
  };

  const addPost = () => {
    const nextSr = data.establishmentPosts.length + 1;
    setData((current) => ({
      ...current,
      establishmentPosts: [
        ...current.establishmentPosts,
        {
          id: crypto.randomUUID(),
          srNo: String(nextSr),
          designation: '',
          cadreClass: '૩',
          sanctioned: 1,
          filled: 0,
          vacant: 1,
          total: 1,
        },
      ],
    }));
  };

  const removePost = (postId: string) => {
    setData((current) => ({
      ...current,
      establishmentPosts: current.establishmentPosts.filter((p) => p.id !== postId),
    }));
  };

  const saveBill = async () => {
    try {
      await saveMutation.mutateAsync({ form: data, existing });
      toast(
        id
          ? { title: 'Bill Updated', description: 'GTR-30 Pay Bill updated successfully.' }
          : { title: 'Bill Created', description: 'New GTR-30 Pay Bill saved to register.' }
      );
      navigate('/gtr30/list');
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const printBill = () => {
    setActiveTab('preview');
    window.setTimeout(() => window.print(), 200);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-24">
      <WorkspaceHeader
        eyebrow="Bill Creation · GTR-30"
        title={id ? 'Edit GTR-30 Pay Bill' : 'Create GTR-30 Pay Bill'}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/gtr30/list')}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Register
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/gtr30/settings')}>
              <Settings className="mr-1 h-4 w-4" /> Settings
            </Button>
            <Button variant="outline" size="sm" onClick={printBill}>
              <Printer className="mr-1 h-4 w-4" /> Print PDF
            </Button>
            <Button size="sm" onClick={saveBill} className="font-bold bg-blue-600 hover:bg-blue-700 text-white">
              <Save className="mr-1 h-4 w-4" /> Save Bill
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="employees" className="text-xs font-semibold py-2">
            1. Employees &amp; Pay Structure ({data.employees.length})
          </TabsTrigger>
          <TabsTrigger value="office" className="text-xs font-semibold py-2">
            2. Bill, Treasury &amp; Office Info
          </TabsTrigger>
          <TabsTrigger value="establishment" className="text-xs font-semibold py-2">
            3. Establishment Posts &amp; Resolutions
          </TabsTrigger>
          <TabsTrigger value="preview" className="text-xs font-semibold py-2 text-blue-700">
            4. Live 10-Page Preview &amp; Print
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Employees & Pay */}
        <TabsContent value="employees" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase text-slate-800">
                Staff Members &amp; Pay Components
              </h2>
              <p className="text-xs text-slate-500">
                Enter employee basic pay, allowances, and schedule deductions. All 10 sheets and cover tables update dynamically.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={loadEmployeesFromMaster}>
                <Users className="mr-1 h-4 w-4" /> Load from Master
              </Button>
              <Button size="sm" onClick={addEmployee} className="font-semibold bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="mr-1 h-4 w-4" /> Add Employee
              </Button>
            </div>
          </div>

          {data.employees.map((emp, index) => {
            const empEarnings = earningsTotal(emp);
            const empDeductions = deductionsTotal(emp);
            const empNet = empEarnings - empDeductions;
            const empNetAfterSociety = empNet - (emp.societyDeduction || 0);

            return (
              <Card key={emp.id} className="border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="font-bold text-slate-800 text-sm">
                      {emp.name || `Employee ${index + 1}`}
                    </span>
                    {emp.designationGujarati && (
                      <span className="text-xs font-medium text-slate-500 font-serif">
                        ({emp.designationGujarati})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-right">
                      <span className="text-slate-500 mr-2">Gross: <strong>₹{formatMoney(empEarnings)}</strong></span>
                      <span className="text-slate-500 mr-2">Deductions: <strong>₹{formatMoney(empDeductions)}</strong></span>
                      <span className="text-blue-700 font-bold mr-2">Net: ₹{formatMoney(empNet)}</span>
                      {emp.societyDeduction > 0 && (
                        <span className="text-emerald-700 font-bold">After Society: ₹{formatMoney(empNetAfterSociety)}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => autoRecalculateEmployee(emp.id)}
                      title="Auto-calculate DA (53%) & NPS (10%)"
                      className="text-xs text-blue-600 hover:bg-blue-50"
                    >
                      <Calculator className="h-3.5 w-3.5 mr-1" /> Auto-Calc
                    </Button>
                    {data.employees.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeEmployee(emp.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Identity & Scale Details */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label className="text-xs">Employee Name</Label>
                    <Input
                      value={emp.name}
                      onChange={(e) => updateEmployee(emp.id, 'name', e.target.value)}
                      placeholder="e.g. Shri R.B.Makvana"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Designation (English)</Label>
                    <Input
                      value={emp.designation}
                      onChange={(e) => updateEmployee(emp.id, 'designation', e.target.value)}
                      placeholder="e.g. Research Assistant"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Designation (Gujarati)</Label>
                    <Input
                      value={emp.designationGujarati || ''}
                      onChange={(e) => updateEmployee(emp.id, 'designationGujarati', e.target.value)}
                      placeholder="e.g. સંશોધન મદદનીશ"
                      className="font-serif"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Cadre Class</Label>
                    <Input
                      value={emp.cadreClass || '3'}
                      onChange={(e) => updateEmployee(emp.id, 'cadreClass', e.target.value)}
                      placeholder="e.g. 3"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Pay Scale / Pay Band</Label>
                    <Input
                      value={emp.payScale}
                      onChange={(e) => updateEmployee(emp.id, 'payScale', e.target.value)}
                      placeholder="e.g. 34,500-1,12,400"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Grade Pay</Label>
                    <Input
                      value={emp.gradePay}
                      onChange={(e) => updateEmployee(emp.id, 'gradePay', e.target.value)}
                      placeholder="e.g. GP:4200"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Pay Level / Cell</Label>
                    <Input
                      value={emp.payLevelCell}
                      onChange={(e) => updateEmployee(emp.id, 'payLevelCell', e.target.value)}
                      placeholder="e.g. PAY=39900 (LEVEL CELL-7)"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">PPA No.</Label>
                    <Input
                      value={emp.ppaNo}
                      onChange={(e) => updateEmployee(emp.id, 'ppaNo', e.target.value)}
                      placeholder="e.g. Applied"
                    />
                  </div>
                </div>

                {/* Quarters & Insurance Group */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Govt Quarters &amp; Residential Address (for Rent Schedule P5)</Label>
                    <Input
                      value={emp.quarterAddress}
                      onChange={(e) => updateEmployee(emp.id, 'quarterAddress', e.target.value)}
                      placeholder="e.g. H-7, Government Quarters, Khatodara, Nr. Sub Jail, Surat"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">GIS Group (ક / ખ / ગ / ઘ)</Label>
                    <Input
                      value={emp.insuranceGroup}
                      onChange={(e) => updateEmployee(emp.id, 'insuranceGroup', e.target.value)}
                      className="font-serif"
                      placeholder="e.g. ખ"
                    />
                  </div>
                </div>

                {/* Earnings */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-xs font-bold uppercase text-slate-700 mb-2">Earnings &amp; Allowances (₹)</div>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div>
                      <Label className="text-xs">Pay of Establishment (0102)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.payOfEstablishment || 0}
                        onChange={(e) => updateEmployee(emp.id, 'payOfEstablishment', parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Pay of Officer (0101)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.payOfOfficer || 0}
                        onChange={(e) => updateEmployee(emp.id, 'payOfOfficer', parseFloat(e.target.value) || 0)}
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-emerald-800">Dearness Allowance (0103)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.da || 0}
                        onChange={(e) => updateEmployee(emp.id, 'da', parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">C.L.A. / Other (0111)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.cla || 0}
                        onChange={(e) => updateEmployee(emp.id, 'cla', parseFloat(e.target.value) || 0)}
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Medical Allowance (0107)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.medicalAllowance || 0}
                        onChange={(e) => updateEmployee(emp.id, 'medicalAllowance', parseFloat(e.target.value) || 0)}
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Transport Allowance (0113)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.transportAllowance || 0}
                        onChange={(e) => updateEmployee(emp.id, 'transportAllowance', parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-200">
                  <div className="text-xs font-bold uppercase text-amber-900 mb-2">Schedule Deductions (₹)</div>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div>
                      <Label className="text-xs font-bold text-amber-900">NPS Pension (9534)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.npsPension || 0}
                        onChange={(e) => updateEmployee(emp.id, 'npsPension', parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Rent of Building (9550)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.rentOfBuilding || 0}
                        onChange={(e) => updateEmployee(emp.id, 'rentOfBuilding', parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Professional Tax (9570)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.professionalTax || 0}
                        onChange={(e) => updateEmployee(emp.id, 'professionalTax', parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">GIS Ins. Fund (9581)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.gis1981Insurance || 0}
                        onChange={(e) => updateEmployee(emp.id, 'gis1981Insurance', parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">GIS Sav. Fund (9582)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.gis1981Savings || 0}
                        onChange={(e) => updateEmployee(emp.id, 'gis1981Savings', parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-sky-800">ICDP Credit Society</Label>
                      <Input
                        type="number"
                        min="0"
                        value={emp.societyDeduction || 0}
                        onChange={(e) => updateEmployee(emp.id, 'societyDeduction', parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          <div className="flex justify-end pt-3">
            <Button onClick={() => setActiveTab('office')}>
              Next: Office &amp; Treasury Details <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        {/* TAB 2: Office & Treasury */}
        <TabsContent value="office" className="mt-4 space-y-4">
          <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase text-slate-800">Bill &amp; Treasury Metadata</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label className="text-xs">Bill Register No.</Label>
                <Input value={data.billRegisterNo} onChange={(e) => setField('billRegisterNo', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Bill Date</Label>
                <Input value={data.billDate} onChange={(e) => setField('billDate', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">For the Month of</Label>
                <Input value={data.monthOf} onChange={(e) => setField('monthOf', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Bill Code</Label>
                <select
                  value={data.billCode}
                  onChange={(e) => setField('billCode', e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 px-2 text-sm"
                >
                  <option value="">Select Bill Code</option>
                  {billCodeOptions.map((opt) => (
                    <option key={opt.id} value={opt.billCode}>
                      {opt.billCode} - {opt.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Station / District</Label>
                <Input value={data.station} onChange={(e) => setField('station', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">District Code</Label>
                <Input value={data.district} onChange={(e) => setField('district', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Branch Name (Establishment)</Label>
                <Input value={data.branchName} onChange={(e) => setField('branchName', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Office Name (Short)</Label>
                <Input value={data.officeName} onChange={(e) => setField('officeName', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Office Full Name</Label>
                <Input value={data.officeFullName} onChange={(e) => setField('officeFullName', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Treasury Name</Label>
                <Input value={data.treasuryName} onChange={(e) => setField('treasuryName', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Office Telephone</Label>
                <Input value={data.phoneNo} onChange={(e) => setField('phoneNo', e.target.value)} />
              </div>
            </div>
          </Card>

          <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase text-slate-800">Budget Classification &amp; Heads</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label className="text-xs">Class of Expenditure</Label>
                <Input value={data.classOfExpenditure} onChange={(e) => setField('classOfExpenditure', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Fund</Label>
                <Input value={data.fund} onChange={(e) => setField('fund', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Drawing Officer Code</Label>
                <Input value={data.drawingOfficer} onChange={(e) => setField('drawingOfficer', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Demand No.</Label>
                <Input value={data.demandNo} onChange={(e) => setField('demandNo', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Type of Budget</Label>
                <Input value={data.typeOfBudget} onChange={(e) => setField('typeOfBudget', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Scheme No.</Label>
                <Input value={data.schemeNo} onChange={(e) => setField('schemeNo', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Head Chargeable (13 Digits)</Label>
                <Input value={data.headChargeable} onChange={(e) => setField('headChargeable', e.target.value)} className="font-mono" />
              </div>
              <div>
                <Label className="text-xs">Sector</Label>
                <Input value={data.sector} onChange={(e) => setField('sector', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Major Head</Label>
                <Input value={data.majorHead} onChange={(e) => setField('majorHead', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Minor Head</Label>
                <Input value={data.minorHead} onChange={(e) => setField('minorHead', e.target.value)} />
              </div>
              <div className="sm:col-span-3">
                <Label className="text-xs">Sub Head</Label>
                <Input value={data.subHead} onChange={(e) => setField('subHead', e.target.value)} />
              </div>
            </div>
          </Card>

          <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase text-slate-800">Drawing Officer &amp; Messenger</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label className="text-xs">Drawing Officer Name (English)</Label>
                <Input value={data.drawingOfficerName} onChange={(e) => setField('drawingOfficerName', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Drawing Officer Name (Gujarati)</Label>
                <Input value={data.drawingOfficerNameGujarati} onChange={(e) => setField('drawingOfficerNameGujarati', e.target.value)} className="font-serif" />
              </div>
              <div>
                <Label className="text-xs">Designation (English)</Label>
                <Input value={data.drawingOfficerDesignation} onChange={(e) => setField('drawingOfficerDesignation', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Designation (Gujarati)</Label>
                <Input value={data.drawingOfficerDesignationGujarati} onChange={(e) => setField('drawingOfficerDesignationGujarati', e.target.value)} className="font-serif" />
              </div>
              <div>
                <Label className="text-xs">Cardex No.</Label>
                <Input value={data.cardexNo} onChange={(e) => setField('cardexNo', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">DDO Code No.</Label>
                <Input value={data.ddoCode} onChange={(e) => setField('ddoCode', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Authorised Messenger Name</Label>
                <Input value={data.messengerName} onChange={(e) => setField('messengerName', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Messenger Designation</Label>
                <Input value={data.messengerDesignation} onChange={(e) => setField('messengerDesignation', e.target.value)} />
              </div>
            </div>
          </Card>

          <div className="flex justify-between pt-3">
            <Button variant="outline" onClick={() => setActiveTab('employees')}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to Employees
            </Button>
            <Button onClick={() => setActiveTab('establishment')}>
              Next: Establishment Posts &amp; Resolutions <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        {/* TAB 3: Establishment & Schemes */}
        <TabsContent value="establishment" className="mt-4 space-y-4">
          <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase text-slate-800">
                  Establishment Information Posts (મહેકમની માહિતી · Page 9)
                </h2>
                <p className="text-xs text-slate-500">
                  Sanctioned and occupied posts listed on Page 9 of the bill.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={addPost}>
                <Plus className="mr-1 h-4 w-4" /> Add Post
              </Button>
            </div>

            <div className="space-y-3">
              {data.establishmentPosts.map((post) => (
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
                    <Label className="text-xs">Designation / Post</Label>
                    <Input
                      value={post.designation}
                      onChange={(e) => updatePost(post.id, 'designation', e.target.value)}
                      placeholder="e.g. આંકડા અધિકારી"
                      className="font-serif font-bold"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Class (વર્ગ)</Label>
                    <Input
                      value={post.cadreClass}
                      onChange={(e) => updatePost(post.id, 'cadreClass', e.target.value)}
                      className="font-serif"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Sanctioned (મંજુર)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={post.sanctioned}
                      onChange={(e) => updatePost(post.id, 'sanctioned', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Filled (ભરાયેલ)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={post.filled}
                      onChange={(e) => updatePost(post.id, 'filled', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Vacant (ખાલી)</Label>
                      <Input value={post.vacant} disabled className="bg-slate-100 font-bold" />
                    </div>
                    {data.establishmentPosts.length > 1 && (
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

          <Card className="border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase text-slate-800">
              Government Resolutions (સરકારી ઠરાવ લખાણ)
            </h2>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Scheme Permanent Sanction Resolution (Page 3 Header Box)</Label>
                <Input
                  value={data.schemeResolutionText}
                  onChange={(e) => setField('schemeResolutionText', e.target.value)}
                  className="font-serif"
                />
              </div>
              <div>
                <Label className="text-xs">7th Pay Commission DA Resolution (Page 10 Point 9)</Label>
                <Input
                  value={data.daResolutionText}
                  onChange={(e) => setField('daResolutionText', e.target.value)}
                  className="font-serif"
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-between pt-3">
            <Button variant="outline" onClick={() => setActiveTab('office')}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to Office
            </Button>
            <Button onClick={() => setActiveTab('preview')}>
              Next: View Full 10-Page Preview <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        {/* TAB 4: Live Preview */}
        <TabsContent value="preview" className="mt-4 space-y-4">
          <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 overflow-auto">
            <GTR30Document data={data} containerId="gtr30-create-preview" />
          </div>
        </TabsContent>
      </Tabs>

      {/* Floating Bottom Summary Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 text-white border-t border-slate-800 px-6 py-2.5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6 text-xs">
          <div>
            <span className="text-slate-400 mr-1.5">Staff:</span>
            <strong className="text-white text-sm">{data.employees.length}</strong>
          </div>
          <div>
            <span className="text-slate-400 mr-1.5">Gross Amount:</span>
            <strong className="text-white text-sm font-mono">₹{formatMoney(totals.gross)}</strong>
          </div>
          <div>
            <span className="text-slate-400 mr-1.5">Total Deductions:</span>
            <strong className="text-amber-400 text-sm font-mono">₹{formatMoney(totals.deductions)}</strong>
          </div>
          <div>
            <span className="text-slate-400 mr-1.5">Net Payable:</span>
            <strong className="text-emerald-400 text-base font-bold font-mono">₹{formatMoney(totals.net)}</strong>
          </div>
          {totals.societyTotal > 0 && (
            <div>
              <span className="text-slate-400 mr-1.5">After Society:</span>
              <strong className="text-sky-300 text-sm font-mono">₹{formatMoney(totals.netAfterSociety)}</strong>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setActiveTab('preview')} className="bg-slate-800 text-white hover:bg-slate-700 border-slate-700">
            Preview
          </Button>
          <Button size="sm" onClick={saveBill} className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white px-5">
            <Save className="mr-1.5 h-4 w-4" /> Save Bill
          </Button>
        </div>
      </div>
    </div>
  );
}
