import type { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Trash2, Calculator, ChevronDown, TrendingUp, TrendingDown, History, Columns } from 'lucide-react';
import { earningsTotal, deductionsTotal, formatMoney } from '../../services/gtr30Calc.service';
import { monthStartFromKey, formatDate } from '../../utils/gtr30PayMatrix';
import type { PayForMonthResult } from '../../utils/gtr30PayMatrix';
import type { GTR30Employee } from '../../types';
import { parsePayLevelCell, composePayLevelCell } from './payLevelCell';

export interface EmployeeCardProps {
  emp: GTR30Employee;
  index: number;
  canRemove: boolean;
  effectiveDaPercent: number;
  payResolutions: Record<string, PayForMonthResult>;
  monthOf: string;
  identityOpen: Record<string, boolean>;
  setIdentityOpen: Dispatch<SetStateAction<Record<string, boolean>>>;
  advancedEarningsOpen: Record<string, boolean>;
  setAdvancedEarningsOpen: Dispatch<SetStateAction<Record<string, boolean>>>;
  advancedDeductionsOpen: Record<string, boolean>;
  setAdvancedDeductionsOpen: Dispatch<SetStateAction<Record<string, boolean>>>;
  updateEmployee: (employeeId: string, field: keyof GTR30Employee, value: string | number) => void;
  autoRecalculateEmployee: (employeeId: string) => void;
  removeEmployee: (employeeId: string) => void;
}

/**
 * Per-employee salary editor card (extracted from GTR30CreatePage).
 * All state and totals are derived from the `emp` prop; parent owns the list.
 */
export function EmployeeCard({
  emp,
  index,
  canRemove,
  effectiveDaPercent,
  payResolutions,
  monthOf,
  identityOpen,
  setIdentityOpen,
  advancedEarningsOpen,
  setAdvancedEarningsOpen,
  advancedDeductionsOpen,
  setAdvancedDeductionsOpen,
  updateEmployee,
  autoRecalculateEmployee,
  removeEmployee,
}: EmployeeCardProps) {
  const empEarnings = earningsTotal(emp);
  const empDeductions = deductionsTotal(emp);
  const empNet = empEarnings - empDeductions;
  const empNetAfterSociety = empNet - (emp.societyDeduction || 0);

  return (
              <Card key={emp.id} className="border border-slate-200 p-5 shadow-sm space-y-4 focus-within:ring-1 focus-within:ring-blue-200">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="font-bold text-slate-800 text-xs">
                      {emp.name || `Employee ${index + 1}`}
                    </span>
                    {emp.designationGujarati && (
                      <span className="text-xs font-medium text-slate-500 font-gujSans">
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
                      title={`Auto-calculate DA (${effectiveDaPercent}%) & NPS (10%)`}
                      className="text-xs text-blue-600 hover:bg-blue-50"
                    >
                      <Calculator className="h-3.5 w-3.5 mr-1" /> Auto-Calc ({effectiveDaPercent}%)
                    </Button>
                    {canRemove && (
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

                {/* Identity & Scale Details — collapsed by default for master-loaded staff */}
                {(() => {
                  const identityExpanded = identityOpen[emp.id] ?? Boolean(emp.name);
                  return (
                    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                      <button
                        type="button"
                        aria-expanded={identityExpanded}
                        onClick={() => setIdentityOpen((prev) => ({ ...prev, [emp.id]: !identityExpanded }))}
                        className="w-full flex items-center justify-between px-3.5 py-2 bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <span className="text-xs font-bold uppercase text-slate-700">
                          Identity &amp; Scale Details
                        </span>
                        <span className="flex items-center gap-2 text-xs text-slate-500">
                          {!identityExpanded && (
                            <span className="hidden sm:block text-xs font-medium text-slate-400 truncate max-w-[320px]">
                              {[emp.payScale, emp.gradePay, parsePayLevelCell(emp.payLevelCell).level && `L-${parsePayLevelCell(emp.payLevelCell).level}`].filter(Boolean).join(' · ') || 'Scale & designation'}
                            </span>
                          )}
                          <ChevronDown className={`h-4 w-4 transition-transform ${identityExpanded ? 'rotate-180' : ''}`} />
                        </span>
                      </button>
                      {identityExpanded && (
                        <div className="p-3.5">
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label htmlFor={`emp-${emp.id}-name`} className="text-xs">Employee Name</Label>
                    <Input
                      id={`emp-${emp.id}-name`}
                      value={emp.name}
                      onChange={(e) => updateEmployee(emp.id, 'name', e.target.value)}
                      placeholder="e.g. Shri R.B.Makvana"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`emp-${emp.id}-designation`} className="text-xs">Designation (English)</Label>
                    <Input
                      id={`emp-${emp.id}-designation`}
                      value={emp.designation}
                      onChange={(e) => updateEmployee(emp.id, 'designation', e.target.value)}
                      placeholder="e.g. Research Assistant"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`emp-${emp.id}-designationGu`} className="text-xs">Designation (Gujarati)</Label>
                    <Input
                      id={`emp-${emp.id}-designationGu`}
                      value={emp.designationGujarati || ''}
                      onChange={(e) => updateEmployee(emp.id, 'designationGujarati', e.target.value)}
                      placeholder="e.g. સંશોધન મદદનીશ"
                      className="font-gujSans"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`emp-${emp.id}-cadre`} className="text-xs">Cadre Class</Label>
                    <Input
                      id={`emp-${emp.id}-cadre`}
                      value={emp.cadreClass || '3'}
                      onChange={(e) => updateEmployee(emp.id, 'cadreClass', e.target.value)}
                      placeholder="e.g. 3"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`emp-${emp.id}-payScale`} className="text-xs">Pay Scale / Pay Band</Label>
                    <Input
                      id={`emp-${emp.id}-payScale`}
                      value={emp.payScale}
                      onChange={(e) => updateEmployee(emp.id, 'payScale', e.target.value)}
                      placeholder="e.g. 34,500-1,12,400"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`emp-${emp.id}-gradePay`} className="text-xs">Grade Pay</Label>
                    <Input
                      id={`emp-${emp.id}-gradePay`}
                      value={emp.gradePay}
                      onChange={(e) => updateEmployee(emp.id, 'gradePay', e.target.value)}
                      placeholder="e.g. GP:4200"
                    />
                  </div>
                  {(() => {
                    const { level, cell } = parsePayLevelCell(emp.payLevelCell);
                    const pay = (emp.payOfEstablishment || emp.payOfOfficer || 0);
                    return (
                      <div>
                        <Label className="text-xs">Pay Level / Cell</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={level}
                            aria-label={`Pay level for ${emp.name || `employee ${emp.id}`}`}
                            onChange={(e) =>
                              updateEmployee(emp.id, 'payLevelCell', composePayLevelCell(pay, e.target.value, cell))
                            }
                            className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs num"
                          >
                            <option value="">Level</option>
                            {Array.from({ length: 18 }, (_, i) => String(i + 1)).map((l) => (
                              <option key={l} value={l}>
                                {l}
                              </option>
                            ))}
                          </select>
                          <Input
                            type="number" inputMode="decimal"
                            min="1"
                            value={cell}
                            aria-label={`Pay cell for ${emp.name || `employee ${emp.id}`}`}
                            onChange={(e) =>
                              updateEmployee(emp.id, 'payLevelCell', composePayLevelCell(pay, level, e.target.value))
                            }
                            placeholder="Cell"
                            className="num"
                          />
                        </div>
                      </div>
                    );
                  })()}
                  <div>
                    <Label htmlFor={`emp-${emp.id}-ppa`} className="text-xs">PPA No.</Label>
                    <Input
                      id={`emp-${emp.id}-ppa`}
                      value={emp.ppaNo}
                      onChange={(e) => updateEmployee(emp.id, 'ppaNo', e.target.value)}
                      placeholder="e.g. Applied"
                    />
                  </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Quarters & Insurance Group */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <Label htmlFor={`emp-${emp.id}-quarter`} className="text-xs">Govt Quarters &amp; Residential Address (for Rent Schedule P5)</Label>
                    <Input
                      id={`emp-${emp.id}-quarter`}
                      value={emp.quarterAddress}
                      onChange={(e) => updateEmployee(emp.id, 'quarterAddress', e.target.value)}
                      placeholder="e.g. H-7, Government Quarters, Khatodara, Nr. Sub Jail, Surat"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`emp-${emp.id}-gisGroup`} className="text-xs">GIS Group (ક / ખ / ગ / ઘ)</Label>
                    <Input
                      id={`emp-${emp.id}-gisGroup`}
                      value={emp.insuranceGroup}
                      onChange={(e) => updateEmployee(emp.id, 'insuranceGroup', e.target.value)}
                      className="font-gujSans"
                      placeholder="e.g. ખ"
                    />
                  </div>
                </div>

                {/* Earnings & Allowances — token: bg-earning-light / border-earning-border / border-l-earning */}
                <div className="bg-earning-light p-3.5 rounded-xl border border-earning-border border-l-4 border-l-earning shadow-xs space-y-2">
                  <div className="text-xs font-bold uppercase text-emerald-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-emerald-600" /> Earnings &amp; Allowances (₹)
                    </span>
                    <span className="num text-emerald-700 font-bold">Total: ₹{formatMoney(empEarnings)}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Pay of Establishment (0102)</Label>
                      <Input
                        type="number" inputMode="decimal"
                        min="0"
                        value={emp.payOfEstablishment || 0}
                        onChange={(e) => updateEmployee(emp.id, 'payOfEstablishment', parseFloat(e.target.value) || 0)}
                        className="num font-bold bg-white"
                      />
                      {(() => {
                        const res = emp.masterId ? payResolutions[emp.masterId] : undefined;
                        if (!res) return null;
                        if (res.prorated && res.split.length > 0) {
                          return (
                            <p className="text-xs text-indigo-700 mt-1 flex items-start gap-1">
                              <History className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>
                                Pay Matrix: blended ₹{res.basicPay.toLocaleString('en-IN')} for {formatDate(monthStartFromKey(monthOf) ?? '')} — {res.split.map((s) => `${s.basicPay.toLocaleString('en-IN')}×${s.days}d`).join(' + ')}
                              </span>
                            </p>
                          );
                        }
                        if (res.entry) {
                          return (
                            <p className="text-xs text-indigo-700 mt-1 flex items-start gap-1">
                              <History className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>
                                Pay Matrix: ₹{res.entry.basicPay.toLocaleString('en-IN')} since {formatDate(res.entry.startDate)}
                              </span>
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Pay of Officer (0101)</Label>
                      <Input
                        type="number" inputMode="decimal"
                        min="0"
                        value={emp.payOfOfficer || 0}
                        onChange={(e) => updateEmployee(emp.id, 'payOfOfficer', parseFloat(e.target.value) || 0)}
                        className="num bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-emerald-800">Dearness Allowance (0103) — {effectiveDaPercent}%</Label>
                      <Input
                        type="number" inputMode="decimal"
                        min="0"
                        value={emp.da || 0}
                        onChange={(e) => updateEmployee(emp.id, 'da', parseFloat(e.target.value) || 0)}
                        className="num font-bold bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">C.L.A. / Other (0111)</Label>
                      <Input
                        type="number" inputMode="decimal"
                        min="0"
                        value={emp.cla || 0}
                        onChange={(e) => updateEmployee(emp.id, 'cla', parseFloat(e.target.value) || 0)}
                        className="num bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Medical Allowance (0107)</Label>
                      <Input
                        type="number" inputMode="decimal"
                        min="0"
                        value={emp.medicalAllowance || 0}
                        onChange={(e) => updateEmployee(emp.id, 'medicalAllowance', parseFloat(e.target.value) || 0)}
                        className="num bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Transport Allowance (0113)</Label>
                      <Input
                        type="number" inputMode="decimal"
                        min="0"
                        value={emp.transportAllowance || 0}
                        onChange={(e) => updateEmployee(emp.id, 'transportAllowance', parseFloat(e.target.value) || 0)}
                        className="num font-bold bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Schedule Deductions - Core (P4 col 22,24,26,27,35,39) — token: bg-deduction-light / border-deduction-border / border-l-deduction */}
                <div className="bg-deduction-light p-3.5 rounded-xl border border-deduction-border border-l-4 border-l-deduction shadow-xs space-y-2">
                  <div className="text-xs font-bold uppercase text-rose-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <TrendingDown className="h-4 w-4 text-rose-600" /> Schedule Deductions (₹) — Core
                    </span>
                    <span className="num text-rose-700 font-bold">Total: ₹{formatMoney(empDeductions)}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div>
                      <Label className="text-xs font-bold text-rose-900">NPS Pension (9534)</Label>
                      <Input
                        type="number" inputMode="decimal"
                        min="0"
                        value={emp.npsPension || 0}
                        onChange={(e) => updateEmployee(emp.id, 'npsPension', parseFloat(e.target.value) || 0)}
                        className="num font-bold bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Rent of Building (9550)</Label>
                      <Input
                        type="number" inputMode="decimal"
                        min="0"
                        value={emp.rentOfBuilding || 0}
                        onChange={(e) => updateEmployee(emp.id, 'rentOfBuilding', parseFloat(e.target.value) || 0)}
                        className="num font-bold bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Professional Tax (9570)</Label>
                      <Input
                        type="number" inputMode="decimal"
                        min="0"
                        value={emp.professionalTax || 0}
                        onChange={(e) => updateEmployee(emp.id, 'professionalTax', parseFloat(e.target.value) || 0)}
                        className="num font-bold bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">GIS Ins. Fund (9581)</Label>
                      <Input
                        type="number" inputMode="decimal"
                        min="0"
                        value={emp.gis1981Insurance || 0}
                        onChange={(e) => updateEmployee(emp.id, 'gis1981Insurance', parseFloat(e.target.value) || 0)}
                        className="num font-bold bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">GIS Sav. Fund (9582)</Label>
                      <Input
                        type="number" inputMode="decimal"
                        min="0"
                        value={emp.gis1981Savings || 0}
                        onChange={(e) => updateEmployee(emp.id, 'gis1981Savings', parseFloat(e.target.value) || 0)}
                        className="num font-bold bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-sky-800">ICDP Credit Society</Label>
                      <Input
                        type="number" inputMode="decimal"
                        min="0"
                        value={emp.societyDeduction || 0}
                        onChange={(e) => updateEmployee(emp.id, 'societyDeduction', parseFloat(e.target.value) || 0)}
                        className="num font-bold bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Advanced Earnings & Recoveries (P3 cols 5-7,10-14,16-18,21 Hidden) */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                  <button
                    type="button"
                    aria-expanded={Boolean(advancedEarningsOpen[emp.id])}
                    onClick={() => setAdvancedEarningsOpen((prev) => ({ ...prev, [emp.id]: !prev[emp.id] }))}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                      <Columns className="h-3.5 w-3.5 text-slate-500" /> Advanced Earnings &amp; Recoveries (P3 — NPPA, HRA, Bonus, ROP, DP, Recov.)
                    </span>
                    <span className="flex items-center gap-2 text-xs text-slate-500">
                      {(emp.nppa || emp.hra || emp.bonus || emp.ropArrearsGaz || emp.housingFund || emp.recovFestivalAdv) ? <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 num text-xs font-bold">has values</span> : null}
                      <ChevronDown className={`h-4 w-4 transition-transform ${advancedEarningsOpen[emp.id] ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                  {advancedEarningsOpen[emp.id] && (
                    <div className="p-3.5 space-y-3">
                      <div className="text-xs font-semibold text-slate-500">These map to P3 columns 5-7, 10-14, 16-18 and P1 Outer BCode 0101-0120. Leave 0 if not applicable.</div>
                      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        <div><Label className="text-xs">NPPA (0128) — Col 5</Label><Input type="number" inputMode="decimal" value={emp.nppa || 0} onChange={(e) => updateEmployee(emp.id, 'nppa', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Deerness Pay (0120) — Col 7</Label><Input type="number" inputMode="decimal" value={emp.dearnessPay || 0} onChange={(e) => updateEmployee(emp.id, 'dearnessPay', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">HRA (0110) — Col 9</Label><Input type="number" inputMode="decimal" value={emp.hra || 0} onChange={(e) => updateEmployee(emp.id, 'hra', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Other Allowance (0104) — Col 10</Label><Input type="number" inputMode="decimal" value={emp.otherAllowance || 0} onChange={(e) => updateEmployee(emp.id, 'otherAllowance', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Bonus (0108) — Col 11</Label><Input type="number" inputMode="decimal" value={emp.bonus || 0} onChange={(e) => updateEmployee(emp.id, 'bonus', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">PTA (1101) — Col 12</Label><Input type="number" inputMode="decimal" value={emp.pta || 0} onChange={(e) => updateEmployee(emp.id, 'pta', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Prof & Spl Service (2801) — Col 12</Label><Input type="number" inputMode="decimal" value={emp.profSplService || 0} onChange={(e) => updateEmployee(emp.id, 'profSplService', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Washing Allowance (1301) — Col 13</Label><Input type="number" inputMode="decimal" value={emp.washingAllowance || 0} onChange={(e) => updateEmployee(emp.id, 'washingAllowance', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Office Expense (5006) — Col 13</Label><Input type="number" inputMode="decimal" value={emp.officeExpenseOther || 0} onChange={(e) => updateEmployee(emp.id, 'officeExpenseOther', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">CA — Col 14</Label><Input type="number" inputMode="decimal" value={emp.ca || 0} onChange={(e) => updateEmployee(emp.id, 'ca', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">ROP Arrears Gaz (0117) — Col 16+</Label><Input type="number" inputMode="decimal" value={emp.ropArrearsGaz || 0} onChange={(e) => updateEmployee(emp.id, 'ropArrearsGaz', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">ROP Arrears Non-Gaz (0118)</Label><Input type="number" inputMode="decimal" value={emp.ropArrearsNonGaz || 0} onChange={(e) => updateEmployee(emp.id, 'ropArrearsNonGaz', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">DP Gaz (0119)</Label><Input type="number" inputMode="decimal" value={emp.dpGaz || 0} onChange={(e) => updateEmployee(emp.id, 'dpGaz', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">DP Non-Gaz (0120)</Label><Input type="number" inputMode="decimal" value={emp.dpNonGaz || 0} onChange={(e) => updateEmployee(emp.id, 'dpNonGaz', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Leave Salary (0102)</Label><Input type="number" inputMode="decimal" value={emp.leaveSalary || 0} onChange={(e) => updateEmployee(emp.id, 'leaveSalary', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Leave Encashment (0109) — Col 6</Label><Input type="number" inputMode="decimal" value={emp.leaveEncashment || 0} onChange={(e) => updateEmployee(emp.id, 'leaveEncashment', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-4 pt-2 border-t border-slate-100">
                        <div><Label className="text-xs text-amber-800 font-semibold">Recov Festival Adv (5701) — Col 17</Label><Input type="number" inputMode="decimal" value={emp.recovFestivalAdv || 0} onChange={(e) => updateEmployee(emp.id, 'recovFestivalAdv', parseFloat(e.target.value) || 0)} className="num h-8 text-xs bg-amber-50 border-amber-200" /></div>
                        <div><Label className="text-xs text-amber-800 font-semibold">Recov Food Grain Adv (5801) — Col 18</Label><Input type="number" inputMode="decimal" value={emp.recovFoodGrainAdv || 0} onChange={(e) => updateEmployee(emp.id, 'recovFoodGrainAdv', parseFloat(e.target.value) || 0)} className="num h-8 text-xs bg-amber-50 border-amber-200" /></div>
                        <div><Label className="text-xs text-amber-800 font-semibold">Recov Pay (0101-)</Label><Input type="number" inputMode="decimal" value={emp.recovPay || 0} onChange={(e) => updateEmployee(emp.id, 'recovPay', parseFloat(e.target.value) || 0)} className="num h-8 text-xs bg-amber-50 border-amber-200" /></div>
                        <div><Label className="text-xs text-amber-800 font-semibold">Leave Salary Adv</Label><Input type="number" inputMode="decimal" value={emp.leaveSalaryAdv || 0} onChange={(e) => updateEmployee(emp.id, 'leaveSalaryAdv', parseFloat(e.target.value) || 0)} className="num h-8 text-xs bg-amber-50 border-amber-200" /></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Advanced Deductions (P4 cols 21,23,25,28-34) — hidden Govt deductions */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                  <button
                    type="button"
                    aria-expanded={Boolean(advancedDeductionsOpen[emp.id])}
                    onClick={() => setAdvancedDeductionsOpen((prev) => ({ ...prev, [emp.id]: !prev[emp.id] }))}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                      <TrendingDown className="h-3.5 w-3.5 text-slate-500" /> Advanced Deductions — Govt Codes 9510-9910 (P4 Col 21,23,25,28-34)
                    </span>
                    <span className="flex items-center gap-2 text-xs text-slate-500">
                      {(emp.incomeTax || emp.postalLifeInsurance || emp.gis1979Insurance || emp.hba || emp.motorCarAdv) ? <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 num text-xs font-bold">has values</span> : null}
                      <ChevronDown className={`h-4 w-4 transition-transform ${advancedDeductionsOpen[emp.id] ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                  {advancedDeductionsOpen[emp.id] && (
                    <div className="p-3.5 space-y-3">
                      <div className="text-xs font-semibold text-slate-500">Maps to P4 columns 21-34 and P1 Outer Deductions A/B. These reduce Net Payable (col 37). Leave 0 if not applicable.</div>
                      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        <div><Label className="text-xs">Income Tax (9510) — Col 21</Label><Input type="number" inputMode="decimal" value={emp.incomeTax || 0} onChange={(e) => updateEmployee(emp.id, 'incomeTax', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Surcharge IT (9520) — Col 21</Label><Input type="number" inputMode="decimal" value={emp.surchargeIT || 0} onChange={(e) => updateEmployee(emp.id, 'surchargeIT', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Housing Fund (9590) — Col 21</Label><Input type="number" inputMode="decimal" value={emp.housingFund || 0} onChange={(e) => updateEmployee(emp.id, 'housingFund', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Police Housing (9560) — Col 22</Label><Input type="number" inputMode="decimal" value={emp.policeHousing || 0} onChange={(e) => updateEmployee(emp.id, 'policeHousing', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Postal Life Insurance (9530) — Col 23</Label><Input type="number" inputMode="decimal" value={emp.postalLifeInsurance || 0} onChange={(e) => updateEmployee(emp.id, 'postalLifeInsurance', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">BSI Premium (9540) — Col 23</Label><Input type="number" inputMode="decimal" value={emp.bsiPremium || 0} onChange={(e) => updateEmployee(emp.id, 'bsiPremium', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">GIS 1979 Insurance (9580) — Col 25</Label><Input type="number" inputMode="decimal" value={emp.gis1979Insurance || 0} onChange={(e) => updateEmployee(emp.id, 'gis1979Insurance', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">AIS Insurance (9583) — Col 25*</Label><Input type="number" inputMode="decimal" value={emp.aisInsurance || 0} onChange={(e) => updateEmployee(emp.id, 'aisInsurance', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">AIS Savings (9584)</Label><Input type="number" inputMode="decimal" value={emp.aisSavings || 0} onChange={(e) => updateEmployee(emp.id, 'aisSavings', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Divi Acct Insurance (9585)</Label><Input type="number" inputMode="decimal" value={emp.diviAcctInsurance || 0} onChange={(e) => updateEmployee(emp.id, 'diviAcctInsurance', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Divi Acct Savings (9586)</Label><Input type="number" inputMode="decimal" value={emp.diviAcctSavings || 0} onChange={(e) => updateEmployee(emp.id, 'diviAcctSavings', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">PF Deputation (9587)</Label><Input type="number" inputMode="decimal" value={emp.pfDeputation || 0} onChange={(e) => updateEmployee(emp.id, 'pfDeputation', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Govt Housing Fund (9590*)</Label><Input type="number" inputMode="decimal" value={emp.govtHousingFund || 0} onChange={(e) => updateEmployee(emp.id, 'govtHousingFund', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">HBA Principal/Interest (9591) — Col 32</Label><Input type="number" inputMode="decimal" value={emp.hba || 0} onChange={(e) => updateEmployee(emp.id, 'hba', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Motor Car Adv (9592) — Col 31</Label><Input type="number" inputMode="decimal" value={emp.motorCarAdv || 0} onChange={(e) => updateEmployee(emp.id, 'motorCarAdv', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Security Deposit (9600)</Label><Input type="number" inputMode="decimal" value={emp.securityDeposit || 0} onChange={(e) => updateEmployee(emp.id, 'securityDeposit', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">IAS PF (9620) — Col 28</Label><Input type="number" inputMode="decimal" value={emp.iasProvidentFund || 0} onChange={(e) => updateEmployee(emp.id, 'iasProvidentFund', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">GPF Other Class4 (9670) — Col 28</Label><Input type="number" inputMode="decimal" value={emp.gpfOtherThanClass4 || 0} onChange={(e) => updateEmployee(emp.id, 'gpfOtherThanClass4', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">GPF Divi Acct (9680)</Label><Input type="number" inputMode="decimal" value={emp.gpfDiviAcct || 0} onChange={(e) => updateEmployee(emp.id, 'gpfDiviAcct', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Contributory PF (9690)</Label><Input type="number" inputMode="decimal" value={emp.contributoryPF || 0} onChange={(e) => updateEmployee(emp.id, 'contributoryPF', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">GPF Work Charged (9532)</Label><Input type="number" inputMode="decimal" value={emp.gpfWorkCharged || 0} onChange={(e) => updateEmployee(emp.id, 'gpfWorkCharged', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">GPF Rojamdar (9533)</Label><Input type="number" inputMode="decimal" value={emp.gpfRojamdar || 0} onChange={(e) => updateEmployee(emp.id, 'gpfRojamdar', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Festival Advance (5701) — Col 29</Label><Input type="number" inputMode="decimal" value={emp.festivalAdv || 0} onChange={(e) => updateEmployee(emp.id, 'festivalAdv', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Food Grain Advance (5801) — Col 30</Label><Input type="number" inputMode="decimal" value={emp.foodGrainAdv || 0} onChange={(e) => updateEmployee(emp.id, 'foodGrainAdv', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Fan Advance (9720) — Col 33</Label><Input type="number" inputMode="decimal" value={emp.fanAdv || 0} onChange={(e) => updateEmployee(emp.id, 'fanAdv', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Other Conveyance Adv (9740)</Label><Input type="number" inputMode="decimal" value={emp.otherConveyanceAdv || 0} onChange={(e) => updateEmployee(emp.id, 'otherConveyanceAdv', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Interest on Adv (9760)</Label><Input type="number" inputMode="decimal" value={emp.interestOnAdv || 0} onChange={(e) => updateEmployee(emp.id, 'interestOnAdv', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Jeep Rent (9780) — Col 34</Label><Input type="number" inputMode="decimal" value={emp.jeepRent || 0} onChange={(e) => updateEmployee(emp.id, 'jeepRent', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">PF Adjustable by AO (9790)</Label><Input type="number" inputMode="decimal" value={emp.pfAdjustableByAO || 0} onChange={(e) => updateEmployee(emp.id, 'pfAdjustableByAO', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Recov Pay/Leave (9770) — Col 34</Label><Input type="number" inputMode="decimal" value={emp.recovPayLeaveSalary || 0} onChange={(e) => updateEmployee(emp.id, 'recovPayLeaveSalary', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Misc Recoveries (9910) — Col 34</Label><Input type="number" inputMode="decimal" value={emp.miscRecoveries || 0} onChange={(e) => updateEmployee(emp.id, 'miscRecoveries', parseFloat(e.target.value) || 0)} className="money-input h-8 bg-white" /></div>
                        <div><Label className="text-xs">Remarks</Label><Input value={emp.remarks || ''} onChange={(e) => updateEmployee(emp.id, 'remarks', e.target.value)} className="h-8 text-xs bg-white" placeholder="P5-P8 remarks" /></div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
  );
}
